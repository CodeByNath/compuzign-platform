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
  // Resolved Default + Additional Leg commercial timeline for THIS
  // Edition's own rate_sheet_id/rate_sheet_items/legs — see
  // PackageManagerSchema::resolveCommercialLegTimeline(). Additive
  // alongside price/billing_cycle/inclusions_override above, which stay the
  // Edition's own flat/base declaration.
  commercial_legs?: CommercialLegPeriod[];
}

// One resolved commercial-priced Rate Sheet selection inside a Commercial
// Leg component — PackageManagerSchema::projectTierRateSheetWith()'s own
// per-row selection shape, carried through resolveCommercialLegTimeline()
// unchanged. Distinct from ServiceInclusion (the flat/base declaration's own
// display shape); mapped to it only for display, never merged.
export interface CommercialLegPricedItem {
  item_id: string;
  label: string;
  quantity: number;
  price_option_id: string | null;
  unit_price: number | null;
  line_total: number | null;
  available: boolean;
}

// One resolved commercial identity's contribution within a Period — the
// occupant's/Edition's own Default Leg, or one Additional Leg. `source` is
// that Leg's own real commercial identity: a Leg Platform ID (CZTL/CZTEL),
// or the literal string 'default' ONLY as a legacy fallback for a Default
// Leg that predates Platform ID backfill — never array position, a display
// label, or billing_cycle text. Two components sharing the same item_id
// inside their own `items` is normal (independent commercial identities),
// never a collision to resolve on the frontend.
export interface CommercialLegComponent {
  source: string;
  billing_cycle: string | null;
  price: number | null;
  available: boolean;
  items: CommercialLegPricedItem[];
}

// One resolved, time-scoped segment of a Tier occupant's/Edition's own
// commercial timeline — see PackageManagerSchema::resolveCommercialLegTimeline().
// A Period itself carries no Platform ID (it is a resolved range, not an
// independently identified commercial atom); the component(s) inside it are
// the identified commercial components. `to_month: null` means indefinite
// (open-ended), same convention as minimum_term_value/unit elsewhere.
export interface CommercialLegPeriod {
  from_month: number;
  to_month: number | null;
  components: CommercialLegComponent[];
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
  // Resolved Default + Additional Leg commercial timeline for this
  // occupant's own rate_sheet_id/rate_sheet_items/legs — see
  // PackageManagerSchema::resolveCommercialLegTimeline(). Additive
  // alongside price/billing_cycle/inclusions above, which stay the
  // occupant's own flat/base Default declaration.
  commercial_legs?: CommercialLegPeriod[];
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
