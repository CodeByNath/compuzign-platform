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

// Tier Edition (Phase 7) — an opaque in-card switch option. `id` is a
// selector key only (never a Platform ID: CZTE stays admin/audit-only and
// is never exposed here — see PackageSchema::publicTierEditionOptions()).
// Active Editions only; a Pending/Disabled/Archived/Trashed one never
// appears. Switching between these must never select a different Tier —
// the Tier's own identity (tierId) never changes.
export interface PricingEditionOption {
  id: string;
  label: string;
  price: number | null;
  contact: boolean;
  billing_cycle: string | null;
  minimum_term_value: number | null;
  minimum_term_unit: string | null;
  inclusions_override: ServiceInclusion[];
  is_default: boolean;
}

export interface PricingTierData {
  price: number | null;
  billing_cycle: string;
  inclusions: ServiceInclusion[];
  features: string[]; // transitional compatibility — prefer inclusions
  label?: string; // admin display-label override; falls back to Tier.title when absent
  // Selection mode: false = this Tier is offered as the customer's one
  // exclusive normal choice; true = it is offered as a stackable add-on
  // alongside whichever normal Tier is selected. Always present — legacy/
  // canonical tiers with no occupant record default to false.
  is_addon: boolean;
  // Phase 7 — additive only. Empty for every Tier that has never used this
  // capability; the switch renders only when length > 1. `price`/
  // `billing_cycle`/`inclusions` above already reflect whichever Edition
  // the occupant's own default_edition_id resolves to (or the Tier's own
  // legacy-flat declaration when none applies) — this array exists only so
  // the customer can switch to a DIFFERENT Edition's declaration in place.
  edition_options?: PricingEditionOption[];
  // Phase 8 — the resolved default Edition's own minimum commitment (or
  // null for every Tier that has never used this capability), the same
  // resolved-default-carries-into-the-top-level-fields treatment `price`/
  // `billing_cycle` already receive.
  minimum_term_value?: number | null;
  minimum_term_unit?: string | null;
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
