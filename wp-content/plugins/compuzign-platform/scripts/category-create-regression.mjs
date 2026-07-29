// Service Home "Create Category" mounted regression.
//
// No component-mounting test framework (vitest/jest/testing-library) exists in
// this repository — every other frontend "contract" here is a source-text
// assertion, not a rendered check. Whether Create Category really opens the
// mature, neutral Category drawer pending, whether inline Save really makes no
// create call, and whether footer Publish really creates the record exactly
// once and keeps the SAME composition mounted through the identity transition
// cannot be proven or disproven that way, so this script mounts the REAL
// CategoryDrawerHost composition — bundled with esbuild (the same technique
// scripts/service-create-regression.mjs and
// scripts/tier-system-footer-loop-regression.mjs already use) — into a real
// DOM via happy-dom and Preact's own render(). Only the network boundary
// (fetch) is faked; hooks, the controller, the composition, and the DOM are
// the actual shipping code.
//
// Usage: npm run regression:category-create
//    or: node scripts/category-create-regression.mjs

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
let createCategoryCalls = 0;
let overviewSaveCalls = 0;
const CREATED_ID = 701;

globalThis.fetch = (url, init = {}) => {
  const path = String(url);
  const method = (init?.method ?? 'GET').toUpperCase();

  if (path.endsWith('/admin/categories') && method === 'GET') {
    return jsonResponse({ categories: [] });
  }
  if (path.endsWith('/admin/services') && method === 'GET') {
    return jsonResponse({ categories: [], stations: [] });
  }
  if (path.endsWith('/admin/service-category-groups') && method === 'GET') {
    return jsonResponse({ category_groups: [] });
  }
  if (path.endsWith('/admin/categories') && method === 'POST') {
    createCategoryCalls += 1;
    const payload = JSON.parse(init.body);
    return jsonResponse({
      success: true,
      category: {
        id: CREATED_ID,
        name: payload.name,
        slug: 'regression-test-category',
        description: payload.description ?? '',
        platform_status: 'disabled',
        previous_platform_status: '',
        module_status: { overview: 'pending' },
        has_draft: true,
        assigned_count: 0,
        group_id: payload.group_id ?? null,
      },
    });
  }
  if (path.includes(`/admin/categories/${CREATED_ID}/overview`) && method === 'PUT') {
    overviewSaveCalls += 1;
    const payload = JSON.parse(init.body);
    return jsonResponse({
      success: true,
      draft: { name: payload.name, description: payload.description ?? '' },
      module_status: { overview: 'pending' },
    });
  }
  return Promise.reject(new Error(`Unexpected fetch in regression harness: ${method} ${path}`));

  function jsonResponse(body) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  }
};

// ── Bundle the REAL composition ─────────────────────────────────────────
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
const { useState, useMemo, useRef } = await import('preact/hooks');

// ── Harness ──────────────────────────────────────────────────────────────
let setFooterCalls = 0;
let onSavedCalls = 0;
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
  const onSaved = useMemo(() => () => { onSavedCalls += 1; }, []);
  const setCloseGuard = useMemo(() => () => {}, []);

  return h(CategoryDrawerHost, {
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

const HOST_LOADING_TEXT = 'Loading Category';
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

console.log('Service Home "Create Category" regression\n');

console.log("1) Mount CategoryDrawerHost at recordId 'new' and let the initial fetches settle");
render(h(Harness), container);
let result = await waitToSettle();
check('mount settles within the observation window', result.settled, `ticks=${result.ticks}`);
check('the pending drawer never rendered the host\'s full "Loading Category…" replacement', !loadingTextSeenDuringLastWait);
check('a footer was registered on mount', setFooterCalls > 0);
check('the Overview module is editable from the pending state (an Edit button is present)',
  [...container.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Edit'));

console.log('2) Fill the Overview draft through a real DOM edit session (Edit → type → Save)');
clickButtonWithText('Edit');
await sleep(20);
const nameInput = container.querySelector('#cz-category-name');
check('the name field is present once the editor is open', nameInput != null);
nameInput.value = 'Regression Test Category';
nameInput.dispatchEvent(new window.Event('input', { bubbles: true }));
await sleep(20);

clickButtonWithText('Save');
result = await waitToSettle();
check(
  'inline Save (local draft commit) settles and makes no create request',
  result.settled && createCategoryCalls === 0,
  `settled=${result.settled}, createCategoryCalls=${createCategoryCalls}`,
);
check('the typed name is reflected in the rendered Overview', container.textContent.includes('Regression Test Category'));

console.log('3) Invoke Publish, then confirm Create in the real dialog');
check('captured footer exposes onPublish', typeof lastFooter?.props?.onPublish === 'function');
lastFooter.props.onPublish();
await sleep(20);
const createButton = clickButtonWithText('Create');
check('the publish-confirm dialog rendered a "Create" action for the pending record', createButton != null);
result = await waitToSettle();
check('publish settles within the observation window', result.settled, `ticks=${result.ticks}`);
check(
  'CategoryDrawerHost never fell back to its full "Loading Category…" state during Publish',
  !loadingTextSeenDuringLastWait,
);
check('createCategory called exactly once', createCategoryCalls === 1, `createCategoryCalls=${createCategoryCalls}`);
check('the created Category name is still rendered after Publish (same mounted composition, real id)',
  container.textContent.includes('Regression Test Category'));

console.log('4) A second inline Save now routes through the real update endpoint (proves the real id is active)');
clickButtonWithText('Edit');
await sleep(20);
const nameInputAfter = container.querySelector('#cz-category-name');
check('the Overview editor reopens against the persisted record', nameInputAfter != null);
if (nameInputAfter) {
  nameInputAfter.value = 'Regression Test Category (updated)';
  nameInputAfter.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(20);
}
clickButtonWithText('Save');
result = await waitToSettle();
check(
  'the post-creation Save calls the real per-id overview endpoint exactly once',
  overviewSaveCalls === 1,
  `overviewSaveCalls=${overviewSaveCalls}`,
);

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — Create Category opens the mature drawer pending, inline Save stays local, and Publish creates exactly once in place.');
process.exit(0);
