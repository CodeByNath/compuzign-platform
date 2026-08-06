// Tier Publish request-timeout — mounted regression.
//
// Mounts the REAL TierDrawerContent composition (esbuild + happy-dom + Preact
// render, same technique as scripts/tier-occupant-lifecycle-regression.mjs)
// against a Pending occupant whose Publish/settle request never returns, and
// proves the shared api/client.ts bounded-timeout safety net actually reaches
// the mounted drawer:
//
//   - Publish shows the footer's busy "Saving…" state (Close disabled,
//     Publish busy) while the request is outstanding — the pre-fix "stuck
//     forever" symptom, up to this exact point;
//   - once the shared client's request timeout fires, usePackageStation's
//     existing `finally { setSaving(false) }` still runs (the timeout only
//     changes what the awaited promise resolves/rejects with, never bypasses
//     try/finally), so the drawer becomes interactive again: Close and
//     Publish are both usable, the busy label is gone;
//   - the surfaced message reports an UNCERTAIN outcome ("may have been
//     saved... Refresh"), never a definite "Publish failed" — the change may
//     already be persisted server-side;
//   - a normal, fast Publish is unaffected: it resolves, activates the
//     occupant, and never touches the timeout path.
//
// The request-timeout constant is intercepted, not shortened: this mounts the
// REAL resources/ts/api/client.ts (bundled, unmodified) and fires its actual
// scheduled timer synchronously instead of waiting 30 real seconds — every
// other timer in the harness (sleep/poll ticks) still runs for real, so
// Preact's own render scheduling is undisturbed.
//
// Usage: npm run regression:tier-publish-timeout
//    or: node scripts/tier-publish-timeout-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-tier-publish-timeout-bundle.mjs');
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

// ── Selective fake timer — intercepts ONLY the shared client's request
// timeout (resources/ts/api/client.ts's REQUEST_TIMEOUT_MS); every other
// delay (the harness's own sleep/poll ticks) still runs on the real clock. ──
const REQUEST_TIMEOUT_MS = 30_000; // must match resources/ts/api/client.ts
const realSetTimeout = globalThis.setTimeout.bind(globalThis);
const realClearTimeout = globalThis.clearTimeout.bind(globalThis);
let pendingRequestTimeoutFn = null;
let pendingRequestTimeoutId = null;
let fakeIdSeq = -1;
globalThis.setTimeout = (fn, ms, ...args) => {
  if (ms === REQUEST_TIMEOUT_MS) {
    pendingRequestTimeoutFn = fn;
    pendingRequestTimeoutId = fakeIdSeq;
    fakeIdSeq -= 1;
    return pendingRequestTimeoutId;
  }
  return realSetTimeout(fn, ms, ...args);
};
globalThis.clearTimeout = (id) => {
  if (id === pendingRequestTimeoutId) {
    pendingRequestTimeoutFn = null;
    pendingRequestTimeoutId = null;
    return;
  }
  return realClearTimeout(id);
};
function fireRequestTimeout() {
  if (!pendingRequestTimeoutFn) throw new Error('No request-timeout timer is currently pending — the request may already have settled.');
  const fn = pendingRequestTimeoutFn;
  pendingRequestTimeoutFn = null;
  pendingRequestTimeoutId = null;
  fn();
}

// ── Fixture server state ────────────────────────────────────────────────
const SERVICE_ID = 802;
const INSTANCE_ID = 'ti_primary';
const RATE_SHEET_ID = 'rs_a';

function emptyDrafts() { return { overview: null, features: null, faqs: null }; }

// An existing Pending occupant — first Overview Save already happened
// (PackageSchema::ensurePendingOccupant), no CZT yet. This is exactly the
// "Publishing an existing Pending tier" scenario from the bug report.
const tiers = {
  basic: {
    settled: {
      occupant_id: 'occ_basic_first_save', platform_id: '', addon_platform_id: '',
      label: '', ideal_for: '', price: null, contact: false, billing_cycle: null,
      rate_sheet_id: null, inclusions_override: [],
      // At least one unresolved selection is required to exercise
      // tierView()'s `dp.rate_sheet_selections.find(...)` fallback below —
      // an empty rate_sheet_items list would never reach that line, and
      // would silently defeat the regression this fixture exists to prove.
      rate_sheet_items: [{ item_id: 'ri_unresolved', quantity: 1 }], rate_sheet_selections: [],
      features: [], faq_refs: [], enabled: false, is_explicitly_disabled: false, is_addon: false,
    },
    drafts: { overview: { label: 'Starter Cloud', ideal_for: 'Small workloads', price: null, contact: false, billing_cycle: 'monthly', rate_sheet_id: RATE_SHEET_ID, is_addon: false }, features: null, faqs: null },
    module_status: { overview: 'pending', features: 'not-configured', faqs: 'not-configured' },
  },
  standard: { settled: null, drafts: emptyDrafts(), module_status: { overview: 'not-configured', features: 'not-configured', faqs: 'not-configured' } },
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

function jsonResponse(body) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) });
}

const READ_PATH = `admin/services/${SERVICE_ID}/package-station/tier-instances/${INSTANCE_ID}/read`;
const TIER_BASE = `admin/services/${SERVICE_ID}/package-station/tier-instances/${INSTANCE_ID}/tiers`;

let settleCalls = 0;
// When true, the settle endpoint's promise is left permanently unsettled
// (mirroring a genuinely stalled request) until the request's own
// AbortController fires — exactly what the shared client's timeout guards.
let hangNextSettle = false;

globalThis.fetch = (url, init = {}) => {
  const path = String(url);
  const method = (init?.method ?? 'GET').toUpperCase();

  if (path.endsWith(READ_PATH) && method === 'GET') {
    return jsonResponse({
      success: true, tier_instance_id: INSTANCE_ID, service_id: SERVICE_ID,
      station: {
        tier_instance_id: INSTANCE_ID, allowed_rate_sheet_ids: [RATE_SHEET_ID], platform_status: 'disabled',
        tiers: stationTiers(), popular_tier: null, popular_label: '', sort_position: 0,
        bundle: { title: '', description: '', price: null }, occupant_bin: [],
      },
      service: { id: SERVICE_ID, title: 'Timeout Regression Service', inclusions: [], faqs: [], rate_sheets: [{ rate_sheet_id: RATE_SHEET_ID, title: 'Primary', status: 'active', groups: [], items: [] }], package_relationships: [] },
    });
  }

  const settleMatch = path.match(new RegExp(`${TIER_BASE}/([a-z]+)/settle$`));
  if (settleMatch && method === 'POST') {
    settleCalls += 1;
    const [, tierId] = settleMatch;

    if (hangNextSettle) {
      hangNextSettle = false;
      // Faithfully reproduces real fetch()'s abort contract: the promise
      // never resolves on its own — only the caller's AbortSignal firing
      // rejects it, exactly like a genuinely stalled network request.
      return new Promise((_resolveFetch, rejectFetch) => {
        const signal = init.signal;
        if (signal) {
          signal.addEventListener('abort', () => {
            rejectFetch(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }
      });
    }

    const t = tiers[tierId];
    const ov = t.drafts.overview;
    const base = t.settled ?? detailFor(tierId);
    t.settled = {
      ...base,
      label: ov?.label ?? base.label,
      ideal_for: ov?.ideal_for ?? base.ideal_for,
      billing_cycle: ov?.billing_cycle ?? base.billing_cycle,
      rate_sheet_id: ov && ov.rate_sheet_id !== undefined ? ov.rate_sheet_id : base.rate_sheet_id,
      enabled: true, is_explicitly_disabled: false,
      platform_id: base.platform_id || `CZT${tierId.toUpperCase()}`,
    };
    t.drafts = emptyDrafts();
    t.module_status = { overview: 'settled', features: 'settled', faqs: 'settled' };
    // Mirrors the REAL backend exactly: settlePackageStationTier's response
    // is built from PackageSchema::normaliseTierSlot(), which never includes
    // rate_sheet_selections — only the separate GET /read endpoint
    // (getPackageStation) computes and adds it via
    // PackageManagerSchema::projectTierRateSheet(). A settle response is
    // never a superset of a read response; omitting it here is not a
    // contrived edge case.
    const responseTier = detailFor(tierId);
    delete responseTier.rate_sheet_selections;
    return jsonResponse({ success: true, tier_id: tierId, platform_status: 'active', tier: responseTier, drafts: t.drafts, module_status: t.module_status });
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

const sleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
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

console.log('=== Tier Publish request-timeout (mounted) ===');

render(h(Harness, { initialTierId: 'basic' }), container);
await waitToSettle();

console.log('\n1) Publish a stalled request — the footer locks into Saving…, exactly the pre-fix symptom up to this point');
hangNextSettle = true;
let footerDom = renderFooterDom();
clickButtonWithText('Publish', footerDom);
await sleep(20);
clickButtonWithText('Publish', container); // the confirm dialog's own Publish button
await sleep(20);

footerDom = renderFooterDom();
const publishBtnWhileSaving = [...footerDom.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Saving…');
const closeBtnWhileSaving = [...footerDom.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Close');
check('the footer shows the busy "Saving…" label while the request is outstanding', !!publishBtnWhileSaving);
check('Close is disabled while the request is outstanding', closeBtnWhileSaving?.disabled === true);
check('exactly one settle request was made so far', settleCalls === 1, settleCalls);

console.log('\n2) The shared client\'s request timeout fires — the drawer must unlock, not stay stuck forever');
fireRequestTimeout();
await waitToSettle();

footerDom = renderFooterDom();
const publishBtnAfterTimeout = [...footerDom.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Publish');
const closeBtnAfterTimeout = [...footerDom.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Close');
check('the busy "Saving…" label is gone once the timeout fires', ![...footerDom.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Saving…'));
check('Publish is interactive again (not busy/disabled by saving)', !!publishBtnAfterTimeout && publishBtnAfterTimeout.disabled === false);
check('Close is interactive again', closeBtnAfterTimeout?.disabled === false);

const errorText = [...container.querySelectorAll('.cz-admin-error-msg')].map((el) => el.textContent).join(' ');
check('the surfaced message reports an UNCERTAIN outcome, not a definite failure', errorText.includes('did not complete in time') && errorText.includes('may have been saved') && errorText.toLowerCase().includes('refresh'), errorText);
check('the message never claims the publish definitely failed', !errorText.toLowerCase().includes('publish failed'), errorText);

console.log('\n3) A normal, fast Publish is unaffected by the timeout machinery');
const beforeSecondSettle = settleCalls;
footerDom = renderFooterDom();
clickButtonWithText('Publish', footerDom);
await sleep(20);
clickButtonWithText('Publish', container);
await waitToSettle();
check('a second (fast) settle request was made', settleCalls === beforeSecondSettle + 1, settleCalls);
const okText = [...container.querySelectorAll('.cz-admin-ok-msg')].map((el) => el.textContent).join(' ');
check('a normal Publish reports success, not the timeout message', okText.trim() === 'Saved.', okText);

render(null, container);
render(null, footerContainer);

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll checks passed — a stalled Tier Publish times out, releases the drawer, and reports an uncertain (not definite-failure) outcome; a normal Publish is unaffected.');
