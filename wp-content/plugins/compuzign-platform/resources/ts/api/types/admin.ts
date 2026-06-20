export interface AdminOverview {
  services_published: number;
  services_draft: number;
  health: Record<string, boolean>;
  platform_version: string | null;
}

export type WorkstationId =
  | 'overview'
  | 'service-catalog'
  | 'service-archived'
  | 'service-trash'
  | 'surface-packages'
  | 'promotions'
  | 'bundles'
  | 'featured'
  | 'requests'
  | 'health';

export interface WorkstationDef {
  id:      WorkstationId;
  label:   string;
  icon:    string;
  group:   string;
  parent?: WorkstationId;
}

export const WORKSTATIONS: WorkstationDef[] = [
  { id: 'overview',          label: 'Overview',          icon: '◈', group: 'command'    },
  { id: 'service-catalog',   label: 'Service Catalog',   icon: '◫', group: 'catalog'    },
  { id: 'service-archived',  label: 'Archived',          icon: '',  group: 'catalog',   parent: 'service-catalog' },
  { id: 'service-trash',     label: 'Trash',             icon: '',  group: 'catalog',   parent: 'service-catalog' },
  { id: 'surface-packages',  label: 'Service Packages',  icon: '◧', group: 'catalog'    },
  { id: 'promotions',       label: 'Promotions',        icon: '◷', group: 'catalog'    },
  { id: 'bundles',          label: 'Bundles',           icon: '❐', group: 'catalog'    },
  { id: 'featured',         label: 'Featured Controls', icon: '◆', group: 'catalog'    },
  { id: 'requests',         label: 'Requests & Quotes', icon: '◌', group: 'operations' },
  { id: 'health',           label: 'Health & Status',   icon: '◉', group: 'operations' },
];

export const WORKSTATION_LABELS: Record<WorkstationId, string> = Object.fromEntries(
  WORKSTATIONS.map((w) => [w.id, w.label]),
) as Record<WorkstationId, string>;

// ── Requests river types ─────────────────────────────────────────────────────

export interface RequestLine {
  serviceId: number;
  serviceTitle: string;
  categoryName: string;
  tierTitle: string;
  tierId: string;
  price: number | null;
  billingCycle: string;
  features: string[];
}

export interface RequestEntry {
  quote_ref: string;
  type: string;
  contact: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
  category?: string;
  items: RequestLine[];
  submitted: string;
}

export interface RequestSummary {
  quote_ref: string;
  type?: string;
  contact: string;
  company: string;
  email: string;
  phone: string;
  category?: string;
  submitted: string;
  item_count: number;
  total: number | null;
  // Additive — Phase 1B: true when a Water record exists for this intake item.
  is_accepted?: boolean;
}

// ── Promotion tier types ──────────────────────────────────────────────────────

export type BasedOnTier = 'basic' | 'standard' | 'premium' | 'enterprise';
export type PromotionStatus = 'draft' | 'active' | 'archived';

export interface PromotionTier {
  id: string;
  name: string;
  slug: string;
  status: PromotionStatus;
  based_on: BasedOnTier | null;
  headline: string;
  description: string;
  price: number | null;
  billing_label: string;
  features: string[];
  inclusions: InclusionItem[];
  exclusions: InclusionItem[];
  badge: string;
  campaign_label: string;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  is_featured: boolean;
  metadata: Record<string, string>;
}

// ── Surface Packages river types ─────────────────────────────────────────────

export interface SurfaceTierSummary {
  label: string;
  price: number | null;
  billing_cycle: string | null;
  inclusion_count: number;
  faq_count: number;
  enabled: boolean;
  configured: boolean;
}

export interface SurfaceServiceRef {
  id: number;
  title: string;
  slug: string;
}

export interface SurfacePackageSummary {
  post_id: number;
  post_status: string;
  platform_status: string;
  title: string;
  package_type: string;
  service_refs: number[];
  services: SurfaceServiceRef[];
  tiers: Record<string, SurfaceTierSummary>;
  promotion_tiers: PromotionTier[];
  popular_tier: string | null;
  popular_label: string;
  faq_refs: string[];
  display_contexts: string[];
  migration_complete: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

export interface SurfacePackagesResponse {
  success: boolean;
  total: number;
  packages: SurfacePackageSummary[];
}

// ── Surface Package detail / tier-management types ────────────────────────────

export interface InclusionItem {
  id: string;
  label: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface SurfaceTierDetail {
  label: string;
  price: number | null;
  contact: boolean;
  billing_cycle: string | null;
  inclusions_override: InclusionItem[];
  features: string[];
  faq_refs: string[];
  enabled: boolean;
}

export interface SurfaceServiceInfo {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  categories?: Array<{ id: number; name: string; slug: string }>;
  inclusions: InclusionItem[];
  faqs: FaqItem[];
}

export interface SurfacePackageDetailData {
  post_id: number;
  post_status: string;
  platform_status: string;
  title: string;
  package_type: string;
  service_refs: number[];
  tiers: Record<string, SurfaceTierDetail>;
  promotion_tiers: PromotionTier[];
  popular_tier: string | null;
  popular_label: string;
  faq_refs: string[];
  display_contexts: string[];
  migration_complete: boolean;
}

export interface SurfacePackageDetailResponse {
  success: boolean;
  package: SurfacePackageDetailData;
  service: SurfaceServiceInfo | null;
}

export interface TierSavePayload {
  label: string;
  price: number | null;
  contact: boolean;
  billing_cycle: string;
  inclusions_override: InclusionItem[];
  faq_refs?: string[];
  popular: boolean;
  popular_label: string;
  enabled: boolean;
  new_inclusions: Array<{ label: string }>;
  new_faqs: Array<{ question: string; answer: string }>;
}

export interface TierSaveResponse {
  success: boolean;
  package_meta: SurfacePackageDetailData;
  new_inclusions_added: number;
  new_faqs_added: number;
}

export interface PackageStatusResponse {
  success: boolean;
  platform_status: string;
  /** @deprecated Use platform_status instead. */
  post_status: string;
}

export interface PromotionTierPayload {
  name: string;
  slug?: string;
  status: PromotionStatus;
  based_on: BasedOnTier | null;
  headline: string;
  description: string;
  price: number | null;
  billing_label: string;
  features: string[];
  inclusions: InclusionItem[];
  exclusions: InclusionItem[];
  badge: string;
  campaign_label: string;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  is_featured: boolean;
  metadata?: Record<string, string>;
  new_inclusions?: Array<{ label: string }>;
}

export interface PromotionTierSaveResponse {
  success: boolean;
  promo_id: string;
  promotion_tier: PromotionTier;
}

export interface PromotionTierArchiveResponse {
  success: boolean;
  promo_id: string;
  status: 'archived';
}

export interface PromotionTierReactivateResponse {
  success: boolean;
  promo_id: string;
  status: 'active';
}

export interface AcceptIntakeResponse {
  success: boolean;
  post_id: number;
  quote_ref: string;
  status: string;
  accepted_at: string;
  already_accepted: boolean;
}

export interface AdminRequestsResponse {
  success: boolean;
  requests: RequestSummary[];
  total: number;
}

// ── Service draft types ───────────────────────────────────────────────────────

export interface OverviewDraftData {
  title:        string;
  excerpt:      string;
  content:      string;
  category_ids: number[];
}

export interface ServiceModuleDrafts {
  overview:   OverviewDraftData | null;
  inclusions: ServiceInclusionItem[] | null;
  faqs:       ServiceFaqItem[] | null;
}

export interface AdminServiceDetailResponse {
  success:         boolean;
  id:              number;
  title:           string;
  excerpt:         string;
  content:         string;
  categories:      Array<{ id: number; name: string; slug: string }>;
  inclusions:      ServiceInclusionItem[];
  faqs:            ServiceFaqItem[];
  platform_status: string;
  module_status:   Record<string, string>;
  drafts:          ServiceModuleDrafts;
}

export interface ModuleSettleResponse {
  success:       boolean;
  module_status: Record<string, string>;
  service:       { id: number; title: string; excerpt: string; content: string; categories: Array<{ id: number; name: string; slug: string }> };
  inclusions:    ServiceInclusionItem[];
  faqs:          ServiceFaqItem[];
}

export interface ModuleRevertResponse {
  success:       boolean;
  module:        string;
  module_status: Record<string, string>;
}

// ── Service overview editor types ─────────────────────────────────────────────

export interface ServiceOverviewPayload {
  title: string;
  excerpt: string;
  content: string;
  category_ids: number[];
}

export interface ServiceOverviewResponse {
  success:       boolean;
  draft:         OverviewDraftData;
  module_status: Record<string, string>;
}

export interface ServiceInclusionItem {
  id: string;
  label: string;
}

export interface ServiceInclusionsPayload {
  inclusions: ServiceInclusionItem[];
}

export interface ServiceInclusionsResponse {
  success:       boolean;
  inclusions:    ServiceInclusionItem[];
  module_status: Record<string, string>;
}

export interface ServiceFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface ServiceFaqsPayload {
  faqs: ServiceFaqItem[];
}

export interface ServiceFaqsResponse {
  success:       boolean;
  faqs:          ServiceFaqItem[];
  module_status: Record<string, string>;
}

export interface ServiceStatusPayload {
  platform_status?: 'active' | 'disabled' | 'archived' | 'trashed';
  /** @deprecated Use platform_status instead. */
  is_active?: boolean;
  /** @deprecated Ignored by the server; kept for transition period only. */
  post_status?: 'publish' | 'draft';
}

export interface ServiceStatusResponse {
  success: boolean;
  service: {
    id: number;
    platform_status: string;
    module_status: Record<string, string>;
    /** @deprecated Use platform_status instead. */
    post_status: string;
    /** @deprecated Use platform_status instead. */
    is_active: boolean;
  };
}

export interface CreateSurfacePackagePayload {
  service_id: number;
  title?: string;
}

export interface CreateSurfacePackageResponse {
  success: boolean;
  package_id: number;
}

export interface CreateServicePayload {
  title: string;
  excerpt?: string;
  content?: string;
  category_ids?: number[];
}

export interface CreateServiceResponse {
  success: boolean;
  service: {
    id:              number;
    title:           string;
    slug:            string;
    platform_status: string;
    module_status:   Record<string, string>;
  };
  drafts: ServiceModuleDrafts;
}

// ── Admin station catalog ─────────────────────────────────────────────────────

export interface StationSummary {
  id:                        number;
  title:                     string;
  slug:                      string;
  categories:                Array<{ id: number | null; name: string; slug: string }>;
  platform_status:           'active' | 'disabled' | 'archived' | 'trashed';
  previous_platform_status?: 'active' | 'disabled' | '';
  module_status:             { overview: string; inclusions: string; faqs: string };
  has_drafts:                boolean;
}

export interface PermanentDeleteResponse {
  success: boolean;
  deleted: number;
}

export interface AdminCatalogResponse {
  categories: Array<{ id: number | null; name: string; slug: string }>;
  stations:   StationSummary[];
}
