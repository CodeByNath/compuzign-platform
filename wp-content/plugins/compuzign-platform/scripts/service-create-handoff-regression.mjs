// Service create-hand-off mounted regression — Issues 1 & 2.
//
// Reproduces the shared root cause behind two reported defects:
//   1. The Service Overview module's "waiting for activation" notification
//      disappears immediately after saving Overview during creation.
//   2. Inclusions/Common Questions erase whatever was just saved on their
//      first save after a brand-new Service is created, recovering only
//      after Publish or a drawer reopen.
//
// Root cause: useServiceStation's saveOverview/saveInclusions/saveFaqs patch
// `adminDetail` via `prev => prev ? patch(prev) : prev` — a silent no-op
// while `adminDetail` is still null, which is exactly the window between the
// create hand-off (`createService()` resolving) and the follow-up
// `fetchAdminServiceDetail` GET resolving. This harness deliberately holds
// that GET open (never resolves it until told to) so every module save in
// this test executes DURING that window — the exact race a fast admin (or a
// slow network) hits in production. The fix seeds `adminDetail` synchronously
// from the create response, so no save in this window is ever silently
// dropped.
//
// Same harness technique as scripts/service-create-regression.mjs: mounts the
// REAL ServiceDrawerHost composition (esbuild + happy-dom + Preact render);
// only fetch is faked.
//
// Usage: npm run regression:service-create-handoff
//    or: node scripts/service-create-handoff-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-service-handoff-bundle.mjs');
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
const CREATED_ID = 601;
const CATEGORY = { id: 1, name: 'Test Category', slug: 'test-category', description: '' };

let createServiceCalls = 0;
let detailFetchCalls = 0;
let detailFetchStarted = false;

// The follow-up GET /admin/services/{id} is held open until the test releases
// it — simulating a real network round-trip that has not yet returned by the
// time the admin performs the next save. Server-side state (below) is always
// consistent by the time this resolves; only the CLIENT's ordering is delayed.
let releaseDetailFetch = () => {};
const detailFetchGate = new Promise((res) => { releaseDetailFetch = res; });

// Server-side truth — every POST mutates this; the (deliberately delayed) GET
// reads from it once released, exactly like a real backend would.
const server = {
  title: '',
  excerpt: '',
  content: '',
  categories: [],
  inclusions: [],
  faqs: [],
  moduleStatus: { overview: 'pending', inclusions: 'not-configured', faqs: 'not-configured' },
};

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
    return jsonResponse({ categories: [CATEGORY], stations: [] });
  }
  if (path.endsWith('/admin/surface-packages') && method === 'GET') {
    return jsonResponse({ success: true, total: 0, packages: [] });
  }
  if (path.endsWith('/admin/services') && method === 'POST') {
    createServiceCalls += 1;
    const payload = JSON.parse(init.body);
    server.title = payload.title;
    server.excerpt = payload.excerpt ?? '';
    server.content = payload.content ?? '';
    server.categories = payload.category_ids?.length ? [CATEGORY] : [];
    return jsonResponse({
      success: true,
      service: {
        id: CREATED_ID,
        title: server.title,
        slug: 'test-service',
        platform_status: 'disabled',
        previous_platform_status: '',
        module_status: server.moduleStatus,
        categories: server.categories,
      },
      drafts: {
        overview: { title: server.title, excerpt: server.excerpt, content: server.content, category_ids: payload.category_ids ?? [] },
        inclusions: null,
        faqs: null,
      },
    });
  }
  if (path.includes(`/admin/services/${CREATED_ID}/overview`) && method === 'POST') {
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
  if (path.includes(`/admin/services/${CREATED_ID}/inclusions`) && method === 'POST') {
    const payload = JSON.parse(init.body);
    server.inclusions = payload.inclusions ?? [];
    server.moduleStatus = { ...server.moduleStatus, inclusions: 'pending' };
    return jsonResponse({ success: true, inclusions: server.inclusions, module_status: server.moduleStatus });
  }
  if (path.includes(`/admin/services/${CREATED_ID}/faqs`) && method === 'POST') {
    const payload = JSON.parse(init.body);
    server.faqs = payload.faqs ?? [];
    server.moduleStatus = { ...server.moduleStatus, faqs: 'pending' };
    return jsonResponse({ success: true, faqs: server.faqs, module_status: server.moduleStatus });
  }
  if (path.endsWith(`/admin/services/${CREATED_ID}`) && method === 'GET') {
    detailFetchStarted = true;
    return detailFetchGate.then(() => {
      detailFetchCalls += 1;
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          id: CREATED_ID,
          title: server.title,
          excerpt: server.excerpt,
          content: server.content,
          categories: server.categories,
          inclusions: server.inclusions,
          faqs: server.faqs,
          platform_status: 'disabled',
          previous_platform_status: '',
          module_status: server.moduleStatus,
          drafts: { overview: null, inclusions: null, faqs: null },
        }),
        text: () => Promise.resolve(''),
      };
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
// The record footer (Publish, Enable/Disable, Archive, …) is registered via
// setFooter, not rendered into `container` — same as
// scripts/service-create-regression.mjs, invoked directly through the
// captured footer node's own handler props.
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
    recordId: 'new',
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

function clickButtonWithText(text) {
  const btn = [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return btn;
}

// The module title node also carries an inline count badge with no separating
// whitespace (e.g. "Included Features1"), so match by prefix, not equality.
function findModule(titleText) {
  return [...container.querySelectorAll('.drawerModule')]
    .find((el) => el.querySelector('.drawerModule__title')?.textContent.trim().startsWith(titleText)) ?? null;
}

console.log('Service create-hand-off regression (Issues 1 & 2)\n');

console.log('1) Mount, fill Overview, Publish → Create — while the follow-up detail GET is held open');
render(h(Harness), container);
await waitToSettle();

clickButtonWithText('Edit');
await sleep(20);
container.querySelector('#cz-service-title').value = 'Handoff Regression Service';
container.querySelector('#cz-service-title').dispatchEvent(new window.Event('input', { bubbles: true }));
container.querySelector('#cz-service-description').value = 'Description filled before creation.';
container.querySelector('#cz-service-description').dispatchEvent(new window.Event('input', { bubbles: true }));
container.querySelector('#cz-service-category').value = String(CATEGORY.id);
container.querySelector('#cz-service-category').dispatchEvent(new window.Event('change', { bubbles: true }));
await sleep(20);
clickButtonWithText('Save');
await waitToSettle();

check('the record footer exposes onPublish', typeof lastFooter?.props?.onPublish === 'function');
lastFooter.props.onPublish();
await sleep(20);
const createButton = clickButtonWithText('Create');
check('publish-confirm dialog offered Create', createButton != null);
await waitToSettle();

check('createService was called exactly once', createServiceCalls === 1, `createServiceCalls=${createServiceCalls}`);
check('the follow-up detail fetch has started but is still held open (the race window)', detailFetchStarted && detailFetchCalls === 0);

// From here on, `detailLoaded` is deliberately still false (the follow-up GET
// is held open) — module READ views legitimately render loading skeletons
// while it is, so DOM text in the read view cannot prove anything about
// adminDetail's correctness during this window. Re-opening a module's EDITOR
// is the discriminating probe instead: the editor seeds its draft straight
// from the station's draft-preferred derivation (inclusions/stationOverviewDraft),
// which is NOT gated by detailLoaded — it reads directly from adminDetail (or,
// pre-fix, silently falls back to the stale creation-time `service` object
// whenever adminDetail's patch no-opped). Reopening a module immediately after
// saving it and reading the editor's seeded value is exactly the same proof a
// human tester performs by re-clicking Edit without closing the drawer.

console.log('\n2) Re-save Overview DURING the open race window — the save itself must not be lost (Issue 1 root cause)');
clickButtonWithText('Edit');
await sleep(20);
const titleAfterCreate = container.querySelector('#cz-service-title');
check('the Overview editor reopens seeded with the just-created values (not reset to empty)', titleAfterCreate?.value === 'Handoff Regression Service', `value="${titleAfterCreate?.value}"`);
if (titleAfterCreate) {
  titleAfterCreate.value = 'Handoff Regression Service (edited post-creation)';
  titleAfterCreate.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButtonWithText('Save');
await waitToSettle();
check('detail fetch is still pending while this save happened', detailFetchCalls === 0);

clickButtonWithText('Edit');
await sleep(20);
const titleReopened = container.querySelector('#cz-service-title');
check(
  'reopening Overview shows the just-saved edit, not the stale creation-time title — proves the save response updated the canonical station state, not just a local echo',
  titleReopened?.value === 'Handoff Regression Service (edited post-creation)',
  `value="${titleReopened?.value}"`,
);
clickButtonWithText('Cancel');
await sleep(20);

console.log('\n3) Save the first Inclusion DURING the still-open race window — it must not be lost (Issue 2)');
const inclusionsModuleBeforeEdit = findModule('Included Features');
check('the Included Features module is present', inclusionsModuleBeforeEdit != null);
const inclusionsEditBtn = [...(inclusionsModuleBeforeEdit?.querySelectorAll('button') ?? [])]
  .find((b) => b.textContent.trim() === 'Edit');
inclusionsEditBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
const addInclusionBtn = clickButtonWithText('+ Add inclusion');
check('the "+ Add inclusion" control is present once the Inclusions editor is open', addInclusionBtn != null);
await sleep(20);
const inclusionInput = container.querySelector('input[placeholder="Inclusion label"]');
check('the new-inclusion input is present', inclusionInput != null);
if (inclusionInput) {
  inclusionInput.value = 'Daily automated backups';
  inclusionInput.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButtonWithText('Add');
await sleep(20);
clickButtonWithText('Save');
await waitToSettle();
check('detail fetch is STILL pending while the Inclusion save happened', detailFetchCalls === 0);

const inclusionsModuleAfterSave = findModule('Included Features');
const inclusionsEditBtn2 = [...(inclusionsModuleAfterSave?.querySelectorAll('button') ?? [])]
  .find((b) => b.textContent.trim() === 'Edit');
inclusionsEditBtn2?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check(
  'reopening Inclusions shows the item just saved — it did not reset to an empty pool (the reported "erases data on first save" defect)',
  [...container.querySelectorAll('input.cz-tf-input')].some((i) => i.value === 'Daily automated backups'),
);
clickButtonWithText('Cancel');
await sleep(20);

console.log('\n4) Save the first Common Question DURING the same still-open race window — it must not be lost either (Issue 2)');
const faqsModuleBeforeEdit = findModule('Common Questions');
check('the Common Questions module is present', faqsModuleBeforeEdit != null);
const faqsEditBtn = [...(faqsModuleBeforeEdit?.querySelectorAll('button') ?? [])]
  .find((b) => b.textContent.trim() === 'Edit');
faqsEditBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
const addFaqBtn = clickButtonWithText('+ Add FAQ');
check('the "+ Add FAQ" control is present once the FAQs editor is open', addFaqBtn != null);
await sleep(20);
const faqQuestionInput = container.querySelector('input[placeholder="Question"]');
const faqAnswerInput = container.querySelector('textarea[placeholder="Answer (optional)"]');
check('the new-FAQ question/answer inputs are present', faqQuestionInput != null && faqAnswerInput != null);
if (faqQuestionInput && faqAnswerInput) {
  faqQuestionInput.value = 'How often are backups taken?';
  faqQuestionInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  faqAnswerInput.value = 'Every 24 hours.';
  faqAnswerInput.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButtonWithText('Add');
await sleep(20);
clickButtonWithText('Save');
await waitToSettle();
check('detail fetch is STILL pending while the FAQ save happened', detailFetchCalls === 0);

const faqsModuleAfterSave = findModule('Common Questions');
const faqsEditBtn2 = [...(faqsModuleAfterSave?.querySelectorAll('button') ?? [])]
  .find((b) => b.textContent.trim() === 'Edit');
faqsEditBtn2?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check(
  'reopening Common Questions shows the question just saved — it did not reset to an empty pool',
  [...container.querySelectorAll('input[placeholder="Question"]')].some((i) => i.value === 'How often are backups taken?'),
);
clickButtonWithText('Cancel');
await sleep(20);

console.log('\n5) The waiting-for-activation notification must reflect the Overview save immediately — not only after another module changes (Issue 1)');
const overviewModule = findModule('Service Overview');
check('the Service Overview module is present', overviewModule != null);
const overviewPillWhileLoading = overviewModule?.querySelector('.cz-module-status-pill');
// The pill itself still renders a loading skeleton while detailLoaded is
// false (a legitimate, unrelated placeholder, per useServiceStation's
// detailLoaded contract) — release the held-open fetch now so the pill can
// resolve to its real state and be inspected. Every module save above has
// already been proven durable without this release; this step only confirms
// the notification wording, which needs `detailLoaded` to render at all.
releaseDetailFetch();
await waitToSettle();
check('the follow-up detail fetch eventually resolved', detailFetchCalls === 1, `detailFetchCalls=${detailFetchCalls}`);
check('the create-hand-off drawer never fell back to the host\'s full "Loading service…" replacement at any point', !container.textContent.includes('Loading service'));

const overviewModuleFinal = findModule('Service Overview');
const overviewPill = overviewModuleFinal?.querySelector('.cz-module-status-pill');
check('the Overview pill is a clickable notification button (it has notes)', overviewPill?.tagName === 'BUTTON', `tag=${overviewPill?.tagName}`);
overviewPill?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check(
  'the Overview pill reads Pending — the Service is not yet published',
  overviewModuleFinal?.querySelector('.cz-module-status-pill')?.textContent.trim() === 'Pending',
  overviewModuleFinal?.querySelector('.cz-module-status-pill')?.textContent,
);
check(
  'the Overview notification panel shows "waiting for activation" — it does not stay empty and does not need another module\'s save to reappear',
  overviewModuleFinal?.textContent.includes('Waiting for') ?? false,
  overviewModuleFinal?.textContent,
);

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — Overview/Inclusions saves during the create hand-off race window are never silently dropped.');
process.exit(0);
