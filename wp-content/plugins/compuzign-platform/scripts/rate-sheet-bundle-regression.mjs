// Rate Sheet Bundle — mounted regression.
//
// Mounts the REAL RateSheetDrawerContent (esbuild + happy-dom + Preact render,
// the same technique as scripts/rate-sheet-service-import-regression.mjs)
// against a fixture Package Manager, and proves the Bundle option-tab system
// end to end:
//
//   Phase 1 — the focused sheet is a DRAWER GROUP screen (Details / Options,
//     the same vocabulary and the same shared Tabs/Accordion renderers as the
//     Tier drawer). Both groups open READABLE; "+ Bundle" lives in the drawer's
//     own nav chrome beside the view toggle, gated on Options being active, and
//     never on the chip strip. Options navigates its Bundles with the shared
//     child chip strip and reads the selected one as a module card; only that
//     card's Edit opens the inline editor, as a focused task that suppresses
//     the group chrome without unmounting the group renderers.
//   Phase 2 — the Bundle inline editor behind that Edit is ONE Rate Sheet row
//     in the SHARED `RateSheetGridEditor`, under the SHARED one-row-at-a-time
//     lock: it opens LOCKED with Edit/Remove, Edit unlocks Save/Cancel(/Delete
//     once saved), and the cells are the ordinary Unit Price (same Price
//     Options tab strip), Per, Qty and Group. The first column is named
//     `Product Bundle` because that cell is the combination's own name. No
//     Delete-Bundle button lives in the editor; whole-Bundle Remove is an
//     action on the module card's own footer.
//   Phase 3 — TWO triggers feed it, one per source: "+ Add Service" (Category →
//     Service → Inclusions) and "+ Add Rate Sheet" (Rate Sheet → its rows).
//     The engine shows only the source it was opened for, and the basket is a
//     full-width strip beneath the browse. Import lands the selection in the
//     OPEN Bundle through the same one save; the source sheet is untouched.
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

const SERVICE_CATALOG = [
  { id: SERVICE_ID, title: 'Test Service', categories: [] },
  { id: 20, title: 'Alpha Co', categories: [{ id: 1, name: 'Compute', slug: 'compute' }] },
];
const INCLUSION_POOL_BY_SERVICE = {
  20: [
    { item_id: 'mgr_website', source_id: 'website', label: 'Website' },
    { item_id: 'mgr_revamp', source_id: 'revamp', label: 'Website Revamp' },
    { item_id: 'mgr_banking', source_id: 'banking', label: 'Online Banking' },
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
      platform_id: 'CZPRC22222',
      title: 'Websites',
      status: 'active',
      groups: [],
      items: [
        { item_id: 'rate_website', platform_id: 'CZPRCI33333', source_item_id: 'mgr_website', unit_price: 5, per: 'Per item', quantity: 1, group_id: null, sort_order: 0, price_options: [] },
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
        { item_id: 'rate_banking', platform_id: 'CZPRCI88888', source_item_id: 'mgr_banking', unit_price: 40, per: 'Per month', quantity: 1, group_id: null, sort_order: 0, price_options: [] },
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

function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
function jsonResponse(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) });
}
function mintItemId(sourceItemId) { return `rate_minted_${sourceItemId}`; }
let bundleSeq = 0;
function mintBundleId() { bundleSeq += 1; return `rsb_minted_${bundleSeq}`; }
let optionSeq = 0;
function mintOptionId() { optionSeq += 1; return `opt_minted_${optionSeq}`; }

// The fixture backend mirrors PackageManagerSchema::commitConfiguration's own
// write-path mint: blank ids are minted here, never by the Tool.
// Fixture ids are shaped exactly like real ones — the engine's own alphabet,
// a full-length suffix — so the identity schema contract can read this file
// without seeing a coined prefix.
const SUFFIX_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
let platformSeq = 0;
function mintPlatformId(prefix) {
  platformSeq += 1;
  return `${prefix}2222${SUFFIX_ALPHABET[platformSeq % SUFFIX_ALPHABET.length]}`;
}

function storeRow(item, platformPrefix) {
  return {
    ...item,
    item_id: item.item_id !== '' ? item.item_id : mintItemId(item.source_item_id),
    platform_id: item.platform_id ?? mintPlatformId(platformPrefix),
    price_options: (item.price_options ?? []).map((option) => ({
      ...option,
      option_id: option.option_id !== '' ? option.option_id : mintOptionId(),
      platform_id: option.platform_id ?? mintPlatformId(`${platformPrefix}O`),
    })),
  };
}

function applySave(payload) {
  const manager = deepClone(server.manager);
  manager.sources = payload.sources;
  manager.items = itemsForSources(manager.sources);
  manager.groups = payload.groups;
  for (const submitted of payload.rate_sheets) {
    const id = submitted.rate_sheet_id !== '' ? submitted.rate_sheet_id : 'rs_minted';
    const stored = {
      ...submitted,
      rate_sheet_id: id,
      items: submitted.items.map((item) => storeRow(item, 'CZPRCI')),
      bundles: (submitted.bundles ?? []).map((bundle) => ({
        ...bundle,
        bundle_id: bundle.bundle_id !== '' ? bundle.bundle_id : mintBundleId(),
        platform_id: bundle.platform_id ?? mintPlatformId("CZPRCB"),
        items: bundle.items.map((item) => storeRow(item, 'CZPRCBI')),
      })),
    };
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
function rowByText(text) { return rowsIn().find((tr) => tr.textContent.includes(text)) ?? null; }
function gridHeaders() {
  const grid = [...container.querySelectorAll('.cz-rate-sheet-tool__grid')]
    .find((table) => table.closest('.cz-rate-sheet-tool__import') === null) ?? null;
  return [...(grid?.querySelectorAll('thead th') ?? [])].map((th) => th.textContent.trim());
}
/** The Bundle row's read-only Supplied content cell — one entry per membership. */
function suppliedItems() {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__supplied-item')];
}

function suppliedLabels() {
  return suppliedItems().map((li) => li.querySelector('span')?.textContent.trim() ?? '');
}
/** The engine's Source column toggle. */
function sourceToggle(label) {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__import-source-toggle button')]
    .find((b) => b.textContent.trim() === label) ?? null;
}
/** Chips of one of the engine's columns, addressed by that column's own label. */
function columnChips(columnLabel) {
  const column = [...container.querySelectorAll('.cz-rate-sheet-tool__import-column')]
    .find((col) => col.querySelector('.cz-rate-sheet-tool__import-column-label')?.textContent.trim().startsWith(columnLabel)) ?? null;
  return [...(column?.querySelectorAll('.cz-rate-sheet-tool__import-chip') ?? [])];
}
function columnChip(columnLabel, labelSubstring) {
  return columnChips(columnLabel).find((b) => b.textContent.includes(labelSubstring)) ?? null;
}
function buttonIn(row, label) {
  return [...(row?.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim() === label) ?? null;
}
function anyButton(label) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === label) ?? null;
}
function importColumnLabels() {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__import-columns .cz-rate-sheet-tool__import-column-label')]
    .map((p) => p.textContent.trim());
}
function basketChips() {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__import-basket .cz-rate-sheet-tool__import-chip')];
}
function basketChip(labelSubstring) {
  return basketChips().find((b) => b.textContent.includes(labelSubstring)) ?? null;
}
function cardActionButton(title, label) {
  return [...(moduleCard(title)?.querySelectorAll('.drawerModule__footer button') ?? [])]
    .find((b) => b.textContent.trim() === label) ?? null;
}
function importChip(labelSubstring) {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__import-columns .cz-rate-sheet-tool__import-chip')]
    .find((b) => b.textContent.includes(labelSubstring)) ?? null;
}
function importActionButton(text) {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__import-actions button')].find((b) => b.textContent.trim().startsWith(text)) ?? null;
}

// The drawer opens in VIEW, the way the module entry contract requires — every
// group is readable first, and only a card's own Edit opens an editor.
async function remount() {
  render(null, container);
  server = { manager: baseManager() };
  saveCalls = 0; lastSavePayload = null; confirmReturnValue = true;
  optionSeq = 0; bundleSeq = 0;
  render(h(Harness, { recordId: 'rs_1', mode: 'view' }), container);
  await settle();
}

/** Options → "+ Bundle" → the new Bundle's card → Edit: the whole authoring
 *  entry path, exactly as an admin walks it. */
async function openNewBundleEditor() {
  selectGroup('Options');
  await settle();
  click(addBundleButton());
  await settle();
  click(cardEditButton('Bundle'));
  await settle();
}

console.log('Rate Sheet Bundle regression\n');

// ── A) Phase 1 — the drawer group screen and Bundle creation ─────────────
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
check('creating a Bundle makes no API request — it is local until Save', saveCalls === savesBeforeCreate);
check('the new Bundle appears as a chip', chipLabels().includes('Bundle 1'), chipLabels().join('|'));
check('the new Bundle is selected', activeChipLabel() === 'Bundle 1', activeChipLabel());
check('it opens READABLE as a module card, not straight into an editor', moduleCard('Bundle') != null && editorShell() == null);
check('a not-yet-saved Bundle reports that its Platform ID comes after Save', moduleCard('Bundle')?.textContent.includes('Assigned after Save'));

click(cardEditButton('Bundle'));
await settle();
check('only Edit opens the inline editor', editorShell() != null);
check('the editor is a focused task that suppresses the group chrome', detailRoot()?.className.includes('cz-req-detail--editing'), detailRoot()?.className);
check('the group renderers stay mounted beneath it, never unmounted', container.querySelector('.cz-drawer-groups__tablist') != null);
check('its own editor is mounted', bundleWorkspace() != null);
check('it is ONE Rate Sheet row, not a grid of membership rows', rowsIn().length === 1, rowsIn().length);
check(
  'Product Bundle names the row, and Supplied content is its OWN column right after it',
  gridHeaders().slice(0, 6).join('|') === 'Product Bundle|Supplied content|Unit Price|Per|Qty|Group',
  gridHeaders().join('|'),
);
check('it compiles nothing yet', suppliedItems().length === 0, suppliedItems().length);

// ── B) Phase 2 — the Bundle IS one Rate Sheet row, under the SAME row lock ──
console.log('\nB) The Bundle row uses the shared grid and the shared row lock');
const lockedRow = rowsIn()[0];
check('it opens LOCKED, exactly like a sheet row', buttonIn(lockedRow, 'Edit') != null);
check('a locked Bundle row offers Edit and Remove, nothing else', buttonIn(lockedRow, 'Remove') != null && buttonIn(lockedRow, 'Save') == null);
check('a locked Bundle row shows no inputs at all', lockedRow.querySelector('input') == null && lockedRow.querySelector('select') == null);
check('there is no Delete Bundle button in the editor', anyButton('Delete Bundle') == null);

click(buttonIn(rowsIn()[0], 'Edit'));
await settle();
const openRow = rowsIn()[0];
check('Edit unlocks it into the SAME inline row editor', buttonIn(openRow, 'Save') != null && buttonIn(openRow, 'Cancel') != null);
check('an unsaved Bundle row offers no Delete — Cancel is its only discard', buttonIn(openRow, 'Delete') == null);
check('it carries the ordinary Price Options tab strip', openRow.querySelector('.cz-rate-sheet-tool__price-options-tabs') != null);
check('and the ordinary Per and Group dropdowns', openRow.querySelectorAll('select').length === 2, openRow.querySelectorAll('select').length);

const nameInput = openRow.querySelector('input[type="text"]');
setInputValue(nameInput, 'Digital Banking Website');
await settle();
check('the row\'s own name cell is the Product Bundle name', editorTitle() === 'Digital Banking Website', editorTitle());
check('naming it makes no API request', saveCalls === savesBeforeCreate);

// ── C) Phase 3 — "+ Add Service": that source's browse ONLY ──────────────
console.log('\nC) "+ Add Service" browses Services only');
click(buttonIn(rowsIn()[0], 'Cancel'));
await settle();
check('Cancel on an unsaved Bundle row discards the Bundle itself', moduleCard('Bundle') == null || bundleWorkspace() == null);

await remount();
await openNewBundleEditor();
check('the editor offers a trigger per source, named for what it adds', anyButton('+ Add Service') != null && anyButton('+ Add Rate Sheet') != null);
check('and never a column label used as an action', anyButton('+ Import supplied content') == null);

click(anyButton('+ Add Service'));
await settle();
check('the Service engine opens', container.querySelector('[aria-label="Add Service to this Bundle"]') != null);
check('it browses Services only — no source switch inside the panel', container.querySelector('.cz-rate-sheet-tool__import-source-toggle') == null);
check('it reuses the Category → Service → Inclusions browse', importColumnLabels().join('|') === 'Browse by category|Browse by service|Browse by inclusions', importColumnLabels().join('|'));
check('the basket is its own full-width strip, not a third column', container.querySelector('.cz-rate-sheet-tool__import-basket') != null);

click(importChip('Alpha Co'));
await settle();
check('an existing Rate Sheet row is offerable as an atomic Bundle membership', importChip('Website') != null);
check('an Inclusion with no existing Rate Sheet row is not offered as a membership', importChip('Website Revamp') == null);
click(importChip('Website'));
await settle();
check('picking the existing row moves it into the basket', basketChip('Website') != null);
check('the basket contains one exact Rate Sheet-row membership', basketChips().length === 1, basketChips().length);

const savesBeforeImport = saveCalls;
click(importActionButton('Import'));
await settle(60);
check('Import persists through exactly one full-manager save', saveCalls === savesBeforeImport + 1, saveCalls - savesBeforeImport);

const publishedSheet = lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_1');
const publishedBundle = publishedSheet?.bundles?.[0];
check('the save payload carries the Bundle under its owning sheet', publishedBundle != null);
check('the Bundle is submitted with a blank id — the backend mints it', publishedBundle?.bundle_id === '', publishedBundle?.bundle_id);
check('its membership landed in the BUNDLE, not in the sheet\'s own rows', (publishedBundle?.items ?? []).length === 1, (publishedBundle?.items ?? []).length);
check('the membership retains the exact existing Rate Sheet row address', publishedBundle?.items?.[0]?.rate_sheet_id === 'rs_1' && publishedBundle?.items?.[0]?.rate_sheet_item_id === 'rate_website', JSON.stringify(publishedBundle?.items?.[0]));
check('the sheet\'s own rows are untouched by the Bundle import', (publishedSheet?.items ?? []).length === 1, (publishedSheet?.items ?? []).length);
check('the Bundle is still ONE compiled row after adding membership', rowsIn().length === 1, rowsIn().length);
check('the member reads in its Supplied content block', suppliedLabels().length === 1, suppliedLabels().join('; '));
check('a saved Bundle shows its minted Platform ID', rowsIn()[0]?.textContent.includes('CZPRCB'), rowsIn()[0]?.textContent.slice(0, 200));

// Editing a SAVED Bundle row: the full lock, Delete included.
click(buttonIn(rowsIn()[0], 'Edit'));
await settle();
const savedOpenRow = rowsIn()[0];
check('a saved Bundle row offers Save, Cancel and Delete', buttonIn(savedOpenRow, 'Save') != null && buttonIn(savedOpenRow, 'Delete') != null);
setInputValue(savedOpenRow.querySelector('input[type="text"]'), 'Foundation Bundle');
await settle();
const priceField = rowsIn()[0].querySelector('.cz-rate-sheet-tool__price-option-fields input[type="number"]');
setInputValue(priceField, 75);
await settle();
click([...rowsIn()[0].querySelectorAll('.cz-rate-sheet-tool__price-options-tab')].find((b) => b.textContent.trim() === '+'));
await settle();
const optionFields = rowsIn()[0].querySelectorAll('.cz-rate-sheet-tool__price-option-fields input');
setInputValue(optionFields[0], 'Annual');
await settle();
setInputValue(optionFields[1], 750);
await settle();
setInputValue(rowsIn()[0].querySelector('input[type="number"][min="1"]'), 3);
await settle();

const savesBeforeRowSave = saveCalls;
check('none of that made an API request on its own', saveCalls === savesBeforeRowSave);
click(buttonIn(rowsIn().find((tr) => buttonIn(tr, 'Save') != null), 'Save'));
await settle(60);
check('the row\'s own Save persists through the same one full-manager save', saveCalls === savesBeforeRowSave + 1, saveCalls - savesBeforeRowSave);
check('and locks the row again', buttonIn(rowsIn()[0], 'Edit') != null);

const savedBundle = lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_1')?.bundles?.[0];
check('the payload carries the Product Bundle name', savedBundle?.title === 'Foundation Bundle', savedBundle?.title);
check("the Bundle's own price", savedBundle?.unit_price === 75, savedBundle?.unit_price);
check("the Bundle's own Price Option", (savedBundle?.price_options ?? []).length === 1 && savedBundle.price_options[0].label === 'Annual', JSON.stringify(savedBundle?.price_options));
check("the Bundle's own quantity", savedBundle?.quantity === 3, savedBundle?.quantity);
check('and its atomic membership', (savedBundle?.items ?? []).length === 1, (savedBundle?.items ?? []).length);
check(
  "the sheet's own row for the SAME supplied content kept its own price",
  lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_1')?.items?.[0]?.unit_price === 5,
);

// Supplied content lives in the ROW's own cell — one place, no second block.
check('the compiled content reads in its own cell of that row', rowsIn()[0]?.querySelector('.cz-rate-sheet-tool__cell-extra .cz-rate-sheet-tool__supplied-list') != null);
check('the name cell carries only the name, never the content', rowsIn()[0]?.querySelector('.cz-rate-sheet-tool__cell-name .cz-rate-sheet-tool__supplied-list') == null);
check('and never in a second block beneath the grid', container.querySelector('.cz-rate-sheet-tool__supplied') == null);
check('a LOCKED row offers no removal — it is read-only like any row', container.querySelector('.cz-rate-sheet-tool__supplied-remove') == null);

// Direct membership editing remains available; backend PHP coverage separately
// proves underlying normal-row deletion through the production save path.
click(buttonIn(rowsIn()[0], 'Edit'));
await settle();
const beforeRemove = suppliedLabels().length;
check('the unlocked row offers removal per entry', container.querySelector('.cz-rate-sheet-tool__supplied-remove') != null);
click(container.querySelector('.cz-rate-sheet-tool__supplied-remove'));
await settle();
check('a membership can still be removed from the combination', suppliedLabels().length === beforeRemove - 1, suppliedLabels().length);

// Persist the removal through the row's own Save — the same one save — so the
// row is locked again before the editor is left.
const savesBeforeDrop = saveCalls;
click(buttonIn(rowsIn().find((tr) => buttonIn(tr, 'Save') != null), 'Save'));
await settle(60);
check('removing a membership persists through the same one save', saveCalls === savesBeforeDrop + 1, saveCalls - savesBeforeDrop);
check('and the row locks again', buttonIn(rowsIn()[0], 'Edit') != null);
check(
  'the dropped membership is gone from the payload',
  (lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_1')?.bundles?.[0]?.items ?? []).length === 0,
);

click(anyButton('Cancel'));
await settle();
if (anyButton('Discard')) { click(anyButton('Discard')); await settle(); }
check('leaving the editor returns to the readable Options group', editorShell() == null && activeGroupTab() === 'Options', activeGroupTab());
check('the module card reads lean — no single-declaration price/per/qty/group', !moduleCard('Bundle')?.textContent.includes('Qty'), moduleCard('Bundle')?.textContent.slice(0, 300));
check('it names the Bundle and what it compiles', moduleCard('Bundle')?.textContent.includes('Product Bundle') && moduleCard('Bundle')?.textContent.includes('Supplied content'));
check('whole-Bundle Remove lives on the module action footer', cardActionButton('Bundle', 'Remove') != null);

// ── D) "+ Add Rate Sheet": the other source, two columns ─────────────────
console.log('\nD) "+ Add Rate Sheet" browses Rate Sheets only');
click(cardEditButton('Bundle'));
await settle();
click(anyButton('+ Add Rate Sheet'));
await settle();
check('the Rate Sheet engine opens', container.querySelector('[aria-label="Add Rate Sheet content to this Bundle"]') != null);
check('it browses Rate Sheets only, in two columns', importColumnLabels().join('|') === 'Browse by Rate Sheet|Browse by row', importColumnLabels().join('|'));
check('every Rate Sheet in the collection is offered', importChip('Websites') != null && importChip('Banking') != null);

click(importChip('Banking'));
await settle();
check("picking a source Rate Sheet lists its own priced rows", importChip('Online Banking') != null);
check('a source row shows the price it already carries', importChip('Online Banking')?.textContent.includes('$40'), importChip('Online Banking')?.textContent);
click(importChip('Online Banking'));
await settle();
check('it moves into the basket', basketChip('Online Banking') != null);

const savesBeforeSheetImport = saveCalls;
click(basketChip('Online Banking'));
await settle();
check('a basket entry can be dropped before Import, with no request', basketChips().length === 0 && saveCalls === savesBeforeSheetImport);
click(importChip('Online Banking'));
await settle();
click(importActionButton('Import'));
await settle(60);
check('Import persists through exactly one full-manager save', saveCalls === savesBeforeSheetImport + 1, saveCalls - savesBeforeSheetImport);

const composedBundle = lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_1')?.bundles?.[0];
check(
  'content composed from ANOTHER Rate Sheet keeps that sheet\'s supplied content',
  (composedBundle?.items ?? []).some((row) => row.source_item_id === 'mgr_banking'),
);
check(
  'the SOURCE Rate Sheet keeps its own row and price — membership references, never moves or copies it',
  lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_2')?.items?.[0]?.unit_price === 40,
);
check('the Bundle is still ONE row after composing across sources', rowsIn().length === 1, rowsIn().length);

click(anyButton('+ Add Rate Sheet'));
await settle();
click(importChip('Banking'));
await settle();
check('a source row already in this Bundle is never offered twice', importChip('Online Banking') == null);
click(anyButton('Close'));
await settle();

// ── E) The Bundle's row is in `items`, and the Tool ignores it ───────────
console.log("\nE) The Bundle's upstream row rides the ordinary items list");
// The fixture backend now answers reads the way buildReadModel does: the
// sheet's own rows plus one compiled row per Bundle, all in `items`.
server.manager.rate_sheets[0].items = [
  ...server.manager.rate_sheets[0].items,
  {
    item_id: 'rate_bundle_offer', platform_id: 'CZPRCI22223', source_item_id: '',
    label: 'Digital Banking Website', resolved_label: 'Digital Banking Website',
    connection_resolved: true, available: true, operational_state: 'connected_available', health_reasons: [],
    unit_price: 75, per: 'Per item',
    quantity: 1, group_id: null, sort_order: 9, price_options: [], includes: [],
  },
];
render(null, container);
render(h(Harness, { recordId: 'rs_1', mode: 'view' }), container);
await settle();
click(cardEditButton('Rate Sheet'));
await settle();
check(
  "the Tool never shows the Bundle's own upstream row as an editable sheet row",
  rowByText('Digital Banking Website') == null,
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
  "and never round-trips the Bundle's row back into storage",
  !(lastSavePayload?.rate_sheets ?? []).some((sheet) => (sheet.items ?? []).some((row) => row.item_id === 'rate_bundle_offer')),
  JSON.stringify((lastSavePayload?.rate_sheets ?? [])[0]?.items?.map((r) => r.item_id)),
);

console.log('');
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('All checks passed — a Rate Sheet Bundle is a Rate Sheet-owned child record with its own identity, navigated by the shared child chip strip, authored through one source-scoped import engine per trigger, and edited as ONE Rate Sheet row in the SHARED grid under the SHARED row lock — through the one existing full-manager save.');
