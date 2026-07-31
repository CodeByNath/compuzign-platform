// Service Disable/Enable mounted regression — Issues 3 & 4.
//
// Reproduces two reported defects on an already-published Service (Overview,
// Inclusions and FAQs all settled/active):
//   3. Disable makes every module pill read "Pending" instead of "Disabled".
//   4. Enable republishes/reactivates content instead of leaving it Pending —
//      i.e. Enable behaves like Publish.
//
// Enable must land the Service on Pending — not Active, and not functionally
// stuck as Disabled either. "Pending" has no literal platform_status value
// (the enum is fixed to active/disabled/archived/trashed across every
// station — see StationLifecycle); it is derived from platform_status
// 'disabled' + an EMPTY previous_platform_status mask. Getting that pair of
// values right is necessary but not sufficient: every permitted action must
// actually be reachable from that state — Overview/Inclusions/FAQs edit and
// save, Publish, Disable again, Archive, Trash — or the record is still
// functionally Disabled no matter what the pill says. This regression proves
// the pill AND the action layer, by mounting the REAL split-action footer
// component (not just inspecting the props passed into it) and driving real
// module editors through real Save cycles.
//
// Mounts the REAL ServiceDrawerHost composition (esbuild + happy-dom + Preact
// render, same technique as scripts/service-create-regression.mjs) against a
// numeric recordId — an existing, already-published record.
//
// Usage: npm run regression:service-disable-enable
//    or: node scripts/service-disable-enable-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-service-disable-enable-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

// ── DOM shim ─────────────────────────────────────────────────────────────
const window = new Window({ url: 'https://cz-test.local/' });
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.MouseEvent = window.MouseEvent;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

window.CompuZignConfig = { apiRoot: 'https://cz-test.local/wp-json/', nonce: 'test-nonce' };

// ── Fetch mock — the only faked boundary ────────────────────────────────
const SERVICE_ID = 701;
const CATEGORY = { id: 1, name: 'Test Category', slug: 'test-category', description: '' };

// Server-side truth — a Service that has already been published, with every
// module settled. Mirrors the ticket's "Disabled published Service" example.
const server = {
  title: 'Existing Published Service',
  excerpt: 'A settled excerpt.',
  content: 'A settled description.',
  categories: [CATEGORY],
  inclusions: [{ id: 'daily-backups', label: 'Daily backups' }],
  faqs: [{ id: 'how-often', question: 'How often?', answer: 'Daily.' }],
  platformStatus: 'active',
  previousPlatformStatus: '',
  moduleStatus: { overview: 'settled', inclusions: 'settled', faqs: 'settled' },
};

let statusCalls = 0;
let lastStatusPayload = null;
let lastStatusResponseModuleStatus = null;

function jsonResponse(body) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

globalThis.fetch = (url, init = {}) => {
  const path = String(url);
  const method = (init?.method ?? 'GET').toUpperCase();

  if (path.endsWith('/admin/services') && method === 'GET') {
    return jsonResponse({
      categories: [CATEGORY],
      stations: [{
        id: SERVICE_ID,
        title: server.title,
        slug: 'existing-published-service',
        platform_status: server.platformStatus,
        previous_platform_status: server.previousPlatformStatus,
        module_status: server.moduleStatus,
        categories: server.categories,
        has_drafts: false,
        inclusion_count: server.inclusions.length,
        faq_count: server.faqs.length,
      }],
    });
  }
  if (path.endsWith('/admin/surface-packages') && method === 'GET') {
    return jsonResponse({ success: true, total: 0, packages: [] });
  }
  if (path.endsWith(`/admin/services/${SERVICE_ID}`) && method === 'GET') {
    return jsonResponse({
      success: true,
      id: SERVICE_ID,
      title: server.title,
      excerpt: server.excerpt,
      content: server.content,
      categories: server.categories,
      inclusions: server.inclusions,
      faqs: server.faqs,
      platform_status: server.platformStatus,
      previous_platform_status: server.previousPlatformStatus,
      module_status: server.moduleStatus,
      drafts: { overview: null, inclusions: null, faqs: null },
    });
  }
  if (path.includes(`/admin/services/${SERVICE_ID}/overview`) && method === 'POST') {
    const payload = JSON.parse(init.body);
    server.title = payload.title;
    server.excerpt = payload.excerpt ?? '';
    server.content = payload.content ?? '';
    server.moduleStatus = { ...server.moduleStatus, overview: 'pending' };
    return jsonResponse({
      success: true,
      draft: { title: payload.title, excerpt: payload.excerpt ?? '', content: payload.content ?? '', category_ids: payload.category_ids ?? [] },
      module_status: server.moduleStatus,
    });
  }
  if (path.includes(`/admin/services/${SERVICE_ID}/inclusions`) && method === 'POST') {
    const payload = JSON.parse(init.body);
    server.inclusions = payload.inclusions ?? [];
    server.moduleStatus = { ...server.moduleStatus, inclusions: 'pending' };
    return jsonResponse({ success: true, inclusions: server.inclusions, module_status: server.moduleStatus });
  }
  if (path.includes(`/admin/services/${SERVICE_ID}/faqs`) && method === 'POST') {
    const payload = JSON.parse(init.body);
    server.faqs = payload.faqs ?? [];
    server.moduleStatus = { ...server.moduleStatus, faqs: 'pending' };
    return jsonResponse({ success: true, faqs: server.faqs, module_status: server.moduleStatus });
  }
  if (path.endsWith(`/admin/services/${SERVICE_ID}/status`) && method === 'POST') {
    statusCalls += 1;
    const payload = JSON.parse(init.body ?? '{}');
    lastStatusPayload = payload;
    // The real backend contract (ServiceController::updateDisabledMask):
    // Disable never touches module_status; Enable always lands on 'disabled'
    // with the mask cleared — it never republishes on its own — also never
    // touching module_status. This mock reproduces that contract so the test
    // proves the FRONTEND wiring, not a reimplementation of the backend rule
    // (the backend rule itself is proven in tests/service-lifecycle-mask.php).
    if (payload.action === 'disable') {
      if (server.platformStatus === 'active' || server.previousPlatformStatus === '') {
        server.previousPlatformStatus = server.platformStatus;
      }
      server.platformStatus = 'disabled';
    } else if (payload.action === 'enable') {
      server.platformStatus = 'disabled';
      server.previousPlatformStatus = '';
    } else {
      return Promise.reject(new Error(`Unexpected /status payload in regression harness: ${init.body}`));
    }
    lastStatusResponseModuleStatus = { ...server.moduleStatus };
    return jsonResponse({
      success: true,
      service: {
        id: SERVICE_ID,
        platform_status: server.platformStatus,
        previous_platform_status: server.previousPlatformStatus,
        module_status: server.moduleStatus,
        post_status: 'publish',
        is_active: server.platformStatus === 'active',
      },
    });
  }
  return Promise.reject(new Error(`Unexpected fetch in regression harness: ${method} ${path}`));
};

// ── Bundle the REAL composition ─────────────────────────────────────────
await build({
  entryPoints: [resolve(root, 'resources/ts/service-station/surface/ServiceDrawerHost.tsx')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  logLevel: 'silent',
});

const { ServiceDrawerHost } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');
const { useState, useMemo, useRef } = await import('preact/hooks');

// ── Harness ──────────────────────────────────────────────────────────────
// The record footer (Disable/Enable/Archive/…) is registered via setFooter,
// not rendered into `container` by the real composition itself — but the
// captured VNode is a real, mountable <ServiceDrawerFooter/> element, so this
// harness renders it into its OWN detached `footerContainer` to inspect and
// click the REAL rendered split-action button/menu/primary button, not just
// the props passed into it.
let setFooterCalls = 0;
let lastFooter = null;

function Harness() {
  const [, setFooterState] = useState(null);
  const setFooterRef = useRef(setFooterState);
  setFooterRef.current = setFooterState;

  const setFooter = useMemo(() => (footer) => {
    setFooterCalls += 1;
    lastFooter = footer;
    setFooterRef.current(footer);
  }, []);
  const onClose = useMemo(() => () => {}, []);
  const onModeChange = useMemo(() => () => {}, []);
  const onSaved = useMemo(() => () => {}, []);
  const setCloseGuard = useMemo(() => () => {}, []);

  return h(ServiceDrawerHost, {
    recordId: SERVICE_ID,
    mode: 'view',
    onClose,
    onModeChange,
    onSaved,
    setFooter,
    setCloseGuard,
  });
}

const container = document.createElement('div');
document.body.appendChild(container);

const footerContainer = document.createElement('div');
document.body.appendChild(footerContainer);
function renderFooterDom() {
  render(lastFooter, footerContainer);
  return footerContainer;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitToSettle(maxTicks = 400, quietTicksNeeded = 15) {
  let quiet = 0;
  let previous = setFooterCalls;
  for (let tick = 0; tick < maxTicks; tick += 1) {
    await sleep(5);
    if (setFooterCalls === previous) {
      quiet += 1;
      if (quiet >= quietTicksNeeded) return { settled: true, ticks: tick };
    } else {
      quiet = 0;
      previous = setFooterCalls;
    }
  }
  return { settled: false, ticks: maxTicks };
}

const failures = [];
function check(label, cond, detail) {
  if (cond) {
    console.log(`  ok — ${label}`);
  } else {
    console.error(`  FAIL — ${label}${detail ? `: ${detail}` : ''}`);
    failures.push(label);
  }
}

function clickButtonWithText(text, root = container) {
  const btn = [...root.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return btn;
}

// The module title node also carries an inline count badge with no separating
// whitespace (e.g. "Included Features1"), so match by prefix, not equality.
function findModule(titleText) {
  return [...container.querySelectorAll('.drawerModule')]
    .find((el) => el.querySelector('.drawerModule__title')?.textContent.trim().startsWith(titleText)) ?? null;
}

function pillLabel(moduleTitle) {
  return findModule(moduleTitle)?.querySelector('.cz-module-status-pill')?.textContent.trim();
}

function editButtonFor(moduleTitle) {
  const mod = findModule(moduleTitle);
  return [...(mod?.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim() === 'Edit');
}

console.log('Service Disable/Enable regression (Issues 3 & 4)\n');

console.log('1) Mount an already-published Service (Overview/Inclusions/FAQs all settled)');
render(h(Harness), container);
await waitToSettle();
check('a footer was registered on mount', setFooterCalls > 0);
check('the record footer exposes onToggleActive', typeof lastFooter?.props?.onToggleActive === 'function');

let footerDom = renderFooterDom();
check('the real rendered split button reads "Disable" while the Service is active', footerDom.querySelector('.cz-footer-split__btn')?.textContent.trim() === 'Disable', footerDom.querySelector('.cz-footer-split__btn')?.textContent);

check('Overview pill reads Active before Disable', pillLabel('Service Overview') === 'Active', pillLabel('Service Overview'));
check('Included Features pill reads Active before Disable', pillLabel('Included Features') === 'Active', pillLabel('Included Features'));
check('Common Questions pill reads Active before Disable', pillLabel('Common Questions') === 'Active', pillLabel('Common Questions'));

console.log('\n2) Disable — every module pill must read Disabled, not Pending (Issue 3)');
lastFooter.props.onToggleActive();
await waitToSettle();
check('the status endpoint was called once for Disable', statusCalls === 1, `statusCalls=${statusCalls}`);
check('the Disable request carried action=disable', lastStatusPayload?.action === 'disable', JSON.stringify(lastStatusPayload));

check('Overview pill reads Disabled after Disable', pillLabel('Service Overview') === 'Disabled', pillLabel('Service Overview'));
check('Included Features pill reads Disabled after Disable — NOT Pending', pillLabel('Included Features') === 'Disabled', pillLabel('Included Features'));
check('Common Questions pill reads Disabled after Disable — NOT Pending', pillLabel('Common Questions') === 'Disabled', pillLabel('Common Questions'));

footerDom = renderFooterDom();
check('the real rendered split button now reads "Enable"', footerDom.querySelector('.cz-footer-split__btn')?.textContent.trim() === 'Enable', footerDom.querySelector('.cz-footer-split__btn')?.textContent);
check('isDisabledMasked is true right after Disable', lastFooter?.props?.isDisabledMasked === true);

console.log('\n3) Enable — the exact post-Enable state, audited directly (Issue 4)');
lastFooter.props.onToggleActive();
await waitToSettle();
check('the status endpoint was called a second time for Enable', statusCalls === 2, `statusCalls=${statusCalls}`);
check('the Enable request carried action=enable', lastStatusPayload?.action === 'enable', JSON.stringify(lastStatusPayload));

console.log(`     platform_status          = ${server.platformStatus}`);
console.log(`     previous_platform_status = "${server.previousPlatformStatus}"`);
console.log(`     module_status.overview   = ${server.moduleStatus.overview}`);
console.log(`     module_status.inclusions = ${server.moduleStatus.inclusions}`);
console.log(`     module_status.faqs       = ${server.moduleStatus.faqs}`);

check('platform_status is disabled — Enable never activates on its own', server.platformStatus === 'disabled', server.platformStatus);
check('previous_platform_status is cleared — the mask is lifted', server.previousPlatformStatus === '', `"${server.previousPlatformStatus}"`);
check('isDisabledMasked is now false — the record is functionally Pending, not Disabled', lastFooter?.props?.isDisabledMasked === false);
check(
  '(8) Enable itself did not settle or publish anything — the response module_status is byte-identical to the pre-Enable settled triple',
  JSON.stringify(lastStatusResponseModuleStatus) === JSON.stringify({ overview: 'settled', inclusions: 'settled', faqs: 'settled' }),
  JSON.stringify(lastStatusResponseModuleStatus),
);

check('(1) Overview pill reads Pending after Enable — not Active, not Disabled', pillLabel('Service Overview') === 'Pending', pillLabel('Service Overview'));
check('(1) Included Features pill reads Pending after Enable', pillLabel('Included Features') === 'Pending', pillLabel('Included Features'));
check('(1) Common Questions pill reads Pending after Enable', pillLabel('Common Questions') === 'Pending', pillLabel('Common Questions'));

console.log('\n4) Action availability after Enable — every permitted footer action must actually be reachable');
footerDom = renderFooterDom();
check('(6) the real rendered split button now reads "Disable" again — NOT a no-op "Enable"', footerDom.querySelector('.cz-footer-split__btn')?.textContent.trim() === 'Disable', footerDom.querySelector('.cz-footer-split__btn')?.textContent);
check('(6) the split button tone is danger, matching every other Disable action', footerDom.querySelector('.cz-footer-split')?.className.includes('cz-footer-split--danger'));

check('(5) Publish is present and enabled — Publish remains available', (() => {
  const publishBtn = [...footerDom.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Publish');
  return publishBtn != null && !publishBtn.disabled;
})());

const chevron = footerDom.querySelector('.cz-footer-split__chevron');
chevron?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
footerDom = renderFooterDom();
const overflowItems = [...footerDom.querySelectorAll('.cz-footer-split__menu .cz-footer-split__item')];
const archiveItem = overflowItems.find((b) => b.textContent.trim() === 'Archive');
const trashItem = overflowItems.find((b) => b.textContent.trim() === 'Move to Trash');
check('(7) Archive is present and enabled — the Service has been published before', archiveItem != null && !archiveItem.disabled, archiveItem?.outerHTML);
check('(7) Move to Trash is present and enabled', trashItem != null && !trashItem.disabled, trashItem?.outerHTML);

console.log('\n5) (2) Overview Edit opens after Enable, and a Save is not blocked or lost');
const overviewEditBtn = editButtonFor('Service Overview');
check('an Edit action is present on Service Overview after Enable', overviewEditBtn != null);
overviewEditBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
const titleInput = container.querySelector('#cz-service-title');
check('the Overview editor opened with the settled title', titleInput?.value === 'Existing Published Service', titleInput?.value);
if (titleInput) {
  titleInput.value = 'Existing Published Service (edited after Enable)';
  titleInput.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButtonWithText('Save');
await waitToSettle();
check('Overview Save after Enable reflects the edit — not lost, not blocked', pillLabel('Service Overview') != null && findModule('Service Overview')?.textContent.includes('Existing Published Service (edited after Enable)') !== false);
check('(9) Overview pill stays Pending after this Save, not Active — only Publish activates', pillLabel('Service Overview') === 'Pending', pillLabel('Service Overview'));

console.log('\n6) (3) Inclusions can be edited and saved after Enable');
const inclusionsEditBtn = editButtonFor('Included Features');
check('an Edit action is present on Included Features after Enable', inclusionsEditBtn != null);
inclusionsEditBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check('the existing inclusion is present in the editor', [...container.querySelectorAll('input.cz-tf-input')].some((i) => i.value === 'Daily backups'));
clickButtonWithText('+ Add inclusion');
await sleep(20);
const inclusionInput = container.querySelector('input[placeholder="Inclusion label"]');
if (inclusionInput) {
  inclusionInput.value = 'Weekly integrity checks';
  inclusionInput.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButtonWithText('Add');
await sleep(20);
clickButtonWithText('Save');
await waitToSettle();
check('Inclusions Save after Enable succeeded — the new item is reflected server-side', server.inclusions.some((i) => i.label === 'Weekly integrity checks'), JSON.stringify(server.inclusions));
check('(9) Included Features pill stays Pending after this Save', pillLabel('Included Features') === 'Pending', pillLabel('Included Features'));

console.log('\n7) (4) Common Questions can be edited and saved after Enable');
const faqsEditBtn = editButtonFor('Common Questions');
check('an Edit action is present on Common Questions after Enable', faqsEditBtn != null);
faqsEditBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check('the existing FAQ is present in the editor', [...container.querySelectorAll('input[placeholder="Question"]')].some((i) => i.value === 'How often?'));
clickButtonWithText('+ Add FAQ');
await sleep(20);
const allQuestionInputs = [...container.querySelectorAll('input[placeholder="Question"]')];
const newQuestionInput = allQuestionInputs[allQuestionInputs.length - 1];
const faqAnswerInputs = [...container.querySelectorAll('textarea[placeholder="Answer (optional)"]')];
const newAnswerInput = faqAnswerInputs[faqAnswerInputs.length - 1];
if (newQuestionInput && newAnswerInput) {
  newQuestionInput.value = 'Can I cancel anytime?';
  newQuestionInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  newAnswerInput.value = 'Yes, anytime.';
  newAnswerInput.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButtonWithText('Add');
await sleep(20);
clickButtonWithText('Save');
await waitToSettle();
check('FAQ Save after Enable succeeded — the new question is reflected server-side', server.faqs.some((f) => f.question === 'Can I cancel anytime?'), JSON.stringify(server.faqs));
check('(9) Common Questions pill stays Pending after this Save', pillLabel('Common Questions') === 'Pending', pillLabel('Common Questions'));

console.log('\n8) (6) Disable is genuinely available again — click the real rendered button, not a mocked prop');
footerDom = renderFooterDom();
const realDisableBtn = footerDom.querySelector('.cz-footer-split__btn');
check('the real button now reads "Disable"', realDisableBtn?.textContent.trim() === 'Disable', realDisableBtn?.textContent);
realDisableBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await waitToSettle();
check('the status endpoint was called a third time', statusCalls === 3, `statusCalls=${statusCalls}`);
check('this click sent action=disable, not action=enable — the fixed decision is not "isActive"-based', lastStatusPayload?.action === 'disable', JSON.stringify(lastStatusPayload));
check('every module pill reads Disabled again after this second Disable', pillLabel('Service Overview') === 'Disabled' && pillLabel('Included Features') === 'Disabled' && pillLabel('Common Questions') === 'Disabled');

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — Disable masks every module as Disabled; Enable lands the Service on Pending with every permitted action (Edit/Save, Publish, Disable, Archive, Trash) genuinely available, not just a relabelled pill.');
process.exit(0);
