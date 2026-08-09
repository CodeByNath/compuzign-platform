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
// Section 13 (secondary-nav sticky refinement) extends the SAME mounted
// tree — no second harness — to prove ChildChipStrip under Options renders
// identically in Accordion mode, that Accordion supplies its documented
// 0px sticky-chrome context (DrawerGroupAccordion, not a new sticky
// accordion-header system), that none of it touches selection or fires an
// endpoint, that scrolling in Accordion mode does NOT hide/reveal the strip
// (TierDrawerContent only resolves a real scroll container while Tabs mode
// is active), and that switching back to Tabs both rebuilds the
// chrome-height variable through Tabs' own mechanism AND re-enables
// scroll-direction hide/reveal with the same hysteresis-against-jitter
// guarantee.
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
let editionBin = [];

// Two selectable Rate Sheet rows — ITEM_ID is the one the regression
// actually selects onto the Edition (step 3b); UNSELECTED_ITEM_ID never gets
// selected. Both are inclusion-type. This proves the Edition Inclusions read
// card renders only the Edition's own persisted selection, not every
// inclusion-type row the bound sheet happens to carry (correction plan item
// 1 — the read card used to filter the whole catalogue). Same fixture shape
// tier-occupant-lifecycle-regression.mjs already uses for the parent
// occupant's own Inclusions editor.
const RATE_SHEET_ID = 'rs_editions';
const ITEM_ID = 'ri_1';
const SOURCE_ITEM_ID = 'src_1';
const UNSELECTED_ITEM_ID = 'ri_2';
const UNSELECTED_SOURCE_ITEM_ID = 'src_2';
const RATE_SHEETS = [{
  rate_sheet_id: RATE_SHEET_ID, title: 'Primary', status: 'active', groups: [],
  items: [
    { item_id: ITEM_ID, source_item_id: SOURCE_ITEM_ID, unit_price: 10, per: null, quantity: 1, group_id: null, sort_order: 0 },
    { item_id: UNSELECTED_ITEM_ID, source_item_id: UNSELECTED_SOURCE_ITEM_ID, unit_price: 5, per: null, quantity: 1, group_id: null, sort_order: 1 },
  ],
}];
const PACKAGE_RELATIONSHIPS = [{
  item_id: SOURCE_ITEM_ID, source_type: 'inclusion', source_id: 'inc_1',
  resolved: { label: 'Priority support' }, decorated_label: 'Priority support', group_id: null,
  sort_order: 0, disabled: false, missing: false, module_transition: 'settled',
}, {
  item_id: UNSELECTED_SOURCE_ITEM_ID, source_type: 'inclusion', source_id: 'inc_2',
  resolved: { label: 'Unselected extra' }, decorated_label: 'Unselected extra', group_id: null,
  sort_order: 1, disabled: false, missing: false, module_transition: 'settled',
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
  return { ...OCCUPANT, tier_editions: editions, tier_edition_bin: editionBin };
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
// Edition lifecycle/Bin UX cleanup — the ONE admin-facing "Move Edition to
// Bin" action, and the bin's own row-level operations. moveToBinCommandCalls
// mirrors the NEW atomic endpoint (PackageStationController::
// moveTierEditionToBinCommand); deleteCalls above stays wired to the OLD
// guarded-delete route (still valid backend-side, just no longer reachable
// from this UI — see tier-edition-move-to-bin-contract.ts) so it is
// deliberately never incremented by any click in this file any more.
let moveToBinCommandCalls = 0;
let restoreFromBinCalls = 0;
let trashBinEntryCalls = 0;
let deleteBinEntryCalls = 0;
let binIdCounter = 0;

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
      // Mirrors PackageSchema::applyTierEditionDisabledMask exactly: neither
      // disable nor enable ever touches is_explicitly_disabled — that field
      // stays at its creation default forever for an Edition (unlike the
      // Tier occupant's own mask, which the occupant's own /status endpoint
      // DOES set — see PackageStationController.php). The frontend must
      // derive Disabled from platform_status/previous_platform_status alone
      // (tierEditionDisabledMasked), never from this field. A mock that
      // "fixed" this field to move in lockstep would test the frontend
      // against a fictional API contract and hide exactly this class of bug.
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

  // Edition lifecycle/Bin UX cleanup — the ONE atomic admin command. Mirrors
  // PackageStationController::moveTierEditionToBinCommand exactly: trash (via
  // the SAME permissive applyStatusPermissive helper the /status route above
  // already uses) only when not already binnable, then relocate — both
  // before a single response, never two separate round trips.
  if ((m = path.match(new RegExp(`${TIER_BASE}/([a-z]+)/editions/([a-z0-9_]+)/move-to-bin$`))) && method === 'POST') {
    moveToBinCommandCalls += 1;
    const edition = findEdition(m[2]);
    if (!edition) return jsonResponse({ success: false, code: 'unknown_edition', message: 'Tier Edition not found.' });
    if (!BIN.has(edition.platform_status)) {
      const change = applyStatusPermissive(edition.platform_status, 'trashed', edition.previous_platform_status);
      edition.platform_status = change.status;
      edition.previous_platform_status = change.previous_status;
    }
    editions = editions.filter((e) => e.id !== edition.id);
    const binEntry = { bin_id: `bin_${(++binIdCounter).toString(16).padStart(6, '0')}`, edition, status: edition.platform_status, displaced_at: '2026-08-09 00:00:00' };
    editionBin = [...editionBin, binEntry];
    return jsonResponse(envelope({
      success: true, tier_id: m[1], edition_id: edition.id, bin_entry: binEntry,
      tier_editions: editions, tier_edition_bin: editionBin,
    }));
  }

  // The occupant-owned Edition bin's own row-level operations (Phase 6,
  // unchanged by this cleanup) — now actually exercised by a real click
  // through TierEditionBinList, not just the PackageSchema-level PHP test.
  if ((m = path.match(new RegExp(`${TIER_BASE}/([a-z]+)/edition-bin/([a-z0-9_]+)/restore$`))) && method === 'POST') {
    restoreFromBinCalls += 1;
    const idx = editionBin.findIndex((e) => e.bin_id === m[2]);
    if (idx === -1) return jsonResponse({ success: false, code: 'unknown_bin_entry' });
    const entry = editionBin[idx];
    if (!BIN.has(entry.status)) return jsonResponse({ success: false, code: 'restore_illegal' });
    editionBin = editionBin.filter((e) => e.bin_id !== m[2]);
    editions = [...editions, { ...entry.edition, platform_status: 'disabled', previous_platform_status: null }];
    return jsonResponse(envelope({ success: true, tier_id: m[1], bin_id: m[2], tier_editions: editions, tier_edition_bin: editionBin }));
  }
  if ((m = path.match(new RegExp(`${TIER_BASE}/([a-z]+)/edition-bin/([a-z0-9_]+)/trash$`))) && method === 'POST') {
    trashBinEntryCalls += 1;
    const idx = editionBin.findIndex((e) => e.bin_id === m[2]);
    if (idx === -1) return jsonResponse({ success: false, code: 'unknown_bin_entry' });
    const entry = editionBin[idx];
    if (entry.status !== 'archived') return jsonResponse({ success: false, code: 'trash_illegal' });
    const next = { ...entry, status: 'trashed', edition: { ...entry.edition, platform_status: 'trashed' } };
    editionBin = editionBin.slice();
    editionBin[idx] = next;
    return jsonResponse(envelope({ success: true, tier_id: m[1], bin_id: m[2], tier_edition_bin: editionBin }));
  }
  if ((m = path.match(new RegExp(`${TIER_BASE}/([a-z]+)/edition-bin/([a-z0-9_]+)$`))) && method === 'DELETE') {
    deleteBinEntryCalls += 1;
    const idx = editionBin.findIndex((e) => e.bin_id === m[2]);
    if (idx === -1) return jsonResponse({ success: false, code: 'unknown_bin_entry' });
    const entry = editionBin[idx];
    if (entry.status !== 'trashed') return jsonResponse({ success: false, code: 'delete_illegal' });
    editionBin = editionBin.filter((e) => e.bin_id !== m[2]);
    return jsonResponse(envelope({ success: true, tier_id: m[1], bin_id: m[2], tier_edition_bin: editionBin }));
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
// Single-footer, scope-aware lifecycle command model: Edition lifecycle
// actions no longer render inline inside `container` — they're in the ONE
// pinned footer, registered through the bridge exactly like the Tier
// occupant's own footer. Same lastFooter/footerContainer/renderFooterDom
// technique tier-occupant-lifecycle-regression.mjs already uses.
let setFooterCalls = 0;
let lastFooter = null;
// Section 14 — inline-editor chrome suppression: the same optional bridge
// capability AdminStationDrawer/TierDrawerHost thread through in the real
// app, tracked here exactly like setFooter above so the regression can
// assert on the actual signal TierDrawerContent publishes, not just its
// visible effects.
let headerHiddenCalls = 0;
let lastHeaderHidden = false;

function Harness({ initialTierId }) {
  const [, setFooterState] = useState(null);
  const setFooterRef = useRef(setFooterState);
  setFooterRef.current = setFooterState;

  const setFooter = useMemo(() => (footer) => {
    setFooterCalls += 1;
    lastFooter = footer;
    setFooterRef.current(footer);
  }, []);
  const setHeaderHidden = useMemo(() => (hidden) => {
    headerHiddenCalls += 1;
    lastHeaderHidden = hidden;
  }, []);
  const bridge = useMemo(() => ({
    close: () => {},
    setFooter,
    setCloseGuard: () => {},
    setHeaderHidden,
    onMutationComplete: () => {},
  }), [setFooter, setHeaderHidden]);

  return h(TierDrawerContent, { serviceId: SERVICE_ID, tierInstanceId: INSTANCE_ID, initialTierId, bridge });
}

const container = document.createElement('div');
// Real markup nests TierDrawerContent's own '.cz-req-detail' root one level
// inside AdminStationDrawer's '.cz-station-drawer__body' (the actual
// scrolling element — see admin-station.css). TierDrawerContent resolves it
// via a single closest() lookup at the composition layer, and ONLY while
// Tabs mode is active (null in Accordion mode) — never inside the generic
// ChildChipStrip primitive. Giving the mount container this class lets that
// lookup resolve to a real element here too, so section 13's scroll checks
// exercise the actual resolved scrollContainer (or its absence in Accordion
// mode) rather than always null.
container.classList.add('cz-station-drawer__body');
document.body.appendChild(container);
const footerContainer = document.createElement('div');
document.body.appendChild(footerContainer);
function renderFooterDom() {
  render(lastFooter, footerContainer);
  return footerContainer;
}

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
// The Tabs/Accordion view toggle (compact-icon refinement) is found by
// aria-label, not text — same technique tier-occupant-lifecycle-
// regression.mjs already uses for the same button.
function clickButtonWithLabel(label, root = container) {
  const btn = root.querySelector(`[aria-label="${label}"]`);
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return btn;
}
// Section 13 — secondary-nav scroll-hide (Tabs mode only): drives
// useScrollHide through the real drawer scroll body (`container` itself,
// tagged '.cz-station-drawer__body' above) rather than window scroll.
// happy-dom does not synthesize 'scroll' events from a bare scrollTop
// write, so this sets it and dispatches the event explicitly, the same
// manual-event-dispatch pattern every other input/click interaction in
// this file already uses.
function fireScroll(scrollTop) {
  container.scrollTop = scrollTop;
  container.dispatchEvent(new window.Event('scroll'));
}
function chipStripHidden() {
  return container.querySelector('.cz-drawer-groups__chip-strip')?.classList.contains('cz-drawer-groups__chip-strip--hidden') ?? null;
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
  return [...container.querySelectorAll('.cz-drawer-groups__chip-strip [role="tab"]')].find((b) => b.textContent.trim() === text);
}
// Edition Bin exclusive view (Edition lifecycle/Bin UX cleanup) — the fixed
// trailing control on the shared chip strip, found by aria-label like the
// view toggle above; TierEditionBinList's own icon-only row actions are
// likewise found by their aria-label (which always carries the real verb,
// e.g. "Move to Trash — Annual Plan"), so clickButtonWithLabel covers both
// without any new DOM-query technique.
function binToggle() {
  return container.querySelector('[aria-label="Edition Bin"]');
}
function binActiveNow() {
  return binToggle()?.getAttribute('aria-pressed') === 'true';
}
function binTableRow(title) {
  return [...container.querySelectorAll('.cz-tier-edition-bin-table tbody tr')]
    .find((tr) => tr.firstElementChild?.textContent.trim() === title);
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
// Correction plan: the obsolete loose lifecycle-status span is gone — the
// module pill and the pinned footer's own action label are the only
// lifecycle presentation now (matching Package Family/Category, neither of
// which ever printed a third status line).
function looseStatusTextAbsent() {
  return container.querySelector('.cz-tier-edition-declaration__status') === null;
}
// Single-footer, scope-aware lifecycle command model: Edition lifecycle
// actions now live in the ONE pinned TierDrawerFooter (registered through
// the bridge, read via footerContainer/renderFooterDom — same technique
// tier-occupant-lifecycle-regression.mjs uses), not an inline per-Edition
// footer inside `container`. Two independent split controls share that one
// footer (UI refinement, Phase 1): LEFT (index 0) carries backward/travel
// actions (buildTierLifecycleMenu — Disable/Enable/Archive/Trash/Restore/
// Move to Bin), RIGHT (index 1, `splitForward`) carries forward/publish
// actions (buildTierPublishMenu — Publish Edition / Publish Tier). Neither
// visible label (nor its own chevron) ever mutates — every real transition
// is an explicit `.cz-footer-split__item` row inside the relevant control's
// own menu. These helpers check actual DOM state before toggling, so
// they're correct regardless of whether a mutation's refetch leaves a menu
// open or closed.
function splitControls(footerDom = renderFooterDom()) {
  return [...footerDom.querySelectorAll('.cz-footer-split')];
}
function splitLabel(footerDom = renderFooterDom()) {
  return splitControls(footerDom)[0]?.querySelector('.cz-footer-split__btn')?.textContent.trim() ?? null;
}
function publishSplitLabel(footerDom = renderFooterDom()) {
  return splitControls(footerDom)[1]?.querySelector('.cz-footer-split__btn')?.textContent.trim() ?? null;
}
async function ensureMenuOpen(index) {
  let footerDom = renderFooterDom();
  if (!splitControls(footerDom)[index]?.querySelector('.cz-footer-split__menu')) {
    splitControls(footerDom)[index]?.querySelector('.cz-footer-split__chevron')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(20);
    footerDom = renderFooterDom();
  }
  return footerDom;
}
async function ensureMenuClosed(index) {
  const footerDom = renderFooterDom();
  if (splitControls(footerDom)[index]?.querySelector('.cz-footer-split__menu')) {
    splitControls(footerDom)[index]?.querySelector('.cz-footer-split__chevron')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(20);
  }
}
async function menuLabelsAt(index) {
  const footerDom = await ensureMenuOpen(index);
  const labels = [...(splitControls(footerDom)[index]?.querySelectorAll('.cz-footer-split__menu .cz-footer-split__item') ?? [])].map((b) => b.textContent.trim());
  await ensureMenuClosed(index);
  return labels;
}
async function clickMenuItemAt(index, label) {
  const footerDom = await ensureMenuOpen(index);
  const item = [...(splitControls(footerDom)[index]?.querySelectorAll('.cz-footer-split__menu .cz-footer-split__item') ?? [])].find((b) => b.textContent.trim() === label);
  item?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(20);
  return item;
}
const ensureLifecycleMenuOpen   = () => ensureMenuOpen(0);
const ensureLifecycleMenuClosed = () => ensureMenuClosed(0);
const lifecycleMenuLabels       = () => menuLabelsAt(0);
const clickLifecycleMenuItem    = (label) => clickMenuItemAt(0, label);
const ensurePublishMenuOpen     = () => ensureMenuOpen(1);
const ensurePublishMenuClosed   = () => ensureMenuClosed(1);
const publishMenuLabels         = () => menuLabelsAt(1);
const clickPublishMenuItem      = (label) => clickMenuItemAt(1, label);
// Correction plan invariant: the module pill and the pinned footer's own
// top-level action label must never disagree about whether the Edition is
// currently disabled — Disabled must offer Enable, and only Disabled/Active
// states are checked here since Pending/Archived/Trashed collapse the pill
// to the same "Pending" label (the pill's 5-state vocabulary has no
// distinct Archived/Trashed value — see tierEditionOverviewModule's own
// comment). The top-level label stays the bare verb ("Enable"/"Disable")
// even though menu ROWS now carry the Edition's title suffix.
function pillAndActionAgree(moduleTitle = 'Edition Overview') {
  const pill = pillLabel(moduleTitle);
  const action = splitLabel();
  if (pill === 'Disabled') return action === 'Enable';
  if (pill === 'Active') return action === 'Disable';
  return true;
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

console.log('\n1a) With no Edition selected, both pinned splits behave exactly like the normal Tier-only footer — no Edition-scoped rows at all');
let menuLabels = await lifecycleMenuLabels();
let pubLabels = await publishMenuLabels();
check('the lifecycle split label follows the Tier\'s own state (published, enabled) — Disable', splitLabel() === 'Disable', splitLabel());
check('no Edition-scoped row appears anywhere in either menu', menuLabels.every((l) => !l.includes('Edition')) && pubLabels.every((l) => !l.includes('Edition')), [menuLabels, pubLabels]);
check('the lifecycle menu carries Archive Tier — no Publish row leaks into it', menuLabels.includes('Archive Tier') && menuLabels.every((l) => !l.includes('Publish')), menuLabels);
check('the publish menu carries Publish Tier (has content)', pubLabels.includes('Publish Tier'), pubLabels);

console.log('\n1b) Safety invariant: clicking the visible split control itself never mutates — it only opens/closes the menu');
const statusCallsBeforeSafety = statusCalls;
let footerDom = renderFooterDom();
footerDom.querySelector('.cz-footer-split__btn')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
footerDom = renderFooterDom();
check('clicking the visible label opened the menu', footerDom.querySelector('.cz-footer-split__menu') !== null);
check('clicking the visible label fired no status/settle request', statusCalls === statusCallsBeforeSafety && settleCalls === 0, `statusCalls=${statusCalls} settleCalls=${settleCalls}`);
footerDom.querySelector('.cz-footer-split__chevron')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check('the chevron closes the same menu the label opened, also without mutating', renderFooterDom().querySelector('.cz-footer-split__menu') === null && statusCalls === statusCallsBeforeSafety);

console.log('\n1b-publish) The same safety invariant on the RIGHT (publish) split — its own visible label never settles either');
const settleCallsBeforeSafety = settleCalls;
footerDom = renderFooterDom();
splitControls(footerDom)[1]?.querySelector('.cz-footer-split__btn')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
footerDom = renderFooterDom();
check('clicking the visible Publish label opened its own menu without settling', splitControls(footerDom)[1]?.querySelector('.cz-footer-split__menu') != null && settleCalls === settleCallsBeforeSafety, `settleCalls=${settleCalls}`);
await ensurePublishMenuClosed();

selectGroup('Options');
await sleep(20);
check('no additional-declarations tab strip renders yet — this Tier behaves exactly as before Editions existed', container.querySelectorAll('.cz-drawer-groups__chip-strip [role="tab"]').length === 0);
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
  declarationTab('Edition 2')?.getAttribute('aria-selected') === 'true' && pillLabel('Edition Overview') === 'Pending',
  `aria-selected=${declarationTab('Edition 2')?.getAttribute('aria-selected')} pill=${pillLabel('Edition Overview')}`,
);
check('no loose lifecycle-status text renders — the module pill is the only status presentation', looseStatusTextAbsent());

console.log('  2a) Edition context changes the menu: the split label follows the newly-selected (Pending, incomplete) Edition, and its rows precede the Tier\'s own');
// A brand-new, never-published Edition's top label is "Move to Bin" (Edition
// lifecycle/Bin UX cleanup: its one live transition always was headed
// there, never really "Trash" as a destination) — not "Publish"; Publish
// Edition is an independently-gated row (canPublish alone), never the top
// verb until the Edition has genuinely been live at least once.
check('the split label follows the selected Edition\'s never-published fallback — Move to Bin', splitLabel() === 'Move to Bin', splitLabel());
menuLabels = await lifecycleMenuLabels();
pubLabels = await publishMenuLabels();
check('no ghost "Publish Edition" row yet in the publish menu — this Edition has no price/Rate Sheet, so it is not actually publishable', pubLabels.every((l) => !l.includes('Publish Edition')), pubLabels);
check('the Tier\'s own valid actions are never hidden merely because the Edition offers nothing of its own', menuLabels.includes('Disable Tier') && menuLabels.includes('Archive Tier'), menuLabels);

selectGroup('Details');
await sleep(20);
check('Overview\'s own Editions count advanced to 2', overviewEditionsCountText() === '2', overviewEditionsCountText());
selectGroup('Options');
await sleep(20);

console.log('\n3) Selecting "Edition 2", editing it through the shared editor, and renaming it to "Annual Plan" via the shared draft/settle module');
selectDeclarationTab('Edition 2');
await sleep(20);
check('the newly selected Edition reads Pending (disabled, never published)', pillLabel('Edition Overview') === 'Pending', pillLabel('Edition Overview'));
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
// Correction plan item 1: the bound Rate Sheet carries a SECOND inclusion-
// type row (UNSELECTED_ITEM_ID / "Unselected extra") that was never added to
// this Edition's own selection. The read card must reflect only what this
// Edition actually selected (rate_sheet_items), not every inclusion-type row
// the bound sheet happens to have.
check(
  'Edition Inclusions does NOT show a Rate Sheet row this Edition never selected',
  !findModule('Edition Inclusions')?.textContent.includes('Unselected extra'),
  findModule('Edition Inclusions')?.textContent,
);

console.log('\n4) Publish "Annual Plan" — activates and assigns CZTE exactly once');
selectDeclarationTab('Annual Plan');
await sleep(20);
pubLabels = await publishMenuLabels();
check('the publish menu offers "Publish Edition — Annual Plan" as an explicit scoped row', pubLabels.includes('Publish Edition — Annual Plan'), pubLabels);
await clickPublishMenuItem('Publish Edition — Annual Plan');
await waitQuiet();
check('the status endpoint was called', statusCalls === 1, statusCalls);
check('a CZTE identifier was minted on first Publish', czteMints === 1, czteMints);
check('the assigned CZTE is now shown', moduleFieldValue('Edition Overview', 'Edition Platform ID')?.includes(`CZTE${CZTE_SUFFIXES[0]}`), moduleFieldValue('Edition Overview', 'Edition Platform ID'));
check('the Edition Overview pill now reads Active — the shared 5-state pill, not a bespoke status string', pillLabel('Edition Overview') === 'Active', pillLabel('Edition Overview'));
check('the pinned footer offers Disable, not Enable, for an Active Edition', splitLabel() === 'Disable', splitLabel());
check('the module pill and the footer action agree', pillAndActionAgree());

console.log('\n5) Disable — captures previous_platform_status; the mock never touches is_explicitly_disabled (mirrors PackageSchema::applyTierEditionDisabledMask, which does not either)');
menuLabels = await lifecycleMenuLabels();
check('the menu offers "Disable Edition — Annual Plan" and, separately, "Archive Edition — Annual Plan"', menuLabels.includes('Disable Edition — Annual Plan') && menuLabels.includes('Archive Edition — Annual Plan'), menuLabels);
check('Move Edition to Bin is NOT offered yet — the Edition is Active, not Archived/Trashed', !menuLabels.includes('Move Edition to Bin'), menuLabels);
await clickLifecycleMenuItem('Disable Edition — Annual Plan');
await waitQuiet();
check('the Edition module pill reads Disabled — tierEditionDisabledMasked, not the always-false is_explicitly_disabled field, drives this', pillLabel('Edition Overview') === 'Disabled', pillLabel('Edition Overview'));
check('Enable is now offered', splitLabel() === 'Enable', splitLabel());
check('the module pill and the footer action agree — no Active-pill/Disabled-action (or vice versa) disagreement', pillAndActionAgree());

console.log('\n6) Enable — lands Pending, never straight back to Active (same rule the occupant itself follows)');
await clickLifecycleMenuItem('Enable Edition — Annual Plan');
await waitQuiet();
check('Enable never reactivates — the Edition pill reads Pending', pillLabel('Edition Overview') === 'Pending', pillLabel('Edition Overview'));
check('Disable is offered again once re-enabled', splitLabel() === 'Disable', splitLabel());
check('the module pill and the footer action agree after Enable', pillAndActionAgree());

console.log('\n7) Republish — reaches Active again; the SAME CZTE is reused, never re-reserved');
check('the publish menu still offers Publish Edition after Enable — the republish capability', (await publishMenuLabels()).includes('Publish Edition — Annual Plan'), await publishMenuLabels());
await clickPublishMenuItem('Publish Edition — Annual Plan');
await waitQuiet();
check('the Edition pill reads Active again', pillLabel('Edition Overview') === 'Active', pillLabel('Edition Overview'));
check('republish never mints a second CZTE', czteMints === 1, czteMints);
check('the CZTE identity is unchanged', moduleFieldValue('Edition Overview', 'Edition Platform ID')?.includes(`CZTE${CZTE_SUFFIXES[0]}`), moduleFieldValue('Edition Overview', 'Edition Platform ID'));
check('the module pill and the footer action agree after republish', pillAndActionAgree());

console.log('\n8) Archive Edition — independent of Archive Tier, never touches the parent Tier occupant');
menuLabels = await lifecycleMenuLabels();
check('Archive Edition is offered, distinct from Archive Tier', menuLabels.includes('Archive Edition — Annual Plan') && menuLabels.includes('Archive Tier'), menuLabels);
const statusCallsBeforeArchive = statusCalls;
await clickLifecycleMenuItem('Archive Edition — Annual Plan');
await waitQuiet();
// The pill has no distinct Archived value (collapses to Pending — see
// tierEditionOverviewModule's own comment), so Archived/Trashed are proven
// through the footer's own action grammar instead.
check('the Edition reads Archived — Restore is now the split\'s own top-level label', splitLabel() === 'Restore', splitLabel());
check('archiving the Edition fired exactly one status call — never a loop over multiple endpoints', statusCalls === statusCallsBeforeArchive + 1, statusCalls);
selectGroup('Details');
await sleep(20);
check('the parent Tier occupant was NOT displaced — Overview\'s own Editions count is still 2 (Default + this archived Edition)', overviewEditionsCountText() === '2', overviewEditionsCountText());
selectGroup('Options');
await sleep(20);

console.log('  8a) Move Edition to Bin — the ONE action for any status, always last in the menu, after the Tier\'s own rows');
menuLabels = await lifecycleMenuLabels();
check('Move Edition to Bin — Annual Plan is offered while Archived', menuLabels.includes('Move Edition to Bin — Annual Plan'), menuLabels);
check('it is the LAST row — Restore leads, Tier rows in the middle, Move to Bin always trails', menuLabels.indexOf('Move Edition to Bin — Annual Plan') === menuLabels.length - 1, menuLabels);
check('there is no separate "Move Edition to Trash" row anywhere — that verb no longer exists in this menu', !menuLabels.some((l) => l.includes('Move Edition to Trash')), menuLabels);

console.log('  8b) Move Edition to Bin, from Archived, relocates DIRECTLY (already binnable) — one atomic request, never a separate trash step');
const moveToBinCallsBefore = moveToBinCommandCalls;
await clickLifecycleMenuItem('Move Edition to Bin — Annual Plan');
await waitQuiet();
check('the atomic move-to-bin endpoint was called exactly once', moveToBinCommandCalls === moveToBinCallsBefore + 1, moveToBinCommandCalls);
check('no separate /status trash call was made — Archived was already binnable, so only relocation happened', statusCalls === statusCallsBeforeArchive + 1, statusCalls);
selectGroup('Details');
await sleep(20);
check('Overview\'s own Editions count dropped back to 1 the instant it left tier_editions[] — the derived count, not a separately stored one', overviewEditionsCountText() === '1', overviewEditionsCountText());
selectGroup('Options');
await sleep(20);
check('no Edition remains selectable in the normal chip strip — Annual Plan left tier_editions[] entirely', declarationTab('Annual Plan') === undefined);

console.log('  8c) The Edition Bin icon is a fixed control on the shared chip strip, not an Edition/CZTE chip; activating it swaps to an EXCLUSIVE bin view');
check('the Bin icon exists and starts inactive', binToggle() !== null && !binActiveNow());
check('the Bin icon is never one of the chip-strip\'s own [role="tab"] chips — it is nav chrome, not an Edition/CZTE chip', binToggle()?.getAttribute('role') !== 'tab' && container.querySelector('.cz-drawer-groups__chip-strip-trailing')?.contains(binToggle()));
clickButtonWithLabel('Edition Bin');
await sleep(20);
check('the Bin icon now reports pressed/active', binActiveNow());
check('the normal empty-state copy is gone while the Bin is active — the two views are mutually exclusive', !container.textContent.includes('No additional Editions yet'));
check('Annual Plan appears as a compact bin row, Archived', binTableRow('Annual Plan')?.textContent.includes('Archived'));
check('Annual Plan\'s CZTE is shown in the bin row', binTableRow('Annual Plan')?.textContent.includes(`CZTE${CZTE_SUFFIXES[0]}`), binTableRow('Annual Plan')?.textContent);

console.log('  8d) Archived bin row -> trash icon means Move to Trash (still reversible); Trashed bin row -> the SAME-looking icon instead means Delete permanently');
check('the Archived row\'s destructive icon is labelled "Move to Trash", never "Delete permanently"', container.querySelector('[aria-label="Move to Trash — Annual Plan"]') !== null && container.querySelector('[aria-label="Delete permanently — Annual Plan"]') === null);
clickButtonWithLabel('Move to Trash — Annual Plan');
await waitQuiet();
check('trashBinEntry was called exactly once', trashBinEntryCalls === 1, trashBinEntryCalls);
check('the SAME row now reads Trashed', binTableRow('Annual Plan')?.textContent.includes('Trashed'), binTableRow('Annual Plan')?.textContent);
check('the row\'s destructive icon now means Delete permanently instead — same icon glyph, different real operation, never guessed', container.querySelector('[aria-label="Delete permanently — Annual Plan"]') !== null && container.querySelector('[aria-label="Move to Trash — Annual Plan"]') === null);
clickButtonWithLabel('Delete permanently — Annual Plan');
await waitQuiet();
check('deleteBinEntry was called exactly once — Permanent Delete is reachable ONLY from the Bin now', deleteBinEntryCalls === 1, deleteBinEntryCalls);
check('the OLD guarded-delete endpoint (tier_editions[]-scoped) was never called by any of this — Permanent Delete moved to the bin-scoped endpoint entirely', deleteCalls === 0, deleteCalls);
check('the bin is empty again', container.textContent.includes('The Edition Bin is empty.'));
clickButtonWithLabel('Edition Bin');
await sleep(20);
check('leaving the Bin view restores the normal empty state — no Edition remains anywhere', !binActiveNow() && container.textContent.includes('No additional Editions yet'));
check('the tab strip is gone again — no editions remain', container.querySelectorAll('.cz-drawer-groups__chip-strip [role="tab"]').length === 0);

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
await clickPublishMenuItem('Publish Edition — Monthly Plan');
await waitQuiet();
check('Monthly Plan reads Active', pillLabel('Edition Overview') === 'Active', pillLabel('Edition Overview'));
check('a second, distinct CZTE was minted', czteMints === 2, czteMints);
check('Monthly Plan carries its own CZTE, not Annual Plan\'s', moduleFieldValue('Edition Overview', 'Edition Platform ID')?.includes(`CZTE${CZTE_SUFFIXES[1]}`), moduleFieldValue('Edition Overview', 'Edition Platform ID'));

console.log('\n10) Restore — archived/trashed → disabled/Pending, never straight to Active');
await clickLifecycleMenuItem('Archive Edition — Monthly Plan');
await waitQuiet();
check('Monthly Plan reads Archived — Restore is the split\'s own top-level label', splitLabel() === 'Restore', splitLabel());
await clickLifecycleMenuItem('Restore Edition — Monthly Plan');
await waitQuiet();
check('restore never reactivates — Monthly Plan\'s pill reads Pending', pillLabel('Edition Overview') === 'Pending', pillLabel('Edition Overview'));
check('restore was called exactly once', restoreCalls === 1, restoreCalls);
check('the module pill and the footer action agree after Restore', pillAndActionAgree());
check('no loose lifecycle-status text renders anywhere in this flow', looseStatusTextAbsent());
check('it kept its own CZTE through Archive/Restore (identity is permanent once assigned)', moduleFieldValue('Edition Overview', 'Edition Platform ID')?.includes(`CZTE${CZTE_SUFFIXES[1]}`), moduleFieldValue('Edition Overview', 'Edition Platform ID'));

console.log('\n11) Ordering invariant: with an Edition selected, its own scoped rows precede every Tier row, EXCEPT the trailing Move-to-Bin row, which is always last of all — in EACH of the two independent splits');
menuLabels = await lifecycleMenuLabels();
pubLabels = await publishMenuLabels();
// Edition lifecycle/Bin UX cleanup: Move Edition to Bin is deliberately the
// ONE exception to "Edition rows precede Tier rows" — it is the single
// admin-facing action that leaves the workspace from ANY status, and it is
// always last, after the Tier's own rows, matching the ordering this file's
// own tierLifecycleMenu.ts documents (destructive/travel-terminal action
// last). Every OTHER Edition-scoped row still precedes every Tier row.
check('the trailing Move Edition to Bin row is the very last entry in the lifecycle menu', menuLabels.at(-1) === 'Move Edition to Bin — Monthly Plan', menuLabels);
const editionRowsExceptMoveToBin = menuLabels.slice(0, -1).map((l, i) => (l.includes('Edition') ? i : -1)).filter((i) => i !== -1);
const lastEditionIdx = editionRowsExceptMoveToBin.length ? Math.max(...editionRowsExceptMoveToBin) : -1;
const firstTierIdx = menuLabels.findIndex((l) => l.includes('Tier'));
check('every OTHER Edition-scoped row still appears before every Tier-scoped row', firstTierIdx === -1 || lastEditionIdx < firstTierIdx, menuLabels);
const lastEditionIdxPub = pubLabels.reduce((acc, l, i) => (l.includes('Edition') ? i : acc), -1);
const firstTierIdxPub = pubLabels.findIndex((l) => l.includes('Tier'));
check('publish menu: Publish Edition precedes Publish Tier, the same scope priority as the lifecycle menu', firstTierIdxPub === -1 || lastEditionIdxPub < firstTierIdxPub, pubLabels);
check('the lifecycle menu never carries a Publish row — it lives only in the publish menu', menuLabels.every((l) => !l.includes('Publish')), menuLabels);
check('the publish menu never carries a lifecycle verb (Disable/Enable/Archive/Trash/Restore/Bin)', pubLabels.every((l) => !/\b(Disable|Enable|Archive|Trash|Restore|Bin)\b/.test(l)), pubLabels);
check('the lifecycle menu never carries a Permanently Delete row — that action lives exclusively in the Edition Bin now', menuLabels.every((l) => !l.includes('Permanently Delete')), menuLabels);

console.log('\n12) No fabricated "All" action ever renders in the real mounted footer, in either split');
check(
  'no Publish All / Enable All / Disable All / Archive All / Restore All / Trash All row exists anywhere in the lifecycle menu',
  menuLabels.every((l) => !/\ball\b/i.test(l)),
  menuLabels,
);
check(
  'no fabricated "All" row exists anywhere in the publish menu either',
  pubLabels.every((l) => !/\ball\b/i.test(l)),
  pubLabels,
);

console.log('\n13) Accordion mode: the same ChildChipStrip renders under Options with its own 0px sticky-chrome context, without touching selection or firing any endpoint, and switching back to Tabs rebuilds the chrome-height variable through Tabs\' own mechanism');
const editionsBeforeAccordion = editions.length;
const selectedBeforeAccordion = declarationTab('Monthly Plan')?.getAttribute('aria-selected');
const czteFieldBeforeAccordion = moduleFieldValue('Edition Overview', 'Edition Platform ID');
const callsBeforeAccordion = { saveDraftCalls, settleCalls, statusCalls, restoreCalls, deleteCalls, czteMints };

check('Tabs mode is still active before this section', container.querySelectorAll('.cz-drawer-groups__tab').length === 4);
clickButtonWithLabel('Switch to accordion view');
await sleep(20);
check('Accordion mode renders no four-tab row', container.querySelectorAll('.cz-drawer-groups__tab').length === 0);

// Explicitly collapse Options first (it may already be the active group,
// carried over from Tabs mode) so expanding it below is a real, observed
// state transition rather than incidental initial state.
clickButtonWithText('Details');
await sleep(20);
check('Options is collapsed while Details is the open accordion section', container.querySelector('.cz-drawer-groups__chip-strip') === null);

clickButtonWithText('Options');
await sleep(20);
check('expanding Options renders the four accordion sections with Options open', container.querySelectorAll('.cz-drawer-groups__accordion-trigger').length === 4);
check(
  'the same ChildChipStrip renders under Options in Accordion mode — same chip count as Tabs mode',
  container.querySelectorAll('.cz-drawer-groups__chip-strip [role="tab"]').length === editionsBeforeAccordion,
  container.querySelectorAll('.cz-drawer-groups__chip-strip [role="tab"]').length,
);
check(
  'the previously selected Edition is still the one shown — selection did not change when switching renderers',
  declarationTab('Monthly Plan')?.getAttribute('aria-selected') === selectedBeforeAccordion,
  declarationTab('Monthly Plan')?.getAttribute('aria-selected'),
);
check(
  'the selected Edition\'s own read surface is unchanged too — same CZTE shown, no refetch/reset',
  moduleFieldValue('Edition Overview', 'Edition Platform ID') === czteFieldBeforeAccordion,
  moduleFieldValue('Edition Overview', 'Edition Platform ID'),
);

const optionsPanel = container.querySelector('#cz-drawer-group-options-panel');
check(
  'Accordion supplies a 0px sticky-chrome context for the child nav via the open panel\'s own inline style — DrawerGroupAccordion\'s documented mechanism, not a new sticky accordion-header system',
  optionsPanel?.getAttribute('style')?.includes('--cz-drawer-group-chrome-h: 0px') ?? false,
  optionsPanel?.getAttribute('style'),
);
check('no .cz-drawer-groups__content wrapper exists in Accordion mode — that mechanism is Tabs-only', container.querySelector('.cz-drawer-groups__content') === null);
check(
  'expanding Options in Accordion mode fired no endpoint and mutated nothing — save/settle/status/restore/delete counts and the CZTE mint count are all unchanged',
  saveDraftCalls === callsBeforeAccordion.saveDraftCalls
    && settleCalls === callsBeforeAccordion.settleCalls
    && statusCalls === callsBeforeAccordion.statusCalls
    && restoreCalls === callsBeforeAccordion.restoreCalls
    && deleteCalls === callsBeforeAccordion.deleteCalls
    && czteMints === callsBeforeAccordion.czteMints
    && editions.length === editionsBeforeAccordion,
  { saveDraftCalls, settleCalls, statusCalls, restoreCalls, deleteCalls, czteMints, editionsLength: editions.length },
);

console.log('  13a) In Accordion mode, scrolling the drawer body does not hide/reveal the strip — TierDrawerContent resolves no scroll container while Accordion is active');
fireScroll(0);
await sleep(20);
check('the strip is visible at rest in Accordion mode', chipStripHidden() === false, chipStripHidden());
fireScroll(200);
await sleep(20);
check('a large downward scroll in Accordion mode does not hide the strip — no scroll container was ever wired up', chipStripHidden() === false, chipStripHidden());
// Locked behavior: Accordion mode gets no hide/reveal AT ALL, for the strip
// or the Bin icon riding inside it — both stay sticky/always visible.
check('the Bin icon is present and its hidden-class ancestor never toggled in Accordion mode', binToggle() !== null && chipStripHidden() === false);
fireScroll(0);
await sleep(20);

console.log('  13b) Switching back to Tabs preserves selection and rebuilds the chrome-height variable through Tabs\' own mechanism, not a stale Accordion value');
clickButtonWithLabel('Switch to tabs view');
await sleep(20);
check(
  'Tabs mode is back — four tabs, no accordion sections',
  container.querySelectorAll('.cz-drawer-groups__tab').length === 4 && container.querySelectorAll('.cz-drawer-groups__accordion-trigger').length === 0,
);
check('the accordion panel (and its own 0px chrome-height style) is gone entirely — no leftover Accordion DOM', container.querySelector('.cz-drawer-groups__accordion-panel') === null);
const tabsContentWrapper = container.querySelector('.cz-drawer-groups__content');
check(
  'Tabs mode publishes the chrome-height variable through its own .cz-drawer-groups__content wrapper — a structurally different mechanism than Accordion\'s panel style, never a value carried over from it',
  tabsContentWrapper?.getAttribute('style')?.includes('--cz-drawer-group-chrome-h:') ?? false,
  tabsContentWrapper?.getAttribute('style'),
);
check('the same Edition is still selected after switching back to Tabs', declarationTab('Monthly Plan')?.getAttribute('aria-selected') === 'true');

console.log('  13c) Tabs mode re-enables scroll-direction hide/reveal, with hysteresis against small movement, and still touches nothing else');
const callsBeforeTabsScroll = { saveDraftCalls, settleCalls, statusCalls, restoreCalls, deleteCalls, czteMints };
fireScroll(0);
await sleep(20);
check('the strip starts visible', chipStripHidden() === false, chipStripHidden());

fireScroll(5);
await sleep(20);
check('a small 5px downward movement (below the hysteresis threshold) does not hide the strip', chipStripHidden() === false, chipStripHidden());

fireScroll(40);
await sleep(20);
check('a deliberate downward scroll past the threshold hides the strip', chipStripHidden() === true, chipStripHidden());
// Locked behavior (Edition lifecycle/Bin UX cleanup correction): in Tabs
// mode the Bin icon hides/reveals TOGETHER with the chips, as one unit —
// proven structurally, since the icon lives inside the SAME element
// chipStripHidden() reads the --hidden class from, not a separate one.
check(
  'the Bin icon shares the exact same hidden-class ancestor as the chips — Tabs mode moves both together, never a separate hide state for the icon',
  binToggle()?.closest('.cz-drawer-groups__chip-strip') === container.querySelector('.cz-drawer-groups__chip-strip'),
);

fireScroll(35);
await sleep(20);
check('a small 5px upward movement (below the hysteresis threshold) does not reveal the strip yet', chipStripHidden() === true, chipStripHidden());

fireScroll(10);
await sleep(20);
check('a deliberate upward scroll past the threshold reveals the strip again', chipStripHidden() === false, chipStripHidden());

fireScroll(0);
await sleep(20);

check(
  'the Tabs-mode scroll sequence fired no endpoint and mutated nothing — save/settle/status/restore/delete counts and the CZTE mint count are all unchanged',
  saveDraftCalls === callsBeforeTabsScroll.saveDraftCalls
    && settleCalls === callsBeforeTabsScroll.settleCalls
    && statusCalls === callsBeforeTabsScroll.statusCalls
    && restoreCalls === callsBeforeTabsScroll.restoreCalls
    && deleteCalls === callsBeforeTabsScroll.deleteCalls
    && czteMints === callsBeforeTabsScroll.czteMints,
  { saveDraftCalls, settleCalls, statusCalls, restoreCalls, deleteCalls, czteMints },
);
check('the selected Edition is still unchanged after the whole scroll sequence', declarationTab('Monthly Plan')?.getAttribute('aria-selected') === 'true');

console.log('\n14) Inline-editor chrome suppression: opening either editor reports header-hidden + applies the --editing class + hides the lifecycle footer, and Save/Cancel/Back each restore all three');

function editingClassApplied() {
  return container.querySelector('.cz-req-detail')?.classList.contains('cz-req-detail--editing') ?? null;
}

check('resting state: header-hidden signal reads false', lastHeaderHidden === false, lastHeaderHidden);
check('resting state: no --editing class on the drawer root', editingClassApplied() === false, editingClassApplied());
check('resting state: the pinned footer is present', lastFooter !== null);

console.log('  14a) Opening the parent Tier\'s own Overview editor (editingSection) hides header + footer');
selectGroup('Details');
await sleep(20);
clickEditOn('Tier Overview');
await sleep(20);
check('the Tier Overview editor is open', container.querySelector('#tier-label') !== null);
check('header-hidden signal reports true', lastHeaderHidden === true, lastHeaderHidden);
check('the --editing class is applied to the drawer root', editingClassApplied() === true, editingClassApplied());
check('the lifecycle footer is hidden while the Tier\'s own module editor is open', lastFooter === null, lastFooter);

console.log('  14b) Cancel (through the discard-confirm this editor always shows, isDirty being unconditional) restores header + footer');
clickButtonWithText('Cancel', container.querySelector('.cz-ies') ?? container);
await sleep(20);
check('the discard-confirm prompt appeared', container.textContent.includes('Discard unsaved changes?'));
clickButtonWithText('Discard', container.querySelector('.cz-ies') ?? container);
await sleep(20);
check('the Tier Overview editor is closed', container.querySelector('#tier-label') === null);
check('header-hidden signal is back to false after Cancel', lastHeaderHidden === false, lastHeaderHidden);
check('the --editing class is gone after Cancel', editingClassApplied() === false, editingClassApplied());
check('the lifecycle footer is restored after Cancel', lastFooter !== null);

console.log('  14c) Opening the SELECTED EDITION\'s own module editor also hides header + footer — the previously-disclosed gap this work closes — and its own child nav/bin/empty-state');
selectGroup('Options');
await sleep(20);
check('Monthly Plan is still the selected Edition', declarationTab('Monthly Plan')?.getAttribute('aria-selected') === 'true');
const chipCountBeforeEdit = container.querySelectorAll('.cz-drawer-groups__chip-strip [role="tab"]').length;
clickEditOn('Edition Overview');
await sleep(20);
check('the Edition editor is open', container.querySelector('#edt-title') !== null);
check('header-hidden signal reports true for Edition editing too', lastHeaderHidden === true, lastHeaderHidden);
check('the --editing class is applied for Edition editing too', editingClassApplied() === true, editingClassApplied());
check('the lifecycle footer is hidden while the Edition\'s own module editor is open (the disclosed bug is fixed)', lastFooter === null, lastFooter);
check('the child chip strip is gone while the Edition editor is open', container.querySelector('.cz-drawer-groups__chip-strip') === null);

console.log('  14d) The editor\'s own Back control restores header + footer + child nav, with the same Edition still selected');
container.querySelector('.cz-action-shell__back')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check('the discard-confirm prompt appeared from Back too', container.textContent.includes('Discard unsaved changes?'));
clickButtonWithText('Discard', container.querySelector('.cz-ies') ?? container);
await sleep(20);
check('the Edition editor is closed', container.querySelector('#edt-title') === null);
check('header-hidden signal is back to false after Back', lastHeaderHidden === false, lastHeaderHidden);
check('the --editing class is gone after Back', editingClassApplied() === false, editingClassApplied());
check('the lifecycle footer is restored after Back', lastFooter !== null);
check('the child chip strip is back after Back, with the same chip count as before editing', container.querySelectorAll('.cz-drawer-groups__chip-strip [role="tab"]').length === chipCountBeforeEdit, container.querySelectorAll('.cz-drawer-groups__chip-strip [role="tab"]').length);
check('Monthly Plan is still the selected Edition after Back', declarationTab('Monthly Plan')?.getAttribute('aria-selected') === 'true');

console.log('  14e) Save also restores header + footer + child nav');
clickEditOn('Edition Overview');
await sleep(20);
check('the Edition editor is open again for the Save path', container.querySelector('#edt-title') !== null);
check('header-hidden signal reports true again', lastHeaderHidden === true, lastHeaderHidden);
clickButtonWithText('Save', container.querySelector('.cz-ies') ?? container);
await waitQuiet();
check('the Edition editor is closed after Save', container.querySelector('#edt-title') === null);
check('header-hidden signal is back to false after Save', lastHeaderHidden === false, lastHeaderHidden);
check('the --editing class is gone after Save', editingClassApplied() === false, editingClassApplied());
check('the lifecycle footer is restored after Save', lastFooter !== null);
check('the child chip strip is back after Save', container.querySelector('.cz-drawer-groups__chip-strip') !== null);
check('Monthly Plan is still the selected Edition after Save', declarationTab('Monthly Plan')?.getAttribute('aria-selected') === 'true');

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — Overview registration, Create/Save-Settle/Publish/Disable/Enable/Archive/Trash/guarded-Delete/Restore behave per SECTION: TIER_EDITION, driven through the real mounted Default Tier Inclusions tab strip, in both Tabs and Accordion view modes. There is no "default Edition" concept left to drive — the occupant\'s own declaration is the permanent Default, and no title/pricing form ever appears in Overview itself.');
process.exit(0);
