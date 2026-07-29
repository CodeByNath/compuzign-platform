// Tier System footer-registration render-loop AND Publish-remount regression
// (cc27a601, repaired further after that fix's own review).
//
// No component-mounting test framework (vitest/jest/testing-library) exists
// in this repository — every other frontend "contract" here is a
// source-text assertion, not a rendered check. Neither defect below can be
// proven or disproven that way, so this script mounts the REAL
// TierRegistrationHost composition — bundled with esbuild (vite's own copy,
// the same technique scripts/module-state-snapshot.mjs already uses) — into
// a real DOM via happy-dom and Preact's own render(). Only the network
// boundary (fetch) is faked; hooks, the controller, the composition, and the
// DOM are the actual shipping code.
//
// Defect 1 — unbounded render loop (fixed): useTierInstances() returned a
// fresh object every render, so useTierSystemController's publish/apply
// (both depend on that object) got a new identity every render, and
// TierSystemContent's footer-registration effect lists publish/apply in its
// dependency array — so the effect refired every render, called
// bridge.setFooter, which (via the real ancestor owning footer state)
// re-rendered the host, which called useTierInstances() again, forever.
// Verified both directions: run against the pre-fix useTierInstances.ts,
// mount alone hits this script's hard cap at 2000+ calls; against the fix,
// the whole scenario settles in single digits.
//
// Defect 2 — Publish discards the pending→persisted transition (fixed):
// tool.createInstance() calls refetch() internally to reconcile with the
// canonical collection. refetch() re-ran the SAME effect that runs on first
// mount, which set the tool's `loading` flag back to true. Both
// TierRegistrationHost and TierInstanceSettingsHost gate mounting the Tier
// System composition on `loading`, so it briefly unmounted
// TierSystemContent and replaced it with a host-level "Loading…" placeholder
// — discarding useTierSystemController's local createdInstance state. When
// the refetch settled and the guard cleared, TierRegistrationHost remounted
// a BRAND NEW TierSystemContent with createdInstance reset to null and its
// hard-coded instance={null} prop, so the drawer silently reverted to
// "pending" even though the instance really had been created. This shape
// predates cc27a601 (the same pattern existed in the parent commit's
// useTierRegistration.ts) but only became user-visible once Milestone 1
// required the SAME mounted composition to continue after Publish.
//
// Fix: useTierInstances() now exposes `loading` as "no data has ever loaded"
// (tracked by a one-way `initialized` flag) rather than "a fetch of any kind
// is in flight". A later refetch() no longer flips it back to true, so the
// host guard never re-fires once the first load has settled, and
// TierSystemContent — and therefore its controller's createdInstance state —
// is never torn down by a background reconciliation fetch. No component was
// changed to "store the identity somewhere else to survive a remount";
// there is simply no remount to survive any more.
//
// Usage: npm run regression:tier-system-footer-loop
//    or: node scripts/tier-system-footer-loop-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild'); // vite's own esbuild — no new bundler dependency

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-tier-system-loop-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

// ── DOM shim ─────────────────────────────────────────────────────────────
const window = new Window({ url: 'https://cz-test.local/' });
globalThis.window = window;
globalThis.document = window.document;
// Node 21+ predefines a read-only global `navigator` getter; happy-dom's
// needs to win here, so it must be redefined rather than assigned.
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.MouseEvent = window.MouseEvent;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;

// Preact's hooks addon schedules effect flushes via requestAnimationFrame
// when it is present on the global object, falling back to a 100ms timeout
// otherwise. Forcing a fast, deterministic macrotask here just keeps this
// driver's polling loop tight — it does not change production behaviour,
// which is bundled from the real source unmodified.
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

window.CompuZignConfig = { apiRoot: 'https://cz-test.local/wp-json/', nonce: 'test-nonce' };

// ── Fetch mock — the only faked boundary ────────────────────────────────
let createInstanceCalls = 0;
const CREATED_ID = 'ti_regress_1';
const FAMILIES = { package_category_groups: [] };
const ASSIGNMENTS = { success: true, tier_assignments: [] };
// The canonical collection, as the backend would report it. Empty until
// createInstance() succeeds, then holds the created record — a background
// refetch() in real production would see the record it just created, and a
// mock that always returned [] would under-test the reconciliation path.
let instancesOnServer = [];

function jsonResponse(body) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

globalThis.fetch = (url, init = {}) => {
  const path = String(url);
  const method = (init?.method ?? 'GET').toUpperCase();
  if (path.includes('/tier-assignments')) return jsonResponse(ASSIGNMENTS);
  if (path.includes('/package-category-groups')) return jsonResponse(FAMILIES);
  if (path.includes('/tier-instances') && method === 'POST') {
    createInstanceCalls += 1;
    const payload = JSON.parse(init.body);
    const created = {
      tier_instance_id: CREATED_ID,
      title: payload.title,
      description: payload.description ?? '',
      status: 'draft',
      allowed_rate_sheet_ids: [],
      popular_tier: null,
      popular_label: '',
      tiers: {},
      occupant_bin: [],
    };
    instancesOnServer = [created];
    return jsonResponse({ success: true, tier_instance: created });
  }
  if (path.includes('/tier-instances')) {
    return jsonResponse({ success: true, tier_instances: instancesOnServer });
  }
  return Promise.reject(new Error(`Unexpected fetch in regression harness: ${method} ${path}`));
};

// ── Bundle the REAL composition ─────────────────────────────────────────
await build({
  entryPoints: [resolve(root, 'resources/ts/package-station/surface/tierSurface/TierRegistrationHost.tsx')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  logLevel: 'silent',
});

const { TierRegistrationHost } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');
const { useState, useMemo, useRef } = await import('preact/hooks');

// ── Harness ──────────────────────────────────────────────────────────────
// bridge.setFooter only matters if calling it can trigger the exact cascade
// that caused the real defect: an ANCESTOR re-render that flows back down
// through the host. A bridge that just records calls without being wired to
// real Preact state would pass even against the unfixed bug, because nothing
// would ever re-render TierRegistrationHost. So this harness owns real
// useState for the footer and hands TierRegistrationHost a bridge built the
// same way TierDrawerHost.tsx builds the real one — refs for the mutable
// parts, useMemo(..., []) so the bridge object itself stays referentially
// stable and cannot itself be the thing that makes an effect refire.
let setFooterCalls = 0;
let onMutationCompleteCalls = 0;
let lastFooter = null;

function Harness() {
  const [, setFooterState] = useState(null);
  const setFooterRef = useRef(setFooterState);
  setFooterRef.current = setFooterState;

  const bridge = useMemo(() => ({
    close: () => {},
    setFooter: (footer) => {
      setFooterCalls += 1;
      lastFooter = footer;
      setFooterRef.current(footer);
    },
    setCloseGuard: () => {},
    onMutationComplete: () => { onMutationCompleteCalls += 1; },
  }), []);

  return h(TierRegistrationHost, { initialFamilyId: null, bridge });
}

const container = document.createElement('div');
document.body.appendChild(container);

const HOST_LOADING_TEXT = 'Loading Package Families';
let loadingTextSeenDuringLastWait = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bounded settle-wait. The cap keeps THIS TEST PROCESS from hanging if the
// loop is not fixed — it is a property of the test harness's observation
// window, not a guard added to production code (which contains none). Also
// records, across the whole wait, whether the host's full-Loading fallback
// was ever the rendered output — the observable proof that
// TierRegistrationHost unmounted TierSystemContent rather than continuing
// the same mounted composition through a background refetch.
async function waitToSettle(maxTicks = 600, quietTicksNeeded = 25) {
  loadingTextSeenDuringLastWait = false;
  let quiet = 0;
  let previous = setFooterCalls;
  for (let tick = 0; tick < maxTicks; tick += 1) {
    await sleep(5);
    if (container.textContent.includes(HOST_LOADING_TEXT)) loadingTextSeenDuringLastWait = true;
    if (setFooterCalls === previous) {
      quiet += 1;
      if (quiet >= quietTicksNeeded) return { settled: true, ticks: tick };
    } else {
      quiet = 0;
      previous = setFooterCalls;
    }
  }
  return { settled: false, ticks: maxTicks };
}

const failures = [];
function check(label, cond, detail) {
  if (cond) {
    console.log(`  ok — ${label}`);
  } else {
    console.error(`  FAIL — ${label}${detail ? `: ${detail}` : ''}`);
    failures.push(label);
  }
}

console.log('Tier System footer-registration loop + Publish-remount regression\n');

console.log('1) Mount TierRegistrationHost (pending) and let the initial fetch settle');
render(h(Harness), container);
let result = await waitToSettle();
check(
  'mount settles within the observation window (no unbounded render loop)',
  result.settled,
  `hit hard cap at ${result.ticks} ticks, setFooterCalls=${setFooterCalls}`,
);
const afterMountCount = setFooterCalls;
check(
  'footer registered a small, bounded number of times on mount',
  afterMountCount > 0 && afterMountCount <= 3,
  `setFooterCalls=${afterMountCount}`,
);
check('footer is present (not null) after settling', lastFooter !== null);

console.log('2) Fill the Overview title through a real DOM edit session (Edit → type → Save)');
const overviewEditBefore = [...container.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Edit');
check('an Edit button is present before publish', overviewEditBefore.length >= 1, `found ${overviewEditBefore.length}`);
// Overview is placed first in TIER_SYSTEM_ENTITY.placements.drawer.details, so
// it is the first Edit button regardless of how many render pre-publish.
overviewEditBefore[0]?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
const titleInput = container.querySelector('input.cz-tf-input');
check('title input is present once the editor is open', titleInput !== null);
if (titleInput) {
  titleInput.value = 'Regression Test Tier';
  titleInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(20);
}
const saveButton = [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Save');
check('Save button is present', saveButton != null);
saveButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
result = await waitToSettle();
check(
  'inline Save (local draft commit) settles within the observation window and makes no network call',
  result.settled && createInstanceCalls === 0,
  `settled=${result.settled}, createInstanceCalls=${createInstanceCalls}`,
);

console.log("3) Invoke Publish through the real footer descriptor's onPublish callback");
check('captured footer exposes onPublish', typeof lastFooter?.props?.onPublish === 'function');
lastFooter.props.onPublish();
result = await waitToSettle();
check(
  'publish settles within the observation window',
  result.settled,
  `hit hard cap at ${result.ticks} ticks, setFooterCalls=${setFooterCalls}`,
);
// Requirement 8: a background refetch must not render the full host Loading
// state — the direct, observable signature of the unmount/remount defect.
check(
  'TierRegistrationHost never fell back to its full "Loading…" state during Publish',
  !loadingTextSeenDuringLastWait,
);
// Requirement 1 (TierSystemContent stayed mounted) is the necessary
// consequence of requirement 8 in this host: `loading` and the composition
// are the only two mutually exclusive render branches once past the error
// check, so if Loading never rendered, the composition was never unmounted
// to make room for it.
check('createInstance called exactly once', createInstanceCalls === 1, `createInstanceCalls=${createInstanceCalls}`);
check(
  'onMutationComplete called exactly once',
  onMutationCompleteCalls === 1,
  `onMutationCompleteCalls=${onMutationCompleteCalls}`,
);
const afterPublishCount = setFooterCalls;
// Publish legitimately touches saving/error state on both the controller
// and the tool (createInstance's own setSaving/setError), commits the
// pending→persisted transition, and — now that TierSystemContent survives
// it — lets the background refetch settle in place, each a genuine,
// independent state change the footer effect is right to react to. This
// ceiling only needs to sit far enough below "unbounded" (the real defect
// hit 2000+ within the same window) to catch a real regression, not to
// pin an exact render count.
check(
  'footer re-registration after Publish stayed small and bounded',
  afterPublishCount - afterMountCount <= 25,
  `delta=${afterPublishCount - afterMountCount}`,
);
// Requirement 2: footer flips from Publish (pending) to Apply/Delete (persisted).
check(
  'footer flipped to persisted mode (Apply + Delete)',
  lastFooter?.props?.mode === 'persisted',
  `mode=${lastFooter?.props?.mode}`,
);
// Requirement 3: the returned tier_instance_id is the active controller
// identity. TierSystemOverviewShellData.reference renders as the "Tier
// system ID" field's value once instance !== null (bindings/tierSystem.tsx),
// so the created id appearing in the DOM is direct proof the controller
// resolved to the real record rather than a lost/reset local id.
check(
  "the created tier_instance_id is rendered as the record's own identity",
  container.textContent.includes(CREATED_ID),
  `expected "${CREATED_ID}" in rendered output`,
);

console.log('4) Open Rate Sheet Access (now unlocked post-publish) via a real DOM click');
const editsAfterPublish = [...container.querySelectorAll('button')].filter((b) => b.textContent.trim() === 'Edit');
check(
  'a Rate Sheet Access Edit action is present and enabled post-publish',
  editsAfterPublish.some((b) => !b.disabled),
  `found ${editsAfterPublish.length} Edit button(s)`,
);
const rateSheetEdit = editsAfterPublish[editsAfterPublish.length - 1];
rateSheetEdit?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
result = await waitToSettle();
check('opening Rate Sheet Access settles within the observation window', result.settled);
check(
  'Rate Sheet Access editor actually opened (its mode select is rendered)',
  container.textContent.includes('Only selected Rate Sheets'),
);
check(
  "TierRegistrationHost still never fell back to its full \"Loading…\" state",
  !loadingTextSeenDuringLastWait,
);

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`All checks passed — no unbounded loop, and Publish settles into the persisted state in place (final setFooterCalls=${setFooterCalls}).`);
process.exit(0);
