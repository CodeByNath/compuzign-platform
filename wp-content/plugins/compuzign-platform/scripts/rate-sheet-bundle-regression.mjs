// Rate Sheet Bundle — mounted regression.
//
// Mounts the REAL RateSheetDrawerContent (esbuild + happy-dom + Preact render,
// the same technique as scripts/rate-sheet-service-import-regression.mjs)
// against a fixture Package Manager, and proves the Bundle-as-real-row system
// end to end:
//
//   Phase 1 — the focused sheet is a DRAWER GROUP screen (Details / Options,
//     the same vocabulary and the same shared Tabs/Accordion renderers as the
//     Tier drawer). Both groups open READABLE; "+ Bundle" lives in the drawer's
//     own nav chrome beside the view toggle, gated on Options being active, and
//     never on the chip strip. "+ Bundle" opens the inline editor DIRECTLY —
//     the import engine IS what shows — with NO intermediate chip, no card,
//     and no precreated Bundle or row of any kind: nothing exists in
//     `bundles`/`items` until the first Import actually succeeds.
//   Phase 2 — that first Import mints the Bundle and its row TOGETHER: the
//     row is a REAL member of the sheet's own `items[]` (the same list every
//     ordinary row lives in), seeded once with the summed price of what was
//     selected. From then on the Bundle inline editor is the Rate Sheet row
//     editor: the SAME `RateSheetGridEditor`, under the SAME one-row-at-a-time
//     lock, Edit/Save/Cancel/Remove(/Delete once saved), the same Price
//     Options tab strip, Per/Qty/Group. The first column is `Product Bundle`
//     because that cell is the row's own name; no Delete-Bundle button lives
//     in the editor — whole-Bundle Remove is the module card's own action.
//   Phase 3 — composing browses three SIMULTANEOUS columns (Rate Sheets |
//     Rate Sheet Rows | Selected Rows): clicking a Rate Sheet replaces column
//     2 with its own priced rows, never clearing column 3 — never a raw
//     Service inclusion, which has no row yet to reference. A LATER Import on
//     an already-created Bundle only adds references — the row's price is
//     never re-touched. Composing across multiple sheets accumulates into one
//     selection; a source row is never copied, only referenced.
//
// Usage: npm run regression:rate-sheet-bundle
//    or: node scripts/rate-sheet-bundle-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-rate-sheet-bundle-bundle.mjs');
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
window.confirm = () => confirmReturnValue;
window.CompuZignConfig = { apiRoot: 'https://cz-test.local/wp-json/', nonce: 'test-nonce' };

// ── Fixture server state ────────────────────────────────────────────────
const SERVICE_ID = 501;
const BUILT_IN_UNITS = ['Per VM', 'Per GB', 'Per TB', 'Per vCPU', 'Per user', 'Per month', 'Per item'];

function baseManager() {
  return {
    service_id: SERVICE_ID,
    platform_status: 'active',
    has_configuration: true,
    sources: [],
    groups: [],
    category_groups: [],
    // An ordinary row's own label resolves through its Manager source — a
    // Bundle-backed row has none and never needs one here.
    items: [
      { item_id: 'mgr_website', source_type: 'inclusion', source_id: 'website', resolved: { label: 'Website Design' }, decorated_label: null, group_id: null, sort_order: 0, disabled: false, missing: false, module_transition: 'settled', source_service_id: null, source_service_title: null },
      { item_id: 'mgr_banking', source_type: 'inclusion', source_id: 'banking', resolved: { label: 'Online Banking' }, decorated_label: null, group_id: null, sort_order: 1, disabled: false, missing: false, module_transition: 'settled', source_service_id: null, source_service_title: null },
    ],
    rate_sheets: [{
      rate_sheet_id: 'rs_1',
      platform_id: 'CZPRC22222',
      title: 'Websites',
      status: 'active',
      groups: [],
      items: [
        { item_id: 'rate_website', platform_id: 'CZPRCI33333', source_item_id: 'mgr_website', bundle_id: '', label: '', unit_price: 10, per: 'Per item', quantity: 1, group_id: null, sort_order: 0, price_options: [] },
      ],
      bundles: [],
    }, {
      // A SECOND Rate Sheet, so the Bundle engine has something to compose
      // across — the whole point of it browsing sheets rather than Services.
      rate_sheet_id: 'rs_2',
      platform_id: 'CZPRC77777',
      title: 'Banking',
      status: 'active',
      groups: [],
      items: [
        { item_id: 'rate_banking', platform_id: 'CZPRCI88888', source_item_id: 'mgr_banking', bundle_id: '', label: '', unit_price: 40, per: 'Per month', quantity: 1, group_id: null, sort_order: 0, price_options: [] },
      ],
      bundles: [],
    }],
    rate_sheet_units: [...BUILT_IN_UNITS],
    projections: { inclusions: [], faqs: [] },
  };
}

let server = { manager: baseManager() };
let saveCalls = 0;
let lastSavePayload = null;
// Set true to make the NEXT save request fail, self-resetting — proves a
// failed first Import leaves no local trace for a retry to duplicate.
let forceSaveFailureOnce = false;

function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
function jsonResponse(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) });
}
function mintItemId(sourceItemId) { return `rate_minted_${sourceItemId}`; }
let bundleSeq = 0;
function mintBundleId() { bundleSeq += 1; return `rsb_minted_${bundleSeq}`; }
function mintBundleRowId(bundleId) { return `rate_minted_row_${bundleId}`; }
let optionSeq = 0;
function mintOptionId() { optionSeq += 1; return `opt_minted_${optionSeq}`; }

// The fixture backend mirrors PackageManagerSchema::commitConfiguration's own
// write-path mint: blank ids are minted here, never by the Tool.
const SUFFIX_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
let platformSeq = 0;
function mintPlatformId(prefix) {
  platformSeq += 1;
  return `${prefix}2222${SUFFIX_ALPHABET[platformSeq % SUFFIX_ALPHABET.length]}`;
}

// The Tool NEVER sends `platform_id` back for an existing record (it is
// output-only everywhere in this codebase — see toStoredRow/toStoredSheet),
// so a stored identity can only be found by looking it up against the PRIOR
// server state, keyed by the entity's own STABLE address — exactly the real
// backend's own reserve-or-reuse-by-address discipline
// (PackagePlatformIdentifierAdapters), never trust-from-payload. Minting
// happens only when no prior identity exists at that address.
function storeRow(item, rateSheetId, platformPrefix, priorPlatformIds) {
  const itemId = item.item_id !== '' ? item.item_id : mintItemId(item.source_item_id);
  return {
    ...item,
    item_id: itemId,
    platform_id: priorPlatformIds.row.get(`${rateSheetId} ${itemId}`) ?? mintPlatformId(platformPrefix),
    price_options: (item.price_options ?? []).map((option) => {
      const optionId = option.option_id !== '' ? option.option_id : mintOptionId();
      return {
        ...option,
        option_id: optionId,
        platform_id: priorPlatformIds.option.get(`${rateSheetId} ${itemId} ${optionId}`) ?? mintPlatformId('CZPRCIO'),
      };
    }),
  };
}

function applySave(payload) {
  const priorManager = server.manager;
  const manager = deepClone(priorManager);
  manager.sources = payload.sources;
  // The Manager item pool (mgr_website/mgr_banking) is fixture-fixed, not
  // derived from connected Services here — this harness no longer exercises
  // Service connection at all, since composing a Bundle never does.
  manager.groups = payload.groups;

  const priorPlatformIds = { row: new Map(), option: new Map(), bundle: new Map(), suppliedContent: new Map() };
  for (const sheet of priorManager.rate_sheets) {
    for (const item of sheet.items ?? []) {
      priorPlatformIds.row.set(`${sheet.rate_sheet_id} ${item.item_id}`, item.platform_id);
      for (const option of item.price_options ?? []) {
        priorPlatformIds.option.set(`${sheet.rate_sheet_id} ${item.item_id} ${option.option_id}`, option.platform_id);
      }
    }
    for (const bundle of sheet.bundles ?? []) {
      priorPlatformIds.bundle.set(`${sheet.rate_sheet_id} ${bundle.bundle_id}`, bundle.platform_id);
      for (const ref of bundle.supplied_content ?? []) {
        priorPlatformIds.suppliedContent.set(`${sheet.rate_sheet_id} ${bundle.bundle_id} ${ref.source_rate_sheet_id} ${ref.source_item_id}`, ref.platform_id);
      }
    }
  }

  for (const submitted of payload.rate_sheets) {
    const id = submitted.rate_sheet_id !== '' ? submitted.rate_sheet_id : 'rs_minted';
    // Mint every Bundle with a blank id, then resolve the shared `'new'`
    // sentinel on whichever row backs it — mirroring
    // PackageManagerSchema::commitConfiguration's own positional linking.
    const newlyMintedBundleIds = [];
    const bundles = (submitted.bundles ?? []).map((bundle) => {
      if (bundle.bundle_id !== '') return { ...bundle };
      const bundleId = mintBundleId();
      newlyMintedBundleIds.push(bundleId);
      return { ...bundle, bundle_id: bundleId };
    });
    let nextNewBundleIndex = 0;
    const items = submitted.items.map((item) => {
      if (item.bundle_id === 'new') {
        const bundleId = newlyMintedBundleIds[nextNewBundleIndex];
        nextNewBundleIndex += 1;
        const itemId = item.item_id !== '' ? item.item_id : mintBundleRowId(bundleId);
        return storeRow({ ...item, bundle_id: bundleId, item_id: itemId }, id, 'CZPRCI', priorPlatformIds);
      }
      return storeRow(item, id, 'CZPRCI', priorPlatformIds);
    });
    const itemIdByBundleId = new Map(items.filter((item) => item.bundle_id).map((item) => [item.bundle_id, item.item_id]));
    const storedBundles = bundles.map((bundle) => ({
      ...bundle,
      platform_id: priorPlatformIds.bundle.get(`${id} ${bundle.bundle_id}`) ?? mintPlatformId('CZPRCB'),
      item_id: itemIdByBundleId.get(bundle.bundle_id) ?? '',
      supplied_content: (bundle.supplied_content ?? []).map((reference) => ({
        ...reference,
        platform_id: priorPlatformIds.suppliedContent.get(`${id} ${bundle.bundle_id} ${reference.source_rate_sheet_id} ${reference.source_item_id}`) ?? mintPlatformId('CZPRCBI'),
      })),
    }));
    const stored = { ...submitted, rate_sheet_id: id, items, bundles: storedBundles };
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
    // useHostService() resolves the host Service from this same catalog —
    // it must carry SERVICE_ID even though composing no longer browses it.
    return jsonResponse({
      categories: [],
      stations: [{
        id: SERVICE_ID, platform_id: `CZS${SERVICE_ID}`, title: 'Test Service', slug: 'test-service',
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
    if (forceSaveFailureOnce) {
      forceSaveFailureOnce = false;
      return jsonResponse({ success: false, message: 'Simulated save failure' });
    }
    lastSavePayload = JSON.parse(init.body ?? '{}');
    applySave(lastSavePayload);
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
function chips() { return [...container.querySelectorAll('.cz-drawer-groups__chip')]; }
function chipLabels() { return chips().map((c) => c.textContent.trim()); }
function chipByLabel(label) { return chips().find((c) => c.textContent.trim() === label) ?? null; }
function activeChipLabel() {
  return chips().find((c) => c.getAttribute('aria-selected') === 'true')?.textContent.trim() ?? null;
}
// ── Drawer group chrome (the top-level Details/Options nav) ──────────────
function detailRoot() { return container.querySelector('.cz-req-detail'); }
function groupTabs() { return [...container.querySelectorAll('.cz-drawer-groups__tab')]; }
function groupTabLabels() { return groupTabs().map((t) => t.textContent.trim()); }
function activeGroupTab() {
  return groupTabs().find((t) => t.getAttribute('aria-selected') === 'true')?.textContent.trim() ?? null;
}
function selectGroup(label) { click(groupTabs().find((t) => t.textContent.trim() === label)); }
function navTrailingButtons() {
  return [...container.querySelectorAll('.cz-drawer-groups__tablist-trailing button')];
}
function addBundleButton() {
  return navTrailingButtons().find((b) => b.textContent.trim() === '+ Bundle') ?? null;
}
function viewToggleButton() { return container.querySelector('.cz-drawer-groups__view-toggle'); }
// ── Readable module cards and the focused editor they open ──────────────
function moduleCard(title) {
  return [...container.querySelectorAll('.drawerModule')]
    .find((card) => card.querySelector('.drawerModule__title')?.textContent.trim() === title) ?? null;
}
function cardEditButton(title) {
  return [...(moduleCard(title)?.querySelectorAll('.drawerModule__footer button') ?? [])]
    .find((b) => b.textContent.trim() === 'Edit') ?? null;
}
function editorShell() { return container.querySelector('.cz-ies'); }
function editorTitle() { return container.querySelector('.cz-ies__title')?.textContent.trim() ?? null; }
function bundleWorkspace() { return container.querySelector('.cz-rate-sheet-tool__bundle'); }
function rowsIn() {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__grid tbody tr')]
    .filter((tr) => tr.closest('.cz-rate-sheet-tool__import') === null);
}
function gridHeaders() {
  const grid = [...container.querySelectorAll('.cz-rate-sheet-tool__grid')]
    .find((table) => table.closest('.cz-rate-sheet-tool__import') === null) ?? null;
  return [...(grid?.querySelectorAll('thead th') ?? [])].map((th) => th.textContent.trim());
}
/** The Bundle row's read-only Supplied content cell — one entry per reference. */
function suppliedItems() {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__supplied-item')];
}
function suppliedLabels() {
  return suppliedItems().map((li) => li.querySelector('span')?.textContent.trim() ?? '');
}
/** Chips of one of the engine's columns, addressed by that column's own label. */
function columnChips(columnLabel) {
  const column = [...container.querySelectorAll('.cz-rate-sheet-tool__import-column')]
    .find((col) => col.querySelector('.cz-rate-sheet-tool__import-column-label')?.textContent.trim().startsWith(columnLabel)) ?? null;
  return [...(column?.querySelectorAll('.cz-rate-sheet-tool__import-chip') ?? [])];
}
function buttonIn(row, label) {
  return [...(row?.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim() === label) ?? null;
}
function anyButton(label) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === label) ?? null;
}
// The SAME Default/Option tab strip every ordinary row's Unit Price cell
// uses (scripts/rate-sheet-row-lock-regression.mjs) — proving a Bundle row's
// own Price Options ride the identical shared engine, never a second one.
function priceOptionTab(row, text) { return row ? [...row.querySelectorAll('.cz-rate-sheet-tool__price-options-tab')].find((b) => b.textContent.trim() === text) ?? null : null; }
function priceOptionLabelInput(row) { return row?.querySelector('.cz-rate-sheet-tool__price-option-fields input[type="text"]') ?? null; }
function priceOptionPriceInput(row) { return row?.querySelector('.cz-rate-sheet-tool__price-option-fields input[type="number"]') ?? null; }
function importColumnLabels() {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__import-columns .cz-rate-sheet-tool__import-column-label')]
    .map((p) => p.textContent.trim());
}
function cardActionButton(title, label) {
  return [...(moduleCard(title)?.querySelectorAll('.drawerModule__footer button') ?? [])]
    .find((b) => b.textContent.trim() === label) ?? null;
}
function importActionButton(text) {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__import-actions button')].find((b) => b.textContent.trim().startsWith(text)) ?? null;
}

// The drawer opens in VIEW, the way the module entry contract requires — every
// group is readable first, and only a card's own Edit opens an editor.
async function remount() {
  render(null, container);
  server = { manager: baseManager() };
  saveCalls = 0; lastSavePayload = null; confirmReturnValue = true; forceSaveFailureOnce = false;
  optionSeq = 0; bundleSeq = 0; platformSeq = 0;
  render(h(Harness, { recordId: 'rs_1', mode: 'view' }), container);
  await settle();
}

console.log('Rate Sheet Bundle regression\n');

// ── A) Phase 1 — the drawer group screen and Bundle authoring entry ──────
console.log('A) The focused sheet is a Details/Options drawer group screen');
await remount();
check('the focused sheet opens on drawer group tabs', groupTabLabels().join('|') === 'Details|Options', groupTabLabels().join('|'));
check('it opens READABLE on Details, never in an editor', activeGroupTab() === 'Details' && editorShell() == null, activeGroupTab());
check('Details reads the Rate Sheet itself, with its CZPRC', moduleCard('Rate Sheet')?.textContent.includes('CZPRC22222'));
check('the nav carries the Tabs/Accordion view toggle', viewToggleButton() != null);
check('"+ Bundle" is not offered while Details is the active group', addBundleButton() == null);

selectGroup('Options');
await settle();
check('Options becomes the active group', activeGroupTab() === 'Options', activeGroupTab());
check('"+ Bundle" lives in the drawer nav, beside the view toggle', addBundleButton() != null);
check('and never on the chip strip\'s own trailing seam', container.querySelector('.cz-drawer-groups__chip-strip-trailing') == null);
check('Options renders a proper empty state with zero Bundles', container.querySelector('.cz-admin-empty')?.textContent.includes('No Bundles yet'));
check('and no Bundle card, because none is selected', moduleCard('Bundle') == null);

// The view toggle swaps which shared renderer draws the nav — never which
// groups exist or which one is active.
click(viewToggleButton());
await settle();
check('the view toggle switches the nav to the shared accordion renderer', container.querySelector('.cz-drawer-groups__accordion') != null);
check('the same two groups are offered in accordion view', [...container.querySelectorAll('.cz-drawer-groups__accordion-trigger')].map((t) => t.textContent.trim()).join('|') === 'Details|Options');
check('"+ Bundle" rides the accordion nav\'s own trailing slot', [...container.querySelectorAll('.cz-drawer-groups__accordion-trailing button')].some((b) => b.textContent.trim() === '+ Bundle'));
check('and Options is still the open group', container.querySelector('#cz-drawer-group-options-panel')?.hasAttribute('hidden') === false);
click(viewToggleButton());
await settle();
check('toggling back restores the tab bar with Options still active', activeGroupTab() === 'Options', activeGroupTab());

const savesBeforeCreate = saveCalls;
click(addBundleButton());
await settle();
check('"+ Bundle" opens the inline editor DIRECTLY — no intermediate chip or card click', editorShell() != null);
check('creating a Bundle makes no API request — nothing is minted until the first Import succeeds', saveCalls === savesBeforeCreate);
check('NO Bundle chip exists yet — never a precreated placeholder record', !chipLabels().includes('Untitled Bundle'), chipLabels().join('|'));
check('and no Bundle module card either — there is nothing yet to read', moduleCard('Bundle') == null);
check('the editor titles itself "New Bundle" while nothing exists to name it', editorTitle() === 'New Bundle', editorTitle());
check('the editor is a focused task that suppresses the group chrome', detailRoot()?.className.includes('cz-req-detail--editing'), detailRoot()?.className);
check('the group renderers stay mounted beneath it, never unmounted', container.querySelector('.cz-drawer-groups__tablist') != null);
check('NO row exists yet — nothing to edit until the first Import creates it', rowsIn().length === 0, rowsIn().length);
check('the import engine is what shows — not the Bundle row workspace', bundleWorkspace() == null);
check('there is no Close button while authoring — Cancel is the only way out', anyButton('Close') == null);

// ── B) Phase 2 — the Bundle's own first Import mints Bundle + row together ──
console.log('\nB) The first Import mints the Bundle and its row together');
check('the Rate Sheet engine opens, aria-labelled for composing this Bundle', container.querySelector('[aria-label="Compose this Bundle from Rate Sheet rows"]') != null);
check(
  'it browses three SIMULTANEOUS columns — Rate Sheets, Rate Sheet Rows, and the accumulating Selected Rows',
  importColumnLabels().length === 3
    && importColumnLabels()[0] === 'Rate Sheets'
    && importColumnLabels()[1] === 'Rate Sheet Rows'
    && importColumnLabels()[2].startsWith('Selected Rows'),
  importColumnLabels().join('|'),
);
const sheetChip = (label) => columnChips('Rate Sheets').find((b) => b.textContent.includes(label)) ?? null;
const rowChip = (label) => columnChips('Rate Sheet Rows').find((b) => b.textContent.includes(label)) ?? null;
const selectedChip = (label) => columnChips('Selected Rows').find((b) => b.textContent.includes(label)) ?? null;
check('every Rate Sheet in the collection is offered', sheetChip('Websites') != null && sheetChip('Banking') != null);
check('Rate Sheet Rows starts empty until a Rate Sheet is picked', columnChips('Rate Sheet Rows').length === 0);

click(sheetChip('Websites'));
await settle();
check('picking a source Rate Sheet lists its own priced rows', rowChip('Website Design') != null);
click(rowChip('Website Design'));
await settle();
check('it moves into Selected Rows', selectedChip('Website Design') != null);
check('and is no longer offered again in Rate Sheet Rows', rowChip('Website Design') == null);

// Moving to ANOTHER sheet accumulates — Selected Rows is never cleared, so
// one Bundle composes across as many sheets as picked.
click(sheetChip('Banking'));
await settle();
check('picking a second Rate Sheet does not clear Selected Rows', selectedChip('Website Design') != null);
check('the second sheet\'s own row is offered, showing the price it already carries', rowChip('Online Banking')?.textContent.includes('$40'), rowChip('Online Banking')?.textContent);
click(rowChip('Online Banking'));
await settle();
check('composing across two Rate Sheets accumulates into ONE Selected Rows list', columnChips('Selected Rows').length === 2, columnChips('Selected Rows').length);

const savesBeforeImport = saveCalls;
click(importActionButton('Import'));
await settle(60);
check('Import persists through exactly one full-manager save', saveCalls === savesBeforeImport + 1, saveCalls - savesBeforeImport);
check('the editor session stays open — Import is not the footer\'s own Save', editorShell() != null && activeGroupTab() === 'Options');
check('authoring ends and the SAME session now shows the minted Bundle\'s own row workspace', bundleWorkspace() != null);

const publishedSheet = lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_1');
const publishedBundle = publishedSheet?.bundles?.[0];
const publishedRow = publishedSheet?.items?.find((item) => (item.bundle_id ?? '') !== '');
check('the save payload carries the Bundle under its owning sheet', publishedBundle != null);
check('the Bundle is submitted with a blank id — the backend mints it', publishedBundle?.bundle_id === '', publishedBundle?.bundle_id);
check('its own row is submitted in the SAME items[] list as the ordinary row, marked with the reserved sentinel', publishedRow?.bundle_id === 'new', publishedRow?.bundle_id);
check('the row is seeded with the SUM of what was selected ($10 + $40 = $50)', publishedRow?.unit_price === 50, publishedRow?.unit_price);
check('both references are submitted as supplied_content, naming their OWN source sheets', publishedBundle?.supplied_content?.length === 2, publishedBundle?.supplied_content);
check('the sheet\'s own ordinary row is untouched by the Bundle import', publishedSheet?.items?.length === 2, publishedSheet?.items?.length);
check('the Bundle is now ONE row', rowsIn().length === 1, rowsIn().length);
check('both supplied references read in its Supplied content block', suppliedLabels().length === 2, suppliedLabels().join('; '));
// CZPRCB lives on the Bundle record itself (shown on its read card, not
// inside the row editor); the row's own Platform ID cell shows its OWN,
// DIFFERENT identity — CZPRCB never replaces it.
const storedBundlePlatformId = server.manager.rate_sheets[0].bundles[0].platform_id;
check('the saved Bundle carries a minted Platform ID (CZPRCB)', /^CZPRCB/.test(storedBundlePlatformId), storedBundlePlatformId);
check('the row also carries its own, DIFFERENT Platform ID (CZPRCI)', rowsIn()[0]?.textContent.includes('CZPRCI'), rowsIn()[0]?.textContent.slice(0, 200));
check(
  'Product Bundle names the row, and Supplied content is its OWN column right after it',
  gridHeaders().slice(0, 6).join('|') === 'Product Bundle|Supplied content|Unit Price|Per|Qty|Group',
  gridHeaders().join('|'),
);

// ── C) The freshly created row opens EDITING immediately, then the shared lock ──
console.log('\nC) The Bundle\'s row opens for editing immediately, then rides the shared lock');
const freshlyCreatedRow = rowsIn()[0];
check(
  'the row does NOT land locked — Import binds the row editor to it directly, never a summary-only card',
  buttonIn(freshlyCreatedRow, 'Edit') == null,
  freshlyCreatedRow.textContent.slice(0, 160),
);
check('it opens straight into the SAME inline row editor\'s Save/Cancel', buttonIn(freshlyCreatedRow, 'Save') != null && buttonIn(freshlyCreatedRow, 'Cancel') != null);
check('a SAVED Bundle row offers Delete too — it is a normal saved row, never a blank draft', buttonIn(freshlyCreatedRow, 'Delete') != null);
check('it carries the ordinary Price Options tab strip', freshlyCreatedRow.querySelector('.cz-rate-sheet-tool__price-options-tabs') != null);
check('and the ordinary Per and Group dropdowns', freshlyCreatedRow.querySelectorAll('select').length === 2, freshlyCreatedRow.querySelectorAll('select').length);
check('there is no Delete Bundle button in the editor', anyButton('Delete Bundle') == null);

// Cancelling this initial edit reverts to the SAME locked, read-only state a
// sheet row's own Cancel leaves — and Edit reopens it bound to the SAME
// persisted row, never a blank "New Bundle" draft.
click(buttonIn(freshlyCreatedRow, 'Cancel'));
await settle();
const lockedRow = rowsIn()[0];
check('Cancel locks it — the same read-only state a sheet row\'s Cancel leaves', buttonIn(lockedRow, 'Edit') != null);
check('a locked Bundle row offers Edit and Remove, nothing else', buttonIn(lockedRow, 'Remove') != null && buttonIn(lockedRow, 'Save') == null);
check('a locked Bundle row shows no inputs at all', lockedRow.querySelector('input') == null && lockedRow.querySelector('select') == null);

click(buttonIn(rowsIn()[0], 'Edit'));
await settle();
const openRow = rowsIn()[0];
check('Edit unlocks it into the SAME inline row editor, bound to the SAME persisted row', buttonIn(openRow, 'Save') != null && buttonIn(openRow, 'Cancel') != null);
check('a SAVED Bundle row offers Delete too — it is a normal saved row', buttonIn(openRow, 'Delete') != null);
check('it carries the ordinary Price Options tab strip', openRow.querySelector('.cz-rate-sheet-tool__price-options-tabs') != null);
check('and the ordinary Per and Group dropdowns', openRow.querySelectorAll('select').length === 2, openRow.querySelectorAll('select').length);

// Phase 4 — Bundle Name/reprice/Price-Option-add together must not remint
// ANY of the Bundle's own identities. Captured fresh, right before the edit,
// against the CURRENT stored truth (not the earlier Section B capture).
const beforeEditBundle = server.manager.rate_sheets[0].bundles[0];
const beforeEditRow = server.manager.rate_sheets[0].items.find((item) => (item.bundle_id ?? '') !== '');

const nameInput = openRow.querySelector('input[type="text"]');
setInputValue(nameInput, 'Digital Banking Website');
await settle();
check('the row\'s own name cell is the Product Bundle name', editorTitle() === 'Digital Banking Website', editorTitle());
const priceField = rowsIn()[0].querySelector('.cz-rate-sheet-tool__price-option-fields input[type="number"]');
setInputValue(priceField, 75);
await settle();
check('naming and repricing it makes no API request until Save', saveCalls === savesBeforeImport + 1);

// A Bundle row's own Price Option rides the IDENTICAL Default/+ tab engine
// row-lock-regression.mjs already proves for an ordinary row — no second
// pricing engine, no Bundle-specific option UI.
click(priceOptionTab(rowsIn()[0], '+'));
await settle();
check('adding a Price Option on a Bundle row shows the SAME "Option 1" tab an ordinary row gets', priceOptionTab(rowsIn()[0], 'Option 1') != null);
setInputValue(priceOptionLabelInput(rowsIn()[0]), 'Combo');
setInputValue(priceOptionPriceInput(rowsIn()[0]), 90);
await settle();
click(priceOptionTab(rowsIn()[0], 'Default Price'));
await settle();
check('switching back to Default Price shows the row\'s own reprice, untouched by the option just added', Number(rowsIn()[0]?.querySelector('.cz-rate-sheet-tool__price-option-fields input[type="number"]')?.value) === 75);

const savesBeforeRowSave = saveCalls;
click(buttonIn(rowsIn().find((tr) => buttonIn(tr, 'Save') != null), 'Save'));
await settle(60);
check('the row\'s own Save persists through the same one full-manager save', saveCalls === savesBeforeRowSave + 1, saveCalls - savesBeforeRowSave);
check('and locks the row again', buttonIn(rowsIn()[0], 'Edit') != null);

const savedBundleRow = lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_1')?.items?.find((item) => (item.bundle_id ?? '') !== '');
check('the payload carries the Product Bundle name on the ROW', savedBundleRow?.label === 'Digital Banking Website', savedBundleRow?.label);
check("the row's own reprice — independent of what its supplied content sums to", savedBundleRow?.unit_price === 75, savedBundleRow?.unit_price);
check(
  'the payload carries the new Price Option (label/price), normal and unmarked, alongside the Default reprice',
  savedBundleRow?.price_options?.length === 1 && savedBundleRow.price_options[0].label === 'Combo' && savedBundleRow.price_options[0].unit_price === 90,
  JSON.stringify(savedBundleRow?.price_options),
);

const afterEditBundle = server.manager.rate_sheets[0].bundles[0];
const afterEditRow = server.manager.rate_sheets[0].items.find((item) => (item.bundle_id ?? '') !== '');
check('renaming, repricing, AND adding a Price Option together never remint bundle_id', afterEditBundle.bundle_id === beforeEditBundle.bundle_id);
check('...nor CZPRCB', afterEditBundle.platform_id === beforeEditBundle.platform_id);
check('...nor the row\'s own item_id', afterEditRow.item_id === beforeEditRow.item_id);
check('...nor its CZPRCI', afterEditRow.platform_id === beforeEditRow.platform_id);
check(
  'the new Price Option mints its OWN CZPRCIO — distinct from the row\'s CZPRCI and the Bundle\'s CZPRCB',
  /^CZPRCIO/.test(afterEditRow.price_options?.[0]?.platform_id ?? '') && afterEditRow.price_options[0].platform_id !== afterEditRow.platform_id,
  afterEditRow.price_options?.[0]?.platform_id,
);
check(
  "the referenced Website row kept its own unchanged price",
  lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_1')?.items?.find((item) => item.source_item_id === 'mgr_website')?.unit_price === 10,
);

// Supplied content lives in the ROW's own cell — one place, no second block.
check('the compiled content reads in its own cell of that row', rowsIn()[0]?.querySelector('.cz-rate-sheet-tool__cell-extra .cz-rate-sheet-tool__supplied-list') != null);
check('the name cell carries only the name, never the content', rowsIn()[0]?.querySelector('.cz-rate-sheet-tool__cell-name .cz-rate-sheet-tool__supplied-list') == null);
check('and never in a second block beneath the grid', container.querySelector('.cz-rate-sheet-tool__supplied') == null);
check('a LOCKED row offers no removal — it is read-only like any row', container.querySelector('.cz-rate-sheet-tool__supplied-remove') == null);

// Removing individual supplied content stays available on the unlocked row —
// and only removes THIS Bundle's membership, never the referenced row.
click(buttonIn(rowsIn()[0], 'Edit'));
await settle();
const beforeRemove = suppliedLabels().length;
check('the unlocked row offers removal per reference', container.querySelector('.cz-rate-sheet-tool__supplied-remove') != null);
click(container.querySelector('.cz-rate-sheet-tool__supplied-remove'));
await settle();
check('a reference can still be removed from the combination', suppliedLabels().length === beforeRemove - 1, suppliedLabels().length);

const savesBeforeDrop = saveCalls;
click(buttonIn(rowsIn().find((tr) => buttonIn(tr, 'Save') != null), 'Save'));
await settle(60);
check('removing a reference persists through the same one save', saveCalls === savesBeforeDrop + 1, saveCalls - savesBeforeDrop);
check('and the row locks again', buttonIn(rowsIn()[0], 'Edit') != null);
check(
  'the dropped reference is gone from the payload',
  (lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_1')?.bundles?.[0]?.supplied_content ?? []).length === 1,
);

click(anyButton('Cancel'));
await settle();
if (anyButton('Discard')) { click(anyButton('Discard')); await settle(); }
check('leaving the editor returns to the readable Options group', editorShell() == null && activeGroupTab() === 'Options', activeGroupTab());
check('the now-real, saved Bundle reads its OWN row name as its chip', activeChipLabel() === 'Digital Banking Website', chipLabels().join('|'));
check('the module card reads lean — no single-declaration price/per/qty/group', !moduleCard('Bundle')?.textContent.includes('Qty'), moduleCard('Bundle')?.textContent.slice(0, 300));
check('it names the Bundle and what it compiles', moduleCard('Bundle')?.textContent.includes('Product Bundle') && moduleCard('Bundle')?.textContent.includes('Supplied content'));
check('whole-Bundle Remove lives on the module action footer', cardActionButton('Bundle', 'Remove') != null);

// ── D) A LATER Import on an already-created Bundle only adds references ──
console.log('\nD) A later Import composes further without re-touching the row\'s price');
click(cardEditButton('Bundle'));
await settle();
check('an already-saved Bundle\'s workspace offers "+ Add Rate Sheet" as a TOGGLE — never a raw Service inclusion', anyButton('+ Add Rate Sheet') != null && anyButton('+ Add Service') == null);
click(anyButton('+ Add Rate Sheet'));
await settle();
check('reopening the engine on an existing Bundle offers its own Close button', anyButton('Close') != null);
click(columnChips('Rate Sheets').find((b) => b.textContent.includes('Banking')));
await settle();
check(
  'a reference already in this Bundle is never offered twice',
  columnChips('Rate Sheet Rows').length === 0,
  columnChips('Rate Sheet Rows').map((b) => b.textContent),
);

// Website Design was DROPPED from this Bundle back in section C — it is
// offered again, and completing a real second Import here proves the
// guarantee end to end, not just that the picker's own dedup works.
click(columnChips('Rate Sheets').find((b) => b.textContent.includes('Websites')));
await settle();
check('a reference dropped earlier is offered again', columnChips('Rate Sheet Rows').some((b) => b.textContent.includes('Website Design')));
click(columnChips('Rate Sheet Rows').find((b) => b.textContent.includes('Website Design')));
await settle();

const bundleRowBefore = server.manager.rate_sheets[0].items.find((item) => (item.bundle_id ?? '') !== '');
const suppliedBeforeLaterImport = suppliedLabels().length;
const savesBeforeLaterImport = saveCalls;
click(importActionButton('Import'));
await settle(60);
check('the later Import persists through exactly one more full-manager save', saveCalls === savesBeforeLaterImport + 1, saveCalls - savesBeforeLaterImport);
check('composing further accumulates — Website Design is back, alongside the still-referenced Banking row', suppliedLabels().length === suppliedBeforeLaterImport + 1, suppliedLabels().join('; '));

const laterImportSheet = server.manager.rate_sheets[0];
const laterImportBundle = laterImportSheet.bundles[0];
const bundleRowAfter = laterImportSheet.items.find((item) => (item.bundle_id ?? '') !== '');
check('the payload/stored Bundle now carries BOTH references again', laterImportBundle.supplied_content.length === 2, laterImportBundle.supplied_content);
check('the Bundle\'s own CZPRCB is unchanged by composing further', laterImportBundle.platform_id === storedBundlePlatformId);
check(
  'the Bundle\'s own row identity AND price are unchanged by composing further — never re-touched by a later Import',
  bundleRowAfter.item_id === bundleRowBefore.item_id && bundleRowAfter.platform_id === bundleRowBefore.platform_id && bundleRowAfter.unit_price === bundleRowBefore.unit_price,
);
check(
  'Website Design\'s own row, back on ITS OWN sheet (the Bundle\'s own sheet — a same-sheet reference), is untouched by being re-referenced',
  laterImportSheet.items.find((item) => item.source_item_id === 'mgr_website')?.unit_price === 10,
);

click(anyButton('Close'));
await settle();

// ── E) The Bundle's row rides the ordinary items list ────────────────────
console.log("\nE) The Bundle's row rides the ordinary items list, and the Tool ignores its own round trip");
// The fixture backend now answers reads the way buildReadModel does: a
// Bundle-backed row carries self_priced/includes, live-resolved.
server.manager.rate_sheets[0].items.push({
  item_id: 'rate_bundle_offer', platform_id: 'CZPRCI99999', source_item_id: '', bundle_id: 'rsb_extra',
  self_priced: true, label: 'Extra Soup', unit_price: 75, per: 'Per item',
  quantity: 1, group_id: null, sort_order: 9, price_options: [], includes: [],
});
server.manager.rate_sheets[0].bundles.push({
  bundle_id: 'rsb_extra', platform_id: 'CZPRCB99999', status: 'active', sort_order: 1,
  item_id: 'rate_bundle_offer', supplied_content: [],
});
render(null, container);
render(h(Harness, { recordId: 'rs_1', mode: 'view' }), container);
await settle();
click(cardEditButton('Rate Sheet'));
await settle();
check(
  "the Tool never shows a Bundle's own row as an editable sheet row under Details",
  ![...rowsIn()].some((tr) => tr.textContent.includes('Extra Soup')),
  rowsIn().map((r) => r.textContent.slice(0, 40)),
);

const savesBeforeRoundTrip = saveCalls;
const firstRow = rowsIn()[0];
click(buttonIn(firstRow, 'Edit'));
await settle();
click(buttonIn(rowsIn().find((tr) => buttonIn(tr, 'Save') != null), 'Save'));
await settle(60);
check('an ordinary save still goes through', saveCalls === savesBeforeRoundTrip + 1);
check(
  "and the Bundle row it never touched round-trips unchanged in the payload",
  (lastSavePayload?.rate_sheets ?? []).some((sheet) => (sheet.items ?? []).some((row) => row.item_id === 'rate_bundle_offer')),
  JSON.stringify((lastSavePayload?.rate_sheets ?? [])[0]?.items?.map((r) => r.item_id)),
);

// ── F) A failed first Import leaves nothing local to duplicate on retry ──
console.log("\nF) A failed first Import leaves no local trace — a retry never duplicates the Bundle");
await remount();
selectGroup('Options');
await settle();
click(addBundleButton());
await settle();
click(sheetChip('Websites'));
await settle();
click(rowChip('Website Design'));
await settle();

forceSaveFailureOnce = true;
const savesBeforeFailedImport = saveCalls;
click(importActionButton('Import'));
await settle(60);
check('the failed attempt still made exactly one request', saveCalls === savesBeforeFailedImport + 1, saveCalls - savesBeforeFailedImport);
check(
  'the picker stays open on failure, with its own error shown',
  container.querySelector('[aria-label="Compose this Bundle from Rate Sheet rows"]') != null && container.querySelector('.cz-admin-error-msg') != null,
);
check('nothing was minted server-side — the sheet still has no Bundle', server.manager.rate_sheets[0].bundles.length === 0, server.manager.rate_sheets[0].bundles.length);
check('the picked row is still staged, ready to retry with no re-picking', selectedChip('Website Design') != null);

const savesBeforeRetry = saveCalls;
click(importActionButton('Import'));
await settle(60);
check('retrying succeeds through one more request', saveCalls === savesBeforeRetry + 1, saveCalls - savesBeforeRetry);
check('exactly ONE Bundle exists — the failed attempt left no orphan to duplicate', server.manager.rate_sheets[0].bundles.length === 1, server.manager.rate_sheets[0].bundles.length);
check(
  'and exactly ONE Bundle-backed row exists alongside it',
  server.manager.rate_sheets[0].items.filter((item) => (item.bundle_id ?? '') !== '').length === 1,
  server.manager.rate_sheets[0].items.filter((item) => (item.bundle_id ?? '') !== '').length,
);

// ── G) The read card's own Remove deletes by the Bundle's REAL linked row ──
// Regression for a specific identity-mismatch bug: RateSheetBundleRead's
// Remove used to pass the Bundle's OWN key (a `rsb_…`/`new:…` id) straight
// into `removeRowImmediately`, which accepts a Rate Sheet ROW id and detects
// Bundle ownership itself by matching `bundle.itemId === rowId`. Since a
// Bundle's own key is never equal to any row's key, that comparison always
// missed — Remove silently fell through to the ordinary-row branch, which
// then matched no row either, so the confirmed "Remove" was a no-op.
console.log("\nG) The read card's own Remove identifies the exact linked row — never falls through to ordinary-row deletion");
await remount();
selectGroup('Options');
await settle();

// Bundle A — Website Design, on this same sheet.
click(addBundleButton());
await settle();
click(sheetChip('Websites'));
await settle();
click(rowChip('Website Design'));
await settle();
click(importActionButton('Import'));
await settle(60);
click(buttonIn(rowsIn()[0], 'Cancel')); // lock the freshly opened row
await settle();
click(anyButton('Cancel')); // leave the Bundle's own editor session
await settle();
if (anyButton('Discard')) { click(anyButton('Discard')); await settle(); }

// Bundle B — Online Banking, referencing the OTHER sheet's row — proves
// Remove never touches a sibling Bundle.
click(addBundleButton());
await settle();
click(sheetChip('Banking'));
await settle();
click(rowChip('Online Banking'));
await settle();
click(importActionButton('Import'));
await settle(60);
click(buttonIn(rowsIn()[0], 'Cancel'));
await settle();
click(anyButton('Cancel'));
await settle();
if (anyButton('Discard')) { click(anyButton('Discard')); await settle(); }

check('both Bundles exist, back on the readable Options group', chipLabels().length === 2, chipLabels().join('|'));
check('back on the readable card — not the inline editor', editorShell() == null);

// Explicitly select Bundle B (the second chip, by creation order) so Remove
// is proven against a SPECIFIC, deliberately chosen Bundle rather than
// whichever the switcher happened to auto-select.
click(chips()[1]);
await settle();

const bundleAEntry = server.manager.rate_sheets[0].bundles[0];
const bundleBEntry = server.manager.rate_sheets[0].bundles[1];
const websiteRowBefore = server.manager.rate_sheets[0].items.find((item) => item.source_item_id === 'mgr_website');
const bankingRowBefore = server.manager.rate_sheets[1].items.find((item) => item.source_item_id === 'mgr_banking');
check('Bundle B is the one now selected on the read card', moduleCard('Bundle') != null);

const savesBeforeCardRemove = saveCalls;
click(cardActionButton('Bundle', 'Remove'));
await settle(60);
check('the read card\'s own Remove persists through exactly one full-manager save', saveCalls === savesBeforeCardRemove + 1, saveCalls - savesBeforeCardRemove);

const remainingBundles = server.manager.rate_sheets[0].bundles;
check(
  'exactly Bundle B is deleted — Bundle A survives, completely untouched',
  remainingBundles.length === 1 && remainingBundles[0].bundle_id === bundleAEntry.bundle_id,
  remainingBundles.map((b) => b.bundle_id),
);
check(
  "Bundle B's own linked row is gone from items[] — the SAME delete a row's own Remove performs",
  server.manager.rate_sheets[0].items.every((item) => item.item_id !== bundleBEntry.item_id),
  server.manager.rate_sheets[0].items.map((item) => item.item_id),
);
check("Bundle A's own row is untouched — deleting B never falls through onto it", server.manager.rate_sheets[0].items.some((item) => item.item_id === bundleAEntry.item_id));
check(
  "the sheet's own ordinary Website Design row is untouched",
  server.manager.rate_sheets[0].items.find((item) => item.item_id === websiteRowBefore.item_id)?.unit_price === websiteRowBefore.unit_price,
);
check(
  "the OTHER sheet's own ordinary Online Banking row is untouched",
  server.manager.rate_sheets[1].items.find((item) => item.item_id === bankingRowBefore.item_id)?.unit_price === bankingRowBefore.unit_price,
);
check('the selection reconciles onto the one remaining Bundle — Bundle A', chipLabels().length === 1 && moduleCard('Bundle') != null, chipLabels().join('|'));

// ── H) Remove still works even when the Bundle's OWN row fails to resolve ──
// A defensive regression: the read card's Remove must not silently no-op
// when `findBundleRow()` comes back null for some reason (a stale or
// inconsistent stored link) — `removeBundleImmediately` addresses the Bundle
// by its OWN key directly, never inferred from a row id.
console.log("\nH) Remove still deletes the Bundle record even when its own row doesn't resolve in items[]");
await remount();
// Seed a Bundle whose item_id names a row that does NOT exist in items[] —
// an orphaned/inconsistent link `findBundleRow()` cannot resolve.
server.manager.rate_sheets[0].bundles.push({
  bundle_id: 'rsb_orphan', platform_id: 'CZPRCBORPHAN', status: 'active', sort_order: 1,
  item_id: 'rate_missing_row', supplied_content: [],
});
render(null, container);
render(h(Harness, { recordId: 'rs_1', mode: 'view' }), container);
await settle();
selectGroup('Options');
await settle();
check('the orphaned Bundle still shows a chip and a readable card', chipLabels().length === 1 && moduleCard('Bundle') != null, chipLabels().join('|'));

const savesBeforeOrphanRemove = saveCalls;
click(cardActionButton('Bundle', 'Remove'));
await settle(60);
check('Remove still persists through one full-manager save, even without a resolvable row', saveCalls === savesBeforeOrphanRemove + 1, saveCalls - savesBeforeOrphanRemove);
check(
  'the orphaned Bundle record is gone',
  server.manager.rate_sheets[0].bundles.every((b) => b.bundle_id !== 'rsb_orphan'),
  server.manager.rate_sheets[0].bundles.map((b) => b.bundle_id),
);
check("the sheet's own ordinary row is completely untouched", server.manager.rate_sheets[0].items.some((item) => item.item_id === 'rate_website'));

// ── I) The workspace's OWN blank-row fallback offers the same Remove ──────
// The editor itself must never be a dead end: opening Edit on an orphaned
// Bundle renders no grid at all (no row to bind), so a "Remove Bundle"
// action belongs right there too — the same removeBundleImmediately(key)
// path, needing no resolved row.
console.log("\nI) The Bundle editor's own blank-row fallback still offers Remove");
await remount();
server.manager.rate_sheets[0].bundles.push({
  bundle_id: 'rsb_orphan2', platform_id: 'CZPRCBORPHAN2', status: 'active', sort_order: 1,
  item_id: 'rate_missing_row_2', supplied_content: [],
});
render(null, container);
render(h(Harness, { recordId: 'rs_1', mode: 'view' }), container);
await settle();
selectGroup('Options');
await settle();
click(cardEditButton('Bundle'));
await settle();
check('the editor opens on the orphaned Bundle', bundleWorkspace() != null);
check('no row grid renders — there is nothing to bind to', rowsIn().length === 0);
check(
  'the workspace itself offers a Remove Bundle action instead of staying a dead end',
  anyButton('Remove Bundle') != null,
);

const savesBeforeWorkspaceRemove = saveCalls;
click(anyButton('Remove Bundle'));
await settle(60);
check('it persists through one full-manager save', saveCalls === savesBeforeWorkspaceRemove + 1, saveCalls - savesBeforeWorkspaceRemove);
check(
  'the orphaned Bundle record is gone',
  server.manager.rate_sheets[0].bundles.every((b) => b.bundle_id !== 'rsb_orphan2'),
  server.manager.rate_sheets[0].bundles.map((b) => b.bundle_id),
);
check("the sheet's own ordinary row is completely untouched", server.manager.rate_sheets[0].items.some((item) => item.item_id === 'rate_website'));
check(
  'the editor session stays open, now showing the empty-Bundles message rather than a stale selection',
  editorShell() != null && editorShell()?.querySelector('.cz-station-empty')?.textContent.includes('no Bundles left to edit'),
);

// ── J) Remove works for a Bundle NEVER linked to a row — a blank itemId ──
// The actual reported case: not merely a link pointing at a row that no
// longer exists, but a Bundle whose own itemId was always blank — data from
// before this Bundle's row/Bundle pair was ever minted atomically. Both the
// read card and the workspace's own fallback must still delete it, since
// `removeBundleImmediately` is addressed by the Bundle's OWN key and never
// depends on itemId at all.
console.log('\nJ) Remove works for a Bundle that was never linked to a row at all (blank itemId)');
await remount();
server.manager.rate_sheets[0].bundles.push({
  bundle_id: 'rsb_neverlinked', platform_id: 'CZPRCBNEVERLINKED', status: 'active', sort_order: 1,
  item_id: '', supplied_content: [],
});
render(null, container);
render(h(Harness, { recordId: 'rs_1', mode: 'view' }), container);
await settle();
selectGroup('Options');
await settle();
check('the never-linked Bundle still shows a chip and a readable card', chipLabels().length === 1 && moduleCard('Bundle') != null, chipLabels().join('|'));

const savesBeforeNeverLinkedRemove = saveCalls;
click(cardActionButton('Bundle', 'Remove'));
await settle(60);
check('the read card\'s Remove persists through one full-manager save, with no itemId at all to key off', saveCalls === savesBeforeNeverLinkedRemove + 1, saveCalls - savesBeforeNeverLinkedRemove);
check(
  'the never-linked Bundle record is gone',
  server.manager.rate_sheets[0].bundles.every((b) => b.bundle_id !== 'rsb_neverlinked'),
  server.manager.rate_sheets[0].bundles.map((b) => b.bundle_id),
);
check("the sheet's own ordinary row is completely untouched", server.manager.rate_sheets[0].items.some((item) => item.item_id === 'rate_website'));

// Same case again, but through the workspace's own fallback Remove Bundle
// button — proving BOTH surfaces work with no itemId whatsoever.
await remount();
server.manager.rate_sheets[0].bundles.push({
  bundle_id: 'rsb_neverlinked2', platform_id: 'CZPRCBNEVERLINKED2', status: 'active', sort_order: 1,
  item_id: '', supplied_content: [],
});
render(null, container);
render(h(Harness, { recordId: 'rs_1', mode: 'view' }), container);
await settle();
selectGroup('Options');
await settle();
click(cardEditButton('Bundle'));
await settle();
check('the workspace fallback still offers Remove Bundle with no itemId at all', anyButton('Remove Bundle') != null);
const savesBeforeNeverLinkedWorkspaceRemove = saveCalls;
click(anyButton('Remove Bundle'));
await settle(60);
check('the workspace\'s own Remove persists through one full-manager save', saveCalls === savesBeforeNeverLinkedWorkspaceRemove + 1, saveCalls - savesBeforeNeverLinkedWorkspaceRemove);
check(
  'the never-linked Bundle record is gone',
  server.manager.rate_sheets[0].bundles.every((b) => b.bundle_id !== 'rsb_neverlinked2'),
  server.manager.rate_sheets[0].bundles.map((b) => b.bundle_id),
);

console.log('');
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('All checks passed — a Rate Sheet Bundle is a real Rate Sheet row: its first Import mints the Bundle and its row together, seeded from what was selected, and every later edit rides the SHARED grid and the SHARED row lock — through the one existing full-manager save.');
