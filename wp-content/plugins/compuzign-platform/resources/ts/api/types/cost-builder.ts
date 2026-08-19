export type TierId = 'basic' | 'standard' | 'premium' | 'enterprise' | 'ultimate';

export interface Category {
  id:           number | null;
  platformId?:  string;
  name:         string;
  slug:         string;
  description?: string;
}

export interface Tier {
  id: TierId;
  title: string;
}

export interface ServiceInclusion {
  id: string;
  label: string;
  // Resolved Rate Sheet selection quantity. Present on occupant-sourced
  // inclusions; absent on plain text-feature-derived ones.
  quantity?: number;
  // Present when this inclusion is a Bundle parent row — the Bundle's own
  // Rate Sheet identity, paired with `includes` below.
  bundle_id?: string;
  // Bundle child rows, display-only: never separately priced, never
  // selectable, never flattened into the top-level inclusion list.
  includes?: ServiceInclusion[];
}

export interface ServiceFaq {
  id: string;
  question: string;
  answer: string;
}

export type PlatformStatus = 'active' | 'disabled' | 'archived' | 'trashed';
export type ModuleTransition = 'settled' | 'pending' | 'not-configured';

export interface ModuleStatus {
  overview:   ModuleTransition;
  inclusions: ModuleTransition;
  faqs:       ModuleTransition;
}

export interface ServiceMeta {
  platform_status: PlatformStatus;
  // The mask signal Disable/Enable use: non-empty while platform_status is
  // 'disabled' means an explicit Disable applied and captured what to restore;
  // empty means 'disabled' because the Service has never been published.
  previous_platform_status?: 'active' | 'disabled' | '';
  module_status:   ModuleStatus;
  short_description: string;
  long_description: string;
  billing_cycle: string;
  sla: string;
  uptime: string;
  notes: string;
  popular_tier: TierId | null;
  popular_label: string | null;
  sort_order: number;
  /** @deprecated Use platform_status instead. */
  is_active?: boolean | null;
}

// Tier Edition — an opaque in-card switch option, always an ALTERNATE to
// the Tier's own permanent Default declaration (the top-level price/
// billing_cycle/inclusions fields below, which are always the occupant's
// own values — never displaced by an Edition). `id` is a selector key only
// (never a Platform ID: CZTE stays admin/audit-only and is never exposed
// here — see PackageSchema::publicTierEditionOptions()). Active Editions
// only; a Pending/Disabled/Archived/Trashed one never appears. Switching
// between these must never select a different Tier — the Tier's own
// identity (tierId) never changes.
export interface PricingEditionOption {
  id: string;
  label: string;
  price: number | null;
  contact: boolean;
  billing_cycle: string | null;
  minimum_term_value: number | null;
  minimum_term_unit: string | null;
  inclusions_override: ServiceInclusion[];
  edition_platform_id?: string;
  // This Edition's own multi-cycle schedule (Phase 3), independent of the
  // occupant's — see PricingTierData.active_billing_cycles/commercial_legs
  // below. Absent/empty for every Edition that has never used this
  // capability.
  active_billing_cycles?: string[];
  commercial_legs?: PricingCommercialLeg[];
}

// One resolved, priced segment of a Tier occupant's or Edition's own
// multi-cycle commercial schedule — start_month/end_month are 1-based
// inclusive months within that record's own minimum_term_value/unit
// commitment, never a commitment of their own. price/inclusions are already
// live-resolved through the same Rate Sheet the record's own top-level
// price/inclusions come from — never a second pricing source.
export interface PricingCommercialLeg {
  id: string;
  payment_category: string;
  billing_cycle: string;
  start_month: number;
  // Null means Indefinite — no commitment bounds this leg's end. See
  // docs/code-map/tier-pricing-rules-plan.md.
  end_month: number | null;
  price: number | null;
  inclusions: ServiceInclusion[];
}

export interface PricingTierData {
  /** Present on the direct Family projection; absent on legacy Service payloads. */
  tier_occupant_id?: string;
  tier_platform_id?: string;
  price: number | null;
  billing_cycle: string;
  inclusions: ServiceInclusion[];
  features: string[]; // transitional compatibility — prefer inclusions
  label?: string; // admin display-label override; falls back to Tier.title when absent
  // Occupant's own short description of who this Tier suits. Present on the
  // direct Family projection; absent on legacy Service payloads.
  ideal_for?: string;
  // An occupant belongs to its Tier Group, not one customer audience.
  // Present on the direct Family projection; absent on legacy Service
  // payloads.
  audience_groups?: ('personal_business' | 'enterprise')[];
  // Selection mode: false = this Tier is offered as the customer's one
  // exclusive normal choice; true = it is offered as a stackable add-on
  // alongside whichever normal Tier is selected. Always present — legacy/
  // canonical tiers with no occupant record default to false.
  is_addon: boolean;
  // Additive only. Empty for every Tier that has never used this capability.
  // `price`/`billing_cycle`/`inclusions` above are always the occupant's own
  // permanent Default declaration — this array exists only so the customer
  // can switch IN PLACE to one of the Tier's additional Edition declarations.
  edition_options?: PricingEditionOption[];
  // The occupant's own permanent Default declaration's minimum commitment —
  // same concern as an Edition's own minimum_term_value/unit above. Null for
  // every Tier that has never configured one, exactly like price/billing_cycle.
  minimum_term_value?: number | null;
  minimum_term_unit?: string | null;
  // The occupant's own multi-cycle schedule (Phase 3), independent of any
  // Edition's own (see PricingEditionOption above — never inherited either
  // way). Absent/empty for every occupant that has never used this
  // capability; price/billing_cycle/inclusions above stay fully
  // authoritative for that occupant, exactly as before this capability
  // existed.
  active_billing_cycles?: string[];
  commercial_legs?: PricingCommercialLeg[];
}

export interface ServicePricing {
  tiers: Record<TierId, PricingTierData>;
  bundle: {
    title: string;
    description: string;
    price: number | null;
  };
}

export interface PromotionOffer {
  id: string;
  name: string;
  headline: string;
  description: string;
  badge: string;
  campaign_label: string;
  price: number | null;
  billing_label: string;
  billing_cycle: string;
  inclusions: ServiceInclusion[];
  features: string[];
  exclusions: ServiceInclusion[];
  based_on: string | null;
  is_featured: boolean;
  priority: number;
}

export interface ServiceAvailability {
  is_available: boolean;
  message: string;
}

export interface ServiceItem {
  id: number;
  // Present on authoritative admin Service projections. The public Cost Builder
  // response deliberately does not expose permanent administration identity.
  platformId?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categories: Category[];
  inclusions: ServiceInclusion[];
  faqs: ServiceFaq[];
  availability: ServiceAvailability;
  meta: ServiceMeta;
  pricing: ServicePricing;
  promotion_tiers: PromotionOffer[];
}

export interface ServicesByCategory {
  category_id: number | null;
  category_name: string;
  category_slug: string;
  services: ServiceItem[];
}

export interface CostBuilderResponse {
  categories: Category[];
  tiers: Tier[];
  services_by_category: ServicesByCategory[];
}

export interface PackageBuilderFamily {
  family_id: string;
  family_platform_id: string;
  title: string;
  description: string;
  tier_instance_id: string;
  tier_instance_platform_id: string;
  popular_tier: TierId | null;
  popular_label: string | null;
  included_categories: string[];
  pricing: { tiers: Partial<Record<TierId, PricingTierData>> };
}

export interface PackageBuilderResponse {
  tiers: Tier[];
  families: PackageBuilderFamily[];
}
