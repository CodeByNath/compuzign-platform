import type { TierId } from '@/api/types/cost-builder';

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
  price: number | null;
  billingCycle: string;
  features: string[];
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
}

export type CartItem = QuoteItem | FamilyTierQuoteItem;
