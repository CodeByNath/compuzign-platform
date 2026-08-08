// Tier Edition admin lifecycle — mounted regression (completes Phase 3/6
// item 2).
//
// Mounts the REAL TierDrawerContent composition (esbuild + happy-dom +
// Preact render, same technique as tier-occupant-lifecycle-regression.mjs)
// against an already-published occupant, and drives the SAME Options group
// (Overview's own "+ Edition" registration control under Details, then the
// [Edition …] tab strip / TierEditionDeclarationSwitcher under Options — no
// Default tab: Default's own terms live in Default Tier Inclusions under
// Details, never as a selectable row here) a real admin sees — proving Overview
// registration (auto-titled, born-disabled, no form) → rename via draft
// Save/Settle → Publish (CZTE assignment, once) → Disable → Enable (lands
// Pending, never Active — the same "Enable never activates" rule the
// occupant itself follows) → republish (CZTE reused, not re-reserved) →
// Archive → Trash → guarded permanent delete (trashed-only — there is no
// "default Edition" concept to guard against, since the occupant's own
// declaration is the permanent Default and is never one of these rows) →
// Restore (archived/trashed → disabled, never straight to active) end to
// end.
//
// The fetch mock reproduces PackageSchema's SECTION: TIER_EDITION engine
// transitions (StationLifecycle::applyStatus/restore, the disable/enable
// mask) and PackageStationController::updateTierEditionStatus's reserve on
// first Active only — proven separately by tests/tier-edition-lifecycle.php
// — so this regression proves the FRONTEND wiring, not a reimplementation
// of the backend rule.
//
// Usage: npm run regression:tier-edition-lifecycle
//    or: node scripts/tier-edition-lifecycle-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-tier-edition-lifecycle-bundle.mjs');
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
window.confirm = () => true;

window.CompuZignConfig = { apiRoot: 'https://cz-test.local/wp-json/', nonce: 'test-nonce' };

// ── Fixture — one already-published occupant, no Editions yet ──────────────
const SERVICE_ID = 802;
const INSTANCE_ID = 'ti_editions';
const TIER_ID = 'basic';

const OCCUPANT = {
  // Not under test here (this regression is scoped to the Editions this
  // occupant owns) — left unassigned like a never-published record rather
  // than a placeholder that reads as a coined Platform ID.
  occupant_id: 'occ_basic', platform_id: '', addon_platform_id: '',
  label: 'Starter Cloud', ideal_for: 'Small workloads', price: 49, contact: false,
  billing_cycle: 'monthly', rate_sheet_id: null, inclusions_override: [],
  rate_sheet_items: [], rate_sheet_selections: [], features: [], faq_refs: [],
  enabled: true, is_explicitly_disabled: false, is_addon: false,
  drafts: { overview: null, features: null, faqs: null },
  module_status: { overview: 'settled', features: 'settled', faqs: 'settled' },
};

let editions = [];

// One selectable Rate Sheet row — needed to prove the tab-switch-preserves-
// draft invariant (step 3 below) touches a real Inclusions-tab field, not
// just an empty select with nothing to choose. Same fixture shape
// tier-occupant-lifecycle-regression.mjs already uses for the parent
// occupant's own Inclusions editor.
const RATE_SHEET_ID = 'rs_editions';
const ITEM_ID = 'ri_1';
const SOURCE_ITEM_ID = 'src_1';
const RATE_SHEETS = [{
  rate_sheet_id: RATE_SHEET_ID, title: 'Primary', status: 'active', groups: [],
  items: [
    { item_id: ITEM_ID, source_item_id: SOURCE_ITEM_ID, unit_price: 10, per: null, quantity: 1, group_id: null, sort_order: 0 },
  ],
}];
const PACKAGE_RELATIONSHIPS = [{
  item_id: SOURCE_ITEM_ID, source_type: 'inclusion', source_id: 'inc_1',
  resolved: { label: 'Priority support' }, decorated_label: 'Priority support', group_id: null,
  sort_order: 0, disabled: false, missing: false, module_transition: 'settled',
}];

function emptySlotDetail() {
  return {
    occupant_id: null, platform_id: '', addon_platform_id: '', label: '', ideal_for: '',
    price: null, contact: false, billing_cycle: null, rate_sheet_id: null, inclusions_override: [],
    rate_sheet_items: [], rate_sheet_selections: [], features: [], faq_refs: [], enabled: false,
    is_explicitly_disabled: false, is_addon: false,
    drafts: { overview: null, features: null, faqs: null },
    module_status: { overview: 'not-configured', features: 'not-configured', faqs: 'not-configured' },
    tier_editions: [],
  };
}

function detailFor(tierId) {
  if (tierId !== TIER_ID) return emptySlotDetail();
  return { ...OCCUPANT, tier_editions: editions };
}

function stationTiers() {
  const out = {};
  for (const key of ['basic', 'standard', 'premium', 'enterprise', 'ultimate']) out[key] = detailFor(key);
  return out;
}

// ── Engine mock — mirrors StationLifecycle's permissive/mask/restore rules ──
const LIVE = new Set(['active', 'disabled']);
const BIN = new Set(['archived', 'trashed']);
function capturePrevious(current, previous) { return LIVE.has(current) ? current : previous; }
function applyStatusPermissive(current, target, previous) {
  return { status: target, previous_status: BIN.has(target) ? capturePrevious(current, previous) : previous };
}
function applyMask(current, previous, action) {
  if (action === 'disable') {
    if (!LIVE.has(current)) throw new Error('Only an active or pending Tier Edition can be disabled.');
    return { status: 'disabled', previous_status: current === 'active' || previous === null ? current : previous };
  }
  if (action === 'enable') {
    if (current !== 'disabled' || previous === null) throw new Error('Only an explicitly disabled Tier Edition can be enabled.');
    return { status: 'disabled', previous_status: null };
  }
  throw new Error('Invalid action.');
}
function restoreTransition(current) {
  if (!BIN.has(current)) return null;
  return { status: 'disabled', previous_status: null };
}

// Well-formed CZTE identifiers: the real prefix plus a 5-char suffix drawn
// from PlatformIdentifierPolicy::ALPHABET, matching contract:platform-
// identity-schema's own closed-vocabulary check (a coined, non-conforming
// numeric-suffix literal would fail that scan even inside a test fixture).
const CZTE_SUFFIXES = ['2A7KZ', '3B8MZ'];
let czteMints = 0;
let czteCounter = 0;
function findEdition(id) { return editions.find((e) => e.id === id) ?? null; }
function replaceEdition(next) {
  const idx = editions.findIndex((e) => e.id === next.id);
  if (idx === -1) editions = [...editions, next]; else { editions = editions.slice(); editions[idx] = next; }
}

function jsonResponse(body, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) });
}
function envelope(payload) { return { ...payload, tier_instance_id: INSTANCE_ID }; }

const READ_PATH = `admin/services/${SERVICE_ID}/package-station/tier-instances/${INSTANCE_ID}/read`;
const TIER_BASE = `admin/services/${SERVICE_ID}/package-station/tier-instances/${INSTANCE_ID}/tiers`;

let saveDraftCalls = 0;
let settleCalls = 0;
let statusCalls = 0;
let restoreCalls = 0;
let deleteCalls = 0;

globalThis.fetch = (url, init = {}) => {
  const path = String(url);
  const method = (init?.method ?? 'GET').toUpperCase();
  const body = init.body ? JSON.parse(init.body) : {};

  if (path.endsWith(READ_PATH) && method === 'GET') {
    return jsonResponse({
      success: true, tier_instance_id: INSTANCE_ID, service_id: SERVICE_ID,
      station: {
        tier_instance_id: INSTANCE_ID, allowed_rate_sheet_ids: [RATE_SHEET_ID], platform_status: 'active',
        tiers: stationTiers(), popular_tier: null, popular_label: '', sort_position: 0,
        bundle: { title: '', description: '', price: null }, occupant_bin: [],
      },
      service: {
        id: SERVICE_ID, title: 'Cloud Backup', inclusions: [], faqs: [],
        rate_sheets: RATE_SHEETS, package_relationships: PACKAGE_RELATIONSHIPS,
      },
    });
  }

  let m;

  if ((m = path.match(new RegExp(`${TIER_BASE}/([a-z]+)/editions$`))) && method === 'POST') {
    const title = String(body.title ?? '').trim();
    if (title === '') return jsonResponse({ success: false, message: 'Tier Edition title is required.' }, 422);
    const edition = {
      id: `edt_${(++czteCounter).toString(16).padStart(6, '0')}`,
      edition_platform_id: '', title, admin_description: '',
      platform_status: 'disabled', previous_platform_status: null, is_explicitly_disabled: false,
      module_status: {}, drafts: {},
      rate_sheet_id: null, rate_sheet_items: [], price: null, contact: false,
      billing_cycle: null, minimum_term_value: null, minimum_term_unit: null,
      inclusions_override: [], faq_refs: [],
    };
    editions = [...editions, edition];
    return jsonResponse(envelope({ success: true, tier_id: m[1], edition_id: edition.id, edition }));
  }

  if ((m = path.match(new RegExp(`${TIER_BASE}/([a-z]+)/editions/([a-z0-9_]+)/modules/overview$`))) && method === 'POST') {
    saveDraftCalls += 1;
    const edition = findEdition(m[2]);
    if (!edition) return jsonResponse({ success: false, message: 'Tier Edition not found.' }, 404);
    const title = String(body.title ?? '').trim();
    if (title === '') return jsonResponse({ success: false, message: 'Tier Edition title is required.' }, 422);
    edition.drafts = {
      ...edition.drafts,
      overview: {
        title, admin_description: body.admin_description ?? '', rate_sheet_id: body.rate_sheet_id ?? null,
        rate_sheet_items: body.rate_sheet_items ?? [], billing_cycle: body.billing_cycle ?? null,
        contact: body.contact ?? false, minimum_term_value: body.minimum_term_value ?? null,
        minimum_term_unit: body.minimum_term_unit ?? null, inclusions_override: body.inclusions_override ?? [],
        faq_refs: body.faq_refs ?? [],
      },
    };
    edition.module_status = { ...edition.module_status, overview: 'pending' };
    replaceEdition(edition);
    return jsonResponse(envelope({ success: true, tier_id: m[1], edition_id: edition.id, edition }));
  }

  if ((m = path.match(new RegExp(`${TIER_BASE}/([a-z]+)/editions/([a-z0-9_]+)/modules/overview/settle$`))) && method === 'POST') {
    settleCalls += 1;
    const edition = findEdition(m[2]);
    if (!edition) return jsonResponse({ success: false, message: 'Tier Edition not found.' }, 404);
    const draft = edition.drafts?.overview ?? null;
    if (draft) {
      edition.title = draft.title ?? edition.title;
      edition.admin_description = draft.admin_description ?? edition.admin_description;
      edition.rate_sheet_id = draft.rate_sheet_id ?? edition.rate_sheet_id;
      edition.rate_sheet_items = draft.rate_sheet_items ?? edition.rate_sheet_items;
      edition.billing_cycle = draft.billing_cycle ?? edition.billing_cycle;
      edition.contact = draft.contact ?? edition.contact;
      edition.minimum_term_value = draft.minimum_term_value ?? edition.minimum_term_value;
      edition.minimum_term_unit = draft.minimum_term_unit ?? edition.minimum_term_unit;
      edition.inclusions_override = draft.inclusions_override ?? edition.inclusions_override;
      edition.faq_refs = draft.faq_refs ?? edition.faq_refs;
      edition.drafts = { ...edition.drafts, overview: null };
      edition.module_status = { ...edition.module_status, overview: 'settled' };
    }
    replaceEdition(edition);
    return jsonResponse(envelope({ success: true, tier_id: m[1], edition_id: edition.id, edition }));
  }

  if ((m = path.match(new RegExp(`${TIER_BASE}/([a-z]+)/editions/([a-z0-9_]+)/status$`))) && method === 'PATCH') {
    statusCalls += 1;
    const edition = findEdition(m[2]);
    if (!edition) return jsonResponse({ success: false, message: 'Tier Edition not found.' }, 404);
    try {
      const change = (body.action === 'disable' || body.action === 'enable')
        ? applyMask(edition.platform_status, edition.previous_platform_status, body.action)
        : applyStatusPermissive(edition.platform_status, body.platform_status, edition.previous_platform_status);
      edition.platform_status = change.status;
      edition.previous_platform_status = change.previous_status;
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 422);
    }
    // Mirrors updateTierEditionStatus's reserve-on-first-Active-only rule.
    if (edition.platform_status === 'active' && edition.edition_platform_id === '') {
      edition.edition_platform_id = `CZTE${CZTE_SUFFIXES[czteMints]}`;
      czteMints += 1;
    }
    replaceEdition(edition);
    return jsonResponse(envelope({ success: true, tier_id: m[1], edition_id: edition.id, edition }));
  }

  if ((m = path.match(new RegExp(`${TIER_BASE}/([a-z]+)/editions/([a-z0-9_]+)/restore$`))) && method === 'POST') {
    restoreCalls += 1;
    const edition = findEdition(m[2]);
    if (!edition) return jsonResponse({ success: false, message: 'Tier Edition not found.' }, 404);
    const change = restoreTransition(edition.platform_status);
    if (!change) return jsonResponse({ success: false, message: 'Tier Edition is not in a restorable state.' }, 422);
    edition.platform_status = change.status;
    edition.previous_platform_status = change.previous_status;
    replaceEdition(edition);
    return jsonResponse(envelope({ success: true, tier_id: m[1], edition_id: edition.id, edition }));
  }

  if ((m = path.match(new RegExp(`${TIER_BASE}/([a-z]+)/editions/([a-z0-9_]+)$`))) && method === 'DELETE') {
    deleteCalls += 1;
    const edition = findEdition(m[2]);
    if (!edition) return jsonResponse({ success: false, message: 'Tier Edition not found.' }, 404);
    if (edition.platform_status !== 'trashed') {
      return jsonResponse({ success: false, code: 'tier_edition_delete_guard', message: 'Only a trashed Tier Edition can be permanently deleted.' }, 409);
    }
    editions = editions.filter((e) => e.id !== edition.id);
    return jsonResponse(envelope({ success: true, tier_id: m[1], edition_id: edition.id }));
  }

  return Promise.reject(new Error(`Unexpected fetch in regression harness: ${method} ${path}`));
};

// ── Bundle the REAL composition — the same file the occupant regression
// mounts, so this proves the actual Details-tab tree an admin sees. ────────
await build({
  entryPoints: [resolve(root, 'resources/ts/package-station/drawer/tier/TierDrawerContent.tsx')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  logLevel: 'silent',
});

const { TierDrawerContent } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');
const { useState, useMemo, useRef } = await import('preact/hooks');

// ── Harness ──────────────────────────────────────────────────────────────
let setFooterCalls = 0;

function Harness({ initialTierId }) {
  const [, setFooterState] = useState(null);
  const setFooterRef = useRef(setFooterState);
  setFooterRef.current = setFooterState;

  const setFooter = useMemo(() => (footer) => {
    setFooterCalls += 1;
    setFooterRef.current(footer);
  }, []);
  const bridge = useMemo(() => ({
    close: () => {},
    setFooter,
    setCloseGuard: () => {},
    onMutationComplete: () => {},
  }), [setFooter]);

  return h(TierDrawerContent, { serviceId: SERVICE_ID, tierInstanceId: INSTANCE_ID, initialTierId, bridge });
}

const container = document.createElement('div');
document.body.appendChild(container);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitQuiet(maxTicks = 400, quietTicksNeeded = 15) {
  let quiet = 0;
  let previous = setFooterCalls;
  for (let tick = 0; tick < maxTicks; tick += 1) {
    await sleep(5);
    if (setFooterCalls === previous) {
      quiet += 1;
      if (quiet >= quietTicksNeeded) return;
    } else {
      quiet = 0;
      previous = setFooterCalls;
    }
  }
}

const failures = [];
function check(label, cond, detail) {
  if (cond) { console.log(`  ok — ${label}`); }
  else { console.error(`  FAIL — ${label}${detail !== undefined ? `: ${detail}` : ''}`); failures.push(label); }
}

function clickButtonWithText(text, root = container) {
  const btn = [...root.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return btn;
}
function setInputValue(selector, value) {
  const el = container.querySelector(selector);
  if (!el) return;
  el.value = value;
  el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
}
// Options' own [Edition …] tab strip (TierEditionDeclarationSwitcher) shows
// exactly ONE Edition's own view/edit surface at a time — no per-row scoping
// needed, unlike the old stacked-list panel this replaced. No Default tab
// exists here — Default's own terms live in Default Tier Inclusions under
// Details, never as a row of this strip.
function declarationTab(text) {
  return [...container.querySelectorAll('.cz-cost-builder__tier-editions [role="tab"]')].find((b) => b.textContent.trim() === text);
}
// The individual-tier drawer's own four-group nav (Details/Options/
// Connections/Support) — Editions live under Options, Overview's own
// "+ Edition" control lives under Details, so this regression must switch
// groups the same way a real admin would rather than finding everything on
// one screen.
function selectGroup(label) {
  const btn = [...container.querySelectorAll('.cz-drawer-groups__tab')].find((b) => b.textContent.trim() === label);
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return btn;
}
function selectDeclarationTab(text) {
  const btn = declarationTab(text);
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return btn;
}
function selectedStatusText() {
  return container.querySelector('.cz-tier-edition-declaration__status')?.textContent.trim() ?? null;
}
// The selected Edition's own read surface is two mature module cards
// (Edition Overview, Edition Inclusions — PlacedShell/ReadBlock, same
// .drawerModule/.drawerModule__title/.drawerModule__field grammar every
// other module in this drawer renders through), not a bespoke summary
// block — same scoping technique tier-occupant-lifecycle-regression.mjs
// already uses for Tier Overview / Default Tier Inclusions.
function findModule(titleText) {
  return [...container.querySelectorAll('.drawerModule')]
    .find((el) => el.querySelector('.drawerModule__title')?.textContent.trim().startsWith(titleText)) ?? null;
}
function moduleFieldValue(moduleTitle, fieldLabel) {
  const mod = findModule(moduleTitle);
  const field = [...(mod?.querySelectorAll('.drawerModule__field') ?? [])]
    .find((el) => el.querySelector('.drawerModule__label')?.textContent.trim() === fieldLabel);
  return field?.querySelector('.drawerModule__value')?.textContent.trim() ?? null;
}
// Proves Edition Overview/Inclusions carry the SAME 5-state pill/notification
// grammar every other module in this drawer does (evaluateModule, not a
// bespoke status string) — same technique as
// tier-occupant-lifecycle-regression.mjs's own pillLabel().
function pillLabel(moduleTitle) {
  return findModule(moduleTitle)?.querySelector('.cz-module-status-pill')?.textContent.trim();
}
// "Edit" is ambiguous at the whole-container level — Overview, Default Tier
// Inclusions, and Common Questions each carry their own "Edit" action too —
// so the click must be scoped to the specific Edition card. Either card
// opens the SAME shared editor (TierEditionEditor.tsx); which card was
// clicked only decides which inner tab opens first.
function clickEditOn(moduleTitle) {
  const mod = findModule(moduleTitle);
  return [...(mod?.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim() === 'Edit')
    ?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}
// The inner Overview/Inclusions editor tab is local presentation state
// (DrawerGroupTabs) inside the one shared editor — read which is active via
// its own field markers rather than a second editing.module.
function editorShowsOverviewTab() {
  return !!container.querySelector('#edt-title');
}
function editorShowsInclusionsTab() {
  return !!container.querySelector('#edt-rate-sheet');
}
function clickEditorTab(label) {
  return clickButtonWithText(label, container.querySelector('.cz-ies') ?? container);
}
// PoolInclusionsEditor's Rate-Sheet-catalogue mode: a plain <select> whose
// first option reads "Add from Rate Sheet…", with no distinguishing id.
function selectRateSheetRow(itemId) {
  const select = [...container.querySelectorAll('select')]
    .find((el) => el.querySelector('option')?.textContent === 'Add from Rate Sheet…');
  if (!select) return;
  select.value = itemId;
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
}
function rateSheetRowCount() {
  return container.querySelectorAll('.cz-ie-row').length;
}
// Overview module's own small "Editions" read field (docs/code-map/tier-edition.md) —
// a `.drawerModule__field` whose label reads "Editions", value is the derived count.
function overviewEditionsCountText() {
  const field = [...container.querySelectorAll('.drawerModule__field')]
    .find((el) => el.querySelector('.drawerModule__label')?.textContent.trim() === 'Editions');
  return field?.querySelector('.drawerModule__value')?.textContent.trim() ?? null;
}

console.log('Tier Edition admin lifecycle regression (mounted TierDrawerContent → Default Tier Inclusions)\n');
render(h(Harness, { initialTierId: TIER_ID }), container);
await waitQuiet();

console.log('1) A freshly published occupant starts with only its own Default declaration');
check('Overview\'s own Editions count reads 1 (the occupant\'s own Default only)', overviewEditionsCountText() === '1', overviewEditionsCountText());
selectGroup('Options');
await sleep(20);
check('no additional-declarations tab strip renders yet — this Tier behaves exactly as before Editions existed', container.querySelectorAll('.cz-cost-builder__tier-editions [role="tab"]').length === 0);
check('Options offers "+ Edition" — the single place that creates one', [...container.querySelectorAll('button')].some((b) => b.textContent.trim() === '+ Edition'));
check('a proper empty state prompts "+ Edition" — never a Default fallback', container.textContent.includes('No additional Editions yet'));

console.log('\n2) Registering one more position from Options mints a born-disabled, auto-titled child — no title form anywhere');
clickButtonWithText('+ Edition');
await waitQuiet();
check('a new Edition was created', editions.length === 1, editions.length);
check('the tab strip offers only the new Edition — no Default tab', declarationTab('Default') === undefined && declarationTab('Edition 2') !== undefined);
check('no CZTE was assigned at creation', czteMints === 0, czteMints);
check('the empty-state prompt is gone now that an Edition exists', !container.textContent.includes('No additional Editions yet'));
check(
  'the new Edition is auto-selected — no explicit tab click needed, and its own view surface already shows',
  declarationTab('Edition 2')?.getAttribute('aria-selected') === 'true' && selectedStatusText()?.includes('Pending'),
  `aria-selected=${declarationTab('Edition 2')?.getAttribute('aria-selected')} status=${selectedStatusText()}`,
);
selectGroup('Details');
await sleep(20);
check('Overview\'s own Editions count advanced to 2', overviewEditionsCountText() === '2', overviewEditionsCountText());
selectGroup('Options');
await sleep(20);

console.log('\n3) Selecting "Edition 2", editing it through the shared editor, and renaming it to "Annual Plan" via the shared draft/settle module');
selectDeclarationTab('Edition 2');
await sleep(20);
check('the newly selected Edition reads Pending (disabled, never published)', selectedStatusText()?.includes('Pending'), selectedStatusText());
check('Edition Overview and Edition Inclusions render as two mature module cards', findModule('Edition Overview') !== null && findModule('Edition Inclusions') !== null);
check('both cards carry the SAME 5-state pill — one module, two views, not two independently resolved ones', pillLabel('Edition Overview') === pillLabel('Edition Inclusions'), `overview=${pillLabel('Edition Overview')} inclusions=${pillLabel('Edition Inclusions')}`);

console.log('  3a) Edit from the Inclusions card opens the SAME shared editor, on the Inclusions tab');
clickEditOn('Edition Inclusions');
await sleep(20);
check('the Inclusions tab is active — no explicit tab click needed', editorShowsInclusionsTab() && !editorShowsOverviewTab());
check('Edition Overview\'s own card is gone while editing — one shared editor replaces both cards', findModule('Edition Overview') === null);

console.log('  3b) Selecting a Rate Sheet row here, then switching to Overview, must not lose it');
setInputValue('#edt-rate-sheet', RATE_SHEET_ID);
await sleep(20);
selectRateSheetRow(ITEM_ID);
await sleep(20);
check('the Rate Sheet row was added on the Inclusions tab', rateSheetRowCount() === 1, rateSheetRowCount());
const saveCallsDuringSwitch = saveDraftCalls;
const settleCallsDuringSwitch = settleCalls;
clickEditorTab('Overview');
await sleep(20);
check('switching tabs fired no draft-save/settle endpoint', saveDraftCalls === saveCallsDuringSwitch && settleCalls === settleCallsDuringSwitch);
check('the Overview tab is now active', editorShowsOverviewTab() && !editorShowsInclusionsTab());

console.log('  3c) Editing the Overview tab, then switching back to Inclusions, must not lose that either');
// Yield between edits — each field's onChange closes over the draft state at
// its own last render, so firing two edits in the same tick (before Preact's
// microtask-batched re-render lands) makes the second call's stale closure
// clobber the first's change.
setInputValue('#edt-title', 'Annual Plan');
await sleep(20);
setInputValue('#edt-billing-cycle', 'annually');
await sleep(20);
clickEditorTab('Inclusions');
await sleep(20);
check('the Rate Sheet row selected before the round trip is still there', rateSheetRowCount() === 1, rateSheetRowCount());
check('switching tabs still fired no endpoint', saveDraftCalls === saveCallsDuringSwitch && settleCalls === settleCallsDuringSwitch);
clickEditorTab('Overview');
await sleep(20);
check('the title typed before the round trip is still there', container.querySelector('#edt-title')?.value === 'Annual Plan', container.querySelector('#edt-title')?.value);

console.log('  3d) One Save commits both tabs\' changes together, as one draft');
const saveCallsBefore = saveDraftCalls;
const settleCallsBefore = settleCalls;
clickButtonWithText('Save');
await waitQuiet();
check('the module draft-save endpoint was called exactly once for both changes', saveDraftCalls === saveCallsBefore + 1, saveDraftCalls);
check('the module settle endpoint was called right after (Save chains draft → settle for an Edition)', settleCalls === settleCallsBefore + 1, settleCalls);
check('the tab now shows the new title', declarationTab('Annual Plan') !== undefined);
check('the old auto-generated title is gone — this is a rename, not a second Edition', declarationTab('Edition 2') === undefined);
check('the Rate Sheet selection from the Inclusions tab was saved in the SAME draft', findEdition(editions.find((e) => e.title === 'Annual Plan')?.id)?.rate_sheet_id === RATE_SHEET_ID);
check('Edition Inclusions now shows the resolved row read-only', findModule('Edition Inclusions')?.textContent.includes('Priority support'));

console.log('\n4) Publish "Annual Plan" — activates and assigns CZTE exactly once');
selectDeclarationTab('Annual Plan');
await sleep(20);
clickButtonWithText('Publish');
await waitQuiet();
check('the status endpoint was called', statusCalls === 1, statusCalls);
check('the Edition reads Active', selectedStatusText()?.includes('Active'), selectedStatusText());
check('a CZTE identifier was minted on first Publish', czteMints === 1, czteMints);
check('the assigned CZTE is now shown', moduleFieldValue('Edition Overview', 'Edition Platform ID')?.includes(`CZTE${CZTE_SUFFIXES[0]}`), moduleFieldValue('Edition Overview', 'Edition Platform ID'));
check('the Edition Overview pill now reads Active — the shared 5-state pill, not a bespoke status string', pillLabel('Edition Overview') === 'Active', pillLabel('Edition Overview'));

console.log('\n5) Disable — captures previous_platform_status, offered Enable');
clickButtonWithText('Disable');
await waitQuiet();
check('the Edition reads Disabled (masked, not Pending)', selectedStatusText()?.includes('Disabled'), selectedStatusText());
check('Enable is now offered', [...container.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Enable'));

console.log('\n6) Enable — lands Pending, never straight back to Active (same rule the occupant itself follows)');
clickButtonWithText('Enable');
await waitQuiet();
check('Enable never reactivates — the Edition reads Pending', selectedStatusText()?.includes('Pending'), selectedStatusText());

console.log('\n7) Republish — reaches Active again; the SAME CZTE is reused, never re-reserved');
clickButtonWithText('Publish');
await waitQuiet();
check('the Edition reads Active again', selectedStatusText()?.includes('Active'), selectedStatusText());
check('republish never mints a second CZTE', czteMints === 1, czteMints);
check('the CZTE identity is unchanged', moduleFieldValue('Edition Overview', 'Edition Platform ID')?.includes(`CZTE${CZTE_SUFFIXES[0]}`), moduleFieldValue('Edition Overview', 'Edition Platform ID'));

console.log('\n8) Archive, then Trash, then guarded permanent delete — succeeds as soon as the Edition is trashed, with no "default Edition" concept to block it');
clickButtonWithText('Archive');
await waitQuiet();
check('the Edition reads Archived', selectedStatusText()?.includes('Archived'), selectedStatusText());
clickButtonWithText('Move to Trash');
await waitQuiet();
check('the Edition reads Trashed', selectedStatusText()?.includes('Trashed'), selectedStatusText());
check('Delete permanently is offered immediately once trashed', [...container.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Delete permanently'));
clickButtonWithText('Delete permanently');
await waitQuiet();
check('the delete endpoint was called', deleteCalls === 1, deleteCalls);
selectGroup('Details');
await sleep(20);
check('Overview\'s own Editions count dropped back to 1 — the derived count, not a separately stored one', overviewEditionsCountText() === '1', overviewEditionsCountText());
selectGroup('Options');
await sleep(20);
check('the tab strip is gone again — no editions remain', container.querySelectorAll('.cz-cost-builder__tier-editions [role="tab"]').length === 0);
check('the empty state is back — never a Default fallback', container.textContent.includes('No additional Editions yet'));

console.log('\n9) Registering + configuring + publishing a second Edition, "Monthly Plan", proves the position-numbering is re-derived, not a permanent sequence');
clickButtonWithText('+ Edition');
await waitQuiet();
check('the auto-title reuses "Edition 2" — it is derived from the current count, not a permanent counter', declarationTab('Edition 2') !== undefined);
selectDeclarationTab('Edition 2');
await sleep(20);
clickEditOn('Edition Overview');
await sleep(20);
setInputValue('#edt-title', 'Monthly Plan');
await sleep(20);
setInputValue('#edt-billing-cycle', 'monthly');
await sleep(20);
clickButtonWithText('Save');
await waitQuiet();
selectDeclarationTab('Monthly Plan');
await sleep(20);
clickButtonWithText('Publish');
await waitQuiet();
check('Monthly Plan reads Active', selectedStatusText()?.includes('Active'), selectedStatusText());
check('a second, distinct CZTE was minted', czteMints === 2, czteMints);
check('Monthly Plan carries its own CZTE, not Annual Plan\'s', moduleFieldValue('Edition Overview', 'Edition Platform ID')?.includes(`CZTE${CZTE_SUFFIXES[1]}`), moduleFieldValue('Edition Overview', 'Edition Platform ID'));

console.log('\n10) Restore — archived/trashed → disabled/Pending, never straight to Active');
clickButtonWithText('Archive');
await waitQuiet();
check('Monthly Plan reads Archived', selectedStatusText()?.includes('Archived'), selectedStatusText());
clickButtonWithText('Restore');
await waitQuiet();
check('restore never reactivates — Monthly Plan reads Pending', selectedStatusText()?.includes('Pending'), selectedStatusText());
check('restore was called exactly once', restoreCalls === 1, restoreCalls);
check('it kept its own CZTE through Archive/Restore (identity is permanent once assigned)', moduleFieldValue('Edition Overview', 'Edition Platform ID')?.includes(`CZTE${CZTE_SUFFIXES[1]}`), moduleFieldValue('Edition Overview', 'Edition Platform ID'));

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — Overview registration, Create/Save-Settle/Publish/Disable/Enable/Archive/Trash/guarded-Delete/Restore behave per SECTION: TIER_EDITION, driven through the real mounted Default Tier Inclusions tab strip. There is no "default Edition" concept left to drive — the occupant\'s own declaration is the permanent Default, and no title/pricing form ever appears in Overview itself.');
process.exit(0);
