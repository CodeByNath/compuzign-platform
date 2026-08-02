// Tier Occupant Lifecycle Repair — mounted regression (Phase 5).
//
// Mounts the REAL TierDrawerContent composition (esbuild + happy-dom + Preact
// render, same technique as scripts/service-disable-enable-regression.mjs)
// against an already-published occupant, and proves the blueprint's
// acceptance matrix end to end: ready module Save reads Pending full without
// settling; Publish activates; Disable masks every module Disabled; Enable
// lands Pending (never Active, never Disabled) with every action reachable;
// Publish after Enable reaches Active again; only the edited module changes
// (siblings retain their state); and an Add-on occupant follows the
// identical lifecycle.
//
// The fetch mock faithfully reproduces the now-implemented backend contract
// (PackageSchema::isExplicitlyDisabled / settleTierSlot / the rewritten
// setPackageStationTierEnabled — proven separately by
// tests/tier-occupant-lifecycle-repair.php) so this regression proves the
// FRONTEND wiring, not a reimplementation of the backend rule.
//
// Usage: npm run regression:tier-occupant-lifecycle
//    or: node scripts/tier-occupant-lifecycle-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-tier-occupant-lifecycle-bundle.mjs');
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

// ── Fetch mock — the only faked boundary ────────────────────────────────
const SERVICE_ID = 801;
const INSTANCE_ID = 'ti_primary';
const RATE_SHEET_ID = 'rs_a';
const ITEM_ID = 'ri_1';
const SOURCE_ITEM_ID = 'src_1';

// FAQ_ITEM/FAQ_SOURCE_ID — Common Questions resolves through the SAME
// rate_sheet_items pipeline as Included Features (usePackageStation.tierView
// re-derives dp.faq_refs from resolved selections whose source_type is
// 'faq'); a Tier is only "complete" for that module with a resolved faq row.
const FAQ_ITEM_ID = 'ri_2';
const FAQ_SOURCE_ITEM_ID = 'src_2';

const RATE_SHEETS = [{
  rate_sheet_id: RATE_SHEET_ID, title: 'Primary', status: 'active', groups: [],
  items: [
    { item_id: ITEM_ID, source_item_id: SOURCE_ITEM_ID, unit_price: 25, per: null, quantity: 1, group_id: null, sort_order: 0 },
    { item_id: FAQ_ITEM_ID, source_item_id: FAQ_SOURCE_ITEM_ID, unit_price: 0, per: null, quantity: 1, group_id: null, sort_order: 1 },
  ],
}];
const PACKAGE_RELATIONSHIPS = [
  {
    item_id: SOURCE_ITEM_ID, source_type: 'inclusion', source_id: 'inc_1',
    resolved: { label: 'Managed backups' }, decorated_label: 'Managed backups', group_id: null,
    sort_order: 0, disabled: false, missing: false, module_transition: 'settled',
  },
  {
    item_id: FAQ_SOURCE_ITEM_ID, source_type: 'faq', source_id: 'faq_1',
    resolved: { question: 'How often?', answer: 'Daily.' }, decorated_label: 'How often?', group_id: null,
    sort_order: 1, disabled: false, missing: false, module_transition: 'settled',
  },
];

function emptyDrafts() { return { overview: null, features: null, faqs: null }; }
function settledModuleStatus() { return { overview: 'settled', features: 'settled', faqs: 'settled' }; }

// Server-side truth for two occupants: an already-published normal Tier
// (basic) and an already-published Add-on (standard) — the blueprint's
// "repair occupants, including is_addon: true" scope, proven identically.
const tiers = {
  basic: {
    settled: {
      occupant_id: 'occ_basic', platform_id: '', addon_platform_id: '',
      label: 'Starter Cloud', ideal_for: 'Small workloads', price: null, contact: false,
      billing_cycle: 'monthly', rate_sheet_id: RATE_SHEET_ID, inclusions_override: [],
      rate_sheet_items: [{ item_id: ITEM_ID, quantity: 1 }, { item_id: FAQ_ITEM_ID, quantity: 1 }], rate_sheet_selections: [],
      features: [], faq_refs: ['faq_1'], enabled: true, is_explicitly_disabled: false, is_addon: false,
    },
    drafts: emptyDrafts(), module_status: settledModuleStatus(),
  },
  standard: {
    settled: {
      occupant_id: 'occ_addon', platform_id: '', addon_platform_id: '',
      label: 'Backup Shield', ideal_for: 'Disaster recovery', price: null, contact: false,
      billing_cycle: 'monthly', rate_sheet_id: RATE_SHEET_ID, inclusions_override: [],
      rate_sheet_items: [{ item_id: ITEM_ID, quantity: 1 }, { item_id: FAQ_ITEM_ID, quantity: 1 }], rate_sheet_selections: [],
      features: [], faq_refs: ['faq_1'], enabled: true, is_explicitly_disabled: false, is_addon: true,
    },
    drafts: emptyDrafts(), module_status: settledModuleStatus(),
  },
  premium: { settled: null, drafts: emptyDrafts(), module_status: { overview: 'not-configured', features: 'not-configured', faqs: 'not-configured' } },
  enterprise: { settled: null, drafts: emptyDrafts(), module_status: { overview: 'not-configured', features: 'not-configured', faqs: 'not-configured' } },
  ultimate: { settled: null, drafts: emptyDrafts(), module_status: { overview: 'not-configured', features: 'not-configured', faqs: 'not-configured' } },
};

function detailFor(tierId) {
  const t = tiers[tierId];
  if (!t.settled) {
    return {
      occupant_id: null, platform_id: '', addon_platform_id: '', label: '', ideal_for: '',
      price: null, contact: false, billing_cycle: null, rate_sheet_id: null, inclusions_override: [],
      rate_sheet_items: [], rate_sheet_selections: [], features: [], faq_refs: [], enabled: false,
      is_explicitly_disabled: false, is_addon: false, drafts: t.drafts, module_status: t.module_status,
    };
  }
  return { ...t.settled, drafts: t.drafts, module_status: t.module_status };
}

function stationTiers() {
  const out = {};
  for (const key of Object.keys(tiers)) out[key] = detailFor(key);
  return out;
}

let settleCalls = 0;
let enabledCalls = 0;
let lastEnabledPayload = null;

function jsonResponse(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) });
}

const READ_PATH = `admin/services/${SERVICE_ID}/package-station/tier-instances/${INSTANCE_ID}/read`;
const TIER_BASE = `admin/services/${SERVICE_ID}/package-station/tier-instances/${INSTANCE_ID}/tiers`;

globalThis.fetch = (url, init = {}) => {
  const path = String(url);
  const method = (init?.method ?? 'GET').toUpperCase();

  if (path.endsWith(READ_PATH) && method === 'GET') {
    return jsonResponse({
      success: true, tier_instance_id: INSTANCE_ID, service_id: SERVICE_ID,
      station: {
        tier_instance_id: INSTANCE_ID, allowed_rate_sheet_ids: [RATE_SHEET_ID], platform_status: 'active',
        tiers: stationTiers(), popular_tier: null, popular_label: '', sort_position: 0,
        bundle: { title: '', description: '', price: null }, occupant_bin: [],
      },
      service: { id: SERVICE_ID, title: 'Cloud Backup', inclusions: [], faqs: [], rate_sheets: RATE_SHEETS, package_relationships: PACKAGE_RELATIONSHIPS },
    });
  }

  const moduleMatch = path.match(new RegExp(`${TIER_BASE}/([a-z]+)/modules/([a-z]+)$`));
  if (moduleMatch && method === 'POST') {
    const [, tierId, module] = moduleMatch;
    const payload = JSON.parse(init.body ?? '{}');
    const t = tiers[tierId];
    if (module === 'overview') {
      t.drafts.overview = {
        label: payload.label ?? '', ideal_for: payload.ideal_for ?? '', price: null, contact: false,
        billing_cycle: payload.billing_cycle ?? '', rate_sheet_id: payload.rate_sheet_id, is_addon: !!payload.is_addon,
      };
    } else if (module === 'features') {
      t.drafts.features = payload.rate_sheet_items ?? [];
    } else {
      t.drafts.faqs = payload.faq_refs ?? [];
    }
    t.module_status[module] = 'pending';
    return jsonResponse({ success: true, tier_id: tierId, module, tier: detailFor(tierId), drafts: t.drafts, module_status: t.module_status });
  }

  const settleMatch = path.match(new RegExp(`${TIER_BASE}/([a-z]+)/settle$`));
  if (settleMatch && method === 'POST') {
    settleCalls += 1;
    const [, tierId] = settleMatch;
    const t = tiers[tierId];
    const ov = t.drafts.overview;
    const base = t.settled ?? detailFor(tierId);
    // Mirrors PackageSchema::settleTierSlot — Publish alone activates and
    // clears the explicit marker, draft-preferred per module, regardless of
    // the marker/status beforehand (Publish after Enable reaches Active).
    t.settled = {
      ...base,
      label: ov?.label ?? base.label,
      ideal_for: ov?.ideal_for ?? base.ideal_for,
      billing_cycle: ov?.billing_cycle ?? base.billing_cycle,
      is_addon: ov?.is_addon ?? base.is_addon,
      rate_sheet_id: ov && ov.rate_sheet_id !== undefined ? ov.rate_sheet_id : base.rate_sheet_id,
      rate_sheet_items: t.drafts.features ?? base.rate_sheet_items,
      faq_refs: t.drafts.faqs ?? base.faq_refs,
      enabled: true,
      is_explicitly_disabled: false,
    };
    t.drafts = emptyDrafts();
    t.module_status = settledModuleStatus();
    return jsonResponse({ success: true, tier_id: tierId, platform_status: 'active', tier: detailFor(tierId), drafts: t.drafts, module_status: t.module_status });
  }

  const enabledMatch = path.match(new RegExp(`${TIER_BASE}/([a-z]+)/enabled$`));
  if (enabledMatch && method === 'POST') {
    enabledCalls += 1;
    const [, tierId] = enabledMatch;
    const payload = JSON.parse(init.body ?? '{}');
    lastEnabledPayload = payload;
    const t = tiers[tierId];
    // Mirrors the rewritten setPackageStationTierEnabled — Enable/Disable
    // never activate; only the marker changes, drafts/module_status preserved.
    t.settled = { ...t.settled, enabled: false, is_explicitly_disabled: !payload.enabled };
    return jsonResponse({ success: true, tier_id: tierId, platform_status: 'active', tier: detailFor(tierId), drafts: t.drafts, module_status: t.module_status });
  }

  return Promise.reject(new Error(`Unexpected fetch in regression harness: ${method} ${path}`));
};

// ── Bundle the REAL composition ─────────────────────────────────────────
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
let lastFooter = null;

function Harness({ initialTierId }) {
  const [, setFooterState] = useState(null);
  const setFooterRef = useRef(setFooterState);
  setFooterRef.current = setFooterState;

  const setFooter = useMemo(() => (footer) => {
    setFooterCalls += 1;
    lastFooter = footer;
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
const footerContainer = document.createElement('div');
document.body.appendChild(footerContainer);
function renderFooterDom() {
  render(lastFooter, footerContainer);
  return footerContainer;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitToSettle(maxTicks = 400, quietTicksNeeded = 15) {
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
  else { console.error(`  FAIL — ${label}${detail ? `: ${detail}` : ''}`); failures.push(label); }
}

function clickButtonWithText(text, root = container) {
  const btn = [...root.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
  btn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return btn;
}
function findModule(titleText) {
  return [...container.querySelectorAll('.drawerModule')]
    .find((el) => el.querySelector('.drawerModule__title')?.textContent.trim().startsWith(titleText)) ?? null;
}
function pillLabel(moduleTitle) {
  return findModule(moduleTitle)?.querySelector('.cz-module-status-pill')?.textContent.trim();
}
function editButtonFor(moduleTitle) {
  const mod = findModule(moduleTitle);
  return [...(mod?.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim() === 'Edit');
}
// The footer's Publish button lives in footerContainer (registered through the
// bridge, exactly like the record footer's Disable/Enable split); the confirm
// dialog's own Publish button is part of the main composition tree.
async function clickPublish() {
  const footerDom = renderFooterDom();
  clickButtonWithText('Publish', footerDom);
  await sleep(20);
  clickButtonWithText('Publish', container);
}
function allPillsRead(label) {
  return pillLabel('Tier Overview') === label && pillLabel('Included Features') === label && pillLabel('Common Questions') === label;
}

async function runScenario(tierId, label) {
  console.log(`\n=== ${label} (slot: ${tierId}) ===`);

  console.log('1) Mount an already-published occupant (Overview/Features/FAQs all settled)');
  render(h(Harness, { initialTierId: tierId }), container);
  await waitToSettle();
  check('a footer was registered on mount', setFooterCalls > 0);
  check('every module pill reads Active on mount', allPillsRead('Active'), `overview=${pillLabel('Tier Overview')} features=${pillLabel('Included Features')} faqs=${pillLabel('Common Questions')}`);

  let footerDom = renderFooterDom();
  check('the real rendered split button reads "Disable" while published and not masked', footerDom.querySelector('.cz-footer-split__btn')?.textContent.trim() === 'Disable', footerDom.querySelector('.cz-footer-split__btn')?.textContent);

  console.log('\n2) Ready module Save — only the edited module changes, and it reads Pending full (not settled/Active)');
  const overviewEditBtn = editButtonFor('Tier Overview');
  check('an Edit action is present on Tier Overview', overviewEditBtn != null);
  overviewEditBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(20);
  const labelInput = container.querySelector('#tier-label');
  check('the Overview editor opened with the settled label', labelInput?.value === tiers[tierId].settled.label, labelInput?.value);
  if (labelInput) {
    labelInput.value = `${tiers[tierId].settled.label} (edited)`;
    labelInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  }
  await sleep(20);
  clickButtonWithText('Save');
  await waitToSettle();
  check('a ready module Save persists a draft only — the occupant is not re-settled by Save', settleCalls === 0, `settleCalls=${settleCalls}`);
  check('the edited module (Overview) reads Pending', pillLabel('Tier Overview') === 'Pending', pillLabel('Tier Overview'));
  check('sibling modules retain their settled state (Features)', pillLabel('Included Features') === 'Active', pillLabel('Included Features'));
  check('sibling modules retain their settled state (FAQs)', pillLabel('Common Questions') === 'Active', pillLabel('Common Questions'));

  console.log('\n3) Publish — activates, and every module returns to settled/Active');
  await clickPublish();
  await waitToSettle();
  check('the settle endpoint was called', settleCalls >= 1, `settleCalls=${settleCalls}`);
  check('every module pill reads Active after Publish', allPillsRead('Active'), `overview=${pillLabel('Tier Overview')} features=${pillLabel('Included Features')} faqs=${pillLabel('Common Questions')}`);
  check('the edit reached the server (label updated)', tiers[tierId].settled.label.endsWith('(edited)'), tiers[tierId].settled.label);

  console.log('\n4) Disable — every module reads Disabled, not Pending');
  footerDom = renderFooterDom();
  const disableBtn = footerDom.querySelector('.cz-footer-split__btn');
  check('the real rendered split button reads "Disable" before the first Disable', disableBtn?.textContent.trim() === 'Disable', disableBtn?.textContent);
  disableBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await waitToSettle();
  check('the enabled endpoint was called for Disable', enabledCalls === 1, `enabledCalls=${enabledCalls}`);
  check('the Disable request carried enabled:false', lastEnabledPayload?.enabled === false, JSON.stringify(lastEnabledPayload));
  check('every module pill reads Disabled after Disable', allPillsRead('Disabled'), `overview=${pillLabel('Tier Overview')} features=${pillLabel('Included Features')} faqs=${pillLabel('Common Questions')}`);

  footerDom = renderFooterDom();
  check('the real rendered split button now reads "Enable"', footerDom.querySelector('.cz-footer-split__btn')?.textContent.trim() === 'Enable', footerDom.querySelector('.cz-footer-split__btn')?.textContent);

  console.log('\n5) Enable — lands Pending (never Active, never stuck Disabled), and the footer offers Disable again');
  const enableBtn = footerDom.querySelector('.cz-footer-split__btn');
  enableBtn?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await waitToSettle();
  check('the enabled endpoint was called for Enable', enabledCalls === 2, `enabledCalls=${enabledCalls}`);
  check('the Enable request carried enabled:true', lastEnabledPayload?.enabled === true, JSON.stringify(lastEnabledPayload));
  check('Enable never activates — every module pill reads Pending, not Active', allPillsRead('Pending'), `overview=${pillLabel('Tier Overview')} features=${pillLabel('Included Features')} faqs=${pillLabel('Common Questions')}`);

  footerDom = renderFooterDom();
  check('after Enable the footer offers Disable again — not a no-op Enable', footerDom.querySelector('.cz-footer-split__btn')?.textContent.trim() === 'Disable', footerDom.querySelector('.cz-footer-split__btn')?.textContent);

  console.log('\n6) Publish after Enable — reaches Active again');
  const settleCallsBefore = settleCalls;
  await clickPublish();
  await waitToSettle();
  check('the settle endpoint was called again', settleCalls === settleCallsBefore + 1, `settleCalls=${settleCalls}`);
  check('Publish after Enable reaches Active on every module', allPillsRead('Active'), `overview=${pillLabel('Tier Overview')} features=${pillLabel('Included Features')} faqs=${pillLabel('Common Questions')}`);

  footerDom = renderFooterDom();
  check('the footer still offers Disable after republish', footerDom.querySelector('.cz-footer-split__btn')?.textContent.trim() === 'Disable', footerDom.querySelector('.cz-footer-split__btn')?.textContent);
}

console.log('Tier occupant lifecycle regression (blueprint acceptance matrix)\n');
await runScenario('basic', 'Normal Tier');
// Unmount between scenarios — Preact reuses the Harness instance across a
// prop-only re-render, so editingTierId (seeded once from initialTierId on
// first mount) would otherwise never re-seed for the second occupant.
render(null, container);
setFooterCalls = 0; lastFooter = null;
settleCalls = 0; enabledCalls = 0; lastEnabledPayload = null;
await runScenario('standard', 'Add-on Tier (identical lifecycle)');
check('the Add-on occupant kept is_addon true throughout its lifecycle', tiers.standard.settled.is_addon === true);
check('the normal Tier occupant is still is_addon false — no cross-occupant leakage', tiers.basic.settled.is_addon === false);
check('occupant ids stayed stable across every transition', tiers.basic.settled.occupant_id === 'occ_basic' && tiers.standard.settled.occupant_id === 'occ_addon');

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — Save/Publish/Disable/Enable/republish behave per the Tier Occupant Lifecycle Repair Blueprint, identically for a normal Tier and an Add-on.');
process.exit(0);
