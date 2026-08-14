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
//   Phase 2 — the Bundle workspace behind that Edit is the FULL Rate Sheet row
//     tooling: the same "+ Add Service" picker, the same grid, the same
//     one-row-at-a-time Edit/Save/Cancel lock, the same Price Options tab strip
//     — every command addressing the Bundle's rows and never the sheet's,
//     through the same single full-manager save.
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
function buttonIn(row, label) {
  return [...(row?.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim() === label) ?? null;
}
function anyButton(label) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === label) ?? null;
}
function importChip(labelSubstring) {
  return [...container.querySelectorAll('.cz-rate-sheet-tool__import-chip')].find((b) => b.textContent.includes(labelSubstring)) ?? null;
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
check('its own workspace is mounted', bundleWorkspace() != null);
check('it opens with no rows', rowsIn().length === 0, rowsIn().length);

const nameInput = bundleWorkspace()?.querySelector('input[aria-label="Bundle name"]');
setInputValue(nameInput, 'Digital Banking Website');
await settle();
check('the Bundle can be renamed', editorTitle() === 'Digital Banking Website', editorTitle());
check('renaming it makes no API request', saveCalls === savesBeforeCreate);

// ── B) Phase 2 — full Rate Sheet row tooling inside the Bundle ───────────
console.log('\nB) Full Rate Sheet row tooling inside the Bundle');
click(anyButton('+ Add Service'));
await settle();
click(importChip('Alpha Co'));
await settle();
check('a source already priced by the SHEET is still offerable inside a Bundle', importChip('Website') != null);
click(importChip('Website'));
await settle();
click(importChip('Website Revamp'));
await settle();
click(importActionButton('Import'));
await settle();

const savesBeforePublish = saveCalls;
click(importActionButton('Publish'));
await settle(60);
check('Publish persists through exactly one full-manager save', saveCalls === savesBeforePublish + 1, saveCalls - savesBeforePublish);

const publishedSheet = lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_1');
const publishedBundle = publishedSheet?.bundles?.[0];
check('the save payload carries the Bundle under its owning sheet', publishedBundle != null);
check('the Bundle is submitted with a blank id — the backend mints it', publishedBundle?.bundle_id === '', publishedBundle?.bundle_id);
check('its rows landed in the BUNDLE, not in the sheet\'s own rows', (publishedBundle?.items ?? []).length === 2, (publishedBundle?.items ?? []).length);
check('the sheet\'s own rows are untouched by the Bundle import', (publishedSheet?.items ?? []).length === 1, (publishedSheet?.items ?? []).length);
check('every Bundle row carries its own label field', (publishedBundle?.items ?? []).every((row) => typeof row.label === 'string'));
check('the Bundle survives the save and stays selected', editorTitle() === 'Digital Banking Website', editorTitle());
check('a saved Bundle shows its minted Platform ID', bundleWorkspace()?.textContent.includes('CZPRCB'), bundleWorkspace()?.textContent.slice(0, 200));
check('its rows render in the Bundle workspace', rowsIn().length === 2, rowsIn().length);
check('each Bundle row shows its own CZPRCBI', rowByText('Website Revamp')?.textContent.includes('CZPRCBI'));

const revampRow = rowByText('Website Revamp');
click(buttonIn(revampRow, 'Edit'));
await settle();
check('a Bundle row unlocks with the same Edit/Save/Cancel lock', buttonIn(rowByText('Website Revamp'), 'Save') != null);
check('the other Bundle row is locked out while one is active', buttonIn(rowsIn()[0], 'Edit')?.disabled === true);

const activeRow = rowsIn().find((tr) => buttonIn(tr, 'Save') != null);
const labelInput = activeRow?.querySelector('input[type="text"]');
check('an active Bundle row offers its own editable name', labelInput != null);
setInputValue(labelInput, 'Revamp (bundled)');
await settle();
const priceInput = activeRow?.querySelector('input[type="number"]');
setInputValue(priceInput, 250);
await settle();
click([...activeRow.querySelectorAll('.cz-rate-sheet-tool__price-options-tab')].find((b) => b.textContent.trim() === '+'));
await settle();
const optionRow = rowsIn().find((tr) => buttonIn(tr, 'Save') != null);
const optionFields = optionRow.querySelectorAll('.cz-rate-sheet-tool__price-option-fields input');
setInputValue(optionFields[0], 'Annual');
await settle();
setInputValue(optionFields[1], 2500);
await settle();

const savesBeforeRowSave = saveCalls;
click(buttonIn(rowsIn().find((tr) => buttonIn(tr, 'Save') != null), 'Save'));
await settle(60);
check('saving the active Bundle row persists through the same one save', saveCalls === savesBeforeRowSave + 1, saveCalls - savesBeforeRowSave);

const savedBundle = lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_1')?.bundles?.[0];
const savedRevamp = (savedBundle?.items ?? []).find((row) => row.source_item_id === 'mgr_revamp');
check('the Bundle row carries its own name', savedRevamp?.label === 'Revamp (bundled)', savedRevamp?.label);
check('the Bundle row carries its own price', savedRevamp?.unit_price === 250, savedRevamp?.unit_price);
check('the Bundle row carries its own Price Option', (savedRevamp?.price_options ?? []).length === 1 && savedRevamp.price_options[0].label === 'Annual');
check(
  "the sheet's own row for the SAME supplied content kept its own price",
  lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_1')?.items?.[0]?.unit_price === 5,
);
check('the renamed row displays its own name once locked', rowByText('Revamp (bundled)') != null);
check('and still shows the supplied content it prices', rowByText('Revamp (bundled)')?.textContent.includes('Website Revamp'));

// The row Save above already persisted, so nothing is dirty and Cancel leaves
// the focused task without a discard prompt.
click(anyButton('Cancel'));
await settle();
check('leaving the Bundle editor returns to the readable Options group', editorShell() == null && activeGroupTab() === 'Options', activeGroupTab());
check('and the group chrome is restored', detailRoot()?.className.includes('cz-req-detail--editing') === false);
check('the saved Bundle reads its minted Platform ID on its card', moduleCard('Bundle')?.textContent.includes('CZPRCB'), moduleCard('Bundle')?.textContent.slice(0, 200));
check('and reports the rows it holds', moduleCard('Bundle')?.textContent.includes('2 rows'), moduleCard('Bundle')?.textContent.slice(0, 300));

selectGroup('Details');
await settle();
click(cardEditButton('Rate Sheet'));
await settle();
check('the sheet\'s own rows are unchanged after all the Bundle editing', rowsIn().length === 1 && rowByText('Website') != null, rowsIn().length);
check('the sheet\'s own row is NOT renamed and shows no name input', rowsIn()[0]?.querySelector('input[type="text"]') == null);

// ── C) Phase 3/4 — the Bundle engine composes from OTHER Rate Sheets ─────
console.log('\nC) The Bundle engine composes rows from other Rate Sheets');
await remount();
await openNewBundleEditor();
click(anyButton('Import from Rate Sheets'));
await settle();
check('the engine browses Rate Sheets, not Services', container.querySelector('[aria-label="Import from Rate Sheets"]') != null);
const sourceHeads = [...container.querySelectorAll('.cz-rate-sheet-tool__bundle-source-head')];
check('every Rate Sheet in the collection is offered as a source', sourceHeads.length === 2, sourceHeads.length);
check('each source reports how many of its rows are available', sourceHeads[0]?.textContent.includes('1 of 1 rows available'), sourceHeads[0]?.textContent);

click(sourceHeads.find((head) => head.textContent.includes('Websites')));
await settle();
check("opening a source Rate Sheet lists its own priced rows", importChip('Website') != null);
check('a source row shows the price it already carries', importChip('Website')?.textContent.includes('$5'), importChip('Website')?.textContent);
click(importChip('Website'));
await settle();

click([...container.querySelectorAll('.cz-rate-sheet-tool__bundle-source-head')].find((head) => head.textContent.includes('Banking')));
await settle();
check('a second Rate Sheet can be opened alongside the first', importChip('Online Banking') != null);
click(importChip('Online Banking'));
await settle();
check('rows from DIFFERENT Rate Sheets select together', anyButton('Combine (2)') != null);

const savesBeforeCombine = saveCalls;
click(importActionButton('Combine'));
await settle();
check('Combine makes no API request — the combination is local until it is added', saveCalls === savesBeforeCombine);
const stagedRows = [...container.querySelectorAll('.cz-rate-sheet-tool__import .cz-rate-sheet-tool__grid tbody tr')];
check('both selected rows are staged', stagedRows.length === 2, stagedRows.length);
check('each staged row records which Rate Sheet it came from', stagedRows.map((r) => r.textContent).join('|').includes('from Websites'));
check('a staged row starts from the price its source row carried', stagedRows.find((r) => r.textContent.includes('from Banking'))?.querySelector('input[type="number"]')?.value === '40');

const combinationName = container.querySelector('input[aria-label="Name for this combination"]');
setInputValue(combinationName, 'Digital Banking Website');
await settle();
check('the combination can be named in the engine itself', editorTitle() === 'Digital Banking Website', editorTitle());

const stagedBanking = [...container.querySelectorAll('.cz-rate-sheet-tool__import .cz-rate-sheet-tool__grid tbody tr')]
  .find((r) => r.textContent.includes('from Banking'));
setInputValue(stagedBanking.querySelector('input[type="text"]'), 'Banking module');
await settle();
setInputValue(stagedBanking.querySelector('input[type="number"]'), 35);
await settle();

const savesBeforeAdd = saveCalls;
click(importActionButton('Add to Bundle'));
await settle(60);
check('Add to Bundle persists through exactly one full-manager save', saveCalls === savesBeforeAdd + 1, saveCalls - savesBeforeAdd);

const composedSheet = lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_1');
const composedBundle = composedSheet?.bundles?.[0];
check('the composed rows landed in the Bundle', (composedBundle?.items ?? []).length === 2, (composedBundle?.items ?? []).length);
check('the Bundle carries the name given in the engine', composedBundle?.title === 'Digital Banking Website', composedBundle?.title);
check(
  'a row composed from ANOTHER Rate Sheet keeps that sheet\'s supplied content',
  (composedBundle?.items ?? []).some((row) => row.source_item_id === 'mgr_banking'),
);
check(
  'the composed row carries the name and price given during composition',
  (composedBundle?.items ?? []).some((row) => row.source_item_id === 'mgr_banking' && row.label === 'Banking module' && row.unit_price === 35),
  JSON.stringify(composedBundle?.items),
);
check(
  'the SOURCE Rate Sheet keeps its own row and its own price — composing copies, never moves',
  lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_2')?.items?.[0]?.unit_price === 40,
);

// Phase 4 — an imported row is an ordinary Bundle row, not a reduced reference.
const importedRow = rowByText('Banking module');
check('the imported row renders in the normal Bundle grid', importedRow != null);
check('it carries its own CZPRCBI', importedRow?.textContent.includes('CZPRCBI'));
click(buttonIn(importedRow, 'Edit'));
await settle();
const activeImported = rowsIn().find((tr) => buttonIn(tr, 'Save') != null);
check('an imported row opens in the SAME inline row editor', activeImported != null);
check('it keeps its editable name', activeImported?.querySelector('input[type="text"]') != null);
check('it keeps the Price Options tab strip', activeImported?.querySelector('.cz-rate-sheet-tool__price-options-tabs') != null);
check('it keeps its Per and Group dropdowns', activeImported?.querySelectorAll('select').length === 2, activeImported?.querySelectorAll('select').length);
check('it keeps Save, Cancel and Delete', buttonIn(activeImported, 'Save') != null && buttonIn(activeImported, 'Cancel') != null && buttonIn(activeImported, 'Delete') != null);
click(buttonIn(activeImported, 'Cancel'));
await settle();

click(anyButton('Import from Rate Sheets'));
await settle();
click([...container.querySelectorAll('.cz-rate-sheet-tool__bundle-source-head')].find((head) => head.textContent.includes('Banking')));
await settle();
check('a source row already in this Bundle is never offered twice', importChip('Online Banking') == null);

// ── D) The Bundle's own commercial price ────────────────────────────────
console.log("\nD) The Bundle's own commercial price");
const bundlePriceInput = () => bundleWorkspace()?.querySelector('.cz-rate-sheet-tool__bundle-price input[type="number"]') ?? null;
check('the Bundle workspace offers its own price field', bundlePriceInput() != null);
setInputValue(bundlePriceInput(), 75);
await settle();
const bundlePriceTabs = bundleWorkspace()?.querySelectorAll('.cz-rate-sheet-tool__bundle-price .cz-rate-sheet-tool__price-options-tab');
check('and its own Price Options tab strip', (bundlePriceTabs?.length ?? 0) >= 2, bundlePriceTabs?.length);
click([...bundlePriceTabs].find((b) => b.textContent.trim() === '+'));
await settle();
const bundleOptionFields = bundleWorkspace()?.querySelectorAll('.cz-rate-sheet-tool__bundle-price .cz-rate-sheet-tool__price-option-fields input');
setInputValue(bundleOptionFields[0], 'Annual');
await settle();
setInputValue(bundleOptionFields[1], 750);
await settle();

const savesBeforeBundlePrice = saveCalls;
click(anyButton('Import from Rate Sheets'));
await settle();
check('editing the Bundle price makes no API request on its own', saveCalls === savesBeforeBundlePrice);
click(anyButton('Close'));
await settle();

// Persist through the row lock's own save, the same one save path.
const anyRow = rowsIn()[0];
click(buttonIn(anyRow, 'Edit'));
await settle();
click(buttonIn(rowsIn().find((tr) => buttonIn(tr, 'Save') != null), 'Save'));
await settle(60);
const pricedBundle = lastSavePayload?.rate_sheets?.find((sheet) => sheet.rate_sheet_id === 'rs_1')?.bundles?.[0];
check("the save payload carries the Bundle's own price", pricedBundle?.unit_price === 75, pricedBundle?.unit_price);
check("and the Bundle's own Price Option", (pricedBundle?.price_options ?? []).length === 1 && pricedBundle.price_options[0].label === 'Annual', JSON.stringify(pricedBundle?.price_options));
check(
  "the ingredient rows keep their own prices, untouched by the Bundle price",
  (pricedBundle?.items ?? []).some((row) => row.unit_price === 35),
  JSON.stringify((pricedBundle?.items ?? []).map((r) => r.unit_price)),
);

// ── E) The Bundle's row is in `items`, and the Tool ignores it ───────────
console.log("\nE) The Bundle's upstream row rides the ordinary items list");
// The fixture backend now answers reads the way buildReadModel does: the
// sheet's own rows plus one self-priced row per Bundle, all in `items`.
server.manager.rate_sheets[0].items = [
  ...server.manager.rate_sheets[0].items,
  {
    item_id: 'rate_bundle_offer', platform_id: 'CZPRCB22223', source_item_id: '',
    self_priced: true, label: 'Digital Banking Website', unit_price: 75, per: 'Per item',
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
console.log('All checks passed — a Rate Sheet Bundle is a Rate Sheet-owned child record with its own identity, navigated by the shared child chip strip, and its rows carry the complete Rate Sheet row tooling through the one existing full-manager save.');
