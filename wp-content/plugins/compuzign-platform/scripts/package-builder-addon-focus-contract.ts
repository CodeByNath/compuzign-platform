// Regression lock for the two Phase 8E live-validation corrections: an
// add-on card's CTA order (Add to Quote primary, above the secondary
// Choose Plan/View Plan) and a quoted add-on's own cart "View Plan" route
// into the real Package Builder focused shell (never the Quote Details
// overlay, never a second/parallel presentation system). Static source
// checks, matching package-builder-regression-lock-contract.ts's own
// readFileSync style — there is no DOM/CSS-cascade runtime here to assert
// against directly, so this locks the exact source facts that produce the
// intended behavior rather than re-deriving it.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Package Builder add-on focus contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const cssSource = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');
const pricingTiersSource = readFileSync(resolve(root, 'resources/ts/components/cost-builder/PricingTiers.tsx'), 'utf8');
const quoteSummarySource = readFileSync(resolve(root, 'resources/ts/components/cost-builder/QuoteSummary.tsx'), 'utf8');
const familyTierAdapterSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx'), 'utf8');
const packageBuilderAppSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/PackageBuilderApp.tsx'), 'utf8');

// ── CTA order: the secondary Choose Plan/View Plan button on an add-on
//    card must sort after the primary Add to Quote button — .tier-action-row
//    is a flex column, so `order` alone reorders without touching JSX or
//    any other card's layout. ──────────────────────────────────────────

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

// ── Add-on cart "View Plan" route: QuoteSummary exposes it only for a
//    quoted add-on, distinct from the primary-only Quote Details route,
//    and it flows through a real focused-shell identity handoff rather
//    than the Quote Details overlay. ───────────────────────────────────

check(
  /onOpenAddonFocus\?:\s*\(item: FamilyTierQuoteItem\) => void/.test(quoteSummarySource),
  'QuoteSummary declares an onOpenAddonFocus prop distinct from onOpenDetails',
);
check(
  /onOpenAddonFocus && isFamilyTierQuoteItem\(item\) && item\.isAddon/.test(quoteSummarySource),
  'the "View Plan" affordance is gated on isAddon (never rendered for a primary item)',
);
check(
  /onOpenDetails && isFamilyTierQuoteItem\(item\) && !item\.isAddon/.test(quoteSummarySource),
  'the existing "View details" (Quote Details overlay) affordance stays primary-only, never rendered for an add-on',
);

check(
  /externalFocusRequest\?:\s*\{\s*tierId:\s*TierId;\s*tierEditionPlatformId:\s*string \| null\s*\}\s*\|\s*null/.test(familyTierAdapterSource),
  'FamilyTierAdapter accepts an external focus request carrying exact Tier + Edition Platform ID identity',
);
check(
  /selectVariant\(tierId, editionId\);\s*\n\s*onExternalFocusConsumed\?\.\(\);/.test(familyTierAdapterSource),
  'an external focus request opens the SAME selectVariant() focused shell every other entry point uses, then is consumed (one-shot, never re-fires)',
);

check(
  /openAddonFocus = \(item: FamilyTierQuoteItem\) => \{\s*\n\s*setActiveFamilyId\(item\.familyId\);\s*\n\s*setAddonFocusRequest\(/.test(packageBuilderAppSource),
  'PackageBuilderApp switches the active Family to the add-on\'s own Family before handing FamilyTierAdapter the focus request, so a cross-Family add-on still resolves against its own real data',
);
check(
  /addonFocusRequest\.familyId === family\.family_id/.test(packageBuilderAppSource),
  'the focus request is only ever applied once the correct Family is actually active, never mid-switch',
);
const quoteDetailsOverlayJsxMatch = packageBuilderAppSource.match(/<QuoteDetailsOverlay[\s\S]*?\/>/);
check(quoteDetailsOverlayJsxMatch !== null, '<QuoteDetailsOverlay /> is still rendered');
check(
  !/isAddon/.test(quoteDetailsOverlayJsxMatch![0]),
  'the add-on focus route never reaches into QuoteDetailsOverlay\'s own props (that stays a separate, primary-only presentation system)',
);

console.log('Package Builder add-on focus contract passed.');
