export interface AdminOverview {
  services_published: number;
  services_draft: number;
  health: Record<string, boolean>;
  platform_version: string | null;
}

// Temporary — Phase 4 promotion migration result. Remove after migration is validated.
export interface MigrationPhase4Result {
  success: boolean;
  results: {
    migrated:         number;
    already_migrated: number;
    born_empty:       number;
    errors:           Array<{ service_id: number; message: string }>;
  };
}

// Phase 4 — service-level Promotion Station responses.
export interface ServicePromotionStationResponse {
  success:    boolean;
  service_id: number;
  promotions: PromotionTier[];
  service: {
    id:         number;
    title:      string;
    inclusions: InclusionItem[];
    faqs:       FaqItem[];
  };
}

export interface ServicePromotionSaveResponse {
  success:        boolean;
  promo_id:       string;
  promotion_tier: PromotionTier;
}

// Temporary — Phase 1+3 migration run result. Remove after migration is validated.
export interface MigrationRunResult {
  success: boolean;
  results: {
    migrated:         number;
    already_migrated: number;
    born_empty:       number;
    errors:           Array<{ service_id: number; message: string }>;
  };
}

// Temporary — Phase 2 migration run result. Remove after migration is validated.
export interface MigrationPhase2Result {
  success: boolean;
  results: {
    migrated:         number;
    already_migrated: number;
    errors:           Array<{ service_id: number; message: string }>;
  };
}

// Phase 2 — Service Station-owned Package Station tier management.
// Engine D2 — a displaced tier occupant travelling through the bin. The shell
// never travels; origin_tier remembers where the occupant came from so restore
// (D3) can return it, swap, or retarget. Occupant pool refs travel untouched.
// The occupant is the raw stored record (upsertOccupant shape), not the
// normalised SurfaceTierDetail.
export interface BinnedOccupant {
  id?:                  string;
  platform_status?:     string;
  label?:               string;
  price?:               number | null;
  contact?:             boolean;
  billing_cycle?:       string | null;
  inclusions_override?: InclusionItem[];
  features?:            string[];
  faq_refs?:            string[];
}

export interface OccupantBinEntry {
  bin_id:           string;
  origin_tier:      string;
  occupant:         BinnedOccupant;
  status:           'archived' | 'trashed';
  previous_enabled: boolean;
  displaced_at:     string | null;
}

export interface ServicePackageStationData {
  platform_status: string;
  tiers:           Record<string, SurfaceTierDetail>;
  popular_tier:    string | null;
  popular_label:   string;
  sort_position:   number;
  bundle:          { title: string; description: string; price: number | null };
  // D2 additive read exposure — [] for stations predating the bin.
  occupant_bin?:   OccupantBinEntry[];
}

export interface ServicePackageStationResponse {
  success:    boolean;
  service_id: number;
  station:    ServicePackageStationData;
  service: {
    id:         number;
    title:      string;
    inclusions: InclusionItem[];
    faqs:       FaqItem[];
  };
}

export interface ServiceTierSaveResponse {
  success:              boolean;
  station:              ServicePackageStationData;
  new_inclusions_added: number;
  new_faqs_added:       number;
}

// Phase 2 — P5 Step 2: immediate canonical pool creation. Service owns the pool;
// the caller attaches the returned id to a tier's module draft in a separate save.
export interface CreateInclusionPoolItemResponse {
  success:   boolean;
  existing:  boolean;
  inclusion: InclusionItem;
}

export interface CreateFaqPoolItemResponse {
  success:  boolean;
  existing: boolean;
  faq:      FaqItem;
}

// Temporary — Phase 0 migration readiness audit. Remove after migration is validated.
export interface MigrationAudit {
  counts: {
    services:   number;
    packages:   number;
    promotions: number;
  };
  promotions_by_status: Record<string, number>;
  services_without_package: {
    count: number;
    ids:   number[];
  };
  packages_empty_refs: {
    count: number;
    ids:   number[];
  };
  packages_broken_refs: {
    count: number;
    items: Array<{ package_id: number; missing_service: number }>;
  };
  multi_service_packages: {
    count:  number;
    result: 'CLEAR' | 'BLOCKED';
    items:  Array<{ package_id: number; service_ids: number[] }>;
  };
}

export type WorkstationId =
  | 'overview'
  | 'service-catalog'
  | 'service-archived'
  | 'service-trash'
  | 'category-catalog'
  | 'bundles'
  | 'featured'
  | 'requests'
  | 'health'
  | 'bin';

// The workstation registry itself (entries, groups, labels) lives in
// components/admin/schema/workstations.ts (Schema architecture S5). Only the
// type-level contract stays here; WorkstationSchema extends WorkstationDef.
export interface WorkstationDef {
  id:      WorkstationId;
  label:   string;
  group:   string;
  parent?: WorkstationId;
}

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

export type BasedOnTier = 'basic' | 'standard' | 'premium' | 'enterprise' | 'ultimate';
// C3 widened to the full engine vocabulary: transitions can now land instances
// on disabled (toggle/restore) and trashed. The legacy trio remains what the
// pre-cutover UI displays; C5 teaches the UI the full set.
export type PromotionStatus = 'draft' | 'active' | 'disabled' | 'archived' | 'trashed';

export type PromotionModuleKey = 'overview' | 'features' | 'faqs';

// Lifecycle engine C1 — promotion module drafts, the travelling-instance
// counterpart of TierDrafts. Overview carries the module's scalar fields only;
// status is deliberately absent — travel state is engine-owned, never draftable.
// All slots stay null until the C2 draft-save endpoints land.
export interface PromotionOverviewDraft {
  name: string;
  slug: string;
  based_on: BasedOnTier | null;
  headline: string;
  description: string;
  price: number | null;
  billing_label: string;
  badge: string;
  campaign_label: string;
  priority: number;
  is_featured: boolean;
}

export interface PromotionDrafts {
  overview: PromotionOverviewDraft | null;
  features: InclusionItem[] | null;
  faqs: string[] | null;
}

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
  faq_refs: string[];
  badge: string;
  campaign_label: string;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  is_featured: boolean;
  metadata: Record<string, string>;
  // C1 — additive lifecycle read exposure: raw drafts + module_status returned
  // SEPARATELY by getPromotionStation (no server-side merge; the hook derives
  // draft-preferred client-side — parity with SurfaceTierDetail's P3/P4 shape).
  drafts?: PromotionDrafts;
  module_status?: Record<string, string>;
}

// C2 — module draft save / settle / revert response (parity with
// TierLifecycleResponse): the raw lifecycle layer plus the normalised instance
// for whole-record patches.
export interface PromotionLifecycleResponse {
  success:        boolean;
  message?:       string;
  promo_id:       string;
  module?:        PromotionModuleKey;
  drafts:         PromotionDrafts;
  module_status:  Record<string, string>;
  promotion_tier: PromotionTier;
}

// C3 — engine travel transition response. publish settles first and therefore
// additionally carries the C2 lifecycle payload.
export interface PromotionTransitionResponse {
  success:         boolean;
  message?:        string;
  promo_id:        string;
  status:          PromotionStatus;
  previous_status: PromotionStatus | null;
  drafts?:         PromotionDrafts;
  module_status?:  Record<string, string>;
  promotion_tier?: PromotionTier;
}

export interface PromotionDeleteResponse {
  success:  boolean;
  message?: string;
  promo_id: string;
  deleted?: boolean;
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
  // B2 — set by the admin read endpoints when the ref no longer resolves against
  // the service inclusion pool. The cached label is kept; the ref is never pruned.
  missing?: boolean;
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
  // Phase 2 (P3) additive read exposure: the tier's pending per-module drafts and
  // module lifecycle status, returned alongside the settled fields above. Optional
  // because pre-P3 responses (and locally-constructed fallbacks) omit them; the
  // draft-preferred merge is performed client-side by usePackageStation.
  drafts?: TierDrafts;
  module_status?: Record<string, string>;
}

// Phase 2 (P3/P4) tier lifecycle shapes — the per-module draft payloads/response
// carried by the package station. `overview` holds tier-owned scalars; `features`
// and `faqs` hold references into the service pool (anchor/consumer model).
export interface TierOverviewDraft {
  label: string;
  price: number | null;
  contact: boolean;
  billing_cycle: string;
}

export interface TierDrafts {
  overview: TierOverviewDraft | null;
  features: InclusionItem[] | null;
  faqs:     string[] | null;
}

export type TierModuleKey = 'overview' | 'features' | 'faqs';

export type TierModuleSavePayload =
  | TierOverviewDraft
  | { inclusions_override: InclusionItem[] }
  | { faq_refs: string[] };

// Response of the per-module save and settle endpoints. `tier` is the settled
// detail (unchanged by a draft save; rewritten by settle); `drafts`/`module_status`
// are the full updated maps for the tier.
export interface TierLifecycleResponse {
  success:       boolean;
  tier_id:       string;
  module?:       TierModuleKey;
  tier:          SurfaceTierDetail;
  drafts:        TierDrafts;
  module_status: Record<string, string>;
}

// Engine D2/D4 — tier occupant archive response. Failures carry `code`
// (pending_drafts) so the UI can confirm-discard and retry; success carries the
// emptied shell plus the updated bin and re-derived station status.
export interface TierArchiveResponse {
  success:          boolean;
  message?:         string;
  code?:            string;
  tier_id?:         string;
  tier?:            SurfaceTierDetail;
  drafts?:          TierDrafts;
  module_status?:   Record<string, string>;
  bin_entry?:       OccupantBinEntry;
  occupant_bin?:    OccupantBinEntry[];
  platform_status?: string;
}

// Engine D3/D4 — bin restore response. Failures carry `code` for the confirm
// flows (target_occupied → offer swap/retarget, pending_drafts → confirm
// discard, origin_unknown → retarget only). Swap additionally returns the
// displaced entry now in the bin.
export interface BinRestoreResponse {
  success:          boolean;
  message?:         string;
  code?:            string;
  bin_id?:          string;
  tier_id?:         string;
  tier?:            SurfaceTierDetail;
  drafts?:          TierDrafts;
  module_status?:   Record<string, string>;
  displaced_entry?: OccupantBinEntry | null;
  occupant_bin?:    OccupantBinEntry[];
  platform_status?: string;
}

export interface BinTrashResponse {
  success:       boolean;
  message?:      string;
  code?:         string;
  bin_id?:       string;
  bin_entry?:    OccupantBinEntry;
  occupant_bin?: OccupantBinEntry[];
}

export interface BinDeleteResponse {
  success:       boolean;
  message?:      string;
  code?:         string;
  bin_id?:       string;
  deleted?:      boolean;
  occupant_bin?: OccupantBinEntry[];
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
  faq_refs: string[];
  badge: string;
  campaign_label: string;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  is_featured: boolean;
  metadata?: Record<string, string>;
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
  categories:      Array<{ id: number; name: string; slug: string; description?: string }>;
  inclusions:      ServiceInclusionItem[];
  faqs:            ServiceFaqItem[];
  platform_status: string;
  module_status:   Record<string, string>;
  drafts:          ServiceModuleDrafts;
}

// B3 — non-blocking pool-settle guard entry: a pool item the settle removed
// while it is still referenced somewhere in the station graph. Holder labels
// are engine-formatted (e.g. 'tier:premium', 'promo:promo_ab12:draft').
export interface PoolSettleWarning {
  id:            string;
  label:         string;
  referenced_by: string[];
}

export interface ModuleSettleResponse {
  success:       boolean;
  module_status: Record<string, string>;
  service:       { id: number; title: string; excerpt: string; content: string; categories: Array<{ id: number; name: string; slug: string }> };
  inclusions:    ServiceInclusionItem[];
  faqs:          ServiceFaqItem[];
  // Present only when the settle orphaned still-referenced pool items.
  pool_warnings?: PoolSettleWarning[];
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
    categories:      Array<{ id: number; name: string; slug: string; description: string }>;
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

// ── Category station (S6) ─────────────────────────────────────────────────────

export interface CategoryOverviewDraft {
  name:        string;
  description: string;
}

// The /admin/categories list-route projection: draft-preferred overview fields
// (name/description show the draft when one exists) + the lifecycle envelope.
// Slug is settled-only (immutable, D5). assigned_count is the D6 delete-guard
// predicate: services assigned to the term in any status.
export interface CategoryStationItem {
  id:                       number;
  name:                     string;
  slug:                     string;
  description:              string;
  platform_status:          'active' | 'disabled' | 'archived' | 'trashed';
  previous_platform_status: 'active' | 'disabled' | '';
  module_status:            { overview: string };
  has_draft:                boolean;
  assigned_count:           number;
}

export interface CategoryListResponse {
  categories: CategoryStationItem[];
}

// Shared by create / settle / revert / status / restore — each returns the full
// refreshed projection.
export interface CategoryMutationResponse {
  success:  boolean;
  message?: string;
  category: CategoryStationItem;
}

export interface CategoryOverviewSaveResponse {
  success:       boolean;
  draft:         CategoryOverviewDraft;
  module_status: { overview: string };
}

// Success shape only. A D6 guard failure is an HTTP 409 — apiClient throws, and
// the error text carries the JSON body { message, assigned_count } for the
// surface's inline-confirm error path to parse.
export interface CategoryDeleteResponse {
  success: boolean;
  deleted: number;
}

export interface AdminCatalogResponse {
  // platform_status is additive (S6 Phase B): entries are scoped to live
  // categories (D7) and carry their lifecycle status for selector rendering.
  categories: Array<{ id: number | null; name: string; slug: string; description: string; platform_status?: 'active' | 'disabled' }>;
  stations:   StationSummary[];
}
