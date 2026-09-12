// Cart Initial Payment must agree with Total Commitment whenever the quoted
// Family Tier lines carry authoritative payment summaries — including when
// every one of them has exactly ONE stream.
//
// Live defect (project-work/2026-09-12-cart-initial-payment-parity.md): a
// KAIROS cart of three single-stream lines — Business Pro $675 Monthly, the
// composable Upgrades line $55 Monthly, Backup & DR Shield $580 Monthly —
// showed "Est. monthly total $1,255 + 1 item at custom pricing" in the Cart
// footer while the Total Commitment overlay showed Initial Payment $1,310.
// $675 + $55 + $580 = $1,310, so the overlay was right and the Cart was
// silently dropping the Upgrade's $55.
//
// Root cause was the Cart footer's BRANCH TRIGGER, not the payment helper.
// QuoteTotalsPresentation() only reached its stream-aware presentation when
// some item had MORE THAN one stream; otherwise it fell back to
// calcQuoteTotals(), which buckets each item's flat `price`/`billingCycle`.
// The composable Upgrade's flat price is null by construction
// (ComposableOfferBrowser.tsx: `headline?.price ?? null`) even though its
// legPaymentSummaries correctly carry $55 Monthly — so calcQuoteTotals()
// classified it as unpriced ("1 item at custom pricing") and dropped it.
// Total Commitment has no such gate, which is exactly why the two disagreed.
//
// The fix asks whether authoritative summaries EXIST (>= 1 stream) rather
// than whether any item is internally complex (> 1 stream). A genuinely
// legacy line — a Cost Builder QuoteItem, which never has the field, or a
// pre-Phase-5 cart entry — still has none and still takes the flat path.
//
// This mounts the REAL exported QuoteTotalsPresentation AND the REAL
// QuoteDetailsOverlay (opened on Total Commitment) via happy-dom + Preact's
// own render(), bundled with vite's own esbuild — the same technique
// scripts/cart-initial-payment-addons-regression.mjs already uses. Both
// figures are read out of rendered DOM rather than re-derived here, which is
// what makes "they agree" a customer-visible proof rather than a tautology.
//
// Usage: npm run regression:cart-initial-payment-parity
//    or: node scripts/cart-initial-payment-parity-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild'); // vite's own esbuild — no new bundler dependency

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-cart-initial-payment-parity-bundle.mjs');
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

// ── Bundle the REAL components ───────────────────────────────────────────
// Both sides of the parity claim in one bundle: the Cart footer and the
// Total Commitment overlay it must agree with.
const entry = resolve(root, 'node_modules/.cache/cz-cart-initial-payment-parity-entry.mjs');
writeFileSync(entry, [
  "export { QuoteTotalsPresentation } from '@/components/cost-builder/QuoteSummary';",
  "export { QuoteDetailsOverlay } from '@/components/package-builder/QuoteDetailsOverlay';",
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

const { QuoteTotalsPresentation, QuoteDetailsOverlay, OrderSummary, QuoteProposalPreview } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`Cart Initial Payment parity regression: ${message}`);
}

// ── Fixtures ─────────────────────────────────────────────────────────────
//
// Ongoing monthly streams, matching the live KAIROS cart: no fixed end date,
// so Total Contract Value stays "Until Cancelled" on both surfaces and this
// script proves the Initial Payment fix did not fabricate a contract total.
function monthlyLeg(price, source = 'Default') {
  return {
    source,
    billingCycle: 'monthly',
    price,
    startMonth: 0,
    endMonth: null,
    isOngoing: true,
    occurrenceMonths: [0],
    subtotal: null,
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
    tierOccupantId: 'occ_business_pro',
    tierPlatformId: 'CZT-KAIROS001',
    tierEditionPlatformId: null,
    tierId: 'business_pro',
    tierTitle: 'Business Pro',
    tierEditionTitle: null,
    price: 675,
    billingCycle: 'monthly',
    features: [],
    inclusionItems: [],
    isAddon: false,
    minimumTermValue: null,
    minimumTermUnit: null,
    planDurationMonths: null,
    legPaymentSummaries: null,
    ...partial,
  };
}

// The three live lines. Each carries exactly ONE stream — that is the whole
// point: under the old > 1 trigger none of them qualified.
const businessPro = familyItem({
  legPaymentSummaries: [monthlyLeg(675)],
});

// The composable Upgrade, built the way ComposableOfferBrowser.tsx builds it:
// isComposable, non-add-on, and a NULL flat price with real streams beside it.
// The null price is what calcQuoteTotals() mistook for "custom pricing".
const upgrades = familyItem({
  tierOccupantId: 'occ_composable',
  tierPlatformId: 'CZT-KAIROSC01',
  tierId: 'composable',
  tierTitle: 'Build Your Own',
  price: null,
  billingCycle: '',
  isAddon: false,
  isComposable: true,
  legPaymentSummaries: [monthlyLeg(55)],
});

const backupShield = familyItem({
  tierOccupantId: 'occ_backup',
  tierPlatformId: 'CZTA-KAIROS01',
  tierId: 'backup_dr',
  tierTitle: 'Backup & DR Shield',
  price: 580,
  isAddon: true,
  legPaymentSummaries: [monthlyLeg(580)],
});

const liveCart = [businessPro, upgrades, backupShield];

// ── Render harnesses ─────────────────────────────────────────────────────
const container = document.createElement('div');
document.body.appendChild(container);

function renderCart(items) {
  render(h(QuoteTotalsPresentation, { items }), container);
  const amount = container.querySelector('.cz-quote-summary__initial-payment-amount');
  const label = container.querySelector('.cz-quote-summary__initial-payment-label');
  const tcvAmount = container.querySelector('.cz-quote-summary__contract-value-amount');
  const tcvLabel = container.querySelector('.cz-quote-summary__contract-value-label');
  const totalLabel = container.querySelector('.cz-quote-summary__total-label');
  const customNote = container.querySelector('.cz-quote-summary__custom-note');
  return {
    initialPayment: amount ? amount.textContent.trim() : null,
    hasLabel: !!label && label.textContent.trim() === 'Initial Payment',
    contractValue: tcvAmount ? tcvAmount.textContent.trim() : null,
    contractValueLabel: tcvLabel ? tcvLabel.textContent.trim() : null,
    totalLabel: totalLabel ? totalLabel.textContent.trim() : null,
    customNote: customNote ? customNote.textContent.trim() : null,
  };
}

// The real overlay, opened directly on Total Commitment (initialTarget
// 'cart'). families/tiers are empty on purpose: resolvePlanDetails() then
// falls back to each item's own quoted tierTitle, which is exactly the
// snapshot identity this figure is supposed to read, and keeps the fixture
// free of catalogue data that has nothing to do with the sum under test.
const overlayContainer = document.createElement('div');
document.body.appendChild(overlayContainer);

function renderTotalCommitment(items) {
  render(
    h(QuoteDetailsOverlay, { items, families: [], tiers: [], initialTarget: 'cart', onClose: () => {} }),
    overlayContainer,
  );
  const rows = [...overlayContainer.querySelectorAll('.cz-package-builder__commitment-row')];
  const initialRow = rows.find((row) => row.textContent.includes('Initial Payment'));
  const contractRow = rows.find((row) => row.textContent.includes('Contract Value'));
  return {
    initialPayment: initialRow ? initialRow.querySelectorAll('span')[1].textContent.trim() : null,
    contractValue: contractRow ? contractRow.querySelectorAll('span')[1].textContent.trim() : null,
  };
}

// ── 1. The reported live defect ──────────────────────────────────────────

const cart = renderCart(liveCart);
check(
  cart.initialPayment === '$1,310',
  `three single-stream lines must total $675 + $55 + $580 = $1,310 (got ${cart.initialPayment})`,
);
check(cart.hasLabel, 'the Cart renders the Initial Payment block for a single-stream cart');

// The exact symptom Nath reported: the flat-price fallback's own labels must
// no longer be what this cart renders.
check(
  cart.totalLabel === null,
  `the flat "Est. monthly total" label must no longer render for a stream-priced cart (got ${cart.totalLabel})`,
);
// Note: .cz-quote-summary__custom-note is shared with the Until Cancelled
// branch's own "Includes charges without a fixed end date." explainer, so
// this asserts the custom-pricing WORDING is gone rather than the element.
check(
  !(cart.customNote ?? '').includes('custom pricing'),
  `the Upgrade must no longer be reported as "at custom pricing" (got ${cart.customNote})`,
);

// ── 2. Parity across every customer-facing surface ───────────────────────
//
// The Cart, Total Commitment, Review & Finalise and the proposal/PDF each
// derive this figure independently, and each of the last three carried its own
// copy of the same `> 1` trigger. Correcting one alone would ship a visible
// customer-state split — a quote approved at one number and printed at
// another — so all of them are proved here against the SAME cart.
//
// The proposal renderer is also what the standalone customer Quote View
// mounts (the "view/print quote" link in the email — see §2b), so fixing it
// fixes that surface too.
const CONTACT = { company: 'Acme', contact: 'Sam Rivers', email: 's@acme.test', phone: '', notes: '' };

// Reads the figure back out of rendered DOM by locating the row labelled
// "Initial Payment" — never by re-deriving the arithmetic in this script.
// Innermost matching row wins, since an ancestor also "starts with" the label
// once it is the first thing inside it.
//
// Each surface gets a FRESH container. Rendering successive surfaces into one
// shared node let a previous surface's row survive in the DOM and be scraped as
// though it belonged to the current one — which silently masked a real failure
// while this script was being written: reverting OrderSummary's trigger still
// "passed", because the Cart's own $1,310 row was still sitting in the node.
// `rowClass`/`labelClass`/`amountClass` scope the read to the surface's OWN
// totals row. This matters more than it looks: OrderSummary renders a
// QuoteProposalPreview inside itself as the print clone, so a loose
// "any div whose text starts with Initial Payment" scrape reads the nested
// proposal's row and reports it as Review & Finalise's own. That masked a real
// failure while this script was being written — reverting OrderSummary's
// trigger still "passed", on the nested proposal's figure.
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

const overlay = renderTotalCommitment(liveCart);
check(
  overlay.initialPayment === '$1,310',
  `Total Commitment reads the same $1,310 from the same summaries (got ${overlay.initialPayment})`,
);

const reviewFigure = initialPaymentFromRendered(h(OrderSummary, {
  items: liveCart,
  services: [],
  contact: CONTACT,
  quoteRef: 'CZ-KAIROS1',
  quoteDate: '2026-09-12',
  step: 'review',
  submitState: 'idle',
  canSubmit: true,
  onSubmit: () => {},
  onPrint: () => {},
}), 'cz-os__total-row', 'cz-os__total-label', 'cz-os__total-amount');
check(
  reviewFigure === '$1,310',
  `Review & Finalise reports the same $1,310 (got ${reviewFigure})`,
);

const proposalFigure = initialPaymentFromRendered(h(QuoteProposalPreview, {
  items: liveCart,
  services: [],
  contact: CONTACT,
  quoteDate: '2026-09-12',
  quoteRef: 'CZ-KAIROS1',
}), 'cz-proposal__total-row', 'cz-proposal__total-label', 'cz-proposal__total-amount');
check(
  proposalFigure === '$1,310',
  `the proposal/PDF — and so the emailed Quote View — reports the same $1,310 (got ${proposalFigure})`,
);

check(
  cart.initialPayment === overlay.initialPayment
    && cart.initialPayment === reviewFigure
    && cart.initialPayment === proposalFigure,
  `every surface must agree (Cart ${cart.initialPayment}, Total Commitment ${overlay.initialPayment}, Review ${reviewFigure}, proposal ${proposalFigure})`,
);

// ── 2b. The Quote View reached from the email ────────────────────────────
//
// Nath reported the same wrong figure on the "view/print quote" page opened
// from the customer email. That page has no totals logic of its own: it
// renders QuoteProposalPreview, already proved above. Asserted as a source
// fact rather than mounted, because QuoteViewApp's own job is the authenticated
// read boundary (fetch + secret handling), which has nothing to do with this
// figure and cannot be exercised without standing that boundary up. If it ever
// grows its own totals renderer, this check fails and the parity claim above
// stops silently covering it.
const quoteViewSource = readFileSync(
  resolve(root, 'resources/ts/components/quote-view/QuoteViewApp.tsx'),
  'utf8',
);
check(
  /import \{ QuoteProposalPreview \} from '@\/components\/request-flow\/QuoteProposalPreview';/.test(quoteViewSource)
    && /<QuoteProposalPreview/.test(quoteViewSource),
  'the standalone Quote View still renders QuoteProposalPreview, so the proposal figure proved above is the one the emailed link shows',
);
// The whole defect was these two surfaces disagreeing, so prove they agree on
// the ongoing-contract answer too, not only on the one number under test.
check(
  cart.contractValue === 'Until Cancelled' && overlay.contractValue === 'Until Cancelled',
  `both surfaces still report an ongoing contract as Until Cancelled (Cart ${cart.contractValue}, overlay ${overlay.contractValue})`,
);

// Directional proof: $1,255 is precisely the wrong number the old trigger
// produced. If the > 1 gate is ever reintroduced, this fails loudly with it.
check(
  cart.initialPayment !== '$1,255',
  'the Cart must not fall back to the flat $1,255 that omitted the composable Upgrade',
);

// ── 3. A single stream is enough, on its own ─────────────────────────────
//
// The narrowest statement of the corrected rule, and the assertion
// cart-initial-payment-addons-regression.mjs §6 previously made in reverse.
const loneSingleStream = renderCart([businessPro]);
check(
  loneSingleStream.initialPayment === '$675',
  `one single-stream item alone still reports its own Initial Payment (expected $675, got ${loneSingleStream.initialPayment})`,
);

// ── 4. Legacy compatibility — no summaries, no stream-aware presentation ──
//
// The flat path must survive exactly where it is still the only truth
// available: Cost Builder QuoteItems (which never carry the field) and
// pre-Phase-5 Family entries.
const legacyCostBuilderItem = {
  offer_type: 'service',
  serviceId: 'svc_backup',
  serviceTitle: 'Managed Backup',
  tierTitle: 'Standard',
  price: 300,
  billingCycle: 'monthly',
  isAddon: false,
  features: [],
};

const legacyOnly = renderCart([legacyCostBuilderItem]);
check(
  legacyOnly.initialPayment === null,
  'a cart with no payment summaries at all renders no Initial Payment block',
);
check(
  legacyOnly.totalLabel === 'Est. monthly total',
  `and keeps the flat "Est. monthly total" presentation (got ${legacyOnly.totalLabel})`,
);

const legacyFamilyItem = familyItem({
  tierOccupantId: 'occ_legacy',
  tierPlatformId: 'CZT-KAIROS999',
  tierTitle: 'Legacy Entry',
  legPaymentSummaries: null,
});
const legacyFamilyOnly = renderCart([legacyFamilyItem]);
check(
  legacyFamilyOnly.initialPayment === null,
  'a pre-Phase-5 Family entry with no summaries also keeps the flat path',
);

// ── 5. Mixed legacy + stream-priced ──────────────────────────────────────
//
// Explicit, because this is the case where the widened trigger changes what a
// mixed cart shows. Once ANY line carries authoritative summaries the cart is
// presented under the stream-aware model, and a no-summary line contributes
// nothing to Initial Payment rather than a silent $0 — "unknown", never zero.
// This is the pre-existing behavior of the old multi-stream branch, now
// reached by more carts; it is asserted here so the consequence is recorded
// rather than discovered later.
const mixed = renderCart([businessPro, legacyFamilyItem, legacyCostBuilderItem]);
check(
  mixed.initialPayment === '$675',
  `a no-summary neighbour contributes nothing to Initial Payment (expected $675, got ${mixed.initialPayment})`,
);
check(
  mixed.hasLabel,
  'and the stream-priced line still drives the stream-aware presentation for the cart',
);

console.log(`Cart Initial Payment parity regression: ${checks} checks passed.`);
