// Rate Sheet row-lock — mounted regression.
//
// Mounts the REAL RateSheetDrawerContent (esbuild + happy-dom + Preact render,
// same technique as scripts/tier-occupant-lifecycle-regression.mjs) against a
// fixture Package Manager, and proves the row Edit/Save/Cancel/Remove/Delete
// lock lifecycle end to end:
//
//   - rows start locked; Edit unlocks exactly one row and disables + Add
//     Service, every other row's Edit, and the now-redundant footer Save;
//   - row Save calls the SAME full-manager save the footer used to, exactly
//     once, and locks the row only after a verified success;
//   - a failed row Save leaves the row unlocked with its draft and the error
//     intact — no local rollback, no lock;
//   - Cancel reverts only the active row's own snapshot, locally, with no API
//     call, and never disturbs a sibling row;
//   - the "+ Add Service" picker stages a new row locally (no API call) and
//     Publish persists it once, adopting the backend-returned canonical row
//     identity and locking it as an existing row — the row-lock's own new-row
//     Save/Cancel/no-Delete lifecycle is proved separately for a row Publish
//     leaves stranded by a failed save (see scripts/
//     rate-sheet-service-import-regression.mjs for the picker's own browse/
//     connect/stage/Publish coverage);
//   - Remove (locked) and Delete (active) both confirm, then persist through
//     the full-manager save with the row excluded from the payload — the
//     boundary the backend's own Platform Identifier tombstone code runs on;
//   - the active row's Unit Price cell is an Edit-triggered popover, anchored
//     to the cell (never a detached drawer/modal), with the Default Price
//     row always first (Default Price is not Option 0 — it stays the row's
//     own price) and every price option simultaneously visible/editable
//     beneath it, never tab-switched; adding, editing, and Cancel-discarding
//     a price option all ride the SAME row-lock Save/Cancel, never a second
//     row, lock, or endpoint — the popover's own small Save is a close
//     affordance only;
//   - the Default Price row's own NAME is admin display configuration
//     (`default_price_label`): it renames the price the row already has,
//     riding the same row Save, and creates no price option and no identity;
//   - a LOCKED row's Unit Price cell is read-only presentation only: zero
//     Price Options keeps the plain value unchanged, and one-or-more render
//     a compact Default/Option list — never the edit popover's own editable
//     rows, and never even the Edit trigger.
//
// The fetch mock is a tiny in-memory Package Manager server: it mints a blank
// item_id exactly like PackageManagerSchema::deriveRateItemId (deterministic,
// not a real hash — the real derivation is proven by
// tests/rate-sheet-platform-identity-reconciliation.php and
// npm run contract:rate-sheet-row-platform-identity), so this regression
// proves the FRONTEND's row-lock wiring, not a reimplementation of backend
// identity rules.
//
// Usage: npm run regression:rate-sheet-row-lock
//    or: node scripts/rate-sheet-row-lock-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-rate-sheet-row-lock-bundle.mjs');
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

// The "+ Add Service" catalog — one already-connected Service (9) and one
// not-yet-connected Service (10), each with its own inclusion pool. `items`
// below is derived from `sources` (never static) exactly like the real
// PackageRepository::sourcePools()/reconcileItems() scope inclusions to
// connected sources only — so this fixture genuinely exercises "select an
// unconnected Service → it connects → its inclusions appear."
// useHostService() resolves its host from this SAME catalog's `stations[0]`
// fallback (no surface-package preference is mocked below) — the host
// (SERVICE_ID) must stay first so the harness keeps addressing the right
// Package Station manager, exactly as the original single-station fixture did.
const SERVICE_CATALOG = [
  { id: SERVICE_ID, title: 'Test Service', categories: [] },
  { id: 9, title: 'Widget Co', categories: [{ id: 1, name: 'Compute', slug: 'compute' }] },
  { id: 10, title: 'Storage Co', categories: [{ id: 2, name: 'Storage', slug: 'storage' }] },
];
const INCLUSION_POOL_BY_SERVICE = {
  9: [
    { item_id: 'mgr_a', source_id: 'inc-a', label: 'Row A' },
    { item_id: 'mgr_b', source_id: 'inc-b', label: 'Row B' },
    { item_id: 'mgr_c', source_id: 'inc-c', label: 'Row C unadded' },
  ],
  10: [
    { item_id: 'mgr_d', source_id: 'inc-d', label: 'Row D unconnected' },
  ],
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
    { relationship_id: 'source_service_9', provider_key: 'service', entity_type: 'service', entity_id: 9, sort_order: 0, category_group_id: null },
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
        { item_id: 'rate_a', source_item_id: 'mgr_a', unit_price: 10, per: 'Per item', quantity: 1, group_id: null, sort_order: 0, price_options: [] },
        { item_id: 'rate_b', source_item_id: 'mgr_b', unit_price: 20, per: 'Per item', quantity: 2, group_id: null, sort_order: 1, price_options: [] },
      ],
    }],
    rate_sheet_units: [...BUILT_IN_UNITS],
    projections: { inclusions: [], faqs: [] },
  };
}

let server = { manager: baseManager() };
let saveCalls = 0;
let lastSavePayload = null;
let forceNextSaveFailure = false;

function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
function jsonResponse(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) });
}
// Deterministic stand-in for PackageManagerSchema::deriveRateItemId — a real
// hash derivation is a backend concern, proven separately; this mock only
// needs "blank in, stable canonical id out" to exercise the frontend.
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
      // Mirrors PackageManagerSchema::commitConfiguration's own write-path-only
      // mint of a blank price-option id — proven for real by
      // tests/package-manager-schema.php and the reconciliation test; this
      // mock only needs "blank in, stable id out" to exercise the frontend.
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
    if (forceNextSaveFailure) {
      forceNextSaveFailure = false;
      return jsonResponse({ success: false, message: 'Simulated backend failure.' });
    }
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
let modeChanges = [];
let onSavedCalls = 0;
let closeCalls = 0;

function Harness({ recordId, mode }) {
  const [currentMode, setCurrentMode] = useState(mode);
  return h(RateSheetDrawerContent, {
    recordId,
    mode: currentMode,
    onClose: () => { closeCalls += 1; },
    onModeChange: (next) => { modeChanges.push(next); setCurrentMode(next); },
    onSaved: () => { onSavedCalls += 1; },
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

// Scoped to exclude the "+ Add Service" picker's own staging table, which
// deliberately reuses the same `.cz-rate-sheet-tool__grid` markup/classes for
// visual consistency — see stagingRows() below for that table specifically.
function rowsIn() {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__grid tbody tr')]
    .filter((tr) => tr.closest('.cz-rate-sheet-tool__import') === null);
}
function rowByLabel(label) { return rowsIn().find((tr) => tr.textContent.includes(label)) ?? null; }
// Excludes the price popover wrap entirely — its own trigger is a plain
// "Edit" button (distinct from the row's real Edit/Save/Cancel/Delete), and
// while open it also carries its own "Save" (a close affordance, distinct
// from the row's real Save) — so a row-level action must never accidentally
// match either.
function buttonIn(row, text) {
  return row
    ? [...row.querySelectorAll('button')]
      .filter((b) => b.closest('.cz-rate-sheet-tool__price-popover-wrap') === null)
      .find((b) => b.textContent.trim() === text) ?? null
    : null;
}
function click(btn) { btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }
function priceInputIn(row) { return row?.querySelector('input[type="number"]') ?? null; }
// The Unit Price cell's own plain Edit button — opens the anchored popover.
// A direct child of the wrap (never inside the popover panel itself), so
// this stays correct whether the popover is open or closed.
function priceEditTrigger(row) { return row?.querySelector('.cz-rate-sheet-tool__price-popover-wrap > button') ?? null; }
function pricePopoverIn(row) { return row?.querySelector('.cz-rate-sheet-tool__price-popover') ?? null; }
function openPricePopover(row) {
  const trigger = priceEditTrigger(row);
  if (trigger && trigger.getAttribute('aria-expanded') !== 'true') click(trigger);
}
// The popover's own small Save — a close affordance only, since every field
// already writes into the row's own draft as it's typed.
function closePricePopover(row) {
  const popover = pricePopoverIn(row);
  const saveBtn = popover ? [...popover.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Save') : null;
  click(saveBtn);
}
// Every price row after the popover's own merged "Unit Price" title row and
// the Default Price row (always first) is one price option, in order —
// simultaneously visible and editable, never tab-switched.
function priceOptionRows(popover) { return popover ? [...popover.querySelectorAll('tbody tr')].slice(2) : []; }
function priceDefaultLabelInput(popover) { return popover?.querySelector('tbody tr:nth-child(2) td:first-child input') ?? null; }
function priceOptionLabelInput(popover, index = priceOptionRows(popover).length - 1) {
  return priceOptionRows(popover)[index]?.querySelector('td:first-child input') ?? null;
}
function priceOptionPriceInput(popover, index = priceOptionRows(popover).length - 1) {
  return priceOptionRows(popover)[index]?.querySelector('td input[type="number"]') ?? null;
}
function priceOptionRemoveButton(popover, index = priceOptionRows(popover).length - 1) {
  return priceOptionRows(popover)[index]?.querySelector('.cz-rate-sheet-tool__price-popover-remove') ?? null;
}
function addPriceOptionButton(popover) {
  return popover ? [...popover.querySelectorAll('button')].find((b) => b.textContent.trim() === '+ Add price') ?? null : null;
}
function priceOptionsSummary(row) { return row?.querySelector('.cz-rate-sheet-tool__price-options-summary') ?? null; }
function priceOptionsSummaryRows(row) { return row ? [...row.querySelectorAll('.cz-rate-sheet-tool__price-options-summary-row')] : []; }
function setInputValue(input, value) {
  input.value = String(value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}
function footerButton(text) {
  return [...container.querySelectorAll('.cz-ies__footer button')].find((b) => b.textContent.trim() === text) ?? null;
}
function addServiceToggleButton() {
  return [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === '+ Add Service' || b.textContent.trim() === 'Close');
}
async function openAddService() {
  const btn = addServiceToggleButton();
  if (btn && btn.textContent.trim() === '+ Add Service') { click(btn); await settle(); }
}
function importChip(labelSubstring) {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__import-chip')].find((b) => b.textContent.includes(labelSubstring)) ?? null;
}
function importActionButton(text) {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__import-actions button')].find((b) => b.textContent.trim().startsWith(text)) ?? null;
}
function importHeadButton(text) {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__import-head button')].find((b) => b.textContent.trim() === text) ?? null;
}
function stagingRows() { return [...container.querySelectorAll('.cz-rate-sheet-tool__import .cz-rate-sheet-tool__grid tbody tr')]; }
function stagingRowByLabel(label) { return stagingRows().find((tr) => tr.textContent.includes(label)) ?? null; }

async function remount() {
  render(null, container);
  server = { manager: baseManager() };
  saveCalls = 0; lastSavePayload = null; forceNextSaveFailure = false;
  confirmCalls = 0; lastConfirmMessage = null; confirmReturnValue = true;
  modeChanges = []; onSavedCalls = 0; closeCalls = 0;
  render(h(Harness, { recordId: 'rs_1', mode: 'edit' }), container);
  await settle();
}

console.log('Rate Sheet row-lock regression\n');

// ── 1) Rows start locked ──────────────────────────────────────────────────
console.log('1) Rows start locked');
await remount();
let rowA = rowByLabel('Row A');
let rowB = rowByLabel('Row B');
check('Row A is present', rowA != null);
check('Row B is present', rowB != null);
check('Row A starts locked: Edit + Remove, no Save/Cancel/Delete', buttonIn(rowA, 'Edit') != null && buttonIn(rowA, 'Remove') != null && buttonIn(rowA, 'Save') == null);
check('Row B starts locked too', buttonIn(rowB, 'Edit') != null && buttonIn(rowB, 'Remove') != null);
check('a locked row with zero Price Options shows the plain Unit Price value, no summary block', priceOptionsSummary(rowA) == null && rowA?.textContent.includes('$10'), rowA?.textContent);
check('a locked row never renders the edit-mode price popover trigger', priceEditTrigger(rowA) == null);

// ── 2) Edit unlocks exactly one row; other actions disabled ─────────────
console.log('\n2) Edit unlocks only Row A; other Edit actions, Add Row, and the footer Save are disabled');
click(buttonIn(rowA, 'Edit'));
await settle();
rowA = rowByLabel('Row A'); rowB = rowByLabel('Row B');
check('Row A is now editable: Save/Cancel/Delete, no Edit', buttonIn(rowA, 'Save') != null && buttonIn(rowA, 'Cancel') != null && buttonIn(rowA, 'Delete') != null && buttonIn(rowA, 'Edit') == null);
check("Row B's Edit is disabled while Row A is active", buttonIn(rowB, 'Edit')?.disabled === true);
check("Row B's Remove is disabled while Row A is active", buttonIn(rowB, 'Remove')?.disabled === true);
check('+ Add Service is disabled while Row A is active', addServiceToggleButton()?.disabled === true, addServiceToggleButton()?.disabled);
check('the footer Save is disabled while a row is active — only one visible Save action', footerButton('Save')?.disabled === true, footerButton('Save')?.disabled);

// ── 3) Row Save persists once and locks only on verified success ────────
console.log('\n3) Existing-row Save persists through the full-manager save exactly once, and locks only after success');
const savesBefore = saveCalls;
// The active row's Unit Price now sits behind the popover's own Edit
// trigger (see section 7 below) — open it to reach the Default Price input,
// the same field the old plain input always was.
openPricePopover(rowA);
await settle();
rowA = rowByLabel('Row A');
setInputValue(pricePopoverIn(rowA)?.querySelector('tbody tr:nth-child(2) input[type="number"]'), 15);
await settle();
closePricePopover(rowA);
await settle();
click(buttonIn(rowByLabel('Row A'), 'Save'));
await settle(80);
check('exactly one full-manager save request was made', saveCalls === savesBefore + 1, saveCalls - savesBefore);
check(
  'the save payload carried the whole manager shape (sources/groups/item_decisions/rate_sheets)',
  ['sources', 'groups', 'item_decisions', 'rate_sheets'].every((k) => k in (lastSavePayload ?? {})),
);
check('the drawer stayed mounted in Edit mode — no switch to View', !modeChanges.includes('view'), JSON.stringify(modeChanges));
rowA = rowByLabel('Row A');
check('Row A is locked again after the verified success', buttonIn(rowA, 'Edit') != null && buttonIn(rowA, 'Save') == null);
check('the returned model is the new baseline (saved price now shown)', rowA?.textContent.includes('$15'), rowA?.textContent);

// ── 4) A failed Save leaves the row unlocked with its draft and error ───
console.log('\n4) A failed row Save leaves the row unlocked, with its edited value and error intact');
click(buttonIn(rowB, 'Edit'));
await settle();
rowB = rowByLabel('Row B');
openPricePopover(rowB);
await settle();
rowB = rowByLabel('Row B');
setInputValue(pricePopoverIn(rowB)?.querySelector('tbody tr:nth-child(2) input[type="number"]'), 99);
await settle();
closePricePopover(rowB);
await settle();
forceNextSaveFailure = true;
const savesBeforeFail = saveCalls;
click(buttonIn(rowByLabel('Row B'), 'Save'));
await settle(80);
check('the failed save still counted as one request', saveCalls === savesBeforeFail + 1);
rowB = rowByLabel('Row B');
check('Row B remains editable after a failed Save (not locked)', buttonIn(rowB, 'Save') != null && buttonIn(rowB, 'Edit') == null);
openPricePopover(rowB);
await settle();
rowB = rowByLabel('Row B');
check(
  'the edited (unsaved) value is retained in the popover on reopen',
  pricePopoverIn(rowB)?.querySelector('tbody tr:nth-child(2) input[type="number"]')?.value === '99',
  pricePopoverIn(rowB)?.querySelector('tbody tr:nth-child(2) input[type="number"]')?.value,
);
closePricePopover(rowB);
await settle();
check('the save error is shown in the editor body', container.querySelector('.cz-admin-error-msg')?.textContent.includes('Simulated backend failure') ?? false);

// ── 5) Cancel restores only the active row's snapshot, no API call ──────
console.log("\n5) Cancel restores only Row B's snapshot, locally, and never touches Row A");
const savesBeforeCancel = saveCalls;
click(buttonIn(rowB, 'Cancel'));
await settle();
check('Cancel made no API request', saveCalls === savesBeforeCancel);
rowB = rowByLabel('Row B'); rowA = rowByLabel('Row A');
check('Row B is locked again and reverted to its last-saved price', buttonIn(rowB, 'Edit') != null && rowB?.textContent.includes('$20'), rowB?.textContent);
check("Row A (saved earlier, unrelated to this Cancel) is untouched", rowA?.textContent.includes('$15'), rowA?.textContent);

// ── 6) The "+ Add Service" picker stages an already-connected Service's
//    inclusion, then Publish persists it once and adopts the canonical
//    identity — the picker's own browse/connect/multi-select coverage lives
//    in scripts/rate-sheet-service-import-regression.mjs; this only proves
//    the seam back into the row grid stays correct. ──────────────────────
console.log('\n6) + Add Service stages a curated row locally; Publish persists it once and locks it');
await remount();
await openAddService();
const widgetChip = importChip('Widget Co');
click(widgetChip);
await settle();
const inclusionChip = importChip('Row C unadded');
check('the unadded inclusion from the already-connected Service is offered', inclusionChip != null);
const savesBeforeImport = saveCalls;
click(inclusionChip);
await settle();
click(importActionButton('Import'));
await settle();
check('Import makes no API request by itself', saveCalls === savesBeforeImport);
let stagingRowC = stagingRowByLabel('Row C unadded');
check('the staged row appears in the local, editable staging list', stagingRowC != null);
setInputValue(priceInputIn(stagingRowC), 30);
await settle();
const savesBeforePublish = saveCalls;
click(importActionButton('Publish'));
await settle(80);
check('Publish persists through exactly one full-manager save', saveCalls === savesBeforePublish + 1);
check('the picker closes back to the normal grid once Publish succeeds', container.querySelector('.cz-rate-sheet-tool__import') == null);
let rowC = rowByLabel('Row C unadded');
check('the new row is locked after success (Edit + Remove, no Save/Cancel)', buttonIn(rowC, 'Edit') != null && buttonIn(rowC, 'Save') == null);
check(
  'the row adopted the backend-minted canonical item_id (no longer "assigned after Save")',
  rowC?.textContent.includes('Platform ID not assigned') && !rowC?.textContent.includes('assigned after Save'),
  rowC?.textContent,
);
check('the staged price is reflected as the new baseline', rowC?.textContent.includes('$30'), rowC?.textContent);

// ── 7) Fresh row / <2 options: the standard compact case always shows
//    THREE editable price rows — Default Price plus rows 2 and 3 — even
//    before any price_options[] entry exists. Opening the popover mints
//    nothing; only the admin's own first keystroke into a still-missing
//    row does, through the SAME addPriceOption/setPriceOptionLabel/
//    setPriceOptionUnitPrice commands every option already uses. ────────
console.log('\n7) Fresh row (<2 options): the standard compact case always shows three editable price rows, minting nothing until typed into');
click(buttonIn(rowByLabel('Row A'), 'Edit'));
await settle();
let rowAOptions = rowByLabel('Row A');
check('an unlocked row with zero price options still shows the Edit trigger, not just a bare price input', priceEditTrigger(rowAOptions) != null);
check(
  'the trigger is a PLAIN Edit button only — no price/value preview beside it (a row can carry several prices)',
  priceEditTrigger(rowAOptions)?.textContent.trim() === 'Edit' && !priceEditTrigger(rowAOptions)?.textContent.includes('$'),
  priceEditTrigger(rowAOptions)?.textContent,
);
check('the trigger is closed by default', priceEditTrigger(rowAOptions)?.getAttribute('aria-expanded') === 'false');

openPricePopover(rowAOptions);
await settle();
rowAOptions = rowByLabel('Row A');
let popover = pricePopoverIn(rowAOptions);
check('opening the trigger reveals the popover, anchored to the cell (not a detached drawer/modal)', popover != null);
check('the popover carries a merged "Unit Price" title row', popover?.textContent.includes('Unit Price'));
check('the Default row is labelled by placeholder as One-Time Fee', priceDefaultLabelInput(popover)?.getAttribute('placeholder') === 'One-Time Fee');
check('Default Price is the first row and edits the row\'s own price exactly as the plain input always did', Number(popover.querySelector('tbody tr:nth-child(2) input[type="number"]')?.value) === 10);
check(
  'rows 2 and 3 are ALWAYS rendered — the standard compact case — even with zero price_options[] entries yet',
  priceOptionRows(popover).length === 2,
);
check('row 2 is placeholder-labelled Annual Renewal, row 3 Monthly Subscription', priceOptionLabelInput(popover, 0)?.getAttribute('placeholder') === 'Annual Renewal' && priceOptionLabelInput(popover, 1)?.getAttribute('placeholder') === 'Monthly Subscription');
check('neither still-phantom row offers Remove — there is nothing yet to remove', priceOptionRemoveButton(popover, 0) == null && priceOptionRemoveButton(popover, 1) == null);

closePricePopover(rowAOptions);
await settle();
const savesBeforeUntouchedPopover = saveCalls;
click(buttonIn(rowByLabel('Row A'), 'Save'));
await settle(80);
check('opening (and closing) the popover without typing persisted through one save, minting NO price option', saveCalls === savesBeforeUntouchedPopover + 1);
const untouchedRowA = lastSavePayload.rate_sheets[0].items.find((item) => item.source_item_id === 'mgr_a');
check('price_options stays empty — merely opening the popover creates nothing', untouchedRowA?.price_options?.length === 0, JSON.stringify(untouchedRowA?.price_options));

// ── 7b) Typing into row 2 alone materializes exactly that one option —
//    row 3 stays phantom. ─────────────────────────────────────────────────
console.log('\n7b) Typing into row 2 alone materializes exactly that one price option; row 3 stays phantom');
click(buttonIn(rowByLabel('Row A'), 'Edit'));
await settle();
rowAOptions = rowByLabel('Row A');
openPricePopover(rowAOptions);
await settle();
rowAOptions = rowByLabel('Row A'); popover = pricePopoverIn(rowAOptions);
setInputValue(priceOptionLabelInput(popover, 0), 'Annual');
await settle();
rowAOptions = rowByLabel('Row A'); popover = pricePopoverIn(rowAOptions);
check('row 2 is materialized (offers Remove) the instant it is typed into', priceOptionRemoveButton(popover, 0) != null);
check('row 3 is still phantom — untouched by materializing row 2', priceOptionRemoveButton(popover, 1) == null && priceOptionLabelInput(popover, 1)?.value === '');
setInputValue(priceOptionPriceInput(popover, 0), 120);
await settle();
rowAOptions = rowByLabel('Row A'); popover = pricePopoverIn(rowAOptions);
check(
  'the Default Price row stays visible and untouched by the option just edited — no switching needed',
  Number(popover.querySelector('tbody tr:nth-child(2) input[type="number"]')?.value) === 10,
);

closePricePopover(rowAOptions);
await settle();
const savesBeforeOptionSave = saveCalls;
click(buttonIn(rowByLabel('Row A'), 'Save'));
await settle(80);
check('the price-option edit persisted through exactly one full-manager save — the same one every other row Save uses', saveCalls === savesBeforeOptionSave + 1);
const savedRowAItem = lastSavePayload.rate_sheets[0].items.find((item) => item.source_item_id === 'mgr_a');
check(
  'the saved row carries exactly the one materialized price option (label/price), while its own unit_price stays the Default Price',
  savedRowAItem?.price_options?.length === 1 && savedRowAItem.price_options[0].label === 'Annual' && savedRowAItem.price_options[0].unit_price === 120 && savedRowAItem.unit_price === 10,
  JSON.stringify(savedRowAItem),
);
rowAOptions = rowByLabel('Row A');
check('the row locks again after the verified success, exactly like every other row Save', buttonIn(rowAOptions, 'Edit') != null && buttonIn(rowAOptions, 'Save') == null);

// ── 7c) Row B, standing in for a second fresh row: typing into row 3
//    FIRST (row 2 still phantom) mints row 2 blank first, so array order —
//    and therefore which row each entry displays as — stays correct
//    (price_options[] has no separate slot identity). Cancelling afterwards
//    discards BOTH materializations, exactly like any other unsaved edit. ──
console.log('\n7c) Typing into row 3 first mints row 2 blank first to keep ordering correct; Cancel discards both');
click(buttonIn(rowByLabel('Row B'), 'Edit'));
await settle();
let rowBOptions = rowByLabel('Row B');
openPricePopover(rowBOptions);
await settle();
rowBOptions = rowByLabel('Row B');
let popoverB = pricePopoverIn(rowBOptions);
check('Row B starts with both standard rows phantom too', priceOptionRemoveButton(popoverB, 0) == null && priceOptionRemoveButton(popoverB, 1) == null);
setInputValue(priceOptionLabelInput(popoverB, 1), 'Only Second');
await settle();
rowBOptions = rowByLabel('Row B'); popoverB = pricePopoverIn(rowBOptions);
check('row 3 is materialized with the typed label', priceOptionLabelInput(popoverB, 1)?.value === 'Only Second');
check('row 2 was ALSO minted (blank) to preserve ordering — it now offers Remove despite carrying no typed text', priceOptionRemoveButton(popoverB, 0) != null && priceOptionLabelInput(popoverB, 0)?.value === '');
closePricePopover(rowBOptions);
await settle();

const savesBeforeCancelB = saveCalls;
click(buttonIn(rowByLabel('Row B'), 'Cancel'));
await settle();
rowBOptions = rowByLabel('Row B');
check('Cancel made no API request', saveCalls === savesBeforeCancelB);
check('the row is locked again after Cancel, exactly like every other row Cancel', buttonIn(rowBOptions, 'Edit') != null);
click(buttonIn(rowBOptions, 'Edit'));
await settle();
rowBOptions = rowByLabel('Row B');
openPricePopover(rowBOptions);
await settle();
rowBOptions = rowByLabel('Row B'); popoverB = pricePopoverIn(rowBOptions);
check(
  'Cancel discarded BOTH unsaved materializations — both standard rows are phantom again',
  priceOptionRemoveButton(popoverB, 0) == null && priceOptionRemoveButton(popoverB, 1) == null,
);
closePricePopover(rowBOptions);
await settle();
click(buttonIn(rowByLabel('Row B'), 'Cancel'));
await settle();

// ── 7d) Exactly two options, and a third beyond the standard case —
//    "+ Add price" still appends further, never capped, rendered after the
//    standard two. ─────────────────────────────────────────────────────────
console.log('\n7d) Typing into row 3 (row 2 already real) reaches exactly two options; a third via "+ Add price" is preserved, never truncated');
click(buttonIn(rowByLabel('Row A'), 'Edit'));
await settle();
rowAOptions = rowByLabel('Row A');
openPricePopover(rowAOptions);
await settle();
rowAOptions = rowByLabel('Row A'); popover = pricePopoverIn(rowAOptions);
check('row 2 (Annual) reappears materialized on reload', priceOptionLabelInput(popover, 0)?.value === 'Annual');
setInputValue(priceOptionPriceInput(popover, 1), 90);
await settle();
rowAOptions = rowByLabel('Row A'); popover = pricePopoverIn(rowAOptions);
check('row 3 is now ALSO materialized — exactly two price options, row 2 untouched', priceOptionRemoveButton(popover, 1) != null && priceOptionLabelInput(popover, 0)?.value === 'Annual');

click(addPriceOptionButton(popover));
await settle();
rowAOptions = rowByLabel('Row A'); popover = pricePopoverIn(rowAOptions);
check('"+ Add price" appends a THIRD row beyond the standard two, generically placeholder-labelled', priceOptionRows(popover).length === 3 && priceOptionLabelInput(popover, 2)?.getAttribute('placeholder') === 'Option label');
setInputValue(priceOptionLabelInput(popover, 2), 'Extra');
setInputValue(priceOptionPriceInput(popover, 2), 50);
await settle();

closePricePopover(rowAOptions);
await settle();
const savesBeforeThreeOptions = saveCalls;
click(buttonIn(rowByLabel('Row A'), 'Save'));
await settle(80);
check('all three price options persisted through the same one full-manager save', saveCalls === savesBeforeThreeOptions + 1);
const threeOptionRowA = lastSavePayload.rate_sheets[0].items.find((item) => item.source_item_id === 'mgr_a');
check(
  'nothing is truncated or reinterpreted — all three survive, in order, with the Default Price untouched',
  threeOptionRowA?.price_options?.length === 3
    && threeOptionRowA.price_options[0].label === 'Annual' && threeOptionRowA.price_options[0].unit_price === 120
    && threeOptionRowA.price_options[1].label === '' && threeOptionRowA.price_options[1].unit_price === 90
    && threeOptionRowA.price_options[2].label === 'Extra' && threeOptionRowA.price_options[2].unit_price === 50
    && threeOptionRowA.unit_price === 10,
  JSON.stringify(threeOptionRowA),
);
rowAOptions = rowByLabel('Row A');
check('the row locks again after the verified success', buttonIn(rowAOptions, 'Edit') != null);
let summaryRows = priceOptionsSummaryRows(rowAOptions);
check(
  'the locked read-only summary lists Default plus all three — the blank-labelled row 3 falls back to "Option 2", never disagreeing with the edit popover',
  summaryRows.length === 4 && summaryRows[1]?.textContent.includes('Annual') && summaryRows[2]?.textContent.includes('Option 2') && summaryRows[3]?.textContent.includes('Extra'),
  summaryRows.map((r) => r.textContent),
);
check('the locked row renders no Edit trigger for its Price Options — read-only presentation only', priceEditTrigger(rowAOptions) == null);

// The popover's own explicit Remove (×) on a materialized STANDARD row (not
// just an "extra" one) — proves removal capability is never narrowed to
// beyond-the-standard-case rows, then Cancel leaves the last-saved three
// untouched for the rename check below.
click(buttonIn(rowByLabel('Row A'), 'Edit'));
await settle();
rowAOptions = rowByLabel('Row A');
openPricePopover(rowAOptions);
await settle();
rowAOptions = rowByLabel('Row A'); popover = pricePopoverIn(rowAOptions);
click(priceOptionRemoveButton(popover, 1));
await settle();
rowAOptions = rowByLabel('Row A'); popover = pricePopoverIn(rowAOptions);
check(
  'Remove on a standard (materialized) row drops only that one, leaving the others untouched — "Extra" shifts up to row 3',
  priceOptionRows(popover).length === 2 && priceOptionLabelInput(popover, 0)?.value === 'Annual' && priceOptionLabelInput(popover, 1)?.value === 'Extra',
);
closePricePopover(rowAOptions);
await settle();
click(buttonIn(rowByLabel('Row A'), 'Cancel'));
await settle();

// ── 7e) The Default Price row's own NAME is admin display configuration for
//    the price the row already has. Renaming it never creates a price
//    option, never mints an identity, and never touches the price or the way
//    a Tier selects it. ────────────────────────────────────────────────────
console.log('\n7e) The Default Price row is editable admin configuration — it names the price the row already has');
click(buttonIn(rowByLabel('Row A'), 'Edit'));
await settle();
rowAOptions = rowByLabel('Row A');
openPricePopover(rowAOptions);
await settle();
rowAOptions = rowByLabel('Row A'); popover = pricePopoverIn(rowAOptions);
const defaultLabelInput = priceDefaultLabelInput(popover);
check('the Default Price row offers its own name field beside the row\'s own price', defaultLabelInput != null);
setInputValue(defaultLabelInput, 'Monthly');
await settle();
rowAOptions = rowByLabel('Row A'); popover = pricePopoverIn(rowAOptions);
check(
  'the trigger\'s own accessible name takes the admin\'s new name in place of the built-in one',
  priceEditTrigger(rowAOptions)?.getAttribute('aria-label')?.includes('Monthly'),
  priceEditTrigger(rowAOptions)?.getAttribute('aria-label'),
);
check('renaming leaves the price itself untouched', Number(popover.querySelector('tbody tr:nth-child(2) input[type="number"]')?.value) === 10);
check(
  'and adds no price option — the row still has only the three it saved (Cancel discarded the earlier Remove)',
  priceOptionRows(popover).length === 3 && priceOptionLabelInput(popover, 0)?.value === 'Annual' && priceOptionLabelInput(popover, 2)?.value === 'Extra',
);
closePricePopover(rowAOptions);
await settle();
const savesBeforeDefaultLabel = saveCalls;
click(buttonIn(rowByLabel('Row A'), 'Save'));
await settle(80);
check('the rename persists through the same one full-manager save', saveCalls === savesBeforeDefaultLabel + 1);
const renamedRowA = lastSavePayload.rate_sheets[0].items.find((item) => item.source_item_id === 'mgr_a');
check(
  'the saved row carries the name as its own default_price_label, with unit_price and price_options untouched',
  renamedRowA?.default_price_label === 'Monthly' && renamedRowA.unit_price === 10 && renamedRowA.price_options.length === 3,
  JSON.stringify(renamedRowA),
);
rowAOptions = rowByLabel('Row A');
check(
  'the locked row\'s read-only summary names the default line the same way, never disagreeing with the trigger',
  priceOptionsSummaryRows(rowAOptions)[0]?.textContent.includes('Monthly'),
  priceOptionsSummaryRows(rowAOptions)[0]?.textContent,
);
click(buttonIn(rowByLabel('Row A'), 'Edit'));
await settle();
rowAOptions = rowByLabel('Row A');
openPricePopover(rowAOptions);
await settle();
rowAOptions = rowByLabel('Row A'); popover = pricePopoverIn(rowAOptions);
check('the name round-trips on reload', priceDefaultLabelInput(popover)?.value === 'Monthly');
setInputValue(priceDefaultLabelInput(popover), '');
await settle();
rowAOptions = rowByLabel('Row A');
check(
  'clearing it restores the built-in "Default Price" name in the trigger\'s own accessible name',
  priceEditTrigger(rowAOptions)?.getAttribute('aria-label')?.includes('Default Price'),
  priceEditTrigger(rowAOptions)?.getAttribute('aria-label'),
);
closePricePopover(rowAOptions);
await settle();
click(buttonIn(rowByLabel('Row A'), 'Cancel'));
await settle();

// ── 8) Remove (locked) confirms, then persists, excluding the row ────────
console.log('\n8) Remove on a locked row confirms, then persists the manager without that row');
rowB = rowByLabel('Row B');
confirmReturnValue = false;
const savesBeforeDeclinedRemove = saveCalls;
click(buttonIn(rowB, 'Remove'));
await settle();
check('a declined confirmation makes no API request', saveCalls === savesBeforeDeclinedRemove);
check('the row is still present after a declined confirmation', rowByLabel('Row B') != null);

confirmReturnValue = true;
const savesBeforeRemove = saveCalls;
click(buttonIn(rowB, 'Remove'));
await settle(80);
check('Remove asked for confirmation', confirmCalls > 0 && typeof lastConfirmMessage === 'string' && lastConfirmMessage.length > 0);
check('Remove persisted through exactly one full-manager save', saveCalls === savesBeforeRemove + 1);
check(
  "the submitted payload's sheet no longer carries Row B's item — the boundary the backend's Platform Identifier tombstone runs on",
  !lastSavePayload.rate_sheets[0].items.some((item) => item.source_item_id === 'mgr_b'),
);
check('Row B is gone from the grid only after the confirmed save resolved', rowByLabel('Row B') == null);

// ── 9) Delete (active row) confirms, then persists, and locks/clears ─────
console.log('\n9) Delete on the active row confirms, persists, and clears the active row on success');
click(buttonIn(rowByLabel('Row A'), 'Edit'));
await settle();
rowA = rowByLabel('Row A');
const savesBeforeDelete = saveCalls;
click(buttonIn(rowA, 'Delete'));
await settle(80);
check('Delete asked for confirmation', confirmCalls > 0);
check('Delete persisted through exactly one full-manager save', saveCalls === savesBeforeDelete + 1);
check('Row A is gone after the confirmed Delete', rowByLabel('Row A') == null);
check('+ Add Service is enabled again — no row remains active after Delete', addServiceToggleButton()?.disabled === false, addServiceToggleButton()?.disabled);

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — the Rate Sheet row lock (Edit/Save/Cancel/Remove/Delete) persists immediately through the existing full-manager save, one row at a time, with the drawer staying mounted in Edit throughout.');
process.exit(0);
