// Phase 2B1 static/local synthetic validation — per the auditor's explicit
// "Validation policy" in project-work/2026-09-02-composable-tier-customer-ux.md:
// no production fixture/policy data added to make the customer path visible
// live; instead this mounts the REAL, shipped ComposableOfferBrowser.tsx
// against synthetic PackageBuilderFamily data (esbuild + happy-dom, the same
// pattern already proven by package-family-create-handoff-regression.mjs and
// its siblings), with fetch mocked so the real resolveComposablePreview()
// call travels through the real component code path.
//
// Covers the eight minimum-evidence points the work file lists:
//   1. Both presentation contexts render distinctly.
//   2. Policy authorization gates visible rows (an inclusion absent from
//      customer_policy.items never renders even though it's on the wire).
//   3. Category/Service filtering, Featured-first sort, max-six paging.
//   4. Optional Add/Remove including default_selected:true; a required row
//      is never offered as a removable browse card at all.
//   5. Fixed quantity has no selector; configurable quantity honors
//      min/max/step and causes a debounced preview request.
//   6. No Price Option control exists anywhere in a submitted payload.
//   7. The server preview result — not client arithmetic — drives the
//      selected card's price; an ambiguous multi-stream item is never
//      summed or guessed.
//   8. ComposableOfferBrowser renders nothing at all when composable_offer
//      is absent — the actual regression risk surface this whole feature
//      introduced for every other, pre-existing customer-facing surface.

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-composable-offer-browser-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

const window = new Window({ url: 'https://cz-test.local/' });
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.MouseEvent = window.MouseEvent;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
window.CompuZignConfig = { apiRoot: 'https://cz-test.local/wp-json/compuzign/v1/', nonce: 'test-nonce' };

// ── Mocked network boundary ─────────────────────────────────────────────
// Every POST to composable-preview is captured (full body, so submitted
// choice rows can be inspected for a stray price_option_id) and answered
// from `mockPeriods`, mutated per scenario below — the ONLY way a test
// changes what the "server" resolves; the component itself never computes
// a price.
const postCalls = [];
let mockPeriods = [];

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
  const method = (init.method ?? 'GET').toUpperCase();
  if (path.includes('/package-builder/composable-preview') && method === 'POST') {
    const body = init.body ? JSON.parse(init.body) : {};
    postCalls.push(body);
    return jsonResponse({ ok: true, periods: mockPeriods });
  }
  return Promise.reject(new Error(`Unexpected fetch in composable offer browser regression: ${method} ${path}`));
};

await build({
  entryPoints: [resolve(root, 'resources/ts/components/package-builder/ComposableOfferBrowser.tsx')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  logLevel: 'silent',
});

const { ComposableOfferBrowser } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');

// ── Synthetic fixture ────────────────────────────────────────────────────
// 8 items total: 1 required (hosting — never offered as a browse card), 7
// optional (forces two pages at PAGE_SIZE=6), 1 present in `inclusions`
// but deliberately absent from `customer_policy.items` at all (simulating
// an excluded/never-authorized item still riding on the wire) — proof #2.

function inclusion(id, label, unitPrice, categories, service) {
  return { id, label, unit_price: unitPrice, line_total: unitPrice, categories, service };
}

function policyItem(id, mode, overrides = {}) {
  return {
    item_id: id,
    mode,
    default_selected: false,
    quantity: null,
    price_option: { mode: 'fixed', allowed_price_option_ids: null, default_price_option_id: null },
    featured: false,
    ...overrides,
  };
}

const inclusions = [
  inclusion('hosting', 'Hosting', 100, [], null),
  inclusion('backup_mirror', 'Backup Mirror', 15, ['Compute'], 'VPS'),
  inclusion('extra_seats', 'Extra Seats', 10, ['Compute'], 'VPS'),
  inclusion('static_ip', 'Static IP', 5, ['Compute'], 'Networking'),
  inclusion('ssl_cert', 'SSL Certificate', 8, ['Compute'], 'Networking'),
  inclusion('monitoring', 'Monitoring', 12, ['Support'], 'Managed Services'),
  inclusion('firewall', 'Firewall', 20, ['Support'], 'Managed Services'),
  // Deliberately labeled to sort LAST alphabetically ('Z...') — the
  // featured item must NOT also happen to sort first alphabetically, or a
  // Featured-sort vs Name-sort comparison would look identical whether or
  // not Featured actually took effect.
  inclusion('priority_support', 'Zzz Priority Support', 30, ['Support'], 'Managed Services'),
  inclusion('unauthorized_item', 'Unauthorized Item', 999, ['Compute'], 'VPS'),
];

const policyItems = [
  policyItem('hosting', 'required'),
  policyItem('priority_support', 'optional', { default_selected: false, featured: true }),
  policyItem('backup_mirror', 'optional', { default_selected: true }),
  policyItem('extra_seats', 'optional', { quantity: { default: 1, min: 1, max: 10, step: 1 } }),
  policyItem('static_ip', 'optional'),
  policyItem('ssl_cert', 'optional'),
  policyItem('monitoring', 'optional'),
  policyItem('firewall', 'optional'),
  // unauthorized_item deliberately has NO policy entry at all.
];

function makeFamily(composableOffer) {
  return {
    family_id: 'fam_synthetic',
    family_platform_id: 'CZPG-SYNTH',
    title: 'Synthetic Family',
    description: '',
    tier_instance_id: 'ti_synth',
    tier_instance_platform_id: 'CZTG-SYNTH',
    popular_tier: null,
    popular_label: null,
    included_categories: [],
    pricing: {
      tiers: {},
      composable_offer: composableOffer,
    },
  };
}

const family = makeFamily({
  tier_occupant_id: 'occ_synth',
  tier_platform_id: 'CZT-SYNTH',
  price: null,
  billing_cycle: 'monthly',
  inclusions,
  features: [],
  is_addon: false,
  minimum_term_value: null,
  minimum_term_unit: null,
  customer_policy: { items: policyItems },
});

// ── Harness helpers ──────────────────────────────────────────────────────

const failures = [];
function check(label, condition, detail = '') {
  if (condition) console.log(`  ok — ${label}`);
  else {
    console.error(`  FAIL — ${label}${detail ? `: ${detail}` : ''}`);
    failures.push(label);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function mount(props) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(h(ComposableOfferBrowser, props), container);
  return container;
}
function cardLabels(container) {
  return [...container.querySelectorAll('.cz-package-builder__composable-card-label')].map((el) => el.textContent.trim());
}
function cardByLabel(container, label) {
  const labelEl = [...container.querySelectorAll('.cz-package-builder__composable-card-label')].find((el) => el.textContent.trim() === label);
  return labelEl?.closest('.cz-package-builder__composable-card') ?? null;
}
function setValue(el, value) {
  el.value = value;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
}

console.log('Composable offer browser static regression\n');

// ── 1. Both presentation contexts render distinctly ─────────────────────

const buildYourOwn = mount({ family, context: 'build_your_own' });
check('1a. Build Your Own heading renders', buildYourOwn.textContent.includes('Build Your Own'));
const upgradeYourBuild = mount({ family, context: 'upgrade_your_build' });
check('1b. Upgrade your build heading renders', upgradeYourBuild.textContent.includes('Upgrade your build'));
check('1c. the two contexts render distinct headings', !buildYourOwn.textContent.includes('Upgrade your build'));

const container = buildYourOwn; // primary container for the remaining checks

// ── 2. Policy authorization gates visible rows ───────────────────────────

check('2a. an inclusion absent from customer_policy.items never renders, even though it is on the wire', !container.textContent.includes('Unauthorized Item'));

// ── 4 (part). required row is never offered as a removable browse card ──

check('4a. the required "Hosting" row is never rendered as a browse card at all (never a Remove target)', cardByLabel(container, 'Hosting') === null);

// ── 3. Category/Service filtering, Featured-first sort, max-six paging ──

check('3a. exactly 6 optional cards render on page 1 (7 eligible, PAGE_SIZE=6)', cardLabels(container).length === 6);
// "Zzz Priority Support" is deliberately named to sort LAST alphabetically
// — under Featured-first sort (default) it must still appear FIRST, on
// page 1, proving Featured actually took effect rather than coincidentally
// matching alphabetical order.
check('3b. Featured-first sort (default): the featured item sorts first, at index 0 of page 1', cardLabels(container)[0] === 'Zzz Priority Support');

const sortSelect = container.querySelector('.cz-package-builder__composable-filters select');
sortSelect.value = 'name';
sortSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
await sleep(20);
check('3c. switching Sort to Name reorders alphabetically: the featured item now sorts LAST, off page 1 entirely', !cardLabels(container).includes('Zzz Priority Support') && cardLabels(container)[0] === 'Backup Mirror');
// Reset for later steps.
sortSelect.value = 'featured';
sortSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
await sleep(20);

const [categoryInput] = container.querySelectorAll('.cz-package-builder__composable-filter input');
setValue(categoryInput, 'Support');
await sleep(20);
check('3d. filtering Category to "Support" narrows the grid to Support-category items only', cardLabels(container).every((label) => ['Monitoring', 'Firewall', 'Zzz Priority Support'].includes(label)));
check('3e. a Compute-category item is excluded by the Category filter', !cardLabels(container).includes('Extra Seats'));
setValue(categoryInput, '');
await sleep(20);

const pager = container.querySelector('.cz-package-builder__composable-pager');
const nextButton = [...pager.querySelectorAll('button')][1];
nextButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check('3f. paging to page 2 shows the 7th eligible item', cardLabels(container).length === 1);
const prevButton = [...pager.querySelectorAll('button')][0];
prevButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
check('3g. paging back to page 1 restores 6 cards', cardLabels(container).length === 6);

// ── 4. Optional Add/Remove including default_selected:true ──────────────

const backupMirrorCard = cardByLabel(container, 'Backup Mirror');
check('4b. a default_selected:true optional item renders with a Remove button (already selected on mount)', [...backupMirrorCard.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Remove'));

postCalls.length = 0;
mockPeriods = [];
const backupMirrorRemoveButton = [...backupMirrorCard.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Remove');
backupMirrorRemoveButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(600); // clears the 400ms debounce
const lastCallAfterRemove = postCalls[postCalls.length - 1];
const backupMirrorChoiceAfterRemove = lastCallAfterRemove?.choice.find((c) => c.item_id === 'backup_mirror');
check('4c. clicking Remove submits an EXPLICIT selected:false for a default_selected:true item — never omitted', backupMirrorChoiceAfterRemove?.selected === false, JSON.stringify(backupMirrorChoiceAfterRemove));

const backupMirrorAddButton = [...backupMirrorCard.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Add');
check('4d. the button now reads Add', backupMirrorAddButton !== undefined);
backupMirrorAddButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(600);
const lastCallAfterAdd = postCalls[postCalls.length - 1];
const backupMirrorChoiceAfterAdd = lastCallAfterAdd?.choice.find((c) => c.item_id === 'backup_mirror');
check('4e. clicking Add again submits an explicit selected:true — the round-trip completes', backupMirrorChoiceAfterAdd?.selected === true, JSON.stringify(backupMirrorChoiceAfterAdd));

// ── 5. Fixed quantity has no selector; configurable quantity honors bounds
//      and causes a debounced preview request ────────────────────────────

check('5a. Backup Mirror (fixed quantity) never renders a quantity input', backupMirrorCard.querySelector('input[type="number"]') === null);

const extraSeatsCard = cardByLabel(container, 'Extra Seats');
check('5b. Extra Seats not selected by default has no quantity input yet', extraSeatsCard.querySelector('input[type="number"]') === null);
const extraSeatsAddButton = [...extraSeatsCard.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Add');
extraSeatsAddButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await sleep(20);
const qtyInput = extraSeatsCard.querySelector('input[type="number"]');
check('5c. once selected, the configurable quantity input appears with the correct min/max/step', qtyInput !== null && qtyInput.min === '1' && qtyInput.max === '10' && qtyInput.step === '1');

postCalls.length = 0;
mockPeriods = [];
setValue(qtyInput, '3');
await sleep(50);
setValue(qtyInput, '4');
await sleep(50);
setValue(qtyInput, '5');
await sleep(600);
check('5d. rapid quantity changes within the debounce window coalesce into exactly ONE preview POST', postCalls.length === 1, `postCalls=${postCalls.length}`);
const finalQtyChoice = postCalls[0]?.choice.find((c) => c.item_id === 'extra_seats');
check('5e. the coalesced request carries the FINAL quantity (5), not an intermediate one', finalQtyChoice?.quantity === 5, JSON.stringify(finalQtyChoice));

// ── 6. No Price Option control exists anywhere in a submitted payload ───

const anyPriceOptionField = postCalls.some((call) => call.choice.some((row) => 'price_option_id' in row));
check('6a. no submitted choice row, across every captured request this run, ever carries a price_option_id field', !anyPriceOptionField);
check('6b. no Price Option selector element exists anywhere in the rendered surface', container.querySelector('select[name*="price_option" i], [class*="price-option" i]') === null);

// ── 7. Server preview result drives the selected card price; ambiguous
//      multi-stream contribution is never summed ────────────────────────

function period(from, to, components) {
  return { from_month: from, to_month: to, components };
}
function component(source, cycle, items, available = true) {
  return { source, billing_cycle: cycle, price: 0, available, items };
}
function item(itemId, quantity, unitPrice, lineTotal) {
  return { item_id: itemId, label: itemId, quantity, price_option_id: null, unit_price: unitPrice, line_total: lineTotal, available: true };
}

mockPeriods = [period(1, null, [component('default', 'monthly', [item('extra_seats', 5, 10, 543)])])];
setValue(qtyInput, '5'); // re-trigger the effect with the same value to force a fresh resolve against the new mockPeriods
await sleep(600);
const extraSeatsPriceEl = extraSeatsCard.querySelector('.cz-package-builder__composable-card-price');
check('7a. the selected card price reflects the server-resolved line_total (543) verbatim — 5*10 would be 50, proving no client-side multiplication', extraSeatsPriceEl.textContent.includes('543'));
check('7b. the resolved price carries no "per unit" fallback label once a real resolve is in effect', !extraSeatsPriceEl.textContent.toLowerCase().includes('per unit'));

mockPeriods = [period(1, null, [
  component('default', 'monthly', [item('extra_seats', 5, 10, 543)]),
  component('CZTL_ONBOARDING', 'one-time', [item('extra_seats', 1, 10, 999)]),
])];
setValue(qtyInput, '6');
await sleep(600);
const extraSeatsAmbiguousText = extraSeatsCard.querySelector('.cz-package-builder__composable-card-price').textContent;
check('7c. extra_seats claimed by two distinct commercial streams falls back to the published base price, never summed (1542) or picked arbitrarily (543 or 999)', !extraSeatsAmbiguousText.includes('1542') && !extraSeatsAmbiguousText.includes('543') && !extraSeatsAmbiguousText.includes('999'));
check('7d. the ambiguous fallback is visibly labeled "per unit"', extraSeatsAmbiguousText.toLowerCase().includes('per unit'));

// ── 8. Renders nothing at all when composable_offer is absent ───────────

const absentFamily = makeFamily(null);
const absentContainer = mount({ family: absentFamily, context: 'build_your_own' });
check('8a. ComposableOfferBrowser renders nothing when composable_offer is absent — no DOM, no error', absentContainer.innerHTML === '');

if (failures.length) {
  console.error(`\nSTATIC VALIDATION FAILED — ${failures.length} check(s)`);
  process.exit(1);
}
console.log('\nAll composable offer browser static validation checks passed.');
