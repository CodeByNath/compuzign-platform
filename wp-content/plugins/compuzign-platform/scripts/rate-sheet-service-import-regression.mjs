// Rate Sheet "+ Add Service" picker — mounted regression.
//
// Mounts the REAL RateSheetDrawerContent (esbuild + happy-dom + Preact
// render, same technique as scripts/rate-sheet-row-lock-regression.mjs)
// against a fixture Package Manager, and proves the unified Service Import
// picker (RateSheetServiceImportPicker.tsx) end to end — the browse/connect/
// stage/Publish flow that replaced the old "Add Source Service" + "Add Row"
// pickers:
//
//   - Column 1/2: selecting a category chip narrows Column 2's Service chips
//     to Services carrying that category; deselecting restores the full list;
//   - selecting an ALREADY-connected Service's chip shows its inclusions with
//     no API request — Column 3 never re-connects a Service that's already a
//     source;
//   - selecting a NOT-yet-connected Service's chip connects it immediately
//     through the SAME full-manager save `connectServices` always used (one
//     request), after which its inclusions appear too;
//   - an inclusion already a row in the sheet is never offered again;
//   - Column 3 chips multi-select (toggle on shows "×", toggle off clears
//     it); Import moves the selection into a local staging list and makes NO
//     API request;
//   - the staging list's Unit Price/Per/Qty/Group are locally editable (Per/
//     Group can create new vocabulary) with no API request per edit;
//   - Back returns to the browse columns WITHOUT discarding already-staged
//     entries, so a second Import appends to the same staging list rather
//     than replacing it;
//   - Close with staged, unpublished entries confirms before discarding;
//     declining keeps the picker (and its staging list) open, accepting
//     closes it with no API request — staging was always local;
//   - Publish appends every staged entry as a curated row and persists
//     through exactly one full-manager save, carrying each row's own
//     curated unit_price/per/quantity/group_id, then locks the resulting
//     rows in the normal grid exactly like any other successful row Save.
//
// The row-lock's own Edit/Save/Cancel/Remove/Delete lifecycle and the Price
// Options tab editor are proven separately in
// scripts/rate-sheet-row-lock-regression.mjs; this file is scoped to the
// picker itself.
//
// Usage: npm run regression:rate-sheet-service-import
//    or: node scripts/rate-sheet-service-import-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-rate-sheet-service-import-bundle.mjs');
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

let confirmReturnValue = true;
let confirmCalls = 0;
let lastConfirmMessage = null;
window.confirm = (message) => { confirmCalls += 1; lastConfirmMessage = message; return confirmReturnValue; };

window.CompuZignConfig = { apiRoot: 'https://cz-test.local/wp-json/', nonce: 'test-nonce' };

// ── Fixture server state ────────────────────────────────────────────────
const SERVICE_ID = 501;
const BUILT_IN_UNITS = ['Per VM', 'Per GB', 'Per TB', 'Per vCPU', 'Per user', 'Per month', 'Per item'];

// useHostService() resolves its host from this SAME catalog's `stations[0]`
// fallback (no surface-package preference is mocked below), so the host
// (SERVICE_ID) stays first. Alpha (20) starts connected; Beta (21) and Gamma
// (22) do not — Gamma shares Alpha's category so the category filter proves
// it narrows by category, not by connection state.
const SERVICE_CATALOG = [
  { id: SERVICE_ID, title: 'Test Service', categories: [] },
  { id: 20, title: 'Alpha Co', categories: [{ id: 1, name: 'Compute', slug: 'compute' }] },
  { id: 21, title: 'Beta Co', categories: [{ id: 2, name: 'Storage', slug: 'storage' }] },
  { id: 22, title: 'Gamma Co', categories: [{ id: 1, name: 'Compute', slug: 'compute' }] },
];
const INCLUSION_POOL_BY_SERVICE = {
  20: [
    { item_id: 'mgr_alpha0', source_id: 'alpha-0', label: 'Alpha Already Row' },
    { item_id: 'mgr_alpha1', source_id: 'alpha-1', label: 'Alpha Item 1' },
  ],
  21: [{ item_id: 'mgr_beta1', source_id: 'beta-1', label: 'Beta Item 1' }],
  22: [{ item_id: 'mgr_gamma1', source_id: 'gamma-1', label: 'Gamma Item 1' }],
};

function itemsForSources(sources) {
  const connectedIds = sources
    .filter((source) => source.provider_key === 'service' && source.entity_type === 'service')
    .map((source) => source.entity_id);
  const items = [];
  let sortOrder = 0;
  for (const serviceId of connectedIds) {
    const title = SERVICE_CATALOG.find((service) => service.id === serviceId)?.title ?? null;
    for (const pool of INCLUSION_POOL_BY_SERVICE[serviceId] ?? []) {
      items.push({
        item_id: pool.item_id, source_type: 'inclusion', source_id: pool.source_id,
        resolved: { label: pool.label }, decorated_label: null, group_id: null, sort_order: sortOrder++,
        disabled: false, missing: false, module_transition: 'settled',
        source_service_id: serviceId, source_service_title: title,
      });
    }
  }
  return items;
}

function baseManager() {
  const sources = [
    { relationship_id: 'source_service_20', provider_key: 'service', entity_type: 'service', entity_id: 20, sort_order: 0, category_group_id: null },
  ];
  return {
    service_id: SERVICE_ID,
    platform_status: 'active',
    has_configuration: true,
    sources,
    groups: [],
    category_groups: [],
    items: itemsForSources(sources),
    rate_sheets: [{
      rate_sheet_id: 'rs_1',
      title: 'Primary Sheet',
      status: 'active',
      groups: [],
      items: [
        { item_id: 'rate_alpha0', source_item_id: 'mgr_alpha0', unit_price: 5, per: 'Per item', quantity: 1, group_id: null, sort_order: 0, price_options: [] },
      ],
    }],
    rate_sheet_units: [...BUILT_IN_UNITS],
    projections: { inclusions: [], faqs: [] },
  };
}

let server = { manager: baseManager() };
let saveCalls = 0;
let lastSavePayload = null;

function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
function jsonResponse(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) });
}
function mintItemId(sourceItemId) { return `rate_minted_${sourceItemId}`; }
let sheetSeq = 0;
function mintSheetId() { sheetSeq += 1; return `rs_minted_${sheetSeq}`; }
let optionSeq = 0;
function mintOptionId() { optionSeq += 1; return `opt_minted_${optionSeq}`; }

function applySave(payload) {
  const manager = deepClone(server.manager);
  manager.sources = payload.sources;
  manager.items = itemsForSources(manager.sources);
  manager.groups = payload.groups;
  for (const submitted of payload.rate_sheets) {
    const id = submitted.rate_sheet_id !== '' ? submitted.rate_sheet_id : mintSheetId();
    const items = submitted.items.map((item) => ({
      ...item,
      item_id: item.item_id !== '' ? item.item_id : mintItemId(item.source_item_id),
      price_options: (item.price_options ?? []).map((option) => ({
        ...option,
        option_id: option.option_id !== '' ? option.option_id : mintOptionId(),
      })),
    }));
    const stored = { ...submitted, rate_sheet_id: id, items };
    const existingIndex = manager.rate_sheets.findIndex((sheet) => sheet.rate_sheet_id === id);
    if (existingIndex >= 0) manager.rate_sheets[existingIndex] = stored;
    else manager.rate_sheets.push(stored);
  }
  manager.rate_sheets = manager.rate_sheets.filter((sheet) => !payload.rate_sheet_deletions.includes(sheet.rate_sheet_id));
  if (payload.rate_sheet_units !== undefined) {
    manager.rate_sheet_units = [...new Set([...BUILT_IN_UNITS, ...payload.rate_sheet_units])];
  }
  server.manager = manager;
}

globalThis.fetch = (url, init = {}) => {
  const path = String(url);
  const method = (init?.method ?? 'GET').toUpperCase();

  if (path.endsWith('admin/services') && method === 'GET') {
    return jsonResponse({
      categories: [],
      stations: SERVICE_CATALOG.map((service) => ({
        id: service.id, platform_id: `CZS${service.id}`, title: service.title, slug: service.title.toLowerCase().replace(/\s+/g, '-'),
        categories: service.categories, platform_status: 'active',
        module_status: { overview: 'settled', inclusions: 'settled', faqs: 'settled' }, has_drafts: false,
      })),
    });
  }
  if (path.endsWith('admin/surface-packages') && method === 'GET') {
    return jsonResponse({ success: true, total: 0, packages: [] });
  }
  if (path.endsWith(`admin/services/${SERVICE_ID}/package-station/manager`) && method === 'GET') {
    return jsonResponse({ success: true, manager: server.manager });
  }
  if (path.endsWith(`admin/services/${SERVICE_ID}/package-station/manager`) && method === 'POST') {
    saveCalls += 1;
    const payload = JSON.parse(init.body ?? '{}');
    lastSavePayload = payload;
    applySave(payload);
    return jsonResponse({ success: true, manager: server.manager });
  }

  return Promise.reject(new Error(`Unexpected fetch in regression harness: ${method} ${path}`));
};

// ── Bundle the REAL composition ─────────────────────────────────────────
await build({
  entryPoints: [resolve(root, 'resources/ts/package-station/presentation/rate-sheet-tool/RateSheetTool.tsx')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  logLevel: 'silent',
});

const { RateSheetDrawerContent } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');
const { useState } = await import('preact/hooks');

// ── Harness ──────────────────────────────────────────────────────────────
function Harness({ recordId, mode }) {
  const [currentMode, setCurrentMode] = useState(mode);
  return h(RateSheetDrawerContent, {
    recordId,
    mode: currentMode,
    onClose: () => {},
    onModeChange: (next) => setCurrentMode(next),
    onSaved: () => {},
    setFooter: () => {},
    setCloseGuard: () => {},
  });
}

const container = document.createElement('div');
document.body.appendChild(container);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function settle(ticks = 30) { for (let i = 0; i < ticks; i += 1) await sleep(5); }

const failures = [];
function check(label, cond, detail) {
  if (cond) { console.log(`  ok — ${label}`); }
  else { console.error(`  FAIL — ${label}${detail !== undefined ? `: ${detail}` : ''}`); failures.push(label); }
}

function click(btn) { btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }
function setInputValue(input, value) {
  input.value = String(value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}
function rowsIn() {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__grid tbody tr')]
    .filter((tr) => tr.closest('.cz-rate-sheet-tool__import') === null);
}
function rowByLabel(label) { return rowsIn().find((tr) => tr.textContent.includes(label)) ?? null; }
function addServiceToggleButton() {
  return [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === '+ Add Service' || b.textContent.trim() === 'Close');
}
async function openAddService() {
  const btn = addServiceToggleButton();
  if (btn && btn.textContent.trim() === '+ Add Service') { click(btn); await settle(); }
}
function chip(labelSubstring) {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__import-chip')].find((b) => b.textContent.includes(labelSubstring)) ?? null;
}
function chipActive(labelSubstring) { return chip(labelSubstring)?.classList.contains('cz-rate-sheet-tool__import-chip--active') ?? false; }
function importActionButton(text) {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__import-actions button')].find((b) => b.textContent.trim().startsWith(text)) ?? null;
}
function importHeadButton(text) {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__import-head button')].find((b) => b.textContent.trim() === text) ?? null;
}
function stagingRows() { return [...container.querySelectorAll('.cz-rate-sheet-tool__import .cz-rate-sheet-tool__grid tbody tr')]; }
function stagingRowByLabel(label) { return stagingRows().find((tr) => tr.textContent.includes(label)) ?? null; }
function priceInputIn(row) { return row?.querySelector('input[type="number"]') ?? null; }
function pickerOpen() { return container.querySelector('.cz-rate-sheet-tool__import') != null; }
function stagingPhase() { return container.querySelector('.cz-rate-sheet-tool__import .cz-rate-sheet-tool__grid') != null; }

async function remount() {
  render(null, container);
  server = { manager: baseManager() };
  saveCalls = 0; lastSavePayload = null;
  confirmCalls = 0; lastConfirmMessage = null; confirmReturnValue = true;
  optionSeq = 0; sheetSeq = 0;
  render(h(Harness, { recordId: 'rs_1', mode: 'edit' }), container);
  await settle();
}

console.log('Rate Sheet Service Import picker regression\n');

// ── A) Category filter, connect-on-select, multi-batch staging, Close-confirm-discard ──
console.log('A) Category filter, connect-on-select, multi-batch staging, and Close-confirm-discard');
await remount();
await openAddService();
check('the picker is open', pickerOpen());
check('Alpha Already Row is not offered — it is already a row in this sheet', chip('Alpha Already Row') == null);

click(chip('Storage'));
await settle();
check('selecting the Storage category shows Beta Co', chip('Beta Co') != null);
check('selecting the Storage category hides Alpha Co (Compute)', chip('Alpha Co') == null);
check('selecting the Storage category hides Gamma Co (Compute)', chip('Gamma Co') == null);

click(chip('Storage'));
await settle();
click(chip('Compute'));
await settle();
check('selecting the Compute category shows Alpha Co', chip('Alpha Co') != null);
check('selecting the Compute category shows Gamma Co (same category as Alpha)', chip('Gamma Co') != null);
check('selecting the Compute category hides Beta Co (Storage)', chip('Beta Co') == null);

const savesBeforeAlpha = saveCalls;
click(chip('Alpha Co'));
await settle();
check('Alpha Co is already a connected source — selecting it makes no API request', saveCalls === savesBeforeAlpha);
check('Alpha Co chip is now active', chipActive('Alpha Co'));
check("Alpha's own unadded inclusion appears once selected", chip('Alpha Item 1') != null);

const savesBeforeGamma = saveCalls;
click(chip('Gamma Co'));
await settle(60);
check('Gamma Co is NOT yet connected — selecting it makes exactly one API request (connect)', saveCalls === savesBeforeGamma + 1, saveCalls - savesBeforeGamma);
check("the connect request's sources now include Gamma (22)", (lastSavePayload?.sources ?? []).some((s) => s.entity_id === 22), JSON.stringify(lastSavePayload?.sources));
check("Gamma's own inclusion appears once connected", chip('Gamma Item 1') != null);

click(chip('Alpha Item 1'));
await settle();
check('Alpha Item 1 shows active/selected', chipActive('Alpha Item 1'));
click(chip('Gamma Item 1'));
await settle();
check('the Import button reflects the 2 selected inclusions', importActionButton('Import')?.textContent.includes('2'), importActionButton('Import')?.textContent);

const savesBeforeImport1 = saveCalls;
click(importActionButton('Import'));
await settle();
check('Import makes no API request', saveCalls === savesBeforeImport1);
check('the picker switches to the staging table', stagingPhase());
check('both imported inclusions are staged', stagingRowByLabel('Alpha Item 1') != null && stagingRowByLabel('Gamma Item 1') != null);

const stagedAlpha = stagingRowByLabel('Alpha Item 1');
setInputValue(priceInputIn(stagedAlpha), 42);
await settle();
check('editing a staged row\'s Unit Price makes no API request', saveCalls === savesBeforeImport1);

click(importHeadButton('← Back'));
await settle();
check('Back returns to the browse columns', !stagingPhase() && pickerOpen());

click(chip('Storage'));
await settle();
const savesBeforeBeta = saveCalls;
click(chip('Beta Co'));
await settle(60);
check('Beta Co connects on selection too (one more request)', saveCalls === savesBeforeBeta + 1);
click(chip('Beta Item 1'));
await settle();
click(importActionButton('Import'));
await settle();
check(
  'Back preserved the earlier staged entries — a second Import APPENDS rather than replaces',
  stagingRowByLabel('Alpha Item 1') != null && stagingRowByLabel('Gamma Item 1') != null && stagingRowByLabel('Beta Item 1') != null,
);
check(
  "the earlier edit survives across Back + a second Import (staging is one continuous local draft)",
  priceInputIn(stagingRowByLabel('Alpha Item 1'))?.value === '42',
  priceInputIn(stagingRowByLabel('Alpha Item 1'))?.value,
);

confirmReturnValue = false;
const savesBeforeDeclinedClose = saveCalls;
click(importHeadButton('Close'));
await settle();
check('Close with staged entries asks for confirmation', confirmCalls > 0);
check('declining the confirmation keeps the picker open', pickerOpen());
check('a declined Close makes no API request', saveCalls === savesBeforeDeclinedClose);

confirmReturnValue = true;
click(importHeadButton('Close'));
await settle();
check('accepting the confirmation closes the picker', !pickerOpen());
check('discarding staged entries makes no API request — staging was always local', saveCalls === savesBeforeDeclinedClose);

await openAddService();
check('reopening the picker starts a fresh session with no stale selection', !chipActive('Alpha Co') && !stagingPhase());
click(importHeadButton('Close'));
await settle();

// ── B) Full cycle: connect, multi-select, Import, edit, Publish ──────────
console.log('\nB) Full cycle: an unconnected Service\'s inclusion is staged, edited, and Publish persists it once');
await remount();
await openAddService();
click(chip('Storage'));
await settle();
click(chip('Beta Co'));
await settle(60);
click(chip('Beta Item 1'));
await settle();
click(importActionButton('Import'));
await settle();
let stagedBeta = stagingRowByLabel('Beta Item 1');
check('Beta Item 1 is staged after connect + select + Import', stagedBeta != null);
setInputValue(priceInputIn(stagedBeta), 77);
await settle();

const savesBeforePublish = saveCalls;
click(importActionButton('Publish'));
await settle(80);
check('Publish persists through exactly one full-manager save', saveCalls === savesBeforePublish + 1);
check('the picker closes once Publish succeeds', !pickerOpen());
const publishedItem = lastSavePayload.rate_sheets[0].items.find((item) => item.source_item_id === 'mgr_beta1');
check(
  "the published row carries the staged Unit Price and the correct source_item_id",
  publishedItem?.unit_price === 77,
  JSON.stringify(publishedItem),
);
const rowBeta = rowByLabel('Beta Item 1');
check('the new row appears locked in the normal grid with the published price', rowBeta != null && rowBeta.textContent.includes('$77'), rowBeta?.textContent);

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — the Service Import picker browses by category/Service/inclusion, connects a Service only when first selected, stages locally with no API request, and Publish persists the staged rows through exactly one full-manager save.');
process.exit(0);
