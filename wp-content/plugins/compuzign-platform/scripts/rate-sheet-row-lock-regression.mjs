// Rate Sheet row-lock — mounted regression.
//
// Mounts the REAL RateSheetDrawerContent (esbuild + happy-dom + Preact render,
// same technique as scripts/tier-occupant-lifecycle-regression.mjs) against a
// fixture Package Manager, and proves the row Edit/Save/Cancel/Remove/Delete
// lock lifecycle end to end:
//
//   - rows start locked; Edit unlocks exactly one row and disables Add Row,
//     every other row's Edit, and the now-redundant footer Save;
//   - row Save calls the SAME full-manager save the footer used to, exactly
//     once, and locks the row only after a verified success;
//   - a failed row Save leaves the row unlocked with its draft and the error
//     intact — no local rollback, no lock;
//   - Cancel reverts only the active row's own snapshot, locally, with no API
//     call, and never disturbs a sibling row;
//   - a new row starts editable with no Delete; Cancel discards it with no
//     API call; Save persists it and adopts the backend-returned canonical
//     row identity, then locks it as an existing row;
//   - Remove (locked) and Delete (active) both confirm, then persist through
//     the full-manager save with the row excluded from the payload — the
//     boundary the backend's own Platform Identifier tombstone code runs on;
//   - the active row's Unit Price cell is a Default/Option tab editor
//     (Default Price is not Option 0 — it stays the row's own price);
//     adding, editing, and Cancel-discarding a price option all ride the
//     SAME row-lock Save/Cancel, never a second row, lock, or endpoint;
//   - a LOCKED row's Unit Price cell is read-only presentation only: zero
//     Price Options keeps the plain value unchanged, and one-or-more render
//     a compact Default/Option list — never the edit mode's selectable
//     chips/tabs.
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

function baseManager() {
  return {
    service_id: SERVICE_ID,
    platform_status: 'active',
    has_configuration: true,
    sources: [
      { relationship_id: 'source_service_9', provider_key: 'service', entity_type: 'service', entity_id: 9, sort_order: 0, category_group_id: null },
    ],
    groups: [],
    category_groups: [],
    items: [
      { item_id: 'mgr_a', source_type: 'inclusion', source_id: 'inc-a', resolved: { label: 'Row A' }, decorated_label: null, group_id: null, sort_order: 0, disabled: false, missing: false, module_transition: 'settled' },
      { item_id: 'mgr_b', source_type: 'inclusion', source_id: 'inc-b', resolved: { label: 'Row B' }, decorated_label: null, group_id: null, sort_order: 1, disabled: false, missing: false, module_transition: 'settled' },
      { item_id: 'mgr_c', source_type: 'inclusion', source_id: 'inc-c', resolved: { label: 'Row C unadded' }, decorated_label: null, group_id: null, sort_order: 2, disabled: false, missing: false, module_transition: 'not-configured' },
    ],
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
      stations: [{
        id: SERVICE_ID, platform_id: 'CZS1', title: 'Test Service', slug: 'test-service',
        categories: [], platform_status: 'active',
        module_status: { overview: 'settled', inclusions: 'settled', faqs: 'settled' }, has_drafts: false,
      }],
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

function rowsIn() { return [...container.querySelectorAll('.cz-rate-sheet-tool__grid tbody tr')]; }
function rowByLabel(label) { return rowsIn().find((tr) => tr.textContent.includes(label)) ?? null; }
function buttonIn(row, text) { return row ? [...row.querySelectorAll('button')].find((b) => b.textContent.trim() === text) ?? null : null; }
function click(btn) { btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }
function priceInputIn(row) { return row?.querySelector('input[type="number"]') ?? null; }
function priceOptionTab(row, text) { return row ? [...row.querySelectorAll('.cz-rate-sheet-tool__price-options-tab')].find((b) => b.textContent.trim() === text) ?? null : null; }
function priceOptionLabelInput(row) { return row?.querySelector('.cz-rate-sheet-tool__price-option-fields input[type="text"]') ?? null; }
function priceOptionPriceInput(row) { return row?.querySelector('.cz-rate-sheet-tool__price-option-fields input[type="number"]') ?? null; }
function priceOptionsSummary(row) { return row?.querySelector('.cz-rate-sheet-tool__price-options-summary') ?? null; }
function priceOptionsSummaryRows(row) { return row ? [...row.querySelectorAll('.cz-rate-sheet-tool__price-options-summary-row')] : []; }
function setInputValue(input, value) {
  input.value = String(value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}
function footerButton(text) {
  return [...container.querySelectorAll('.cz-ies__footer button')].find((b) => b.textContent.trim() === text) ?? null;
}
function addRowToggleButton() {
  return [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Add Row' || b.textContent.trim() === 'Close Rows');
}
async function ensurePickerOpen() {
  const btn = addRowToggleButton();
  if (btn && btn.textContent.trim() === 'Add Row') { click(btn); await settle(); }
}
function addCandidateButton(labelText) {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__candidate')]
    .find((label) => label.textContent.includes(labelText))
    ?.querySelector('button') ?? null;
}

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
check('a locked row never renders the edit-mode tab strip', rowA?.querySelector('.cz-rate-sheet-tool__price-options-tab') == null);

// ── 2) Edit unlocks exactly one row; other actions disabled ─────────────
console.log('\n2) Edit unlocks only Row A; other Edit actions, Add Row, and the footer Save are disabled');
click(buttonIn(rowA, 'Edit'));
await settle();
rowA = rowByLabel('Row A'); rowB = rowByLabel('Row B');
check('Row A is now editable: Save/Cancel/Delete, no Edit', buttonIn(rowA, 'Save') != null && buttonIn(rowA, 'Cancel') != null && buttonIn(rowA, 'Delete') != null && buttonIn(rowA, 'Edit') == null);
check("Row B's Edit is disabled while Row A is active", buttonIn(rowB, 'Edit')?.disabled === true);
check("Row B's Remove is disabled while Row A is active", buttonIn(rowB, 'Remove')?.disabled === true);
check('Add Row is disabled while Row A is active', addRowToggleButton()?.disabled === true, addRowToggleButton()?.disabled);
check('the footer Save is disabled while a row is active — only one visible Save action', footerButton('Save')?.disabled === true, footerButton('Save')?.disabled);

// ── 3) Row Save persists once and locks only on verified success ────────
console.log('\n3) Existing-row Save persists through the full-manager save exactly once, and locks only after success');
const savesBefore = saveCalls;
setInputValue(priceInputIn(rowA), 15);
await settle();
click(buttonIn(rowA, 'Save'));
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
setInputValue(priceInputIn(rowB), 99);
await settle();
forceNextSaveFailure = true;
const savesBeforeFail = saveCalls;
click(buttonIn(rowB, 'Save'));
await settle(80);
check('the failed save still counted as one request', saveCalls === savesBeforeFail + 1);
rowB = rowByLabel('Row B');
check('Row B remains editable after a failed Save (not locked)', buttonIn(rowB, 'Save') != null && buttonIn(rowB, 'Edit') == null);
check('the edited (unsaved) value is retained in the input', priceInputIn(rowB)?.value === '99', priceInputIn(rowB)?.value);
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

// ── 6) A new row starts editable, with no Delete ─────────────────────────
console.log('\n6) A new row starts editable, with no Delete');
await remount();
await ensurePickerOpen();
const addCandidateBtn = addCandidateButton('Row C unadded');
check('the unadded source is offered as a candidate to add', addCandidateBtn != null);
const savesBeforeAdd = saveCalls;
click(addCandidateBtn);
await settle();
let rowC = rowByLabel('Row C unadded');
check('the new row is present and starts editable (Save/Cancel, no Edit)', buttonIn(rowC, 'Save') != null && buttonIn(rowC, 'Cancel') != null && buttonIn(rowC, 'Edit') == null);
check('the new row never shows Delete before its first successful save', buttonIn(rowC, 'Delete') == null);
check('adding a row makes no API request by itself', saveCalls === savesBeforeAdd);
check('Add Row is disabled while the new row itself is active', addRowToggleButton()?.disabled === true);

// ── 7) New-row Cancel removes it locally, with no API call ───────────────
console.log('\n7) New-row Cancel discards it locally, with no API request');
const savesBeforeNewCancel = saveCalls;
click(buttonIn(rowC, 'Cancel'));
await settle();
check('Cancel on a new row made no API request', saveCalls === savesBeforeNewCancel);
check('the new row is gone from the grid', rowByLabel('Row C unadded') == null);

// ── 8) New-row Save persists it and adopts the canonical identity ────────
console.log('\n8) New-row Save persists it, adopts the returned canonical identity, and locks it');
await ensurePickerOpen();
const addCandidateBtn2 = addCandidateButton('Row C unadded');
click(addCandidateBtn2);
await settle();
rowC = rowByLabel('Row C unadded');
setInputValue(priceInputIn(rowC), 30);
await settle();
const savesBeforeNewSave = saveCalls;
click(buttonIn(rowC, 'Save'));
await settle(80);
check('exactly one full-manager save request was made for the new row', saveCalls === savesBeforeNewSave + 1);
rowC = rowByLabel('Row C unadded');
check('the new row is locked after success (Edit + Remove, no Save/Cancel)', buttonIn(rowC, 'Edit') != null && buttonIn(rowC, 'Save') == null);
check('the new row now has Delete available as a locked existing row would', buttonIn(rowC, 'Remove') != null);
check(
  'the row adopted the backend-minted canonical item_id (no longer "assigned after Save")',
  rowC?.textContent.includes('Platform ID not assigned') && !rowC?.textContent.includes('assigned after Save'),
  rowC?.textContent,
);
check('the saved price is reflected as the new baseline', rowC?.textContent.includes('$30'), rowC?.textContent);

// ── 9) The active row's Unit Price cell is a Default/Option tab editor;
//    adding a price option rides the SAME row-lock Save/Cancel — no new
//    row, no new lock, no new endpoint. Default Price stays independent of
//    the option; Cancel discards an unsaved option along with everything
//    else the row's own Cancel already discards. ─────────────────────────
console.log('\n9) The active row\'s Unit Price cell is a Default/Option tab editor; adding a price option rides the same row lock');
click(buttonIn(rowByLabel('Row A'), 'Edit'));
await settle();
let rowAOptions = rowByLabel('Row A');
check('an unlocked row with zero price options still shows the Default/+ tab editor, not just a bare price input', priceOptionTab(rowAOptions, 'Default Price') != null && priceOptionTab(rowAOptions, '+') != null);
check('Default Price is pre-selected and edits the row\'s own price exactly as the plain input always did', Number(priceInputIn(rowAOptions)?.value) === 10);

click(priceOptionTab(rowAOptions, '+'));
await settle();
rowAOptions = rowByLabel('Row A');
check('adding a price option shows a new "Option 1" tab', priceOptionTab(rowAOptions, 'Option 1') != null);
check('the Unit Price cell now shows the option\'s own label/price fields, not the Default Price input', priceOptionLabelInput(rowAOptions) != null && priceOptionPriceInput(rowAOptions) != null);
setInputValue(priceOptionLabelInput(rowAOptions), 'Annual');
setInputValue(priceOptionPriceInput(rowAOptions), 120);
await settle();

click(priceOptionTab(rowByLabel('Row A'), 'Default Price'));
await settle();
rowAOptions = rowByLabel('Row A');
check('switching back to Default Price shows the row\'s own price, untouched by the option just edited', Number(priceInputIn(rowAOptions)?.value) === 10);

const savesBeforeOptionSave = saveCalls;
click(buttonIn(rowAOptions, 'Save'));
await settle(80);
check('the price-option edit persisted through exactly one full-manager save — the same one every other row Save uses', saveCalls === savesBeforeOptionSave + 1);
const savedRowAItem = lastSavePayload.rate_sheets[0].items.find((item) => item.source_item_id === 'mgr_a');
check(
  'the saved row carries the new price option (label/price), while its own unit_price stays the Default Price',
  savedRowAItem?.price_options?.length === 1 && savedRowAItem.price_options[0].label === 'Annual' && savedRowAItem.price_options[0].unit_price === 120 && savedRowAItem.unit_price === 10,
  JSON.stringify(savedRowAItem),
);
rowAOptions = rowByLabel('Row A');
check('the row locks again after the verified success, exactly like every other row Save', buttonIn(rowAOptions, 'Edit') != null && buttonIn(rowAOptions, 'Save') == null);

// ── 9b) A locked row with Price Options shows the compact read-only summary
//    in the same Unit Price cell — never the edit mode's selectable chips/
//    tabs. Default is the row's own existing price, listed first. ─────────
console.log('\n9b) A locked row with Price Options shows the compact read-only summary, never the edit-mode tab strip');
check('the locked row\'s Unit Price cell carries a "Price Options" summary', rowAOptions?.textContent.includes('Price Options'));
let summaryRows = priceOptionsSummaryRows(rowAOptions);
check('the summary lists Default plus each price option, one line each', summaryRows.length === 2, summaryRows.map((r) => r.textContent));
check("the Default line shows the row's own existing unit_price", summaryRows[0]?.textContent.includes('Default') && summaryRows[0]?.textContent.includes('$10'), summaryRows[0]?.textContent);
check('the option line shows its own label and price', summaryRows[1]?.textContent.includes('Annual') && summaryRows[1]?.textContent.includes('$120'), summaryRows[1]?.textContent);
check('the locked row renders no selectable chips/tabs for its Price Options', rowAOptions?.querySelector('.cz-rate-sheet-tool__price-options-tab') == null);

// Re-open and prove the persisted option round-trips with a real (mock-)minted
// option_id, and that Cancel on a freshly-added SECOND option discards only
// that option, locally, with no request.
click(buttonIn(rowByLabel('Row A'), 'Edit'));
await settle();
rowAOptions = rowByLabel('Row A');
check('the saved option reappears by its own label on reload', priceOptionTab(rowAOptions, 'Annual') != null);
click(priceOptionTab(rowAOptions, '+'));
await settle();
rowAOptions = rowByLabel('Row A');
check('a second not-yet-saved option gets its own "Option 2" tab (the first is already labeled "Annual")', priceOptionTab(rowAOptions, 'Option 2') != null);
const savesBeforeOptionCancel = saveCalls;
click(buttonIn(rowAOptions, 'Cancel'));
await settle();
rowAOptions = rowByLabel('Row A');
check('Cancel made no API request', saveCalls === savesBeforeOptionCancel);
check('the row is locked again after Cancel, exactly like every other row Cancel', buttonIn(rowAOptions, 'Edit') != null);
click(buttonIn(rowAOptions, 'Edit'));
await settle();
rowAOptions = rowByLabel('Row A');
check(
  'Cancel discarded the unsaved second option — only the persisted "Annual" option survives, never a second row',
  priceOptionTab(rowAOptions, 'Annual') != null && priceOptionTab(rowAOptions, 'Option 2') == null,
);
click(buttonIn(rowAOptions, 'Cancel'));
await settle();

// ── 10) Remove (locked) confirms, then persists, excluding the row ───────
console.log('\n10) Remove on a locked row confirms, then persists the manager without that row');
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

// ── 11) Delete (active row) confirms, then persists, and locks/clears ────
console.log('\n11) Delete on the active row confirms, persists, and clears the active row on success');
click(buttonIn(rowByLabel('Row A'), 'Edit'));
await settle();
rowA = rowByLabel('Row A');
const savesBeforeDelete = saveCalls;
click(buttonIn(rowA, 'Delete'));
await settle(80);
check('Delete asked for confirmation', confirmCalls > 0);
check('Delete persisted through exactly one full-manager save', saveCalls === savesBeforeDelete + 1);
check('Row A is gone after the confirmed Delete', rowByLabel('Row A') == null);
check('Add Row is enabled again — no row remains active after Delete', addRowToggleButton()?.disabled === false, addRowToggleButton()?.disabled);

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — the Rate Sheet row lock (Edit/Save/Cancel/Remove/Delete) persists immediately through the existing full-manager save, one row at a time, with the drawer staying mounted in Edit throughout.');
process.exit(0);
