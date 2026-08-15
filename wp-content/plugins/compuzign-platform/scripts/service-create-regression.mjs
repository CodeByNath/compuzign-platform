// Service Home "Create Service" mounted regression.
//
// No component-mounting test framework (vitest/jest/testing-library) exists in
// this repository — every other frontend "contract" here is a source-text
// assertion, not a rendered check. Whether Create Service really opens the
// mature Service drawer pending, whether inline Save really makes no create
// call, and whether footer Publish really creates the record exactly once and
// keeps the SAME composition mounted through the identity transition cannot be
// proven or disproven that way, so this script mounts the REAL ServiceDrawerHost
// composition — bundled with esbuild (vite's own copy, the same technique
// scripts/module-state-snapshot.mjs and scripts/tier-system-footer-loop-regression.mjs
// already use) — into a real DOM via happy-dom and Preact's own render(). Only
// the network boundary (fetch) is faked; hooks, the controller, the
// composition, and the DOM are the actual shipping code.
//
// Usage: npm run regression:service-create
//    or: node scripts/service-create-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-service-create-bundle.mjs');
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
let createServiceCalls = 0;
let overviewUpdateCalls = 0;
let inclusionsUpdateCalls = 0;
let faqsUpdateCalls = 0;
let detailFetchCalls = 0;
let settleCalls = 0;
let activationCalls = 0;
const lifecycleIds = [];
const CREATED_ID = 501;
const PLATFORM_ID = 'CZS7K9Q2';
const CATEGORY = { id: 1, name: 'Test Category', slug: 'test-category', description: '' };

let serverService = null; // set once createService succeeds

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
    serverService = {
      id: CREATED_ID,
      platform_id: PLATFORM_ID,
      title: payload.title,
      slug: 'test-service',
      platform_status: 'disabled',
      module_status: { overview: 'pending', inclusions: 'not-configured', faqs: 'not-configured' },
      categories: payload.category_ids?.length ? [CATEGORY] : [],
      inclusions: [],
      faqs: [],
    };
    return jsonResponse({
      success: true,
      service: serverService,
      drafts: {
        overview: { title: payload.title, excerpt: payload.excerpt ?? '', content: payload.content ?? '', category_ids: payload.category_ids ?? [] },
        inclusions: null,
        faqs: null,
      },
    });
  }
  if (path.endsWith(`/admin/services/${CREATED_ID}/settle`) && method === 'POST') {
    settleCalls += 1;
    lifecycleIds.push(CREATED_ID);
    serverService.module_status = { overview: 'settled', inclusions: 'settled', faqs: 'settled' };
    return jsonResponse({
      success: true,
      service: {
        id: CREATED_ID,
        platform_id: PLATFORM_ID,
        title: serverService.title,
        excerpt: '',
        content: 'A pending Service created by the regression harness.',
        categories: serverService.categories,
      },
      inclusions: serverService.inclusions,
      faqs: serverService.faqs,
      module_status: serverService.module_status,
    });
  }
  if (path.endsWith(`/admin/services/${CREATED_ID}/status`) && method === 'POST') {
    const payload = JSON.parse(init.body);
    if (payload.platform_status === 'active') {
      activationCalls += 1;
      lifecycleIds.push(CREATED_ID);
      serverService.platform_status = 'active';
    }
    return jsonResponse({
      success: true,
      service: {
        id: CREATED_ID,
        platform_id: PLATFORM_ID,
        platform_status: serverService.platform_status,
        previous_platform_status: '',
        module_status: serverService.module_status,
        post_status: 'draft',
        is_active: serverService.platform_status === 'active',
      },
    });
  }
  if (path.includes(`/admin/services/${CREATED_ID}/overview`) && method === 'POST') {
    overviewUpdateCalls += 1;
    const payload = JSON.parse(init.body);
    serverService.title = payload.title;
    serverService.module_status = { ...serverService.module_status, overview: 'pending' };
    return jsonResponse({
      success: true,
      draft: { title: payload.title, excerpt: payload.excerpt ?? '', content: payload.content ?? '', category_ids: payload.category_ids ?? [] },
      module_status: serverService.module_status,
    });
  }
  if (path.includes(`/admin/services/${CREATED_ID}/inclusions`) && method === 'POST') {
    inclusionsUpdateCalls += 1;
    const payload = JSON.parse(init.body);
    serverService.inclusions = payload.inclusions ?? [];
    serverService.module_status = { ...serverService.module_status, inclusions: 'pending' };
    return jsonResponse({ success: true, inclusions: serverService.inclusions, module_status: serverService.module_status });
  }
  if (path.includes(`/admin/services/${CREATED_ID}/faqs`) && method === 'POST') {
    faqsUpdateCalls += 1;
    const payload = JSON.parse(init.body);
    serverService.faqs = payload.faqs ?? [];
    serverService.module_status = { ...serverService.module_status, faqs: 'pending' };
    return jsonResponse({ success: true, faqs: serverService.faqs, module_status: serverService.module_status });
  }
  if (path.endsWith(`/admin/services/${CREATED_ID}`) && method === 'GET') {
    detailFetchCalls += 1;
    return jsonResponse({
      success: true,
      id: CREATED_ID,
      platform_id: PLATFORM_ID,
      title: serverService?.title ?? '',
      excerpt: '',
      content: 'A pending Service created by the regression harness.',
      categories: [CATEGORY],
      inclusions: [],
      faqs: [],
      platform_status: 'disabled',
      module_status: { overview: 'pending', inclusions: 'not-configured', faqs: 'not-configured' },
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
let setFooterCalls = 0;
let onSavedCalls = 0;
let footerCloseCalls = 0;
let lastFooter = null;
let latestRecordFooter = null;

function Harness() {
  const [, setFooterState] = useState(null);
  const setFooterRef = useRef(setFooterState);
  setFooterRef.current = setFooterState;

  const setFooter = useMemo(() => (footer) => {
    setFooterCalls += 1;
    lastFooter = footer;
    if (footer) latestRecordFooter = footer;
    setFooterRef.current(footer);
  }, []);
  const onClose = useMemo(() => () => { footerCloseCalls += 1; }, []);
  const onModeChange = useMemo(() => () => {}, []);
  const onSaved = useMemo(() => () => { onSavedCalls += 1; }, []);
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

const HOST_LOADING_TEXT = 'Loading service';
let loadingTextSeenDuringLastWait = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitToSettle(maxTicks = 400, quietTicksNeeded = 15) {
  loadingTextSeenDuringLastWait = false;
  let quiet = 0;
  let previous = setFooterCalls;
  for (let tick = 0; tick < maxTicks; tick += 1) {
    await sleep(5);
    if (container.textContent.includes(HOST_LOADING_TEXT)) loadingTextSeenDuringLastWait = true;
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

function findModule(titleText) {
  return [...container.querySelectorAll('.drawerModule')]
    .find((el) => el.querySelector('.drawerModule__title')?.textContent.trim().startsWith(titleText)) ?? null;
}

console.log('Service Home "Create Service" regression\n');

console.log("1) Mount ServiceDrawerHost at recordId 'new' and let the initial catalogue fetch settle");
render(h(Harness), container);
let result = await waitToSettle();
check('mount settles within the observation window', result.settled, `ticks=${result.ticks}`);
check('the pending drawer never rendered the host\'s full "Loading service…" replacement', !loadingTextSeenDuringLastWait);
check('a footer was registered on mount', setFooterCalls > 0);
check('the Overview module is editable from the pending state (an Edit button is present)',
  [...container.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Edit'));
const pendingInclusionsModule = findModule('Included Features');
const pendingFaqsModule = findModule('Common Questions');
const pendingInclusionsEdit = [...(pendingInclusionsModule?.querySelectorAll('button') ?? [])]
  .find((button) => button.textContent.trim() === 'Edit');
const pendingFaqsEdit = [...(pendingFaqsModule?.querySelectorAll('button') ?? [])]
  .find((button) => button.textContent.trim() === 'Edit');
check('child editors are locked until Overview Save creates the Service',
  pendingInclusionsEdit?.disabled === true && pendingFaqsEdit?.disabled === true);
const pendingInclusionsPill = pendingInclusionsModule?.querySelector('.cz-module-status-pill');
pendingInclusionsPill?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check('locked child notification directs the user to save Overview first',
  pendingInclusionsModule?.textContent.includes('Save Service Overview before adding included features.'));

console.log('2) Complete Overview and Save — this creates a persisted Pending Service record in place');
clickButtonWithText('Edit');
await sleep(20);
const titleInput = container.querySelector('#cz-service-title');
const descTextarea = container.querySelector('#cz-service-description');
const categorySelect = container.querySelector('#cz-service-category');
check('name/description/category fields are present once the editor is open',
  titleInput != null && descTextarea != null && categorySelect != null);
// The Service's own name is called "Name", never "Title" — the same word the
// Package Family Overview already uses for the same thing.
check('the name field is labelled Name, not Title',
  container.querySelector('label[for="cz-service-title"]')?.textContent.trim() === 'Name',
  container.querySelector('label[for="cz-service-title"]')?.textContent);

titleInput.value = 'Regression Test Service';
titleInput.dispatchEvent(new window.Event('input', { bubbles: true }));
descTextarea.value = 'A pending Service created by the regression harness.';
descTextarea.dispatchEvent(new window.Event('input', { bubbles: true }));
categorySelect.value = String(CATEGORY.id);
categorySelect.dispatchEvent(new window.Event('change', { bubbles: true }));
await sleep(20);

clickButtonWithText('Save');
result = await waitToSettle();
check(
  'Overview Save creates exactly one persisted Pending Service record without settling or activating it',
  result.settled && createServiceCalls === 1 && settleCalls === 0 && activationCalls === 0,
  `settled=${result.settled}, create=${createServiceCalls}, settle=${settleCalls}, activate=${activationCalls}`,
);
check('the typed name is reflected in the rendered Overview', container.textContent.includes('Regression Test Service'));
// CZS is reserved at create, so the Overview reads its permanent identity in
// the same mount — beneath the name it belongs to, never a native post id.
check('the Overview reads the created Service\'s Platform ID under its name',
  findModule('Service Overview')?.textContent.includes(PLATFORM_ID),
  findModule('Service Overview')?.textContent.slice(0, 200));
check('the returned Service id is handed off without a full loading replacement or detail fetch',
  !loadingTextSeenDuringLastWait && detailFetchCalls === 0, `detailFetchCalls=${detailFetchCalls}`);
const overviewModuleAfterSave = findModule('Service Overview');
const overviewPillAfterSave = overviewModuleAfterSave?.querySelector('.cz-module-status-pill');
check('Overview retains a clickable pending-draft notification after Save', overviewPillAfterSave?.tagName === 'BUTTON');
overviewPillAfterSave?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check('Overview pending-draft notification panel stays mounted after identity hand-off', overviewModuleAfterSave?.querySelector('.cz-module-notes') != null);
check('Overview Pending notification states that Service publication is still required',
  overviewModuleAfterSave?.textContent.includes('Waiting for Service publication'));

console.log('3) Inclusions persist before Publish and reject blank labels without closing');
const inclusionsModule = findModule('Included Features');
const inclusionsEdit = [...(inclusionsModule?.querySelectorAll('button') ?? [])]
  .find((button) => button.textContent.trim() === 'Edit');
inclusionsEdit?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
const addInclusion = clickButtonWithText('+ Add inclusion');
await sleep(20);
const inclusionInput = container.querySelector('input[placeholder="Inclusion label"]');
if (inclusionInput) {
  inclusionInput.value = 'Daily automated backups';
  inclusionInput.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButtonWithText('Add');
await sleep(20);
clickButtonWithText('Save');
await waitToSettle();
check('Inclusions accepts nonblank input and persists it before Publish',
  addInclusion != null && inclusionsUpdateCalls === 1 && settleCalls === 0 && serverService.inclusions[0]?.label === 'Daily automated backups',
  `add=${addInclusion != null}, saves=${inclusionsUpdateCalls}, label=${serverService.inclusions[0]?.label}`);
const savedInclusionsModule = findModule('Included Features');
[...(savedInclusionsModule?.querySelectorAll('button') ?? [])].find((button) => button.textContent.trim() === 'Edit')
  ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check('reopening Inclusions shows its saved value before Publish',
  [...container.querySelectorAll('input.cz-tf-input')].some((input) => input.value === 'Daily automated backups'));
const savedInclusionInput = [...container.querySelectorAll('input.cz-tf-input')]
  .find((input) => input.value === 'Daily automated backups');
if (savedInclusionInput) {
  savedInclusionInput.value = '';
  savedInclusionInput.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButtonWithText('Save');
await sleep(20);
check('blank inclusion labels show an inline error and keep the editor open',
  container.textContent.includes('Each inclusion needs a label.') && container.querySelector('input.cz-tf-input') != null && inclusionsUpdateCalls === 1);
clickButtonWithText('Cancel');
await sleep(20);

console.log('4) FAQs persist before Publish and reject blank questions or answers without closing');
const faqsModule = findModule('Common Questions');
const faqsEdit = [...(faqsModule?.querySelectorAll('button') ?? [])]
  .find((button) => button.textContent.trim() === 'Edit');
faqsEdit?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
const addFaq = clickButtonWithText('+ Add FAQ');
await sleep(20);
const faqQuestion = container.querySelector('input[placeholder="Question"]');
const faqAnswer = container.querySelector('textarea[placeholder="Answer (optional)"]');
if (faqQuestion && faqAnswer) {
  faqQuestion.value = 'How often are backups taken?';
  faqQuestion.dispatchEvent(new window.Event('input', { bubbles: true }));
  faqAnswer.value = 'Every 24 hours.';
  faqAnswer.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButtonWithText('Add');
await sleep(20);
clickButtonWithText('Save');
await waitToSettle();
check('FAQs accept complete input and persist it before Publish',
  addFaq != null && faqsUpdateCalls === 1 && settleCalls === 0 && serverService.faqs[0]?.question === 'How often are backups taken?',
  `add=${addFaq != null}, saves=${faqsUpdateCalls}, question=${serverService.faqs[0]?.question}`);
const savedFaqsModule = findModule('Common Questions');
[...(savedFaqsModule?.querySelectorAll('button') ?? [])].find((button) => button.textContent.trim() === 'Edit')
  ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check('reopening FAQs shows its saved values before Publish',
  [...container.querySelectorAll('input[placeholder="Question"]')].some((input) => input.value === 'How often are backups taken?'));
const savedFaqQuestion = container.querySelector('input[placeholder="Question"]');
if (savedFaqQuestion) {
  savedFaqQuestion.value = '';
  savedFaqQuestion.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButtonWithText('Save');
await sleep(20);
check('blank FAQ questions show an inline error and keep the editor open',
  container.textContent.includes('Each FAQ needs a question and an answer.') && container.querySelector('input[placeholder="Question"]') != null && faqsUpdateCalls === 1);
if (savedFaqQuestion) {
  savedFaqQuestion.value = 'How often are backups taken?';
  savedFaqQuestion.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
const savedFaqAnswer = container.querySelector('textarea[placeholder="Answer"]');
if (savedFaqAnswer) {
  savedFaqAnswer.value = '';
  savedFaqAnswer.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButtonWithText('Save');
await sleep(20);
check('blank FAQ answers show an inline error and keep the editor open',
  container.textContent.includes('Each FAQ needs a question and an answer.') && container.querySelector('textarea[placeholder="Answer"]') != null && faqsUpdateCalls === 1);
clickButtonWithText('Cancel');
await sleep(20);

console.log('5) Publish later settles the existing draft and activates it without creating another Service');
check('the persisted Pending Service footer exposes Publish', typeof latestRecordFooter?.props?.onPublish === 'function');
latestRecordFooter?.props?.onPublish();
await sleep(20);
const publishButton = clickButtonWithText('Publish');
check('the Publish confirmation targets the existing Service', publishButton != null);
result = await waitToSettle();
check('Publish settles and activates the existing returned Service id',
  result.settled && settleCalls === 1 && activationCalls === 1 && lifecycleIds[0] === CREATED_ID && lifecycleIds[1] === CREATED_ID);
check('Publish does not create a second Service', createServiceCalls === 1, `createServiceCalls=${createServiceCalls}`);
check('the final record is active and all saved modules are settled',
  serverService.platform_status === 'active' && Object.values(serverService.module_status).every((status) => status === 'settled'));
check('Publish keeps the mounted drawer out of a full loading replacement', !loadingTextSeenDuringLastWait);

check('the retained record footer remains available immediately after hand-off', typeof latestRecordFooter?.props?.onClose === 'function');
latestRecordFooter?.props?.onClose();
check('the retained record footer remains interactive immediately after hand-off', footerCloseCalls === 1);

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — Overview Save creates the Pending Service record, child modules save before Publish, and Publish later settles and activates it.');
process.exit(0);
