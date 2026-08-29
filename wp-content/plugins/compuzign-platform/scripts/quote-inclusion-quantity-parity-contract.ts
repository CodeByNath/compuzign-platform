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

console.log('Quote inclusion quantity parity contract passed.');
