// Regression lock for Phase 8E's add-on card/cart behavior, after the
// live-validation reversal: an add-on card's CTA order (Add to Quote
// primary, above the secondary Choose Plan/View Plan) stays as originally
// fixed, but the cart route was reversed — a quoted add-on's cart row
// shows "View details" through the SAME Quote Details overlay every
// primary already uses (an earlier round routed it into a separate
// direct-focus shortcut instead; that bypassed the overlay and was
// reversed). QuoteDetailsOverlay now gives every quoted plan — primary
// AND add-on — its own tab, resolved with fail-closed exact Tier +
// Edition identity, while Total Commitment stays primary-only (no
// canonical add-on TCV math exists). Static source checks, matching
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
check(
  /onOpenDetails && isFamilyTierQuoteItem\(item\) && \(/.test(quoteSummarySource),
  'the "View details" affordance is gated on isFamilyTierQuoteItem only — no !item.isAddon exclusion (note: !item.isAddon legitimately still appears elsewhere in this file for the cart-total/TCV math, which stays primary-only by design)',
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
//    stays primary-only; identity resolution fails closed. ─────────────

check(
  /const allFamilyTierItems = items\.filter\(isFamilyTierQuoteItem\);/.test(quoteDetailsOverlaySource),
  'every quoted family_tier item (primary and add-on) is collected for the tab list',
);
check(
  /const primaryFamilyTierItems = allFamilyTierItems\.filter\(\(item\) => !item\.isAddon\);/.test(quoteDetailsOverlaySource),
  'primaryFamilyTierItems is derived from allFamilyTierItems and stays add-on-excluded for Total Commitment',
);
check(
  /allFamilyTierItems\.find\(\(item\) => quoteItemKey\(item\) === activeKey\)/.test(quoteDetailsOverlaySource),
  'the active tab can resolve to ANY quoted plan (primary or add-on), not only primaries',
);
check(
  /allFamilyTierItems\.map\(\(item\) => \{/.test(quoteDetailsOverlaySource),
  'the tab bar itself renders one tab per quoted plan (primary or add-on)',
);
check(
  /<TotalCommitmentTab items=\{primaryFamilyTierItems\}/.test(quoteDetailsOverlaySource),
  'the Total Commitment tab still only ever sees primary items — no invented add-on TCV math',
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
