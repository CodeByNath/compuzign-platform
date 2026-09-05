import type { ComposablePreviewChoiceItem, ServiceInclusion, TierId } from '@/api/types/cost-builder';
import type { LegPaymentSummary, QuotedBreakdownPeriod } from '@/utils/paymentSummary';

// 'bundle' = recommended bundle; 'promotion' = active promotion tier offer
export type QuoteItemTierId = TierId | 'bundle' | 'promotion';

// The composable ("Build Your Own") occupant's own customer-side tierId
// sentinel — deliberately a SEPARATE constant from Package Station's admin-
// only COMPOSABLE_TIER_ID (package-station/vocabulary.ts): that module is
// never imported by customer-facing code, and this one is never imported by
// it. The two happen to share a literal string value; they are not the same
// identity and must not be conflated or cross-imported.
export const COMPOSABLE_QUOTE_TIER_ID = 'composable' as const;

export interface QuoteItem {
  serviceId: number;
  serviceTitle: string;
  tierId: QuoteItemTierId;
  tierTitle: string;
  price: number | null;
  billingCycle: string;
  categoryName: string;
  features: string[];
  // Optional promotion fields — absent on all Core Tier and bundle items.
  offer_type?: 'core_tier' | 'promotion_tier';
  promotion_id?: string;
  billing_label?: string;
  // Whether this line is a stackable Tier add-on (selected alongside the
  // normal Tier for the same serviceId) rather than the one normal/exclusive
  // selection for that Service. Required and explicit — the classification
  // for the add-on capability, never inferred from serviceId's sign. Legacy
  // recommended-bundle items (tierId: 'bundle', negative serviceId) and
  // promotion items are not Tier add-ons and carry isAddon: false; they stay
  // distinguishable from real add-ons by tierId/offer_type, not merged into
  // this flag.
  isAddon: boolean;
  // Structured minimum commitment (Phase 8) — the resolved Tier Edition's
  // own minimum_term_value/unit when one applies (via PricingTiers'
  // resolveEffectiveTierDisplay), or null for every existing Tier that has
  // never used this capability. Structured data, not presentation text: the
  // cart is the boundary that preserves it, not a string the customer could
  // silently lose by re-reading a label.
  minimumTermValue: number | null;
  minimumTermUnit: string | null;
  // Phase 8J-C2 correction: the live catalog's own short description
  // (mainItems) / recommended-Bundle description (bundleItems, negative
  // serviceId) — normally re-resolved from the `services` prop at render
  // time via findService(item.serviceId) (see OrderSummary.tsx's/
  // QuoteProposalPreview.tsx's own `desc`/`bundleDesc`). Absent for every
  // cart item during normal interactive use; populated ONLY on the outgoing
  // submission payload (QuoteCartFlow.tsx's handleSubmit(), never mutating
  // the live cart item itself) so the secure quote-view reload page — which
  // never re-resolves live catalog data — can render the same optional text
  // straight from the stored snapshot. Never used for Family items, whose
  // own inclusionItems/features already fully describe them.
  serviceDescription?: string;
  bundleDescription?: string;
}

/**
 * A customer selection from a Package Family's explicitly assigned Tier
 * Instance. It deliberately has no serviceId: Services are upstream inclusion
 * sources, never the identity or discovery path for this cart line.
 */
export interface FamilyTierQuoteItem {
  offer_type: 'family_tier';
  familyId: string;
  familyPlatformId: string;
  familyTitle: string;
  tierInstanceId: string;
  tierInstancePlatformId: string;
  tierOccupantId: string;
  tierPlatformId: string;
  tierEditionPlatformId: string | null;
  // Widened (additive) to admit the composable occupant's own customer-side
  // sentinel alongside the five fixed Tier ids — see COMPOSABLE_QUOTE_TIER_ID
  // above. Every existing reader either only ever sees a real TierId here
  // (an add-on/primary-only lookup, since resolveQuoteItemRole() in
  // utils/quote.ts keeps the composable line out of both of those buckets)
  // or already fails closed on an unresolvable id (QuoteDetailsOverlay.tsx's
  // resolvePlanDetails()).
  tierId: TierId | typeof COMPOSABLE_QUOTE_TIER_ID;
  tierTitle: string;
  // Human-readable Edition label at the moment of selection (e.g.
  // effective.selectedEdition?.label), for customer-facing review/PDF
  // surfaces that must never resolve display text from live catalog data —
  // see FamilyTierAdapter.tsx's itemFor(). Null for a Default (no Edition)
  // selection; optional because carts persisted before this field existed
  // simply omit it, in which case callers fall back to tierTitle.
  tierEditionTitle?: string | null;
  price: number | null;
  billingCycle: string;
  features: string[];
  // Phase 8G: the exact resolved effective.inclusionItems structure at
  // Add-to-Quote time (see FamilyTierAdapter.tsx's itemFor()) — a Bundle
  // parent's own `includes` children travel with it here, which the flat
  // `features: string[]` labels above cannot carry. Additive alongside
  // features (never replacing it — old carts and any caller still reading
  // features keep working unchanged); customer-facing surfaces render this
  // when present and fall back to `features` when it is absent (a
  // pre-Phase-8G cart entry). Never re-resolved from live catalog data.
  inclusionItems?: ServiceInclusion[];
  isAddon: boolean;
  // The composable ("Build Your Own") occupant's own aggregate quote line —
  // a role orthogonal to isAddon, never both true at once (see
  // resolveQuoteItemRole() in utils/quote.ts, the one place that resolves
  // primary/addon/composable so no call site re-derives it). Optional
  // because every cart item that predates this capability simply omits it,
  // in which case it reads as a normal (non-composable) line, unchanged.
  isComposable?: boolean;
  // The exact customer choice submitted to the LAST SUCCESSFUL composable
  // preview this line was built from — intent/history for re-seeding
  // ComposableOfferBrowser's own Add/Remove state when the customer returns
  // to it, never itself a pricing source. price/inclusionItems/
  // legPaymentSummaries above always come from that same successful
  // preview's resolved response, never recomputed from this array. Absent
  // for every non-composable line.
  composableSelection?: ComposablePreviewChoiceItem[];
  minimumTermValue: number | null;
  minimumTermUnit: string | null;
  // Plan duration in months chosen in the focused Choose Plan view, captured
  // at the moment of selection so it travels with the line. Null for a direct
  // card selection (no duration was ever shown) and for add-on lines. Distinct
  // from minimumTermValue above, which is the Edition's own commitment —
  // nothing derives price, term, or Edition meaning from this yet. Optional
  // because carts persisted before this field existed simply omit it.
  planDurationMonths?: number | null;
  // Phase 5: the quoted Default/Edition's own resolved commercial payment
  // streams — buildLegPaymentSummaries() over its commercial_legs, captured
  // once at Add to Quote time (see FamilyTierAdapter.tsx's itemFor()), the
  // same snapshot-at-selection treatment price/billingCycle above already
  // get. price/billingCycle above stay the Headline-only card figure,
  // unchanged; this is the full multi-Leg structure for the quote panel to
  // show what price/billingCycle alone can't (e.g. a separate upfront charge
  // alongside a recurring one). Null when the quoted option has no resolved
  // commercial_legs at all (never configured, or a pre-Commercial-Legs
  // Tier); optional because carts persisted before this field existed simply
  // omit it — both cases mean "show today's single price/cycle line."
  legPaymentSummaries?: LegPaymentSummary[] | null;
  // Live-gate correction (2026-09-05, "preserve period/leg inclusion
  // attribution in quote snapshots"): the exact resolved breakdown behind
  // legPaymentSummaries above — WHICH inclusion, at what quantity/unit
  // price/line total, in which Period/component — captured once at Add to
  // Quote time from the SAME resolved CommercialLegPeriod[] (see
  // FamilyTierAdapter.tsx's itemFor(), ComposableOfferBrowser.tsx's
  // buildComposableFamilyTierQuoteItem(), buildQuotedCommercialBreakdown()
  // in PricingTiers.tsx). Additive alongside legPaymentSummaries — never
  // replaces it and is never itself a pricing source: every Monthly/Yearly/
  // Total figure a customer sees still comes from legPaymentSummaries/price
  // above exactly as before; this field only EXPLAINS those figures.
  // Preserves every Period/component occurrence exactly once — never
  // deduplicated by Leg source the way legPaymentSummaries is, since the
  // same Leg's own inclusion set can genuinely differ Period to Period.
  // Null/absent for every cart item that predates this field, or has no
  // resolved commercial_legs at all — customer surfaces fall back to
  // today's generic inclusion display (features/inclusionItems above) in
  // that case, never fabricating attribution.
  commercialBreakdown?: QuotedBreakdownPeriod[] | null;
}

export type CartItem = QuoteItem | FamilyTierQuoteItem;
