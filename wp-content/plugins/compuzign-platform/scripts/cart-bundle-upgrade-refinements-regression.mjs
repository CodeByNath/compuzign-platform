// Cart Bundle + Upgrade refinements
// (project-work/2026-09-10-cart-bundle-and-upgrade-refinements.md).
//
// Two independent live defects, proven here against the REAL shipping code:
//
// Issue 1 — Bundle children in the compact disclosures. Cart quick view and
// the Total Commitment disclosure rendered Bundle children as "Contact Us"
// and produced "Total $NaN", while the established View Details renderer
// (PlanDetailsModal's own table) correctly shows children as Included and
// totals only the priced Bundle parent. InclusionDisclosurePanel already
// received row.isChild but ignored it for the money columns, and its priced
// test was `lineTotal !== null` — so a snapshot row whose lineTotal key is
// absent (undefined, not null) counted as priced: formatPrice(undefined)
// renders the "Contact Us" placeholder, and reducing undefined yields NaN.
//
// Issue 2 — replaceFamilyNormalQuoteItem() dropped the composable/Upgrade
// line whenever tierOccupantId or tierEditionPlatformId changed. The rule is
// now simply that an Upgrade belongs to the FAMILY, not the selected
// Tier/Edition, so a same-Family Tier or Edition swap must preserve it
// exactly — same snapshot object, nothing repriced or rebuilt.
//
// The panel is mounted for real (happy-dom + Preact's own render, bundled
// with vite's own esbuild — the technique tier-system-footer-loop-regression
// .mjs already established) and asserted through the rendered DOM, because
// "Contact Us"/"$NaN" are rendering facts. The cart helpers are pure, so they
// are exercised directly.
//
// The Recommendations CTA suppression lives in FamilyTierAdapter, which
// carries too much live-fetched Family/pricing state to instantiate in a
// script — the same limitation composable-recommendations-cta-contract.ts
// already documents — so that half is locked there as a source fact instead.
//
// Usage: npm run regression:cart-bundle-upgrade-refinements

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-cart-bundle-upgrade-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

const window = new Window({ url: 'https://cz-test.local/' });
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const entry = resolve(root, 'node_modules/.cache/cz-cart-bundle-upgrade-entry.mjs');
writeFileSync(entry, [
  "export { InclusionDisclosurePanel } from '@/components/cost-builder/InclusionDisclosure';",
  "export { replaceFamilyNormalQuoteItem, upsertFamilyComposableQuoteItem, upsertFamilyAddonQuoteItem, removeFamilyTierSystemQuoteItems, resolveQuoteItemRole } from '@/utils/quote';",
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

const {
  InclusionDisclosurePanel,
  replaceFamilyNormalQuoteItem,
  upsertFamilyComposableQuoteItem,
  upsertFamilyAddonQuoteItem,
  removeFamilyTierSystemQuoteItems,
  resolveQuoteItemRole,
  OrderSummary,
  QuoteProposalPreview,
} = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');

let checks = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`Cart bundle/upgrade regression: ${message}`);
}

// ── Issue 1: Bundle children in the compact disclosure ───────────────────

const container = document.createElement('div');
document.body.appendChild(container);

function renderPanel(rows) {
  render(h(InclusionDisclosurePanel, { rows }), container);
  const bodyRows = [...container.querySelectorAll('tbody tr')].map((tr) => {
    const cells = [...tr.querySelectorAll('td')].map((td) => td.textContent.trim());
    return { cells, isChildLabel: !!tr.querySelector('.cz-inclusion-disclosure__label--child') };
  });
  const totalEl = container.querySelector('.cz-inclusion-disclosure__total');
  return {
    rows: bodyRows,
    total: totalEl ? totalEl.textContent.replace('Total', '').trim() : null,
    html: container.innerHTML,
  };
}

// The reported shape: a priced Bundle parent with unpriced children. The
// children carry `undefined` for the money fields — exactly what a persisted
// cartBreakdown snapshot delivers when those keys are simply absent, which is
// what produced Contact Us/NaN.
const bundleRows = [
  { id: 'parent', label: 'Security Bundle', quantity: 1, unitPrice: 4000, lineTotal: 4000, isChild: false },
  { id: 'parent:child:0', label: 'Endpoint Protection', quantity: 25, unitPrice: undefined, lineTotal: undefined, isChild: true },
  { id: 'parent:child:1', label: 'SIEM Monitoring', quantity: null, unitPrice: undefined, lineTotal: undefined, isChild: true },
];

const bundle = renderPanel(bundleRows);
check(bundle.rows.length === 3, `the Bundle parent and both children all render (got ${bundle.rows.length} rows)`);
check(bundle.rows[0].cells[2] === '$4,000' && bundle.rows[0].cells[3] === '$4,000',
  `the Bundle parent keeps its own resolved Unit price / Line total (got ${bundle.rows[0].cells[2]} / ${bundle.rows[0].cells[3]})`);
for (const index of [1, 2]) {
  check(bundle.rows[index].cells[2] === 'Included' && bundle.rows[index].cells[3] === 'Included',
    `Bundle child row ${index} reads Included in both money columns (got ${bundle.rows[index].cells[2]} / ${bundle.rows[index].cells[3]})`);
  check(bundle.rows[index].isChildLabel, `Bundle child row ${index} keeps its existing child-label indent`);
}
check(!bundle.html.includes('Contact Us'), 'no Bundle child renders the Contact Us placeholder');
check(bundle.total === '$4,000', `the Total counts only the priced Bundle parent (expected $4,000, got ${bundle.total})`);
check(!bundle.html.includes('NaN'), 'the rendered panel contains no NaN anywhere');

// A child that somehow DOES carry a resolved number is still Included and
// still out of the Total — a child is never independently billed.
const pricedChild = renderPanel([
  { id: 'p', label: 'Security Bundle', quantity: 1, unitPrice: 4000, lineTotal: 4000, isChild: false },
  { id: 'p:c', label: 'Endpoint Protection', quantity: 25, unitPrice: 12, lineTotal: 300, isChild: true },
]);
check(pricedChild.rows[1].cells[3] === 'Included', 'a Bundle child with a resolved lineTotal still reads Included');
check(pricedChild.total === '$4,000', `a Bundle child never joins the Total (expected $4,000, got ${pricedChild.total})`);

// Genuine NON-Bundle unresolved pricing is preserved exactly: blank cells,
// excluded from the Total, never mapped to Included.
const unresolved = renderPanel([
  { id: 'a', label: 'Managed Firewall', quantity: 1, unitPrice: 250, lineTotal: 250, isChild: false },
  { id: 'b', label: 'Custom Integration', quantity: null, unitPrice: null, lineTotal: null, isChild: false },
]);
check(unresolved.rows[1].cells[2] === '' && unresolved.rows[1].cells[3] === '',
  'a genuinely unresolved NON-Bundle row still renders blank money cells');
check(!unresolved.html.includes('Included'), 'unknown values are never globally mapped to Included');
check(unresolved.total === '$250', `an unresolved non-Bundle row stays out of the Total (expected $250, got ${unresolved.total})`);

// Ordinary priced rows still sum normally — the Total was not disabled.
const plainTotal = renderPanel([
  { id: 'a', label: 'Seats', quantity: 2, unitPrice: 40, lineTotal: 80, isChild: false },
  { id: 'b', label: 'Backup', quantity: 1, unitPrice: 20, lineTotal: 20, isChild: false },
]);
check(plainTotal.total === '$100', `ordinary priced rows still total normally (expected $100, got ${plainTotal.total})`);

// Sectioned (Commercial Leg) rendering keeps its own per-section subtotals
// and shows no combined grand total — unchanged behavior.
const sectioned = renderPanel([
  { id: 's1', label: 'Block Storage', quantity: 1, unitPrice: 80, lineTotal: 80, isChild: false, sectionKey: 'extension:0', sectionLabel: 'Month 11–Indefinite · Yearly', sectionSubtotal: '$80.00 / yr' },
]);
check(sectioned.total === null, 'a sectioned disclosure still shows no combined grand total');

render(null, container);

// ── Issue 2: an Upgrade belongs to the Family, not the Tier/Edition ──────

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
    tierEditionPlatformId: 'CZTE-KAIROS001',
    tierId: 'basic',
    tierTitle: 'KAIROS Basic',
    price: 10,
    billingCycle: 'monthly',
    features: [],
    isAddon: false,
    minimumTermValue: null,
    minimumTermUnit: null,
    ...partial,
  };
}

const primaryA = familyItem({});
const addon = familyItem({ tierOccupantId: 'occ_backup', tierPlatformId: 'CZTA-KAIROS01', isAddon: true });
const upgrade = familyItem({
  tierOccupantId: 'occ_composable',
  tierPlatformId: 'CZT-KAIROS099',
  tierId: 'composable',
  tierTitle: 'Build Your Own',
  isComposable: true,
  composableSelection: [{ item_id: 'block-storage', selected: true }],
  price: 25,
});

let cart = replaceFamilyNormalQuoteItem([], primaryA);
cart = upsertFamilyAddonQuoteItem(cart, addon);
cart = upsertFamilyComposableQuoteItem(cart, upgrade);
check(cart.length === 3, 'primary + add-on + Upgrade all coexist');
check(resolveQuoteItemRole(upgrade) === 'composable', 'the Upgrade fixture really is the composable role');

// Tier A -> Tier B (different occupant): Upgrade preserved, exact snapshot.
const primaryB = familyItem({ tierOccupantId: 'occ_premium', tierPlatformId: 'CZT-KAIROS002', tierId: 'premium', tierTitle: 'KAIROS Premium' });
const afterTierSwap = replaceFamilyNormalQuoteItem(cart, primaryB);
check(afterTierSwap.includes(primaryB) && !afterTierSwap.includes(primaryA), 'a Tier swap still replaces the primary itself');
check(afterTierSwap.includes(upgrade), 'a Tier swap PRESERVES the existing Upgrade line');
check(afterTierSwap.find((i) => i === upgrade) === upgrade, 'the preserved Upgrade is the exact same snapshot object after a Tier swap');
check(afterTierSwap.find((i) => i === upgrade).price === 25, 'the preserved Upgrade was not repriced');
check(afterTierSwap.find((i) => i === upgrade).composableSelection === upgrade.composableSelection, 'the preserved Upgrade keeps its own selection snapshot by reference');
check(afterTierSwap.find((i) => i === upgrade).tierOccupantId === 'occ_composable', 'the preserved Upgrade was never reattached to the new primary occupant');
check(afterTierSwap.includes(addon), 'a Tier swap still preserves the add-on');

// Edition A -> Edition B (same occupant): Upgrade preserved.
const primaryEditionB = familyItem({ tierEditionPlatformId: 'CZTE-KAIROS002' });
const afterEditionSwap = replaceFamilyNormalQuoteItem(cart, primaryEditionB);
check(afterEditionSwap.includes(upgrade), 'an Edition swap PRESERVES the existing Upgrade line');
check(afterEditionSwap.find((i) => i === upgrade) === upgrade, 'the preserved Upgrade is the exact same snapshot object after an Edition swap');
check(afterEditionSwap.includes(primaryEditionB) && !afterEditionSwap.includes(primaryA), 'an Edition swap still replaces the primary itself');

// Repeated swaps do not accumulate or lose the Upgrade.
const afterTwoSwaps = replaceFamilyNormalQuoteItem(afterTierSwap, familyItem({ tierOccupantId: 'occ_enterprise', tierPlatformId: 'CZT-KAIROS003' }));
check(afterTwoSwaps.filter((i) => i === upgrade).length === 1, 'repeated swaps keep exactly one Upgrade line, never duplicated or dropped');

// The no-orphan invariant still holds: removing the whole Tier System
// cascades to the Upgrade, and a swap always leaves a primary behind.
const afterRemoval = removeFamilyTierSystemQuoteItems(afterTierSwap, 'pcg_kairos', 'ti_kairos');
check(!afterRemoval.includes(upgrade), 'removing the Tier System still cascades to the Upgrade — no standalone Upgrade survives');
check(!afterRemoval.includes(primaryB) && !afterRemoval.includes(addon), 'removing the Tier System still clears the primary and add-on too');
check(
  afterTierSwap.some((i) => i.offer_type === 'family_tier' && resolveQuoteItemRole(i) === 'primary'),
  'a swap always leaves a primary in the cart, so it can never orphan the Upgrade',
);

// A different Family's swap never touches this Family's Upgrade.
const otherFamilyPrimary = familyItem({
  familyId: 'pcg_omnia', familyPlatformId: 'CZPG-OMNIA001', familyTitle: 'OMNIA',
  tierInstanceId: 'ti_omnia', tierInstancePlatformId: 'CZTG-OMNIA001',
  tierOccupantId: 'occ_omnia', tierPlatformId: 'CZT-OMNIA0001',
});
const afterOtherFamily = replaceFamilyNormalQuoteItem(cart, otherFamilyPrimary);
check(afterOtherFamily.includes(upgrade) && afterOtherFamily.includes(primaryA),
  "another Family's swap touches neither this Family's Upgrade nor its primary");

// ── Issue 3 (live follow-up, 2026-09-10): Review & Finalise, View Full Quote
//    and the frontend Print/PDF must show Bundle children as Included too ──
//
// Cart quick view, Total Commitment, Plan Details and the email were all
// already correct; these three frontend surfaces were not. They render from
// QuoteProposalPreview (also the standalone Quote View and the Print/PDF
// clone source) and OrderSummary, both of which tested `row.unitPrice !== null`
// / `row.lineTotal !== null` and so passed an absent (undefined) money fact to
// formatPrice(), printing its "Contact Us" placeholder on Bundle children.
//
// Both now read the ONE shared inclusionMoneyPresentation().

const CONTACT = { company: 'Acme', contact: 'Sam Rivers', email: 's@acme.test', phone: '', notes: '' };

// A quoted item whose commercialBreakdown carries a priced Bundle parent with
// unpriced children — the exact shape behind Nath's screenshot.
const bundleQuotedItem = familyItem({
  tierTitle: 'OMNIA Foundation',
  legPaymentSummaries: [
    { source: 'Default', billingCycle: 'monthly', price: 4000, startMonth: 0, endMonth: 11, isOngoing: false, occurrenceMonths: Array.from({ length: 12 }, (_, i) => i), subtotal: 48000 },
  ],
  commercialBreakdown: [
    {
      periodLabel: 'Month 1–12',
      components: [
        {
          billingCycle: 'monthly',
          price: 4000,
          unchangedFromPrevious: false,
          inclusions: [
            {
              label: 'Foundation Bundle',
              quantity: 1,
              unitPrice: 4000,
              lineTotal: 4000,
              // Children with NO money keys at all — undefined, not null.
              includes: [
                { label: 'Managed Detection', quantity: 1 },
                { label: 'Patch Management', quantity: 25 },
              ],
            },
          ],
        },
      ],
    },
  ],
});

function renderSurface(vnode) {
  render(vnode, container);
  const text = container.textContent;
  const childLis = [...container.querySelectorAll('li')].filter((li) => /--child/.test(li.className));
  return {
    text,
    html: container.innerHTML,
    childTexts: childLis.map((li) => li.textContent.trim()),
  };
}

const proposal = renderSurface(h(QuoteProposalPreview, {
  items: [bundleQuotedItem], services: [], contact: CONTACT, quoteDate: '2026-09-10', quoteRef: 'CZ-TEST01',
}));
check(proposal.text.includes('Foundation Bundle'), 'the proposal renders the Bundle parent');
check(proposal.text.includes('$4,000'), 'the proposal keeps the Bundle parent price');
check(!proposal.html.includes('Contact Us'), 'the proposal renders no Contact Us for Bundle children');
check(proposal.childTexts.length === 2, `both Bundle children render as child rows in the proposal (got ${proposal.childTexts.length})`);
for (const childText of proposal.childTexts) {
  check(childText.includes('Included'), `a proposal Bundle child reads Included (got "${childText}")`);
}

const review = renderSurface(h(OrderSummary, {
  items: [bundleQuotedItem], services: [], contact: CONTACT, quoteRef: 'CZ-TEST01', quoteDate: '2026-09-10',
  step: 'review', submitState: 'idle', canSubmit: true, onSubmit: () => {}, onPrint: () => {},
}));
check(review.text.includes('Foundation Bundle'), 'Review & Finalise renders the Bundle parent');
check(review.text.includes('$4,000'), 'Review & Finalise keeps the Bundle parent price');
check(!review.html.includes('Contact Us'), 'Review & Finalise renders no Contact Us for Bundle children');
check(review.childTexts.length >= 2, `both Bundle children render as child rows in Review & Finalise (got ${review.childTexts.length})`);
for (const childText of review.childTexts) {
  check(childText.includes('Included'), `a Review & Finalise Bundle child reads Included (got "${childText}")`);
}

// Genuine unresolved NON-Bundle pricing is still preserved on these surfaces:
// a top-level inclusion with no money facts shows neither a price nor
// "Included" — it is unresolved, not covered by a parent.
const unresolvedQuotedItem = familyItem({
  tierTitle: 'OMNIA Custom',
  legPaymentSummaries: [
    { source: 'Default', billingCycle: 'monthly', price: 100, startMonth: 0, endMonth: 11, isOngoing: false, occurrenceMonths: Array.from({ length: 12 }, (_, i) => i), subtotal: 1200 },
  ],
  commercialBreakdown: [
    {
      periodLabel: 'Month 1–12',
      components: [
        {
          billingCycle: 'monthly',
          price: 100,
          unchangedFromPrevious: false,
          inclusions: [{ label: 'Custom Integration', quantity: 1 }],
        },
      ],
    },
  ],
});

const unresolvedProposal = renderSurface(h(QuoteProposalPreview, {
  items: [unresolvedQuotedItem], services: [], contact: CONTACT, quoteDate: '2026-09-10', quoteRef: 'CZ-TEST01',
}));
check(unresolvedProposal.text.includes('Custom Integration'), 'the unresolved non-Bundle inclusion still renders');
check(!unresolvedProposal.html.includes('Contact Us'), 'an unresolved non-Bundle inclusion no longer prints Contact Us either');
{
  const row = [...container.querySelectorAll('li')].find((li) => li.textContent.includes('Custom Integration'));
  check(row !== undefined && !row.textContent.includes('Included'),
    'a genuinely unresolved NON-Bundle inclusion is never labelled Included — no global unknown-to-Included mapping');
}

render(null, container);

console.log(`Cart bundle/upgrade regression: ${checks} checks passed.`);
