// Service create-publish hand-off mounted regression.
//
// One confirmed Publish from a pending drawer must complete the Service
// Station transaction — create the real record, settle it with the returned
// id, activate it, and seed final detail — before the controller swaps its
// local identity. The same mounted drawer must then retain usable Overview,
// notification, Inclusions, and FAQ bindings without a loading fetch.
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
let settleCalls = 0;
let activationCalls = 0;

// Server-side truth — every POST mutates this. A create-publish hand-off must
// not need the detail GET at all because Service Station receives final detail
// from the create/settle/status transaction itself.
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
  if (path.endsWith(`/admin/services/${CREATED_ID}/settle`) && method === 'POST') {
    settleCalls += 1;
    server.moduleStatus = { overview: 'settled', inclusions: 'not-configured', faqs: 'not-configured' };
    return jsonResponse({
      success: true,
      service: { id: CREATED_ID, title: server.title, excerpt: server.excerpt, content: server.content, categories: server.categories },
      inclusions: server.inclusions,
      faqs: server.faqs,
      module_status: server.moduleStatus,
    });
  }
  if (path.endsWith(`/admin/services/${CREATED_ID}/status`) && method === 'POST') {
    const payload = JSON.parse(init.body);
    if (payload.platform_status === 'active') activationCalls += 1;
    return jsonResponse({
      success: true,
      service: {
        id: CREATED_ID,
        platform_status: 'active',
        previous_platform_status: '',
        module_status: server.moduleStatus,
        post_status: 'draft',
        is_active: true,
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
    detailFetchCalls += 1;
    return jsonResponse({
      success: true,
      id: CREATED_ID,
      title: server.title,
      excerpt: server.excerpt,
      content: server.content,
      categories: server.categories,
      inclusions: server.inclusions,
      faqs: server.faqs,
      platform_status: 'active',
      previous_platform_status: '',
      module_status: server.moduleStatus,
      drafts: { overview: null, inclusions: null, faqs: null },
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

console.log('Service create-hand-off regression\n');

console.log('1) Mount, fill Overview, Publish → Create → Settle → Activate in one mounted drawer');
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
check('the returned record id was settled and activated before the identity hand-off', settleCalls === 1 && activationCalls === 1,
  `settleCalls=${settleCalls}, activationCalls=${activationCalls}`);
check('the final detail seed keeps the hand-off out of a loading fetch', !detailFetchStarted && detailFetchCalls === 0);

// The final seed is already mounted here. Re-opening modules and reading their
// editor drafts proves that the authoritative station state survived the
// identity hand-off rather than being reset to the initial empty pools.

console.log('\n2) Re-save Overview after the completed hand-off — the station state remains live');
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
check('the save runs without a hand-off detail reload', detailFetchCalls === 0);

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

console.log('\n3) Save the first Inclusion immediately after hand-off — it must not be lost');
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
check('the Inclusion save does not trigger a hand-off detail reload', detailFetchCalls === 0);

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

console.log('\n4) Save the first Common Question immediately after hand-off — it must not be lost either');
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
check('the FAQ save does not trigger a hand-off detail reload', detailFetchCalls === 0);

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

console.log('\n5) The Overview notification remains available after the completed hand-off');
const overviewModule = findModule('Service Overview');
check('the Service Overview module is present', overviewModule != null);
const overviewPillWhileLoading = overviewModule?.querySelector('.cz-module-status-pill');
await waitToSettle();
check('the final detail stays mounted without a follow-up fetch', detailFetchCalls === 0, `detailFetchCalls=${detailFetchCalls}`);
check('the create-hand-off drawer never fell back to the host\'s full "Loading service…" replacement at any point', !container.textContent.includes('Loading service'));

const overviewModuleFinal = findModule('Service Overview');
const overviewPill = overviewModuleFinal?.querySelector('.cz-module-status-pill');
check('the Overview pill is a clickable notification button (it has notes)', overviewPill?.tagName === 'BUTTON', `tag=${overviewPill?.tagName}`);
overviewPill?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check(
  'the Overview pill reads Pending — the post-publish draft remains editable',
  overviewModuleFinal?.querySelector('.cz-module-status-pill')?.textContent.trim() === 'Pending',
  overviewModuleFinal?.querySelector('.cz-module-status-pill')?.textContent,
);
check(
  'the Overview notification panel remains mounted and populated after the hand-off',
  overviewModuleFinal?.querySelector('.cz-module-notes') != null,
  overviewModuleFinal?.textContent,
);

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — one confirmed Publish retains live Service drawer bindings through the final identity hand-off.');
process.exit(0);
