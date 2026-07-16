/*
 * Service Station — frontend contracts for the cz_service entity.
 *
 * The authoritative definitions of every Service-owned API and application
 * type. Moved verbatim from api/types/admin.ts when the frontend Service
 * boundary was established; that file now re-exports these for existing
 * consumers and holds no Service definitions of its own.
 *
 * These mirror the backend module src/Modules/Service (ServiceController's 14
 * routes). Fields, optionality, and comments are unchanged — this is
 * relocation, not redesign.
 *
 * DELIBERATELY ZERO IMPORTS. api/types/admin.ts re-exports from this file, so
 * importing anything back from it would create a cycle. Keep this file
 * self-contained; if a Service type ever needs a shared shape, resolve the
 * shared type's ownership rather than importing the god module here.
 *
 * Organised by read/write boundary:
 *   CATALOGUE   list/Home summary data
 *   DETAIL      single-service read
 *   POOLS       the Service-owned inclusion/FAQ item shapes
 *   DRAFTS      pending edit state
 *   MODULE I/O  per-module draft save payloads and responses
 *   SETTLE      settle/revert responses
 *   LIFECYCLE   status, restore, delete
 *   CREATE      service creation
 */

// ── CATALOGUE: list / Home summary ───────────────────────────────────────────

/**
 * One row of the Service catalogue (GET /admin/services).
 *
 * Service-owned despite the historical name `StationSummary`: module_status
 * carries exactly the Service module triple, and the pool counts are Service
 * pools. Other stations have their own row types (CategoryStationItem,
 * CategoryGroupStationItem, PackageCategoryGroupItem). Consumers outside
 * Service hold these to display Service data — they never construct one from
 * another entity.
 */
export interface ServiceSummary {
  id:                        number;
  title:                     string;
  slug:                      string;
  categories:                Array<{ id: number | null; name: string; slug: string }>;
  platform_status:           'active' | 'disabled' | 'archived' | 'trashed';
  previous_platform_status?: 'active' | 'disabled' | '';
  module_status:             { overview: string; inclusions: string; faqs: string };
  has_drafts:                boolean;
  // Service-owned pool sizes (counts only) for the Package Manager Services table.
  inclusion_count?:          number;
  faq_count?:                number;
}

/**
 * The Service catalogue response envelope.
 *
 * `categories` is a lightweight picker projection embedded in this Service
 * route's response — deliberately NOT the Category station's model
 * (CategoryStationItem / CategoryListResponse), which Categories owns.
 */
export interface ServiceCatalogResponse {
  // platform_status is additive (S6 Phase B): entries are scoped to live
  // categories (D7) and carry their lifecycle status for selector rendering.
  categories: Array<{ id: number | null; name: string; slug: string; description: string; platform_status?: 'active' | 'disabled' }>;
  stations:   ServiceSummary[];
}

// ── DETAIL: single-service read ──────────────────────────────────────────────

/** GET /admin/services/{id} — the drawer-open read. */
export interface ServiceDetail {
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

// ── POOLS: Service-owned item shapes ─────────────────────────────────────────

export interface ServiceInclusionItem {
  id: string;
  label: string;
}

export interface ServiceFaqItem {
  id: string;
  question: string;
  answer: string;
}

// ── DRAFTS: pending edit state ───────────────────────────────────────────────

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

// ── EDIT DRAFTS: the shapes the editors hold while a module is being edited ───
//
// Distinct from the *Data shapes above, which are what the server stores and
// returns: an edit draft carries what the form is working on. `OverviewDraft`
// notably holds a single `category_id`, while the persisted `OverviewDraftData`
// carries `category_ids`; useServiceStation converts between them on save.
//
// These are pure data — no props, no rendering. They are contracts because they
// appear in useServiceStation's public save signatures, so the station owns
// them and the editors import them back. The editors still own the `init*Draft`
// builders, which need the DOM.

export interface OverviewDraft {
  title: string;
  excerpt: string;
  content: string;
  category_id: number | null;
}

export interface InclusionDraftItem {
  id: string;
  label: string;
}

export interface InclusionsDraft {
  items: InclusionDraftItem[];
}

export interface FaqDraftItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqsDraft {
  items: FaqDraftItem[];
}

// ── MODULE I/O: per-module draft saves ───────────────────────────────────────

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

export interface ServiceInclusionsPayload {
  inclusions: ServiceInclusionItem[];
}

export interface ServiceInclusionsResponse {
  success:       boolean;
  inclusions:    ServiceInclusionItem[];
  module_status: Record<string, string>;
}

export interface ServiceFaqsPayload {
  faqs: ServiceFaqItem[];
}

export interface ServiceFaqsResponse {
  success:       boolean;
  faqs:          ServiceFaqItem[];
  module_status: Record<string, string>;
}

// ── SETTLE: settle / revert ──────────────────────────────────────────────────

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

// ── LIFECYCLE: status, restore, delete ───────────────────────────────────────

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

/** DELETE /admin/services/{id}. Service-only despite the generic name. */
export interface PermanentDeleteResponse {
  success: boolean;
  deleted: number;
}

// ── CREATE ───────────────────────────────────────────────────────────────────

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

// The pre-extraction aliases (AdminServiceDetailResponse, StationSummary,
// AdminCatalogResponse) were removed at the Phase 7 cutover; every consumer now
// reads the canonical name above.
