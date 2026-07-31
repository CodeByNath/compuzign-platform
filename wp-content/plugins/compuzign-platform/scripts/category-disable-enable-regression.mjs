// Category Disable/Enable mounted regression — the Category mirror of
// scripts/service-disable-enable-regression.mjs.
//
// Category's Disable/Enable used to be a direct, unmasked platform_status
// toggle (Enable jumped straight to 'active', identical to Service's own
// pre-fix defect): every module pill flips correctly to Disabled, but Enable
// silently republished the Category with no review step. Enable must land the
// Category on Pending — not Active, and not functionally stuck Disabled
// either: every permitted action (Edit/Save Overview, Publish, Disable again,
// Archive, Trash) must actually be reachable from that state, not just a
// relabelled pill. This mounts the REAL split-action footer (CanonicalEntityFooter,
// via CategoryDrawerFooter) and drives a real Overview edit+save cycle after
// Enable — the same proof technique the Service regression uses.
//
// Usage: npm run regression:category-disable-enable
//    or: node scripts/category-disable-enable-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-category-disable-enable-bundle.mjs');
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
const CATEGORY_ID = 801;

const server = {
  name: 'Existing Published Category',
  description: 'A settled description.',
  platform_status: 'active',
  previous_platform_status: '',
  module_status: { overview: 'settled' },
  has_draft: false,
};

let statusCalls = 0;
let lastStatusPayload = null;
let lastStatusResponseModuleStatus = null;
let overviewSaveCalls = 0;

function jsonResponse(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) });
}
function categoryPayload() {
  return {
    id: CATEGORY_ID, name: server.name, slug: 'existing-published-category', description: server.description,
    platform_status: server.platform_status, previous_platform_status: server.previous_platform_status,
    module_status: server.module_status, has_draft: server.has_draft, assigned_count: 0,
  };
}

globalThis.fetch = (url, init = {}) => {
  const path = String(url);
  const method = (init?.method ?? 'GET').toUpperCase();

  if (path.endsWith('/admin/categories') && method === 'GET') {
    return jsonResponse({ categories: [categoryPayload()] });
  }
  if (path.endsWith('/admin/services') && method === 'GET') {
    return jsonResponse({ categories: [], stations: [] });
  }
  if (path.includes(`/admin/categories/${CATEGORY_ID}/overview`) && method === 'PUT') {
    overviewSaveCalls += 1;
    const payload = JSON.parse(init.body);
    server.name = payload.name;
    server.description = payload.description ?? '';
    server.has_draft = true;
    server.module_status = { overview: 'pending' };
    return jsonResponse({ success: true, draft: { name: server.name, description: server.description }, module_status: server.module_status });
  }
  if (path.includes(`/admin/categories/${CATEGORY_ID}/status`) && method === 'PATCH') {
    statusCalls += 1;
    const payload = JSON.parse(init.body ?? '{}');
    lastStatusPayload = payload;
    // The real backend contract (AdminCategoriesController::updateDisabledMask):
    // Disable never touches module_status; Enable always lands on 'disabled'
    // with the mask cleared — it never republishes on its own — also never
    // touching module_status. This mock reproduces that contract so the test
    // proves the FRONTEND wiring, not a reimplementation of the backend rule
    // (the backend rule itself is proven in tests/category-lifecycle-mask.php).
    if (payload.action === 'disable') {
      if (server.platform_status === 'active' || server.previous_platform_status === '') {
        server.previous_platform_status = server.platform_status;
      }
      server.platform_status = 'disabled';
    } else if (payload.action === 'enable') {
      server.platform_status = 'disabled';
      server.previous_platform_status = '';
    } else if (payload.platform_status) {
      server.platform_status = payload.platform_status;
    } else {
      return Promise.reject(new Error(`Unexpected /status payload in regression harness: ${init.body}`));
    }
    lastStatusResponseModuleStatus = { ...server.module_status };
    return jsonResponse({ success: true, category: categoryPayload() });
  }
  return Promise.reject(new Error(`Unexpected fetch in regression harness: ${method} ${path}`));
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

  return h(CategoryDrawerHost, { recordId: CATEGORY_ID, mode: 'view', onClose, onModeChange, onSaved, setFooter, setCloseGuard });
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
  let quiet = 0, previous = setFooterCalls;
  for (let tick = 0; tick < maxTicks; tick += 1) {
    await sleep(5);
    if (setFooterCalls === previous) { quiet += 1; if (quiet >= quietTicksNeeded) return; } else { quiet = 0; previous = setFooterCalls; }
  }
}

const failures = [];
function check(label, cond, detail) {
  if (cond) console.log(`  ok — ${label}`);
  else { console.error(`  FAIL — ${label}${detail ? `: ${detail}` : ''}`); failures.push(label); }
}

function clickButtonWithText(text, root = container) {
  const btn = [...root.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return btn;
}

function pillLabel() {
  return container.querySelector('.cz-module-status-pill')?.textContent.trim();
}

console.log('Category Disable/Enable regression\n');

console.log('1) Mount an already-published, already-settled Category');
render(h(Harness), container);
await waitToSettle();
check('a footer was registered on mount', setFooterCalls > 0);

let footerDom = renderFooterDom();
check('the real rendered split button reads "Disable" while the Category is active', footerDom.querySelector('.cz-footer-split__btn')?.textContent.trim() === 'Disable', footerDom.querySelector('.cz-footer-split__btn')?.textContent);
check('Overview pill reads Active before Disable', pillLabel() === 'Active', pillLabel());

console.log('\n2) Disable — the pill must read Disabled');
lastFooter.props.onToggleActive();
await waitToSettle();
check('the status endpoint was called once for Disable', statusCalls === 1, `statusCalls=${statusCalls}`);
check('the Disable request carried action=disable', lastStatusPayload?.action === 'disable', JSON.stringify(lastStatusPayload));
check('Overview pill reads Disabled after Disable', pillLabel() === 'Disabled', pillLabel());

footerDom = renderFooterDom();
check('the real rendered split button now reads "Enable"', footerDom.querySelector('.cz-footer-split__btn')?.textContent.trim() === 'Enable', footerDom.querySelector('.cz-footer-split__btn')?.textContent);
check('isDisabledMasked is true right after Disable', lastFooter?.props?.isDisabledMasked === true);

console.log('\n3) Enable — the exact post-Enable state, audited directly');
lastFooter.props.onToggleActive();
await waitToSettle();
check('the status endpoint was called a second time for Enable', statusCalls === 2, `statusCalls=${statusCalls}`);
check('the Enable request carried action=enable', lastStatusPayload?.action === 'enable', JSON.stringify(lastStatusPayload));

console.log(`     platform_status          = ${server.platform_status}`);
console.log(`     previous_platform_status = "${server.previous_platform_status}"`);
console.log(`     module_status.overview   = ${server.module_status.overview}`);

check('platform_status is disabled — Enable never activates on its own', server.platform_status === 'disabled', server.platform_status);
check('previous_platform_status is cleared — the mask is lifted', server.previous_platform_status === '', `"${server.previous_platform_status}"`);
check('isDisabledMasked is now false — the record is functionally Pending, not Disabled', lastFooter?.props?.isDisabledMasked === false);
check(
  'Enable itself did not settle or publish anything — the response module_status is byte-identical to the pre-Enable settled value',
  JSON.stringify(lastStatusResponseModuleStatus) === JSON.stringify({ overview: 'settled' }),
  JSON.stringify(lastStatusResponseModuleStatus),
);
check('Overview pill reads Pending after Enable — not Active, not Disabled', pillLabel() === 'Pending', pillLabel());

console.log('\n4) Action availability after Enable — every permitted footer action must actually be reachable');
footerDom = renderFooterDom();
check('the real rendered split button now reads "Disable" again — NOT a no-op "Enable"', footerDom.querySelector('.cz-footer-split__btn')?.textContent.trim() === 'Disable', footerDom.querySelector('.cz-footer-split__btn')?.textContent);
check('the split button tone is danger, matching every other Disable action', footerDom.querySelector('.cz-footer-split')?.className.includes('cz-footer-split--danger'));
check('Publish is present and enabled — Publish remains available', (() => {
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
check('Archive is present and enabled — the Category has been published before', archiveItem != null && !archiveItem.disabled, archiveItem?.outerHTML);
check('Move to Trash is present and enabled', trashItem != null && !trashItem.disabled, trashItem?.outerHTML);

console.log('\n5) Overview Edit opens after Enable, and a Save is not blocked or lost');
const editBtn = clickButtonWithText('Edit');
check('an Edit action is present on the Overview module after Enable', editBtn != null);
await sleep(20);
const nameInput = container.querySelector('#cz-category-name');
check('the Overview editor opened with the settled name', nameInput?.value === 'Existing Published Category', nameInput?.value);
if (nameInput) {
  nameInput.value = 'Existing Published Category (edited after Enable)';
  nameInput.dispatchEvent(new window.Event('input', { bubbles: true }));
}
await sleep(20);
clickButtonWithText('Save');
await waitToSettle();
check('Overview Save after Enable succeeded — reflected server-side, not lost', server.name === 'Existing Published Category (edited after Enable)', server.name);
check('overview save endpoint was called exactly once', overviewSaveCalls === 1, `overviewSaveCalls=${overviewSaveCalls}`);
check('Overview pill stays Pending after this Save, not Active — only Publish activates', pillLabel() === 'Pending', pillLabel());

console.log('\n6) Disable is genuinely available again — click the real rendered button, not a mocked prop');
footerDom = renderFooterDom();
const realDisableBtn = footerDom.querySelector('.cz-footer-split__btn');
check('the real button now reads "Disable"', realDisableBtn?.textContent.trim() === 'Disable', realDisableBtn?.textContent);
realDisableBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await waitToSettle();
check('the status endpoint was called a third time', statusCalls === 3, `statusCalls=${statusCalls}`);
check('this click sent action=disable, not action=enable — the fixed decision is not "isActive"-based', lastStatusPayload?.action === 'disable', JSON.stringify(lastStatusPayload));
check('the Overview pill reads Disabled again after this second Disable', pillLabel() === 'Disabled', pillLabel());

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — Disable masks the Category as Disabled; Enable lands it on Pending with every permitted action (Edit/Save, Publish, Disable, Archive, Trash) genuinely available, not just a relabelled pill.');
process.exit(0);
