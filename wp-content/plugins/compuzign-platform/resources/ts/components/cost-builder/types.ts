import type { ServiceInclusion, TierId } from '@/api/types/cost-builder';
import type { LegPaymentSummary } from './PricingTiers';

// 'bundle' = recommended bundle; 'promotion' = active promotion tier offer
export type QuoteItemTierId = TierId | 'bundle' | 'promotion';

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
  tierId: TierId;
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
}

export type CartItem = QuoteItem | FamilyTierQuoteItem;
