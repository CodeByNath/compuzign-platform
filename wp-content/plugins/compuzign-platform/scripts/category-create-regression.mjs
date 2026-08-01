// Category pending-draft lifecycle mounted regression.
//
// Mounts the real CategoryDrawerHost with Preact and happy-dom. Only fetch is
// faked: the station, controller, footer, notification rules, and editors are
// the shipping code. It locks the contract that Overview Save creates the
// persisted Pending record in place; Publish is later settlement + activation.

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-category-create-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

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

let createCalls = 0;
let overviewSaveCalls = 0;
let settleCalls = 0;
let activateCalls = 0;
let disableCalls = 0;
let enableCalls = 0;
const lifecycleIds = [];
const CREATED_ID = 701;
let serverCategory = null;

function response(body) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function categoryResponse() {
  return { ...serverCategory, module_status: { ...serverCategory.module_status } };
}

globalThis.fetch = (url, init = {}) => {
  const path = String(url);
  const method = (init.method ?? 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : {};

  if (path.endsWith('/admin/categories') && method === 'GET') return response({ categories: [] });
  if (path.endsWith('/admin/services') && method === 'GET') return response({ categories: [], stations: [] });

  if (path.endsWith('/admin/categories') && method === 'POST') {
    createCalls += 1;
    serverCategory = {
      id: CREATED_ID,
      name: body.name,
      slug: 'regression-category',
      description: body.description ?? '',
      platform_status: 'disabled',
      previous_platform_status: '',
      module_status: { overview: 'pending' },
      has_draft: true,
      assigned_count: 0,
    };
    return response({ success: true, category: categoryResponse() });
  }

  if (path.endsWith(`/admin/categories/${CREATED_ID}/overview`) && method === 'PUT') {
    overviewSaveCalls += 1;
    serverCategory.name = body.name;
    serverCategory.description = body.description ?? '';
    serverCategory.has_draft = true;
    serverCategory.module_status = { overview: 'pending' };
    return response({
      success: true,
      draft: { name: serverCategory.name, description: serverCategory.description },
      module_status: { ...serverCategory.module_status },
    });
  }

  if (path.endsWith(`/admin/categories/${CREATED_ID}/overview/settle`) && method === 'POST') {
    settleCalls += 1;
    lifecycleIds.push(CREATED_ID);
    serverCategory.has_draft = false;
    serverCategory.module_status = { overview: 'settled' };
    return response({ success: true, category: categoryResponse() });
  }

  if (path.endsWith(`/admin/categories/${CREATED_ID}/status`) && method === 'PATCH') {
    lifecycleIds.push(CREATED_ID);
    if (body.platform_status === 'active') {
      activateCalls += 1;
      serverCategory.platform_status = 'active';
      serverCategory.previous_platform_status = '';
    } else if (body.action === 'disable') {
      disableCalls += 1;
      serverCategory.platform_status = 'disabled';
      serverCategory.previous_platform_status = 'active';
    } else if (body.action === 'enable') {
      enableCalls += 1;
      serverCategory.platform_status = 'disabled';
      serverCategory.previous_platform_status = '';
    } else {
      return Promise.reject(new Error(`Unexpected Category status payload: ${JSON.stringify(body)}`));
    }
    return response({ success: true, category: categoryResponse() });
  }

  return Promise.reject(new Error(`Unexpected fetch in Category regression: ${method} ${path}`));
};

await build({
  entryPoints: [resolve(root, 'resources/ts/admin-station/stations/serviceCategory/CategoryDrawerHost.tsx')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  logLevel: 'silent',
});

const { CategoryDrawerHost } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');
const { useMemo, useRef, useState } = await import('preact/hooks');

let setFooterCalls = 0;
let latestFooter = null;

function Harness() {
  const [, setFooterState] = useState(null);
  const setFooterRef = useRef(setFooterState);
  setFooterRef.current = setFooterState;
  const setFooter = useMemo(() => (footer) => {
    setFooterCalls += 1;
    if (footer) latestFooter = footer;
    setFooterRef.current(footer);
  }, []);
  const noop = useMemo(() => () => {}, []);
  return h(CategoryDrawerHost, {
    recordId: 'new', mode: 'view', onClose: noop, onModeChange: noop,
    onSaved: noop, setFooter, setCloseGuard: noop,
  });
}

const container = document.createElement('div');
document.body.appendChild(container);
const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
const HOST_LOADING_TEXT = 'Loading Category';
let loadingSeen = false;

async function settle(maxTicks = 400, quietTicks = 15) {
  loadingSeen = false;
  let quiet = 0;
  let previous = setFooterCalls;
  for (let tick = 0; tick < maxTicks; tick += 1) {
    await sleep(5);
    if (container.textContent.includes(HOST_LOADING_TEXT)) loadingSeen = true;
    if (setFooterCalls === previous) {
      quiet += 1;
      if (quiet >= quietTicks) return true;
    } else {
      quiet = 0;
      previous = setFooterCalls;
    }
  }
  return false;
}

const failures = [];
function check(label, condition, detail = '') {
  if (condition) console.log(`  ok — ${label}`);
  else {
    console.error(`  FAIL — ${label}${detail ? `: ${detail}` : ''}`);
    failures.push(label);
  }
}
function clickButton(text) {
  const button = [...container.querySelectorAll('button')].find((item) => item.textContent.trim() === text);
  button?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return button;
}
function overviewModule() {
  return [...container.querySelectorAll('.drawerModule')]
    .find((item) => item.querySelector('.drawerModule__title')?.textContent.trim() === 'Category Overview') ?? null;
}
function overviewPillText() {
  return overviewModule()?.querySelector('.cz-module-status-pill')?.textContent.trim() ?? '';
}
function overviewIsDim() {
  return overviewModule()?.querySelector('.drawerModule__status')?.classList.contains('drawerModule__status--dim') ?? false;
}
function modulePillTexts() {
  return [...container.querySelectorAll('.cz-module-status-pill')].map((pill) => pill.textContent.trim());
}
async function revealOverviewNote(note) {
  if (container.textContent.includes(note)) return;
  overviewModule()?.querySelector('.cz-module-status-pill')?.dispatchEvent(
    new window.MouseEvent('click', { bubbles: true }),
  );
  await sleep(10);
}

console.log('Category pending-draft lifecycle regression\n');

console.log('1) Open the real new-Category drawer');
render(h(Harness), container);
check('mount settles', await settle());
check('new Overview starts dim Pending', overviewPillText() === 'Pending', overviewPillText());
check('new Overview has the dim Pending treatment', overviewIsDim());
await revealOverviewNote('Edit and name this category.');
check('new Overview explains that it needs a name', container.textContent.includes('Edit and name this category.'));
check('new drawer is not replaced by a loading mask', !loadingSeen);

console.log('2) Save a complete Overview; this creates the persisted Pending Category');
clickButton('Edit');
await sleep(10);
const nameInput = container.querySelector('#cz-category-name');
const descriptionInput = container.querySelector('#cz-category-description');
check('Overview editor opened', nameInput !== null && descriptionInput !== null);
if (nameInput) {
  nameInput.value = 'Networking';
  nameInput.dispatchEvent(new window.Event('input', { bubbles: true }));
}
if (descriptionInput) {
  descriptionInput.value = 'Network design and support.';
  descriptionInput.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButton('Save');
check('Overview Save settles', await settle());
check('Overview Save creates exactly one Category', createCalls === 1, `createCalls=${createCalls}`);
check('Overview Save does not settle before Publish', settleCalls === 0, `settleCalls=${settleCalls}`);
check('Overview Save does not activate before Publish', activateCalls === 0, `activateCalls=${activateCalls}`);
check('the returned identity remains in the same mounted drawer', container.textContent.includes('Networking'));
check('the hand-off does not substitute the loading mask', !loadingSeen);
check('saved Overview is full Pending', overviewPillText() === 'Pending', overviewPillText());
check('saved Overview no longer uses the dim Pending treatment', !overviewIsDim());
await revealOverviewNote('Waiting for Category publication');
check('saved Overview keeps the publication notification', container.textContent.includes('Waiting for Category publication'));
check('the footer now offers Publish for the persisted record', typeof latestFooter?.props?.onPublish === 'function');

console.log('3) Publish settles the existing returned ID and activates it');
latestFooter.props.onPublish();
await sleep(10);
const publishButton = clickButton('Publish');
check('Publish confirmation is Publish, never Create', publishButton !== null);
check('Publish settles', await settle());
check('Publish did not create a second Category', createCalls === 1, `createCalls=${createCalls}`);
check('Publish settled Overview once', settleCalls === 1, `settleCalls=${settleCalls}`);
check('Publish activated once', activateCalls === 1, `activateCalls=${activateCalls}`);
check('all Publish lifecycle requests use the returned ID', lifecycleIds.every((id) => id === CREATED_ID), JSON.stringify(lifecycleIds));
check('published Overview is Active', overviewPillText() === 'Active', overviewPillText());

console.log('4) Disable masks every Category module; Enable restores Pending without publishing');
latestFooter.props.onToggleActive();
check('Disable settles', await settle());
check('Disable uses the explicit mask action', disableCalls === 1, `disableCalls=${disableCalls}`);
check('Disabled Overview uses the Disabled pill', overviewPillText() === 'Disabled', overviewPillText());
check('Disable masks every Category module pill', modulePillTexts().every((text) => text === 'Disabled'), modulePillTexts().join(', '));
await revealOverviewNote('Category is disabled');
check('Disabled Overview explains the explicit state', container.textContent.includes('Category is disabled'));
check('footer marks the explicit disabled mask', latestFooter.props.isDisabledMasked === true);

latestFooter.props.onToggleActive();
check('Enable settles', await settle());
check('Enable clears only the explicit mask', enableCalls === 1, `enableCalls=${enableCalls}`);
check('Enable did not settle or activate', settleCalls === 1 && activateCalls === 1, `settle=${settleCalls}, active=${activateCalls}`);
check('enabled Category returns to full Pending', overviewPillText() === 'Pending', overviewPillText());
await revealOverviewNote('Waiting for Category publication');
check('enabled Category again waits for publication', container.textContent.includes('Waiting for Category publication'));
check('footer no longer treats the unmasked Pending record as disabled', latestFooter.props.isDisabledMasked === false);

console.log('5) Clearing Description is an authoritative empty save, not stale text');
clickButton('Edit');
await sleep(10);
const descriptionAfterEnable = container.querySelector('#cz-category-description');
check('Overview editor reopens after Enable', descriptionAfterEnable !== null);
if (descriptionAfterEnable) {
  descriptionAfterEnable.value = '';
  descriptionAfterEnable.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButton('Save');
check('description clear Save settles', await settle());
check('the persisted Overview endpoint receives the clear', overviewSaveCalls === 1, `overviewSaveCalls=${overviewSaveCalls}`);
clickButton('Edit');
await sleep(10);
const reopenedDescription = container.querySelector('#cz-category-description');
check('reopened Description is empty, not stale Networking text', reopenedDescription?.value === '', `value=${reopenedDescription?.value}`);
clickButton('Cancel');
await sleep(10);

console.log('6) Publish again settles the saved empty Description and reactivates without creation');
latestFooter.props.onPublish();
await sleep(10);
clickButton('Publish');
check('republish settles', await settle());
check('republish still creates no second Category', createCalls === 1, `createCalls=${createCalls}`);
check('republish settles the saved draft and activates', settleCalls === 2 && activateCalls === 2, `settle=${settleCalls}, active=${activateCalls}`);
check('server-side response retains the cleared Description', serverCategory.description === '', `description=${serverCategory.description}`);

if (failures.length > 0) {
  console.error(`\nREGRESSION FAILED — ${failures.length} check(s):`);
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}
console.log('\nAll Category pending-draft lifecycle checks passed.');
