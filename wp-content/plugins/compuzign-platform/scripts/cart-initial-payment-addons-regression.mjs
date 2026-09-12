// Cart Initial Payment must include every surviving quoted line's own
// starting charges — primary, add-on, and composable/Upgrade Edition alike.
//
// Live defect (2026-09-10): a KAIROS primary + KAIROS add-on are quoted, the
// primary is later replaced by an OMNIA primary, the KAIROS add-on correctly
// survives in the cart — and Initial Payment silently stopped including that
// surviving add-on's starting charge.
//
// Root cause: QuoteTotalsPresentation() derives `primaryFamilyTierItems`
// (non-add-on only) for the Total Contract Value sum, which is a deliberate
// finite-contract policy, and then REUSED that same primary-only set as the
// input to startingPaymentsByCycle(). startingPaymentsByCycle() is itself a
// generic multi-item helper — each item's own earliest startMonth, same-cycle
// aggregation only — so the omission was purely in the caller.
//
// The fix passes the whole `familyTierItems` set to the Initial Payment
// derivation while leaving TCV's primary-only eligibility exactly as it was.
//
// This mounts the REAL exported QuoteTotalsPresentation via happy-dom +
// Preact's own render() — bundled with vite's own esbuild, the same technique
// scripts/tier-system-footer-loop-regression.mjs already uses. Nothing is
// faked: no network boundary exists in this component, so the component,
// startingPaymentsByCycle(), computeTotalContractValue() and the DOM are all
// the actual shipping code. Asserting rendered text (rather than re-deriving
// the numbers here) is what makes this prove the customer-visible fact.
//
// Usage: npm run regression:cart-initial-payment-addons
//    or: node scripts/cart-initial-payment-addons-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild'); // vite's own esbuild — no new bundler dependency

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-cart-initial-payment-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

// ── DOM shim ─────────────────────────────────────────────────────────────
const window = new Window({ url: 'https://cz-test.local/' });
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

// ── Bundle the REAL component ────────────────────────────────────────────
// One entry re-exporting all three customer surfaces, so a single bundle
// carries the Cart footer, Review & Finalise and the proposal/PDF renderer.
const entry = resolve(root, 'node_modules/.cache/cz-cart-initial-payment-entry.mjs');
writeFileSync(entry, [
  "export { QuoteTotalsPresentation } from '@/components/cost-builder/QuoteSummary';",
  "export { OrderSummary } from '@/components/request-flow/OrderSummary';",
  "export { QuoteProposalPreview } from '@/components/request-flow/QuoteProposalPreview';",
].join('\n'));

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  logLevel: 'silent',
});

const { QuoteTotalsPresentation, OrderSummary, QuoteProposalPreview } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`Cart Initial Payment regression: ${message}`);
}

// ── Fixtures ─────────────────────────────────────────────────────────────
//
// A finite recurring stream, so Total Contract Value stays derivable and this
// script can also prove TCV did NOT change. `occurrenceMonths`/`subtotal` are
// what computeTotalContractValue() reads; `startMonth`/`billingCycle`/`price`
// are what startingPaymentsByCycle() reads.
function leg(partial) {
  const startMonth = partial.startMonth ?? 0;
  const months = partial.months ?? 12;
  const price = partial.price ?? 100;
  return {
    source: partial.source ?? 'Default',
    billingCycle: partial.billingCycle ?? 'monthly',
    price,
    startMonth,
    endMonth: startMonth + months - 1,
    isOngoing: false,
    occurrenceMonths: Array.from({ length: months }, (_, i) => startMonth + i),
    subtotal: price * months,
    ...(partial.overrides ?? {}),
  };
}

function familyItem(partial) {
  return {
    offer_type: 'family_tier',
    familyId: 'pcg_kairos',
    familyPlatformId: 'CZPG-KAIROS01',
    familyTitle: 'KAIROS',
    tierInstanceId: 'ti_kairos',
    tierInstancePlatformId: 'CZTG-KAIROS01',
    tierOccupantId: 'occ_basic',
    tierPlatformId: 'CZT-KAIROS001',
    tierEditionPlatformId: null,
    tierId: 'basic',
    tierTitle: 'KAIROS Basic',
    price: 100,
    billingCycle: 'monthly',
    features: [],
    isAddon: false,
    minimumTermValue: null,
    minimumTermUnit: null,
    planDurationMonths: null,
    legPaymentSummaries: null,
    ...partial,
  };
}

// ── Render harness ───────────────────────────────────────────────────────
const container = document.createElement('div');
document.body.appendChild(container);

function renderTotals(items) {
  render(h(QuoteTotalsPresentation, { items }), container);
  const node = container.querySelector('.cz-quote-summary__initial-payment-amount');
  const label = container.querySelector('.cz-quote-summary__initial-payment-label');
  const tcvAmount = container.querySelector('.cz-quote-summary__contract-value-amount');
  const tcvLabel = container.querySelector('.cz-quote-summary__contract-value-label');
  return {
    initialPayment: node ? node.textContent.trim() : null,
    hasLabel: !!label && label.textContent.trim() === 'Initial Payment',
    contractValue: tcvAmount ? tcvAmount.textContent.trim() : null,
    contractValueLabel: tcvLabel ? tcvLabel.textContent.trim() : null,
    html: container.innerHTML,
  };
}

// The scenarios below use multi-stream items because that is the shape this
// script's own subject (the Initial Payment POPULATION rule) was reported
// against. They no longer need to: since the 2026-09-12 parity correction the
// footer's presentation trigger is "any item carries payment summaries at
// all", not "some item has more than one", so single-stream carts reach the
// same block — see §6 and cart-initial-payment-parity-regression.mjs.
const upfrontPlusMonthly = [
  leg({ source: 'Setup', billingCycle: 'upfront', price: 5000, months: 1 }),
  leg({ source: 'Default', billingCycle: 'monthly', price: 200, months: 12 }),
];

// ── 1. The reported live defect ──────────────────────────────────────────
//
// KAIROS add-on survives after the primary is replaced by OMNIA. Both start
// at their own month 0. Initial Payment must include BOTH.
const omniaPrimary = familyItem({
  familyId: 'pcg_omnia',
  familyPlatformId: 'CZPG-OMNIA001',
  familyTitle: 'OMNIA',
  tierInstanceId: 'ti_omnia',
  tierInstancePlatformId: 'CZTG-OMNIA001',
  tierOccupantId: 'occ_omnia_basic',
  tierPlatformId: 'CZT-OMNIA0001',
  tierTitle: 'Omnia Basic',
  isAddon: false,
  legPaymentSummaries: upfrontPlusMonthly,
});

const survivingKairosAddon = familyItem({
  tierOccupantId: 'occ_backup',
  tierPlatformId: 'CZTA-KAIROS01',
  tierId: 'standard',
  tierTitle: 'Backup & DR Shield',
  isAddon: true,
  legPaymentSummaries: [leg({ source: 'Default', billingCycle: 'monthly', price: 75, months: 12 })],
});

const primaryOnly = renderTotals([omniaPrimary]);
// 5000 upfront + 200 monthly, both at the item's own month 0.
check(primaryOnly.initialPayment === '$5,200', `primary alone starts at $5,200, got ${primaryOnly.initialPayment}`);

const withSurvivingAddon = renderTotals([omniaPrimary, survivingKairosAddon]);
check(
  withSurvivingAddon.initialPayment === '$5,275',
  `the surviving add-on's own $75 start must be included (expected $5,275, got ${withSurvivingAddon.initialPayment})`,
);
check(withSurvivingAddon.hasLabel, 'the Initial Payment block still renders its own label');

// Directional proof: this is exactly the number the primary-only filter
// suppressed. If the filter is ever reintroduced, the figure falls back to
// the primary-only total and this check fails loudly.
check(
  withSurvivingAddon.initialPayment !== primaryOnly.initialPayment,
  'a surviving add-on must change Initial Payment — an identical figure means the primary-only filter is back',
);

// The add-on belongs to a DIFFERENT Family than the current primary. Initial
// Payment must not depend on which Family owns the primary.
check(
  survivingKairosAddon.familyPlatformId !== omniaPrimary.familyPlatformId,
  'the surviving add-on fixture is genuinely from another Family, as the live defect describes',
);

// ── 2. Same-cycle aggregation across primary and add-on ──────────────────
const sameCycleAddon = familyItem({
  tierOccupantId: 'occ_addon_same',
  tierPlatformId: 'CZTA-KAIROS02',
  isAddon: true,
  legPaymentSummaries: [
    leg({ source: 'Setup', billingCycle: 'upfront', price: 1000, months: 1 }),
    leg({ source: 'Default', billingCycle: 'monthly', price: 50, months: 12 }),
  ],
});
const aggregated = renderTotals([omniaPrimary, sameCycleAddon]);
// upfront 5000 + 1000, monthly 200 + 50 — same-cycle streams add, and the
// footer's own presentation step then collapses the buckets into one figure.
check(
  aggregated.initialPayment === '$6,250',
  `same-cycle starting charges aggregate across items (expected $6,250, got ${aggregated.initialPayment})`,
);

// ── 3. A later-starting Leg inside an item is still excluded ─────────────
//
// startingPaymentsByCycle()'s "each item's OWN earliest startMonth" semantics
// must survive the wider input set — widening WHICH items contribute must not
// widen WHICH streams within an item contribute.
const addonWithLaterLeg = familyItem({
  tierOccupantId: 'occ_addon_later',
  tierPlatformId: 'CZTA-KAIROS03',
  isAddon: true,
  legPaymentSummaries: [
    leg({ source: 'Default', billingCycle: 'monthly', price: 75, months: 6, startMonth: 0 }),
    leg({ source: 'Additional Leg', billingCycle: 'monthly', price: 999, months: 6, startMonth: 6 }),
  ],
});
const laterLegExcluded = renderTotals([omniaPrimary, addonWithLaterLeg]);
check(
  laterLegExcluded.initialPayment === '$5,275',
  `a Leg starting in Month 6 must not count toward Initial Payment (expected $5,275, got ${laterLegExcluded.initialPayment})`,
);
check(
  !laterLegExcluded.html.includes('999'),
  'the later-starting Leg amount never reaches the Initial Payment figure',
);

// An item whose OWN earliest start is later than month 0 still contributes
// from its own start — "starting" is per item, never a shared global month 0.
const laterStartingAddon = familyItem({
  tierOccupantId: 'occ_addon_late_start',
  tierPlatformId: 'CZTA-KAIROS04',
  isAddon: true,
  legPaymentSummaries: [leg({ source: 'Default', billingCycle: 'monthly', price: 60, months: 6, startMonth: 3 })],
});
const ownStart = renderTotals([omniaPrimary, laterStartingAddon]);
check(
  ownStart.initialPayment === '$5,260',
  `an item's own earliest start contributes even when it is not month 0 (expected $5,260, got ${ownStart.initialPayment})`,
);

// ── 4. Composable / Upgrade Edition lines contribute ─────────────────────
//
// An Edition-bearing line is the same family_tier shape (FamilyTierAdapter's
// itemFor() builds both from the same path, differing only in which
// commercial_legs it resolved), so it must contribute like any other line.
const composableEdition = familyItem({
  tierOccupantId: 'occ_composable',
  tierPlatformId: 'CZT-KAIROS009',
  tierEditionPlatformId: 'CZTE-KAIROS01',
  tierTitle: 'KAIROS Subscriptions Edition',
  isAddon: false,
  legPaymentSummaries: [leg({ source: 'Edition Default', billingCycle: 'monthly', price: 300, months: 12 })],
});
const withComposable = renderTotals([omniaPrimary, composableEdition, survivingKairosAddon]);
check(
  withComposable.initialPayment === '$5,575',
  `a composable/Upgrade Edition line contributes its own start (expected $5,575, got ${withComposable.initialPayment})`,
);

// ── 5. Total Contract Value policy is unchanged ──────────────────────────
//
// TCV must still be primary-only. The add-on's $900 finite subtotal must NOT
// appear in it, even though that same add-on now contributes to Initial
// Payment — this is the boundary the fix was required to preserve.
const primaryTcv = renderTotals([omniaPrimary]).contractValue;
const tcvWithAddon = renderTotals([omniaPrimary, survivingKairosAddon]).contractValue;
check(
  primaryTcv === tcvWithAddon,
  `Total Contract Value stays primary-only (was ${primaryTcv}, became ${tcvWithAddon} once an add-on was quoted)`,
);
// 5000 upfront + (200 x 12) = 7,400 — primary's own finite contract only. The
// add-on's own finite 75 x 12 = 900 must never join this number.
check(primaryTcv === '$7,400', `the primary's own finite TCV is unchanged (got ${primaryTcv})`);
check(
  tcvWithAddon !== '$8,300',
  'the add-on subtotal must not leak into Total Contract Value',
);

// An add-on alone (no primary) must still produce NO fabricated TCV, while
// still honestly reporting its own Initial Payment.
const addonAlone = renderTotals([familyItem({
  tierOccupantId: 'occ_addon_solo',
  tierPlatformId: 'CZTA-KAIROS05',
  isAddon: true,
  legPaymentSummaries: upfrontPlusMonthly,
})]);
check(
  addonAlone.contractValue === 'Until Cancelled' && addonAlone.contractValueLabel === 'Contract Value',
  `an add-on-only cart never fabricates a $0 Total Contract Value (got ${addonAlone.contractValueLabel} / ${addonAlone.contractValue})`,
);
check(
  addonAlone.initialPayment === '$5,200',
  `an add-on-only cart still reports its own Initial Payment (expected $5,200, got ${addonAlone.initialPayment})`,
);

// ── 6. Neighbouring behavior ─────────────────────────────────────────────
//
// Single-stream cart. This assertion was INVERTED by the 2026-09-12 Cart
// Initial Payment parity correction: it used to require that a single-stream
// cart render NO Initial Payment block, which encoded exactly the assumption
// that work item had to remove ("stream-aware totals are only needed when one
// item has multiple streams"). That assumption is what dropped the composable
// Upgrade's $55 from the live KAIROS cart, because a single resolved stream is
// every bit as authoritative as three. The population rule this script owns —
// primary + add-on + composable, each once — is unaffected either way; only
// the presentation trigger moved. See
// scripts/cart-initial-payment-parity-regression.mjs for that trigger's own
// coverage, and project-work/2026-09-12-cart-initial-payment-parity.md.
const singleStream = renderTotals([familyItem({
  legPaymentSummaries: [leg({ source: 'Default', billingCycle: 'monthly', price: 100, months: 12 })],
})]);
check(
  singleStream.initialPayment === '$100',
  `a single-stream cart now reports its own Initial Payment (expected $100, got ${singleStream.initialPayment})`,
);

// Items with no legPaymentSummaries at all contribute nothing and crash
// nothing — "unknown", never a silent $0 contributor.
const withUnpricedNeighbour = renderTotals([omniaPrimary, familyItem({
  tierOccupantId: 'occ_no_legs',
  tierPlatformId: 'CZT-KAIROS777',
  legPaymentSummaries: null,
})]);
check(
  withUnpricedNeighbour.initialPayment === '$5,200',
  `an item with no payment streams contributes nothing (expected $5,200, got ${withUnpricedNeighbour.initialPayment})`,
);

// A legacy (non-family_tier) Service line is not a family_tier item and must
// not reach the family-tier derivation at all.
const withLegacyService = renderTotals([omniaPrimary, {
  serviceId: 101,
  serviceTitle: 'Legacy Service',
  tierId: 'basic',
  tierTitle: 'Basic',
  price: 20,
  billingCycle: 'monthly',
  categoryName: 'Managed IT',
  features: [],
  isAddon: false,
  minimumTermValue: null,
  minimumTermUnit: null,
}]);
check(
  withLegacyService.initialPayment === '$5,200',
  `a legacy Service line never enters Initial Payment (expected $5,200, got ${withLegacyService.initialPayment})`,
);

// An empty cart renders without an Initial Payment block and without throwing.
const empty = renderTotals([]);
check(empty.initialPayment === null, 'an empty cart renders no Initial Payment block');

// ── 7. Every customer surface agrees on the same figure ──────────────────
//
// Initial Payment is one whole-quote fact. The Cart footer, Review & Finalise
// (OrderSummary) and the proposal/PDF renderer (QuoteProposalPreview, which
// is also the standalone customer Quote View) each derive it independently
// from the same primitives, so all three must land on the same number for the
// same cart. Correcting only one of them would ship a visible customer-state
// split — the exact failure mode this section guards.
//
// Each is mounted as the real component; the figure is read back out of the
// rendered DOM by locating the row labelled "Initial Payment", never by
// re-deriving the arithmetic in this script.
const CONTACT = { company: 'Acme', contact: 'Sam Rivers', email: 's@acme.test', phone: '', notes: '' };

// Reads one surface's OWN Initial Payment row, in its own fresh container.
//
// Both precautions were added by the 2026-09-12 parity correction after this
// helper was found to be asserting nothing: it rendered into the shared
// `container` that renderTotals() had just filled, and matched any div whose
// text began with the label. So it could read the CART's leftover row, or the
// QuoteProposalPreview that OrderSummary renders inside itself as its print
// clone, and report either as the surface under test. Deleting OrderSummary's
// Initial Payment row outright still passed this file before the fix.
function initialPaymentFromRendered(vnode, rowClass, labelClass, amountClass) {
  const surfaceContainer = document.createElement('div');
  document.body.appendChild(surfaceContainer);
  render(vnode, surfaceContainer);
  let found = null;
  for (const row of surfaceContainer.querySelectorAll(`.${rowClass}`)) {
    const label = row.querySelector(`.${labelClass}`);
    if (!label || label.textContent.trim() !== 'Initial Payment') continue;
    const amount = row.querySelector(`.${amountClass}`);
    found = amount ? amount.textContent.trim() : null;
  }
  render(null, surfaceContainer);
  surfaceContainer.remove();
  return found;
}

const surfaceCart = [omniaPrimary, survivingKairosAddon];

const cartFigure = renderTotals(surfaceCart).initialPayment;
const reviewFigure = initialPaymentFromRendered(h(OrderSummary, {
  items: surfaceCart,
  services: [],
  contact: CONTACT,
  quoteRef: 'CZ-TEST01',
  quoteDate: '2026-09-10',
  step: 'review',
  submitState: 'idle',
  canSubmit: true,
  onSubmit: () => {},
  onPrint: () => {},
}), 'cz-os__total-row', 'cz-os__total-label', 'cz-os__total-amount');
const proposalFigure = initialPaymentFromRendered(h(QuoteProposalPreview, {
  items: surfaceCart,
  services: [],
  contact: CONTACT,
  quoteDate: '2026-09-10',
  quoteRef: 'CZ-TEST01',
}), 'cz-proposal__total-row', 'cz-proposal__total-label', 'cz-proposal__total-amount');

check(cartFigure === '$5,275', `Cart footer figure (got ${cartFigure})`);
check(
  reviewFigure === '$5,275',
  `Review & Finalise must include the surviving add-on's own start (expected $5,275, got ${reviewFigure})`,
);
check(
  proposalFigure === '$5,275',
  `the proposal/PDF renderer must include it too (expected $5,275, got ${proposalFigure})`,
);
check(
  cartFigure === reviewFigure && reviewFigure === proposalFigure,
  `all three customer surfaces must agree (cart ${cartFigure}, review ${reviewFigure}, proposal ${proposalFigure})`,
);

// The same three surfaces must also agree when a composable/Upgrade line is
// present alongside primary and add-on.
const composableCart = [omniaPrimary, composableEdition, survivingKairosAddon];
const cartComposable = renderTotals(composableCart).initialPayment;
const reviewComposable = initialPaymentFromRendered(h(OrderSummary, {
  items: composableCart,
  services: [],
  contact: CONTACT,
  quoteRef: 'CZ-TEST01',
  quoteDate: '2026-09-10',
  step: 'review',
  submitState: 'idle',
  canSubmit: true,
  onSubmit: () => {},
  onPrint: () => {},
}), 'cz-os__total-row', 'cz-os__total-label', 'cz-os__total-amount');
const proposalComposable = initialPaymentFromRendered(h(QuoteProposalPreview, {
  items: composableCart,
  services: [],
  contact: CONTACT,
  quoteDate: '2026-09-10',
  quoteRef: 'CZ-TEST01',
}), 'cz-proposal__total-row', 'cz-proposal__total-label', 'cz-proposal__total-amount');
check(
  cartComposable === '$5,575' && reviewComposable === '$5,575' && proposalComposable === '$5,575',
  `primary + composable + add-on agrees across surfaces (cart ${cartComposable}, review ${reviewComposable}, proposal ${proposalComposable})`,
);

render(null, container);

console.log(`Cart Initial Payment regression: ${checks} checks passed.`);
