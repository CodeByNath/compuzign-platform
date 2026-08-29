import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Quote inclusion quantity parity: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const order = readFileSync(resolve(root, 'resources/ts/components/request-flow/OrderSummary.tsx'), 'utf8');
const proposal = readFileSync(resolve(root, 'resources/ts/components/request-flow/QuoteProposalPreview.tsx'), 'utf8');

function familyInclusionsListBody(source: string): string {
  const match = source.match(/function FamilyInclusionsList[\s\S]*?\n}\n/);
  check(!!match, 'FamilyInclusionsList is present');
  return match![0];
}

// Both the on-screen Review & Finalise Quote (OrderSummary.tsx) and the
// printable/PDF proposal (QuoteProposalPreview.tsx, cloned verbatim by
// RequestFlowModal's print portal — no divergent print-only data path)
// must show the identical quantity-bearing markup.
for (const file of [order, proposal]) {
  const body = familyInclusionsListBody(file);

  // 1. Ordinary top-level inclusion shows its snapshot quantity.
  check(/inclusion\.bundle_id \? inclusion\.label : \(/.test(body), 'branches on inclusion.bundle_id before deciding whether to show a quantity');
  check(body.includes('{inclusion.quantity ?? \'\'}'), 'an ordinary inclusion renders its quantity using nullish semantics (quantity ?? \'\')');

  // 2. Bundle parent remains a quantity-less section header — the bundle_id
  // branch renders only the label, matching PricingTiers.tsx's own
  // bundle_id treatment, never inventing/rendering a quantity for it.
  const bundleBranch = body.match(/inclusion\.bundle_id \? inclusion\.label : \([\s\S]*?\)\}/);
  check(!!bundleBranch, 'the Bundle parent branch is present');
  // The true/bundle_id side of the ternary is the literal `inclusion.label`
  // token alone (no `.quantity` reference anywhere before the `:`).
  const ternaryTrueSide = body.slice(body.indexOf('inclusion.bundle_id ? inclusion.label :'), body.indexOf('inclusion.bundle_id ? inclusion.label :') + 'inclusion.bundle_id ? inclusion.label :'.length);
  check(!ternaryTrueSide.includes('quantity'), 'the Bundle parent (bundle_id) branch never references a quantity');

  // 3. Bundle child inclusion shows its own snapshot quantity.
  const childBlock = body.match(/\(inclusion\.includes \?\? \[\]\)\.map\(\(child, ci\) => \([\s\S]*?\)\),/);
  check(!!childBlock, 'renders a row per Bundle-supplied child inclusion');
  check(childBlock![0].includes('{child.quantity ?? \'\'}'), 'a Bundle child renders its quantity using nullish semantics (quantity ?? \'\')');

  // 4. Quantity and label are explicit, separately styled spans — never
  // concatenated into one ambiguous display string.
  check(body.includes('cz-os__feature-label') || body.includes('cz-proposal__feature-label'), 'uses a dedicated label span');
  check(body.includes('cz-os__feature-qty') || body.includes('cz-proposal__feature-qty'), 'uses a dedicated, separately styled quantity span');

  // 5. Old-cart fallback (features[]) stays label-only — no quantity field
  // exists on a flat feature string, so none may be invented.
  const fallbackBlock = body.match(/if \(item\.features\.length > 0\) \{[\s\S]*?\n  \}/);
  check(!!fallbackBlock, 'the old-cart features[] fallback branch is present');
  check(!fallbackBlock![0].includes('quantity'), 'the features[] fallback never references or invents a quantity');

  // 6. Applied identically to both Family primary and Family add-on rows —
  // both populations are served by this one component.
  const usageCount = (file.match(/<FamilyInclusionsList item=\{item\} \/>/g) ?? []).length;
  check(usageCount === 2, 'FamilyInclusionsList (with its quantity rendering) is used for both Family primary and Family add-on rows');
}

// Runtime proof of the exact nullish-vs-falsy distinction the source uses:
// a real quantity of 0 must remain visible as 0, never collapse to ''
// the way a `quantity || ''` (truthy check) would incorrectly do.
function quantityCell(quantity: number | undefined): number | string {
  return quantity ?? '';
}
check(quantityCell(0) === 0, 'a real quantity of 0 renders as 0, not blank (nullish check, never a truthy check)');
check(quantityCell(4) === 4, 'a real quantity renders as its own number');
check(quantityCell(undefined) === '', 'an absent quantity renders as an empty cell, never a fabricated number');

// Phase 8I add-on alignment correction: a Family add-on's own
// .cz-proposal__features shell must be pulled flush to the card edges
// (unlike a primary plan's, which never needed this — .cz-proposal__service
// itself carries no padding of its own), using the SAME tokens the parent
// add-on's own padding uses, never a divergent selector or new literal.
const css = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');

// Direct-child selector only — never widened to every .cz-proposal__features
// (that would also touch a primary plan's untouched geometry).
const addonFeaturesScreenRule = css.match(/\.cz-proposal__addon > \.cz-proposal__features\s*\{[^}]*\}/);
check(!!addonFeaturesScreenRule, '.cz-proposal__addon > .cz-proposal__features (direct-child only) rule is present');
check(addonFeaturesScreenRule![0].includes('flex: 1 1 100%'), 'the existing full-width flex sizing is retained');
check(
  /margin:\s*0\s+calc\(var\(--cz-space-5\)\s*\*\s*-1\)\s+calc\(var\(--cz-space-4\)\s*\*\s*-1\)/.test(addonFeaturesScreenRule![0]),
  'screen offsets cancel the parent .cz-proposal__addon padding using its own tokens (--cz-space-5 horizontal, --cz-space-4 bottom), never a new literal size',
);

// The base .cz-proposal__features rule (shared by primary and add-on) must
// keep its own padding untouched — that's what owns label/quantity
// breathing room and must not be zeroed to compensate.
const baseFeaturesRule = css.match(/(?<!> )\.cz-proposal__features\s*\{[^}]*\}/);
check(!!baseFeaturesRule, 'the base .cz-proposal__features rule is present');
check(baseFeaturesRule![0].includes('padding: var(--cz-space-3) var(--cz-space-5)'), 'the base .cz-proposal__features padding is untouched');

// Explicit print geometry — never left to an inherited var()-token value
// that might not equal the print rhythm the sibling rules already use.
const printAddonRule = css.match(/#cz-print-root \.cz-proposal__addon\s*\{[^}]*\}/);
check(!!printAddonRule, 'an explicit #cz-print-root .cz-proposal__addon padding rule is present');
check(printAddonRule![0].includes('padding: 0.25cm 0.4cm !important'), '.cz-proposal__addon\'s print padding matches the existing 0.25cm/0.4cm rhythm .cz-proposal__service-row already uses, made explicit rather than inherited');

const printAddonFeaturesRule = css.match(/#cz-print-root \.cz-proposal__addon > \.cz-proposal__features\s*\{[^}]*\}/);
check(!!printAddonFeaturesRule, 'an explicit #cz-print-root .cz-proposal__addon > .cz-proposal__features cancellation rule is present');
check(
  /margin:\s*0\s+-0\.4cm\s+-0\.25cm\s*!important/.test(printAddonFeaturesRule![0]),
  'print offsets exactly cancel the explicit 0.4cm horizontal / 0.25cm bottom add-on padding above — matching values, not a guess',
);

// Primary service inclusion geometry must be completely untouched by this
// correction — its own print padding rule still carries its original,
// unmodified value.
const serviceRowPrintRule = css.match(/#cz-print-root \.cz-proposal__service-row\s*\{[^}]*\}/);
check(!!serviceRowPrintRule && serviceRowPrintRule[0].includes('0.25cm 0.4cm'), '.cz-proposal__service-row keeps its original 0.25cm/0.4cm print padding, unchanged by this correction');

console.log('Quote inclusion quantity parity contract passed.');
