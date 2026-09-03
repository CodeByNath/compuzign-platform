// Composable occupant quote/cart reactive-sync loop regression
// (ChatGPT review finding on review/composable-quote-cart-connection).
//
// No component-mounting test framework (vitest/jest/testing-library) exists
// in this repository — every other frontend "contract" here is a
// source-text assertion, not a rendered check. A callback-identity/effect-
// lifecycle loop cannot be proven or disproven that way, so — same
// precedent as scripts/tier-system-footer-loop-regression.mjs — this
// script mounts the REAL PackageBuilderApp composition, bundled with
// esbuild (vite's own copy), into a real DOM via happy-dom and Preact's own
// render(). Only the network boundary (fetch) is faked; hooks, the
// composition, ComposableOfferBrowser's own debounced preview effect, and
// the DOM are the actual shipping code.
//
// The defect: PackageBuilderApp defined addComposable/removeComposable (and
// every other cart-mutation callback) as a plain closure redefined every
// render. ComposableOfferBrowser's preview effect depends on onCommit/
// onRemoveFromQuote so it can react to a genuine Family switch — but a
// successful preview calling onCommit() updates cart state via setItems(),
// re-rendering PackageBuilderApp, producing a NEW addComposable identity,
// which re-triggers the SAME effect even though the customer's own
// selection never changed, resolving the same preview again and committing
// again: an unbounded 400ms preview/commit loop. Fix: those callbacks are
// now wrapped in useCallback with the Family's own identity strings (not
// the full family object) as deps, constructed before the component's
// loading/error/empty early returns (Rules of Hooks).
//
// Usage: npm run regression:composable-quote-cart-loop
//    or: node scripts/composable-quote-cart-loop-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-composable-quote-cart-loop-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

// ── DOM shim ─────────────────────────────────────────────────────────────
const window = new Window({ url: 'https://cz-test.local/' });
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.MouseEvent = window.MouseEvent;
globalThis.HTMLElement = window.HTMLElement;
globalThis.HTMLInputElement = window.HTMLInputElement;
globalThis.Node = window.Node;
globalThis.localStorage = window.localStorage;
globalThis.IntersectionObserver = window.IntersectionObserver;
globalThis.ResizeObserver = window.ResizeObserver;
globalThis.MutationObserver = window.MutationObserver;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

window.CompuZignConfig = { apiRoot: 'https://cz-test.local/wp-json/compuzign/v1/', nonce: 'test-nonce' };

// ── Fixture: one Family with a composable occupant, one optional inclusion ──
const FAMILY = {
  family_id: 'pcg_kairos', family_platform_id: 'CZPG-KAIROS01', title: 'KAIROS',
  description: '', tier_instance_id: 'ti_kairos', tier_instance_platform_id: 'CZTG-KAIROS01',
  popular_tier: null, popular_label: null, included_categories: [],
  pricing: {
    tiers: {},
    composable_offer: {
      tier_occupant_id: 'occ_composable', tier_platform_id: 'CZT-KAIROS099',
      price: null, billing_cycle: '', features: [], label: 'Build Your Own',
      minimum_term_value: 12, minimum_term_unit: 'months', headline_leg_id: 'default',
      inclusions: [
        { id: 'block-storage', label: 'Block Storage', unit_price: 10, categories: [], service: null },
      ],
      customer_policy: {
        items: [
          { item_id: 'block-storage', mode: 'optional', default_selected: false, quantity: null,
            price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null }, featured: false },
        ],
      },
    },
  },
};

// ── Fetch mock — the only faked boundary ────────────────────────────────
let previewCalls = 0;
const submittedChoices = [];
let failNextPreview = false;

function jsonResponse(body) {
  return Promise.resolve({
    ok: true, status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

globalThis.fetch = (url, init = {}) => {
  const path = String(url);
  const method = (init?.method ?? 'GET').toUpperCase();
  if (path.endsWith('/package-builder') && method === 'GET') {
    return jsonResponse({ tiers: [], families: [FAMILY] });
  }
  if (path.includes('/package-builder/composable-preview') && method === 'POST') {
    previewCalls += 1;
    const payload = JSON.parse(init.body);
    submittedChoices.push(payload.choice);
    if (failNextPreview) {
      failNextPreview = false;
      return jsonResponse({ ok: false, code: 'unavailable' });
    }
    const entry = payload.choice.find((c) => c.item_id === 'block-storage');
    const isSelected = entry?.selected === true;
    if (!isSelected) return jsonResponse({ ok: true, periods: [] });
    return jsonResponse({
      ok: true,
      periods: [
        { from_month: 0, to_month: null, components: [
          { source: 'default', billing_cycle: 'monthly', price: 10, available: true,
            items: [{ item_id: 'block-storage', label: 'Block Storage', quantity: 1, price_option_id: null, unit_price: 10, line_total: 10, available: true }] },
        ] },
      ],
    });
  }
  return Promise.reject(new Error(`Unexpected fetch in regression harness: ${method} ${path}`));
};

// ── Cart-write spy — the real observable signal for "a commit happened" ──
// PackageBuilderApp's own [items] effect calls saveCart(items) -> exactly
// this localStorage key, exactly once per items state update. Every
// onCommit/onRemoveFromQuote causes exactly one such update, so this is a
// precise, non-invasive count of actual cart writes — no application code
// is instrumented to get it. Patched on Storage.prototype, not the
// localStorage INSTANCE: happy-dom's Storage instance is a spec-accurate
// exotic object (`localStorage.foo = 'bar'` sets a storage key named
// "foo", per the real Web Storage API), so `window.localStorage.setItem =
// fn` silently creates a stored key called "setItem" instead of
// overriding the method — confirmed by inspection before writing this.
// A cart mutation is `saveCart()` (localStorage.setItem) when items.length
// > 0, but PackageBuilderApp's own [items] effect calls clearCart()
// (localStorage.removeItem) instead once the LAST item is removed — the
// composable-removal path this regression itself exercises (step 4). Both
// must count as one cart write, and both must be patched on
// Storage.prototype for the same exotic-instance reason setItem is.
const CART_KEY = 'compuzign_quote_cart_v1';
let cartWrites = 0;
let lastCartComposableItem = null;
const storageProto = Object.getPrototypeOf(window.localStorage);
const nativeSetItem = storageProto.setItem;
storageProto.setItem = function patchedSetItem(key, value) {
  if (key === CART_KEY) {
    cartWrites += 1;
    const payload = JSON.parse(value);
    lastCartComposableItem = payload.items.find((item) => item.isComposable === true) ?? null;
  }
  return nativeSetItem.call(this, key, value);
};
const nativeRemoveItem = storageProto.removeItem;
storageProto.removeItem = function patchedRemoveItem(key) {
  if (key === CART_KEY) {
    cartWrites += 1;
    lastCartComposableItem = null;
  }
  return nativeRemoveItem.call(this, key);
};

// ── Bundle the REAL composition ─────────────────────────────────────────
await build({
  entryPoints: [resolve(root, 'resources/ts/components/package-builder/PackageBuilderApp.tsx')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  logLevel: 'silent',
});

const { PackageBuilderApp } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');

const container = document.createElement('div');
document.body.appendChild(container);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bounded settle-wait keyed on BOTH preview calls and cart writes going
// quiet — the loop this regression targets grows one or both unboundedly.
// quietTicksNeeded=100 (500ms of no change) is deliberately well past
// ComposableOfferBrowser's own 400ms preview debounce, so this never
// declares "settled" merely because the debounce timer has not fired yet —
// it waits the SAME amount of real time whether the debounced request is
// about to land or has already landed, then confirms nothing further moves.
async function waitToSettle(maxTicks = 400, quietTicksNeeded = 100) {
  let quiet = 0;
  let previous = previewCalls + cartWrites;
  for (let tick = 0; tick < maxTicks; tick += 1) {
    await sleep(5);
    const current = previewCalls + cartWrites;
    if (current === previous) {
      quiet += 1;
      if (quiet >= quietTicksNeeded) return { settled: true, ticks: tick };
    } else {
      quiet = 0;
      previous = current;
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

console.log('Composable quote/cart reactive-sync loop regression\n');

console.log('1) Mount PackageBuilderApp and let the initial fetch settle');
render(h(PackageBuilderApp), container);
let result = await waitToSettle();
check('initial mount settles within the observation window (no unbounded loop)', result.settled, `hit hard cap at ${result.ticks} ticks`);
// The unmodified pre-existing preview-on-load behavior (ComposableOfferBrowser
// always previewed the default-seeded selection before this phase too) means
// exactly one preview call is expected here — the property this regression
// actually targets is that NO CART WRITE happens merely from mounting/
// default-seeding (hasInteracted gates the commit, not the preview itself).
check('exactly one preview call from the default-seeded mount (pre-existing preview-on-load behavior, unchanged)', previewCalls === 1, `previewCalls=${previewCalls}`);
// PackageBuilderApp's own [items] effect runs on first mount too (items
// starts as an empty loadCart() result), calling clearCart() once
// regardless of whether there was ever anything to clear — a pre-existing
// baseline write, not a composable-specific symptom. Captured as the
// baseline every later delta is measured against, rather than asserted to
// be zero.
const cartWritesAfterMount = cartWrites;
check('no cart write is caused BY the default-seeded preview specifically (only the pre-existing mount-time clearCart() baseline)', cartWritesAfterMount <= 1, `cartWrites=${cartWrites}`);

console.log('2) Click "Add" on the one optional inclusion (real DOM click)');
const findAddButton = () => [...container.querySelectorAll('.cz-package-builder__composable-grid button')]
  .find((b) => b.textContent.trim() === 'Add');
let addButton = findAddButton();
check('an Add button is present for the composable row', addButton != null);
const previewCallsBeforeAdd = previewCalls;
addButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
result = await waitToSettle();
check('the click settles within the observation window (no unbounded loop after commit)', result.settled, `hit hard cap at ${result.ticks} ticks, previewCalls=${previewCalls}, cartWrites=${cartWrites}`);
check('exactly one NEW preview call resolved for this one interaction', previewCalls === previewCallsBeforeAdd + 1, `previewCalls=${previewCalls}, before=${previewCallsBeforeAdd}`);
check('exactly one NEW cart write (one commit) resulted from this one interaction', cartWrites === cartWritesAfterMount + 1, `cartWrites=${cartWrites}, baseline=${cartWritesAfterMount}`);
check('the committed cart line is the composable occupant, selected and priced', lastCartComposableItem?.isComposable === true && lastCartComposableItem?.price === 10, `item=${JSON.stringify(lastCartComposableItem)}`);
check('the row now reads Remove (selection state reflects the commit)', findAddButton() == null && [...container.querySelectorAll('.cz-package-builder__composable-grid button')].some((b) => b.textContent.trim() === 'Remove'));

console.log('3) Wait again with NO further interaction — the loop, if present, keeps growing here');
const previewCallsAfterFirstCommit = previewCalls;
const cartWritesAfterFirstCommit = cartWrites;
await sleep(1000);
check(
  'preview call count stayed exactly the same with no further interaction (the actual reported loop symptom)',
  previewCalls === previewCallsAfterFirstCommit,
  `before=${previewCallsAfterFirstCommit}, after=${previewCalls}`,
);
check(
  'cart write count stayed exactly the same with no further interaction',
  cartWrites === cartWritesAfterFirstCommit,
  `before=${cartWritesAfterFirstCommit}, after=${cartWrites}`,
);

console.log('4) Click "Remove" — a genuine second interaction must still produce exactly one new preview + one new commit (removal)');
const removeButton = [...container.querySelectorAll('.cz-package-builder__composable-grid button')].find((b) => b.textContent.trim() === 'Remove');
check('a Remove button is present after the first commit', removeButton != null);
removeButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
result = await waitToSettle();
check('the second interaction settles within the observation window', result.settled, `hit hard cap at ${result.ticks} ticks`);
check('exactly one new preview call for this second interaction', previewCalls === previewCallsAfterFirstCommit + 1, `previewCalls=${previewCalls}`);
check('exactly one new cart write (the removal) for this second interaction', cartWrites === cartWritesAfterFirstCommit + 1, `cartWrites=${cartWrites}`);
check('the composable line is gone from the cart (zero-selection removal)', lastCartComposableItem === null);

console.log('5) Click "Add" again, this time forcing the next preview to fail — a failed preview must never commit');
failNextPreview = true;
const previewCallsBeforeFailure = previewCalls;
const cartWritesBeforeFailure = cartWrites;
const addAgainButton = findAddButton();
check('an Add button is present again after the removal', addAgainButton != null);
addAgainButton?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
result = await waitToSettle();
check('the failed-preview interaction settles within the observation window (no loop from a failure either)', result.settled, `hit hard cap at ${result.ticks} ticks`);
check('exactly one preview call was made (the failing one)', previewCalls === previewCallsBeforeFailure + 1, `previewCalls=${previewCalls}`);
check('NO cart write happened from a failed preview', cartWrites === cartWritesBeforeFailure, `cartWrites=${cartWrites}, expected=${cartWritesBeforeFailure}`);

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`All checks passed — no reactive-sync loop; each real interaction produces exactly one preview call and one cart write (final previewCalls=${previewCalls}, cartWrites=${cartWrites}).`);
process.exit(0);
