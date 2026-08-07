// Tier Edition admin lifecycle — mounted regression (completes Phase 3/6
// item 2).
//
// Mounts the REAL TierDrawerContent composition (esbuild + happy-dom +
// Preact render, same technique as tier-occupant-lifecycle-regression.mjs)
// against an already-published occupant, and drives the SAME
// TierEditionsPanel a real admin sees in that occupant's Details tab —
// proving Create → draft Save/Settle → Publish (CZTE assignment, once) →
// Disable → Enable (lands Pending, never Active — the same "Enable never
// activates" rule the occupant itself follows) → republish (CZTE reused,
// not re-reserved) → Archive → Trash → guarded permanent delete (trashed-
// only — there is no "default Edition" concept to guard against, since the
// occupant's own declaration is the permanent Default and is never one of
// these rows) → Restore (archived/trashed → disabled, never straight to
// active) end to end.
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
        tier_instance_id: INSTANCE_ID, allowed_rate_sheet_ids: [], platform_status: 'active',
        tiers: stationTiers(), popular_tier: null, popular_label: '', sort_position: 0,
        bundle: { title: '', description: '', price: null }, occupant_bin: [],
      },
      service: { id: SERVICE_ID, title: 'Cloud Backup', inclusions: [], faqs: [], rate_sheets: [], package_relationships: [] },
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
// Per-edition row: only findable by title while it is in VIEW mode (editing
// replaces the row's own <strong>{title}</strong> with the shared form).
function editionRow(title) {
  return [...container.querySelectorAll('.cz-shell-section--no-border')]
    .find((el) => el.querySelector('strong')?.textContent.trim() === title) ?? null;
}
function rowStatusText(title) {
  return editionRow(title)?.querySelector('span.drawerModule__value')?.textContent.trim() ?? null;
}
function rowDetailText(title) {
  return editionRow(title)?.querySelector('p.drawerModule__value')?.textContent.trim() ?? null;
}
function clickRowButton(title, text) {
  const row = editionRow(title);
  const btn = [...(row?.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim() === text);
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return btn;
}

console.log('Tier Edition admin lifecycle regression (mounted TierDrawerContent → TierEditionsPanel)\n');
render(h(Harness, { initialTierId: TIER_ID }), container);
await waitQuiet();

console.log('1) A freshly published occupant starts with no Editions');
check('the empty-state copy is shown', container.textContent.includes('No Editions yet'));
check('+ Add Edition is present', [...container.querySelectorAll('button')].some((b) => b.textContent.trim() === '+ Add Edition'));

console.log('\n2) Create "Annual Plan" — born disabled/Pending, no CZTE yet');
clickButtonWithText('+ Add Edition');
await sleep(20);
setInputValue('#edt-new-title', 'Annual Plan');
await sleep(20);
clickButtonWithText('Create');
await waitQuiet();
check('the created Edition appears in the list', editionRow('Annual Plan') !== null);
check('a newly created Edition reads Pending (disabled, never published)', rowStatusText('Annual Plan') === '(Pending)', rowStatusText('Annual Plan'));
check('no CZTE was assigned at creation', czteMints === 0, czteMints);
check('Publish is offered on a Pending Edition', clickRowButton !== undefined && [...editionRow('Annual Plan').querySelectorAll('button')].some((b) => b.textContent.trim() === 'Publish'));

console.log('\n3) Publish — activates and assigns CZTE exactly once');
clickRowButton('Annual Plan', 'Publish');
await waitQuiet();
check('the status endpoint was called', statusCalls === 1, statusCalls);
check('the Edition reads Active', rowStatusText('Annual Plan') === '(Active)', rowStatusText('Annual Plan'));
check('a CZTE identifier was minted on first Publish', czteMints === 1, czteMints);
check('the assigned CZTE is now shown on the row', rowDetailText('Annual Plan')?.includes(`CZTE${CZTE_SUFFIXES[0]}`), rowDetailText('Annual Plan'));

console.log('\n4) Disable — captures previous_platform_status, offered Enable');
clickRowButton('Annual Plan', 'Disable');
await waitQuiet();
check('the Edition reads Disabled (masked, not Pending)', rowStatusText('Annual Plan') === '(Disabled)', rowStatusText('Annual Plan'));
check('Enable is now offered', [...editionRow('Annual Plan').querySelectorAll('button')].some((b) => b.textContent.trim() === 'Enable'));

console.log('\n5) Enable — lands Pending, never straight back to Active (same rule the occupant itself follows)');
clickRowButton('Annual Plan', 'Enable');
await waitQuiet();
check('Enable never reactivates — the Edition reads Pending', rowStatusText('Annual Plan') === '(Pending)', rowStatusText('Annual Plan'));

console.log('\n6) Republish — reaches Active again; the SAME CZTE is reused, never re-reserved');
clickRowButton('Annual Plan', 'Publish');
await waitQuiet();
check('the Edition reads Active again', rowStatusText('Annual Plan') === '(Active)', rowStatusText('Annual Plan'));
check('republish never mints a second CZTE', czteMints === 1, czteMints);
check('the CZTE identity is unchanged', rowDetailText('Annual Plan')?.includes(`CZTE${CZTE_SUFFIXES[0]}`), rowDetailText('Annual Plan'));

console.log('\n7) Archive, then Trash, then guarded permanent delete — succeeds as soon as the Edition is trashed, with no "default Edition" concept to block it');
clickRowButton('Annual Plan', 'Archive');
await waitQuiet();
check('the Edition reads Archived', rowStatusText('Annual Plan') === '(Archived)', rowStatusText('Annual Plan'));
clickRowButton('Annual Plan', 'Move to Trash');
await waitQuiet();
check('the Edition reads Trashed', rowStatusText('Annual Plan') === '(Trashed)', rowStatusText('Annual Plan'));
check('Delete permanently is offered immediately once trashed', [...editionRow('Annual Plan').querySelectorAll('button')].some((b) => b.textContent.trim() === 'Delete permanently'));
clickRowButton('Annual Plan', 'Delete permanently');
await waitQuiet();
check('the delete endpoint was called', deleteCalls === 1, deleteCalls);
check('Annual Plan is gone from the list', editionRow('Annual Plan') === null);

console.log('\n8) Create + publish a second Edition, "Monthly Plan", editing its title via the shared draft/settle module before Publish');
clickButtonWithText('+ Add Edition');
await sleep(20);
setInputValue('#edt-new-title', 'Monthly Draft');
await sleep(20);
clickButtonWithText('Create');
await waitQuiet();
check('a second Edition was created', editionRow('Monthly Draft') !== null);

clickRowButton('Monthly Draft', 'Edit');
await sleep(20);
// Yield between edits — each field's onChange closes over the draft state at
// its own last render, so firing two edits in the same tick (before Preact's
// microtask-batched re-render lands) makes the second call's stale closure
// clobber the first's change.
setInputValue('#edt-title', 'Monthly Plan');
await sleep(20);
setInputValue('#edt-billing-cycle', 'monthly');
await sleep(20);
const saveCallsBefore = saveDraftCalls;
const settleCallsBefore = settleCalls;
clickButtonWithText('Save');
await waitQuiet();
check('the module draft-save endpoint was called', saveDraftCalls === saveCallsBefore + 1, saveDraftCalls);
check('the module settle endpoint was called right after (Save chains draft → settle for an Edition)', settleCalls === settleCallsBefore + 1, settleCalls);
check('the renamed Edition now shows its new title', editionRow('Monthly Plan') !== null);
check('the OLD title is gone — this is a rename, not a second Edition', editionRow('Monthly Draft') === null);

console.log('\n9) Publish "Monthly Plan" — mints its OWN distinct CZTE');
clickRowButton('Monthly Plan', 'Publish');
await waitQuiet();
check('Monthly Plan reads Active', rowStatusText('Monthly Plan') === '(Active)', rowStatusText('Monthly Plan'));
check('a second, distinct CZTE was minted', czteMints === 2, czteMints);
check('Monthly Plan carries its own CZTE, not Annual Plan\'s', rowDetailText('Monthly Plan')?.includes(`CZTE${CZTE_SUFFIXES[1]}`), rowDetailText('Monthly Plan'));

console.log('\n10) Restore — archived/trashed → disabled/Pending, never straight to Active');
clickRowButton('Monthly Plan', 'Archive');
await waitQuiet();
check('Monthly Plan reads Archived', rowStatusText('Monthly Plan') === '(Archived)', rowStatusText('Monthly Plan'));
clickRowButton('Monthly Plan', 'Restore');
await waitQuiet();
check('restore never reactivates — Monthly Plan reads Pending', rowStatusText('Monthly Plan') === '(Pending)', rowStatusText('Monthly Plan'));
check('restore was called exactly once', restoreCalls === 1, restoreCalls);
check('it kept its own CZTE through Archive/Restore (identity is permanent once assigned)', rowDetailText('Monthly Plan')?.includes(`CZTE${CZTE_SUFFIXES[1]}`), rowDetailText('Monthly Plan'));

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — Create/Save-Settle/Publish/Disable/Enable/Archive/Trash/guarded-Delete/Restore behave per SECTION: TIER_EDITION, driven through the real mounted TierEditionsPanel. There is no "default Edition" concept left to drive — the occupant\'s own declaration is the permanent Default.');
process.exit(0);
