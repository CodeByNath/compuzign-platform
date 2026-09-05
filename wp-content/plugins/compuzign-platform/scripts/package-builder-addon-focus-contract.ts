// Regression lock for Phase 8E's add-on card/cart behavior, after the
// live-validation reversal: an add-on card's CTA order (Add to Quote
// primary, above the secondary Choose Plan/View Plan) stays as originally
// fixed, but the cart route was reversed — a quoted add-on's cart row
// shows "View details" through the SAME Quote Details overlay every
// primary already uses (an earlier round routed it into a separate
// direct-focus shortcut instead; that bypassed the overlay and was
// reversed). QuoteDetailsOverlay now gives every quoted plan — primary,
// Upgrade, AND add-on — its own tab, resolved with fail-closed exact Tier +
// Edition identity; Total Commitment (2026-09-05 correction) now aggregates
// that same complete population instead of a primary-only subset. Static
// source checks, matching
// package-builder-regression-lock-contract.ts's own readFileSync style —
// there is no DOM/CSS-cascade runtime here to assert against directly, so
// this locks the exact source facts that produce the intended behavior
// rather than re-deriving it.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Builder add-on focus contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const cssSource = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');
const quoteSummarySource = readFileSync(resolve(root, 'resources/ts/components/cost-builder/QuoteSummary.tsx'), 'utf8');
const familyTierAdapterSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx'), 'utf8');
const packageBuilderAppSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/PackageBuilderApp.tsx'), 'utf8');
const quoteDetailsOverlaySource = readFileSync(resolve(root, 'resources/ts/components/package-builder/QuoteDetailsOverlay.tsx'), 'utf8');

// ── CTA order (unchanged by this round): the secondary Choose Plan/View
//    Plan button on an add-on card must sort after the primary Add to
//    Quote button — .tier-action-row is a flex column, so `order` alone
//    reorders without touching JSX or any other card's layout. ─────────

const chooseAddonRuleMatch = cssSource.match(/\.cz-cost-builder__tier-choose--addon\s*\{([^}]*)\}/);
check(chooseAddonRuleMatch !== null, '.cz-cost-builder__tier-choose--addon rule exists');
check(
  /order:\s*2\s*;/.test(chooseAddonRuleMatch![1]),
  'the add-on secondary Choose Plan/View Plan button is ordered after the primary Add to Quote button (order: 2)',
);
check(
  !/\.cz-cost-builder__tier-action--addon-primary\s*\{[^}]*order:/.test(cssSource),
  'the primary Add to Quote button keeps its default (unset) flex order rather than being pinned, so it always sorts before the ordered secondary button',
);

// ── Reversed cart route: an add-on's cart row uses the SAME "View
//    details" / onOpenDetails path a primary uses — never a separate
//    direct-focus callback, which has been fully removed. ──────────────

check(
  !/onOpenAddonFocus/.test(quoteSummarySource),
  'the removed onOpenAddonFocus callback/prop is gone from QuoteSummary',
);

// ── Single consolidated cart-level entry point (Nath refinement): no
//    per-item "View details" buttons — exactly one footer control,
//    opening on the FIRST quoted plan (cart order), never Total
//    Commitment. ─────────────────────────────────────────────────────

check(
  (quoteSummarySource.match(/cz-quote-summary__view-details/g) ?? []).length === 2,
  'exactly one "View details" button remains: the class name substring appears exactly twice (once as the base class, once as a prefix of its own --cart modifier, both inside that ONE button\'s single class attribute) — a per-item button creeping back in would add more occurrences',
);
check(
  !/onOpenDetails\(item\)/.test(quoteSummarySource),
  'no per-item button calls onOpenDetails(item) inside the cart list anymore',
);
check(
  /onOpenDetails && orderedFamilyTierItems\.length > 0/.test(quoteSummarySource),
  'the one footer "View details" button is gated on any quoted family_tier item existing (an add-on can never exist without its own primary, so this is exactly "is there a plan to show")',
);
check(
  /onClick=\{\(\) => onOpenDetails\(orderedFamilyTierItems\[0\]\)\}/.test(quoteSummarySource),
  'the one footer button opens on the FIRST quoted plan in HIERARCHY order (main plan first, via orderedQuoteItems() — 2026-09-05 cart hierarchy correction), never raw cart-insertion order, and never onOpenDetails(null)/Total Commitment',
);
check(
  /const displayItems = orderedQuoteItems\(items\);/.test(quoteSummarySource)
    && /const orderedFamilyTierItems = displayItems\.filter\(isFamilyTierQuoteItem\);/.test(quoteSummarySource),
  'QuoteSummary.tsx derives its display order and the "View details" target from the SAME shared orderedQuoteItems() helper (utils/quote.ts), never a second hand-sort',
);

const cartViewDetailsCssMatch = cssSource.match(/\.cz-quote-summary__view-details--cart\s*\{([^}]*)\}/);
check(cartViewDetailsCssMatch !== null, '.cz-quote-summary__view-details--cart rule exists');
check(
  /align-self:\s*flex-start\s*;/.test(cartViewDetailsCssMatch![1]),
  'the single cart-level "View details" control is left-aligned (flex-start), not centered',
);

check(
  !/externalFocusRequest|onExternalFocusConsumed/.test(familyTierAdapterSource),
  'the removed external-focus-request mechanism is gone from FamilyTierAdapter (no other valid consumer once the cart route reverted)',
);
check(
  !/externalFocusRequest|onExternalFocusConsumed|openAddonFocus|addonFocusRequest/.test(packageBuilderAppSource),
  'the removed add-on focus plumbing is gone from PackageBuilderApp',
);

// ── QuoteDetailsOverlay: every quoted plan gets a tab; Total Commitment
//    now aggregates that SAME complete population (2026-09-05 "Complete
//    Total Commitment" correction — reversing the prior primary-only
//    filter, which rested on the now-disproven assumption that no
//    canonical add-on TCV math exists; computeTotalContractValue()/
//    startingPaymentsByCycle() are fully generic per-item, no primary-only
//    special-casing anywhere); identity resolution fails closed. ────────

check(
  /const allFamilyTierItems = orderedQuoteItems\(items\)\.filter\(isFamilyTierQuoteItem\);/.test(quoteDetailsOverlaySource),
  'every quoted family_tier item (primary, Upgrade, and add-on) is collected for the tab list, in cart-hierarchy order via the SAME shared orderedQuoteItems() helper QuoteSummary.tsx uses — never a second hand-sort',
);
check(
  !/primaryFamilyTierItems/.test(quoteDetailsOverlaySource),
  'the old add-on-excluded primaryFamilyTierItems population is gone — Total Commitment now reads the complete allFamilyTierItems population directly',
);
check(
  /allFamilyTierItems\.find\(\(item\) => quoteItemKey\(item\) === activeKey\)/.test(quoteDetailsOverlaySource),
  'the active tab can resolve to ANY quoted plan (primary, Upgrade, or add-on), not only primaries',
);
check(
  /allFamilyTierItems\.map\(\(item\) => \{/.test(quoteDetailsOverlaySource),
  'the tab bar itself renders one tab per quoted plan (primary, Upgrade, or add-on)',
);
check(
  /<TotalCommitmentTab items=\{allFamilyTierItems\}/.test(quoteDetailsOverlaySource),
  'the Total Commitment tab now sees the COMPLETE quoted Family population — primary, Upgrade, and add-ons, each exactly once — not a primary-only subset',
);

// Fail-closed exact identity inside resolvePlanDetails() — isolate the
// function body itself so these checks can't accidentally match
// elsewhere in the file.
const resolvePlanDetailsMatch = quoteDetailsOverlaySource.match(
  /function resolvePlanDetails\([\s\S]*?\n\}/,
);
check(resolvePlanDetailsMatch !== null, 'resolvePlanDetails() exists');
const resolvePlanDetailsBody = resolvePlanDetailsMatch![0];

check(
  /if \(!tierData\) return null;/.test(resolvePlanDetailsBody),
  'a Tier that does not exist on the resolved Family returns null (no details) rather than proceeding with undefined data',
);
check(
  /if \(item\.tierEditionPlatformId !== null\) \{[\s\S]*?if \(!edition\) return null;/.test(resolvePlanDetailsBody),
  'a non-null tierEditionPlatformId that matches no real Edition returns null — never silently falls back to Default',
);
check(
  !/\?\.id \?\? null/.test(resolvePlanDetailsBody),
  'the old fail-open pattern (a missing Edition match silently resolving to Default via ?? null) is gone from resolvePlanDetails',
);

console.log('Package Builder add-on focus contract passed.');
