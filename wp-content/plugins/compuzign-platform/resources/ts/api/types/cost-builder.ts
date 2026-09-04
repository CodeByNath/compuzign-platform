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
  // Phase 2B1 — browse/merchandising-only fields, additive on every
  // occupant-sourced inclusion (composable and normal Tier alike; the
  // backend projects them through one shared function). unit_price/
  // line_total are this row's own resolved Rate Sheet price at its
  // published quantity/Price Option — never itself a customer control.
  // categories/service are live-resolved supplying-Service provenance
  // labels for filtering only, never an authorization signal — see
  // PackageRepository::compileOccupantSlotForCostBuilder().
  unit_price?: number | null;
  line_total?: number | null;
  categories?: string[];
  service?: string | null;
}

// Phase 2B1 — Admin-authorized customer selection bounds for the composable
// Tier occupant (and, when configured, a Tier Edition). Server-owned policy:
// PackageSchema::sanitizeCustomerPolicy() is the only place this shape is
// produced, and the public projection (PackageFamilyPricingBuilder::
// presentCustomerPolicy()) has already stripped every `mode: 'excluded'`
// entry — an item_id absent from `items` here is simply not offered.
// Price Option is deliberately never customer-controlled in this phase: a
// 'choice' entry names its own Admin-configured default only for display;
// there is no client field anywhere in this contract to submit an
// alternative, and PackageRepository::resolveComposableOfferSelection()
// silently drops one if a caller sends it anyway.
export interface CustomerPolicyQuantityBounds {
  default: number;
  min: number;
  max: number;
  step: number;
}

export interface CustomerPolicyPriceOption {
  mode: 'fixed' | 'choice';
  allowed_price_option_ids: string[] | null;
  default_price_option_id: string | null;
}

export interface CustomerPolicyItem {
  item_id: string;
  // The true backend shape (PackageSchema::sanitizeCustomerPolicy()) always
  // allows 'excluded' — the CUSTOMER-facing projection this type originally
  // modeled never actually carries one (PackageFamilyPricingBuilder::
  // presentCustomerPolicy() strips every excluded entry before it reaches
  // the wire), but the raw admin-side stored/settled policy
  // (package-station's own Admin "Customer Options" drawer) does, so the
  // type must allow it to stay accurate for both readers of this one shape.
  mode: 'required' | 'optional' | 'excluded';
  // Only meaningful when mode === 'optional'.
  default_selected: boolean;
  // null = fixed at this item's own published quantity — render no selector.
  quantity: CustomerPolicyQuantityBounds | null;
  price_option: CustomerPolicyPriceOption;
  // Merchandising-only sort/highlight flag — never authorization. Structurally
  // cannot reference an unauthorized item_id: it lives on this same
  // policy-authorized entry.
  featured: boolean;
}

export interface CustomerPolicy {
  items: CustomerPolicyItem[];
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
  // Customer-facing Headline pointer — presentation metadata only, this
  // Edition's own independent choice (never shared with the occupant's).
  // Already resolved server-side to a real Leg identity (or the literal
  // 'default'), matching exactly what one of commercial_legs' own
  // components[].source will carry — see resolveHeadlinePrice() in
  // PricingTiers.tsx. Never itself a price/cycle value.
  headline_leg_id?: string;
  // Phase 2B1 — this Edition's own customer selection policy. Absent/null
  // for every Edition that has never configured one (identical posture to
  // commercial_legs/headline_leg_id above).
  customer_policy?: CustomerPolicy | null;
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
  // Present (non-null) only for a Bundle-backed row — its compiled supplied
  // content, already emitted by PackageManagerSchema::projectTierRateSheetWith()
  // ('includes' => $rateItem['includes'] ?? null) and carried through
  // resolveCommercialLegTimeline() unchanged. Display-only, mirrors
  // ServiceInclusion.includes; a Bundle is still exactly one row/one
  // commercial inclusion, never separately priced/selectable entries.
  includes?: CommercialLegPricedItem[] | null;
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
  // Customer-facing Headline pointer — presentation metadata only, never a
  // pricing calculation of its own. Already resolved server-side to a real
  // Leg identity (or the literal 'default'), matching exactly what one of
  // commercial_legs' own components[].source will carry — see
  // resolveHeadlinePrice() in PricingTiers.tsx.
  headline_leg_id?: string;
  // Phase 2B1 — Admin-authorized customer selection bounds for this
  // occupant's own Default declaration. Null for every occupant that has
  // never configured one (normal Tiers today, and any Family predating
  // this field) — same additive-absence posture as commercial_legs/
  // edition_options above.
  customer_policy?: CustomerPolicy | null;
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
  pricing: {
    tiers: Partial<Record<TierId, PricingTierData>>;
    // Phase 1A/2B1 — the subordinate composable Tier occupant, projected
    // through the exact same shape as any `tiers[tierId]` entry, but never
    // itself a member of the exclusive "Choose your Tier" set `tiers`
    // drives. Absent entirely when the Family has none configured.
    composable_offer?: PricingTierData | null;
  };
}

export interface PackageBuilderResponse {
  tiers: Tier[];
  families: PackageBuilderFamily[];
}

// Phase 2B1 — one Add/Remove/quantity candidate row a customer submits to
// POST /package-builder/composable-preview. `price_option_id` is
// deliberately not a field here at all: this contract has no client-facing
// Price Option control — see CustomerPolicy above.
export interface ComposablePreviewChoiceItem {
  item_id: string;
  // Only meaningful for a 'optional' policy item — omit for 'required'.
  selected?: boolean;
  // Only meaningful for an item with non-null quantity bounds — omit for a
  // fixed-quantity item; the server ignores this field for one anyway.
  quantity?: number;
}

// PackageManagerSchema::resolveCustomerComposableSelection()'s own return
// shape, unchanged end to end through PackageRepository::
// resolveComposableOfferSelection().
export interface ComposablePreviewResult {
  ok: boolean;
  periods?: CommercialLegPeriod[];
  code?: string;
  rejected_items?: { item_id: string | null; reason: string }[];
}
