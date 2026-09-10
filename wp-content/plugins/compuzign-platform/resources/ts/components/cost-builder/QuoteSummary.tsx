import { useState } from 'preact/hooks';
import { formatPrice, formatCycleLabel } from '@/utils/format';
import { calcQuoteTotals, composableCoexistsWithPrimary, orderedQuoteItems, quoteItemKey } from '@/utils/quote';
import { isFamilyTierQuoteItem } from '@/utils/quote';
import { chargeTypeLabel, computeTotalContractValue, startingPaymentsByCycle } from '@/utils/paymentSummary';
import { InclusionDisclosureToggle, InclusionDisclosurePanel, disclosureRowsForFamilyTierItem, useSingleOpenDisclosure } from './InclusionDisclosure';
import type { CartItem, FamilyTierQuoteItem } from './types';

interface QuoteSummaryProps {
  items: CartItem[];
  onRemove: (item: CartItem) => void;
  onClear: () => void;
  onOpenReview: () => void;
  // Phase 8D: optional so this component's other caller (CostBuilderApp.tsx,
  // which has no Package Family/Plan Details concept at all) is completely
  // unaffected — omitting this prop simply hides the "View details"
  // affordance below, never importing anything package-builder-specific
  // into this cost-builder-layer component. `null` means "cart-level"
  // (opens the overlay on Total Commitment); a specific item means "open
  // on that item's own tab". This file now only ever calls it with a real
  // item (the first quoted plan, from its one consolidated footer button
  // — see below) — `null` stays a valid, supported target on the overlay
  // itself, just not one this caller currently reaches for.
  onOpenDetails?: (item: FamilyTierQuoteItem | null) => void;
  // project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md,
  // "Manage build" — optional so this component's other caller
  // (CostBuilderApp.tsx, no Upgrade Your Build concept) is unaffected.
  // Rendered only for the composable Upgrades line that coexists with its
  // primary (see composableCoexistsWithPrimary below); PackageBuilderApp
  // owns routing this back into FamilyTierAdapter's browsing stage.
  onManageBuild?: (item: FamilyTierQuoteItem) => void;
  // "Skipped-upgrade Cart footer recovery route" — optional for the same
  // reason as onManageBuild above (CostBuilderApp.tsx is unaffected).
  // Renders one footer entry point ("Upgrade your build") immediately
  // before View details, generic on this component's side: PackageBuilderApp
  // alone decides eligibility (quoted primary + a real eligible catalogue +
  // no committed composable/Upgrades line yet for the currently active
  // Family) and only supplies this callback when eligible — QuoteSummary
  // performs no Family/eligibility logic of its own, the same "presence of
  // the callback is the render gate" posture already used elsewhere here.
  onUpgradeYourBuild?: () => void;
}

// Extracted (project-work/2026-09-06-tier-catalogue-admin-ux-consolidation.md,
// Phase 4 correction — "scoped Cart presentation reuse") so a second
// caller (the Upgrade Your Build browsing stage's own scoped view of just
// the primary + composable line, in package-builder/UpgradeBuildSummary.tsx)
// can render the exact same item title/tier-label/payment-stream/per-item-
// total presentation this component already renders per row — never a
// second, simplified reimplementation of it. Verbatim extraction of what
// was this component's own inline per-item markup; QuoteSummary itself now
// calls this too, so there is exactly one place this presentation lives.
// Deliberately excludes the corner-actions (remove button, inclusion
// disclosure toggle/panel) — those are cart-editing controls, not payment
// presentation, and stay QuoteSummary-only per the locked "no cart-mutating
// controls" requirement for the Upgrade-stage caller.
export function QuoteItemPricePresentation({ item, items }: { item: CartItem; items: CartItem[] }) {
  const flatCycleSuffix = formatCycleLabel(item.billingCycle);
  // Phase 5/7: this quoted option's own resolved commercial payment
  // streams (buildLegPaymentSummaries(), captured at Add to Quote time —
  // see FamilyTierAdapter.tsx's itemFor()). Any item with no streams at
  // all (a Cost Builder QuoteItem, which never has this field, or a
  // pre-Phase-5 legacy cart entry) keeps today's one flat price/cycle
  // line — there's no per-stream data to lay out. An item WITH streams (1
  // or more) renders each as its own order-summary row — charge-type
  // label on the left, price on the right, never a slash suffix
  // duplicating what the label already says — plus a "Total" row when
  // computeTotalContractValue() resolves finite (never shown for an
  // ongoing/unbounded stream).
  const streams = isFamilyTierQuoteItem(item) ? item.legPaymentSummaries : null;
  const hasStreams = !!streams && streams.length > 0;
  const totalContractValue = hasStreams ? computeTotalContractValue(streams!) : null;
  return (
    <>
      <div class="cz-quote-summary__item-info">
        <span class="cz-quote-summary__item-title">{isFamilyTierQuoteItem(item) ? item.familyTitle : item.serviceTitle}</span>
        {/* Live-correction round: a composable ("Build Your Own") line
            reached via "upgrade your build" (a sibling primary Tier
            already selected for the same Family) reads as "Upgrades" here
            — the standalone Build Your Own naming stays for a composable
            line with no primary sibling, and for every Admin-facing
            surface regardless. */}
        <span class="cz-quote-summary__item-tier">
          {isFamilyTierQuoteItem(item) && composableCoexistsWithPrimary(item, items) ? 'Upgrades' : item.tierTitle}
        </span>
      </div>
      <div class="cz-quote-summary__item-prices">
        {hasStreams ? (
          <>
            {streams!.map((stream) => (
              <div key={stream.source} class="cz-quote-summary__stream-row">
                <span class="cz-quote-summary__stream-label">{chargeTypeLabel(stream.billingCycle)}</span>
                <span class="cz-quote-summary__stream-value">{formatPrice(stream.price)}</span>
              </div>
            ))}
            {/* Phase 7: "Total" (this item's own subtotal) — deliberately
                NOT "Total Contract Value" (that wording is reserved for
                the whole-cart footer, so the two numbers are never
                confused for each other). Only when finite; an ongoing
                stream leaves just its own row(s) above, never a fake
                finite Total. */}
            {totalContractValue !== null && (
              <div class="cz-quote-summary__stream-row cz-quote-summary__stream-row--total">
                <span class="cz-quote-summary__stream-label">Total</span>
                <span class="cz-quote-summary__stream-value">{formatPrice(totalContractValue)}</span>
              </div>
            )}
          </>
        ) : (
          <span class="cz-quote-summary__item-price">
            {item.price !== null ? (
              <>
                {formatPrice(item.price)}
                {flatCycleSuffix && (
                  <span class="cz-quote-summary__item-cycle">{' '}{flatCycleSuffix}</span>
                )}
              </>
            ) : 'Custom'}
          </span>
        )}
      </div>
    </>
  );
}

// Extracted alongside QuoteItemPricePresentation above, same precedent/
// reasoning — this component's own whole-footer totals block (cycle
// totals/Total Contract Value/Initial Payment), now parameterized by
// `items` instead of reading the outer `items` prop directly, so a second
// caller can invoke it over a SCOPED subset (e.g. just the primary +
// composable line) and get the exact same truthful multi-stream/mixed-
// cycle/TCV/Initial-Payment reasoning calcQuoteTotals()/
// computeTotalContractValue()/startingPaymentsByCycle() already produce —
// never a second, simplified totals implementation. Excludes "View
// details"/"Review & Finalise Quote" (cart-level navigation, not totals
// presentation) — those stay QuoteSummary-only.
export function QuoteTotalsPresentation({ items }: { items: CartItem[] }) {
  const { unpricedItems, cycleEntries, hasMixedCycles, singleCycle } = calcQuoteTotals(items);

  // Phase 6/7: calcQuoteTotals()'s own cycle-bucket math is untouched — it
  // still only ever sees each item's single flat Headline price/cycle, so
  // its "Est. X total" is only trustworthy when NO item actually has more
  // than one real payment stream. Rather than teach that function a second,
  // per-stream bucketing model (an invented cross-cycle summation this phase
  // was told not to build), a multi-stream item's presence is classified
  // here and the footer branches BEFORE reaching calcQuoteTotals' own
  // labels at all.
  const familyTierItems = items.filter(isFamilyTierQuoteItem);
  const hasMultiStreamItem = familyTierItems.some((item) => (item.legPaymentSummaries?.length ?? 0) > 1);
  // Phase 7: sum every PRIMARY (non-add-on) Tier/Edition item's own finite
  // Total Contract Value — never add-ons (no canonical finite-contract math
  // exists for them yet; they stay represented by calcQuoteTotals' own
  // cycle totals wherever those still apply) and never a live re-derivation
  // (computeTotalContractValue() is reused exactly as Plan Details/the
  // per-item row above already call it). "No legPaymentSummaries at all" is
  // treated as unknown, not zero — it must never silently count as $0
  // toward the sum, and an empty primaries list must never vacuously read
  // as "all finite" (.every() on [] is true) and show a fabricated "$0
  // Total Contract Value".
  const primaryFamilyTierItems = familyTierItems.filter((item) => !item.isAddon);
  const primaryTotalContractValues = primaryFamilyTierItems.map((item) =>
    item.legPaymentSummaries && item.legPaymentSummaries.length > 0
      ? computeTotalContractValue(item.legPaymentSummaries)
      : null,
  );
  const allPrimariesFinite = primaryFamilyTierItems.length > 0
    && primaryTotalContractValues.every((value) => value !== null);
  const combinedPrimaryTotalContractValue = allPrimariesFinite
    ? primaryTotalContractValues.reduce((sum, value) => sum + (value as number), 0)
    : null;
  // Phase 8B: what's due at each quoted item's own plan start, summed
  // across items by cycle only (never combining unlike cycles) — shown
  // independently of whether a finite Total Contract Value exists, so a
  // mixed finite+ongoing cart still reports something truthful instead of
  // nothing. Does not touch/replace the TCV/fallback logic above.
  // Deliberately reads the WHOLE familyTierItems set, not the primary-only
  // subset the TCV sum above uses. Initial Payment answers a cart-level
  // question — what is actually due when the quoted plans start — so every
  // surviving quoted line contributes its own starting streams: primary,
  // add-on, and composable/Upgrade Edition alike. The primary-only filter
  // belongs to TCV's own finite-contract policy (no canonical add-on
  // contract math exists yet) and must not leak into this figure: an
  // add-on that survives its original primary being replaced is still
  // genuinely charged at its own start, and omitting it understated what
  // the customer pays.
  const startingPayments = startingPaymentsByCycle(
    familyTierItems.map((item) => item.legPaymentSummaries ?? []),
  );
  const initialPaymentTotal = startingPayments.reduce((sum, [, amount]) => sum + amount, 0);

  return (
    <>
      <div class="cz-quote-summary__total">
        {cycleEntries.length === 0 ? (
          <>
            <span class="cz-quote-summary__total-label">Pricing on request</span>
            <span class="cz-quote-summary__total-price">Contact Us</span>
          </>
        ) : hasMultiStreamItem ? (
          combinedPrimaryTotalContractValue !== null ? (
            <>
              <span class="cz-quote-summary__contract-value-label">Total Contract Value</span>
              <span class="cz-quote-summary__contract-value-amount">{formatPrice(combinedPrimaryTotalContractValue)}</span>
            </>
          ) : (
            <>
              <span class="cz-quote-summary__contract-value-label">Contract Value</span>
              <span class="cz-quote-summary__contract-value-amount">Until Cancelled</span>
              <span class="cz-quote-summary__custom-note">
                Includes charges without a fixed end date.
              </span>
            </>
          )
        ) : hasMixedCycles ? (
          <>
            <span class="cz-quote-summary__total-label">
              Estimated totals{unpricedItems.length > 0 ? ' (custom pricing applies)' : ''}
            </span>
            {cycleEntries.map(([cycle, total]) => {
              const suffix = formatCycleLabel(cycle);
              return (
                <div key={cycle} class="cz-quote-summary__cycle-row">
                  <span class="cz-quote-summary__cycle-name">{cycle}</span>
                  <span class="cz-quote-summary__cycle-amount">
                    {formatPrice(total)}{suffix ? ` ${suffix}` : ''}
                  </span>
                </div>
              );
            })}
            {unpricedItems.length > 0 && (
              <span class="cz-quote-summary__custom-note">
                + {unpricedItems.length} item{unpricedItems.length === 1 ? '' : 's'} at custom pricing
              </span>
            )}
          </>
        ) : (
          <>
            <span class="cz-quote-summary__total-label">
              Est. {singleCycle![0]} total
              {unpricedItems.length > 0 ? ' (custom pricing applies)' : ''}
            </span>
            <span class="cz-quote-summary__total-price">
              {formatPrice(singleCycle![1])}
              {formatCycleLabel(singleCycle![0]) && (
                <span class="cz-quote-summary__total-cycle">
                  {' '}{formatCycleLabel(singleCycle![0])}
                </span>
              )}
            </span>
            {unpricedItems.length > 0 && (
              <span class="cz-quote-summary__custom-note">
                + {unpricedItems.length} item{unpricedItems.length === 1 ? '' : 's'} at custom pricing
              </span>
            )}
          </>
        )}
      </div>

      {/* Phase 9: the final, strongest number in the footer — deliberately
          last, directly above the CTA (in QuoteSummary's own layout), since
          "what do I pay right now" is the most immediate checkout fact. A
          cart-level presentation label only: collapses every
          startingPaymentsByCycle() bucket into ONE combined figure
          (initialPaymentTotal above) — the underlying per-cycle
          math/derivation is untouched, and each quote item's own row above
          still shows its own real Upfront/Monthly/Yearly labels; only this
          summary number stops describing which Leg types make it up. Same
          hasMultiStreamItem gate as .total's own multi-stream branch — a
          simple single-stream cart's existing compact "Est. X total"
          already answers this question, so nothing new renders there. */}
      {hasMultiStreamItem && startingPayments.length > 0 && (
        <div class="cz-quote-summary__initial-payment">
          <span class="cz-quote-summary__initial-payment-label">Initial Payment</span>
          <span class="cz-quote-summary__initial-payment-amount">{formatPrice(initialPaymentTotal)}</span>
        </div>
      )}
    </>
  );
}

export function QuoteSummary({ items, onRemove, onClear, onOpenReview, onOpenDetails, onManageBuild, onUpgradeYourBuild }: QuoteSummaryProps) {
  const [clearPending, setClearPending] = useState(false);
  const { openKey: openDisclosureKey, toggle: toggleDisclosure, panelRef: disclosurePanelRef } = useSingleOpenDisclosure();

  const handleClear = () => {
    onClear();
    setClearPending(false);
  };

  // Live-gate correction (2026-09-05, "cart hierarchy requirement"):
  // presentation order only — every total/sum above stays derived from the
  // original `items` prop (order-independent), never this reordered view.
  // Main plan, then its Upgrade when present, then its add-ons, per
  // Family/Tier system; unrelated items keep their existing relative
  // position. See orderedQuoteItems() in utils/quote.ts for the single
  // shared derivation — never hand-sorted here.
  const displayItems = orderedQuoteItems(items);
  const orderedFamilyTierItems = displayItems.filter(isFamilyTierQuoteItem);

  return (
    <div class="cz-quote-summary">
      <div class="cz-quote-summary__header">
        <h3 class="cz-heading-sm">
          Your Quote
          {items.length > 0 && (
            <span class="cz-quote-summary__badge">{items.length}</span>
          )}
        </h3>
        {clearPending ? (
          <div class="cz-quote-summary__clear-group">
            <button type="button" class="cz-quote-summary__clear-yes" onClick={handleClear}>
              Clear all?
            </button>
            <button type="button" class="cz-quote-summary__clear-cancel" onClick={() => setClearPending(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" class="cz-quote-summary__clear" onClick={() => setClearPending(true)}>
            Clear all
          </button>
        )}
      </div>

      <ul class="cz-quote-summary__list">
        {displayItems.map((item) => {
          const key = quoteItemKey(item);
          const disclosureRows = isFamilyTierQuoteItem(item) ? disclosureRowsForFamilyTierItem(item) : [];
          const disclosureOpen = openDisclosureKey === key;
          return (
            <li key={key} class="cz-quote-summary__item">
              {/* Phase 6: fixed top-right corner, independent of the content
                  column's own height below (1 line for a simple item,
                  several for a multi-stream one with its own Total row) —
                  never competing with price text for horizontal space.
                  Auditor correction: the inclusion chevron now sits in this
                  SAME corner cluster, immediately left of the remove × —
                  two separate controls, separate hit targets, never one
                  repurposed as the other. */}
              <div class="cz-quote-summary__corner-actions">
                {isFamilyTierQuoteItem(item) && (
                  <InclusionDisclosureToggle
                    label={item.familyTitle}
                    rows={disclosureRows}
                    open={disclosureOpen}
                    onClick={() => toggleDisclosure(key)}
                  />
                )}
                <button
                  type="button"
                  class="cz-quote-summary__remove"
                  onClick={() => onRemove(item)}
                  aria-label={`Remove ${isFamilyTierQuoteItem(item) ? item.familyTitle : item.serviceTitle}`}
                >
                  ×
                </button>
              </div>
              {/* Phase 6: raw CZ Platform IDs (familyPlatformId,
                  tierInstancePlatformId, tierPlatformId,
                  tierEditionPlatformId) are deliberately not rendered —
                  customer-facing presentation only, human-readable
                  hierarchy only. The IDs stay on the underlying quote item
                  untouched (still read by quote capture/PDF/admin
                  surfaces); QuoteItemPricePresentation simply doesn't print
                  them. */}
              <QuoteItemPricePresentation item={item} items={items} />
              {/* Manage build: this action belongs to Upgrade Your Build,
                  not generic Cart navigation — rendered only for the exact
                  composable line that coexists with its primary (never a
                  standalone Build Your Own line, never inferred from the
                  "Upgrades" label above). */}
              {onManageBuild && isFamilyTierQuoteItem(item) && composableCoexistsWithPrimary(item, items) && (
                <button
                  type="button"
                  class="cz-quote-summary__manage-build"
                  onClick={() => onManageBuild(item)}
                >
                  Manage build
                </button>
              )}
              {disclosureOpen && (
                <InclusionDisclosurePanel rows={disclosureRows} panelRef={disclosurePanelRef} />
              )}
            </li>
          );
        })}
      </ul>

      <div class="cz-quote-summary__footer">
        <QuoteTotalsPresentation items={items} />

        {/* Skipped-upgrade Cart footer recovery route + the existing View
            details entry point, together in one row — "Upgrade your build"
            always first, immediately before View details. Wrapper only
            renders when at least one of the two has something to show, so
            an all-false render never leaves a stray empty row in the
            footer's flex-column layout. */}
        {(onUpgradeYourBuild || (onOpenDetails && orderedFamilyTierItems.length > 0)) && (
          <div class="cz-quote-summary__footer-links">
            {onUpgradeYourBuild && (
              <button
                type="button"
                class="cz-quote-summary__upgrade-your-build"
                onClick={onUpgradeYourBuild}
              >
                Upgrade your build
              </button>
            )}
            {/* Nath refinement: ONE cart-level "View details" entry point only
                — the earlier per-item buttons above are gone, so this is now
                the sole way into the quote-details overlay. Opens on the
                FIRST quoted plan in HIERARCHY order (main plan first — see
                orderedFamilyTierItems above), never raw cart-insertion order:
                a base Tier swap re-appends the replacement primary at the END
                of `items` (replaceFamilyNormalQuoteItem(), utils/quote.ts), so
                insertion order could previously land on an add-on's tab
                instead of the main plan's. Never Total Commitment; the
                customer reaches every other plan tab and Total Commitment by
                navigating inside that one overlay. Gated on any quoted
                family_tier item existing (a quoted add-on can never exist
                without its own primary — confirmed by the cart's whole-Tier-
                System removal rule — so this is exactly "is there anything to
                show a plan tab for"). */}
            {onOpenDetails && orderedFamilyTierItems.length > 0 && (
              <button
                type="button"
                class="cz-quote-summary__view-details cz-quote-summary__view-details--cart"
                onClick={() => onOpenDetails(orderedFamilyTierItems[0])}
              >
                View details
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          class="cz-btn cz-btn-primary cz-quote-summary__cta"
          onClick={onOpenReview}
        >
          Review &amp; Finalise Quote
        </button>
      </div>
    </div>
  );
}
