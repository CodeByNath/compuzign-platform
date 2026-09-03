// Shared pool item shapes are owned by the neutral pool contract module; this
// file consumes them like any other station does.
import type { InclusionItem, FaqItem } from './pools';

export interface AdminOverview {
  services_published: number;
  services_draft: number;
  health: Record<string, boolean>;
  platform_version: string | null;
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


// Package contracts/endpoints are owned by Package Station and are NOT
// re-exported here. Import them from '@/package-station'.


export type StationId =
  | 'overview'
  | 'service-catalog'
  | 'service-archived'
  | 'service-trash'
  | 'package-manager'
  | 'category-catalog'
  | 'category-archived'
  | 'category-trash'
  | 'category-group-catalog'
  | 'category-group-archived'
  | 'category-group-trash'
  | 'bundles'
  | 'featured'
  | 'requests'
  | 'health'
  | 'bin';

// Type-level station contract. The concrete station registry (entries, groups,
// labels) belonged to the retired Command Centre; only this shared contract
// remains for consumers that describe a station.
export interface StationDef {
  id:      StationId;
  label:   string;
  group:   string;
  parent?: StationId;
}

// ── Requests (CRM-1B: durable RequestRepository, not a quote transient) ──────

export type RequestStatus = 'pending' | 'approved' | 'cancelled';

// One inclusion snapshot row (RequestSchema::sanitizeInclusionItems()) — a
// Bundle parent carries no quantity and nests its real children in `includes`.
export interface RequestInclusionItem {
  id: string;
  label: string;
  quantity?: number;
  bundle_id?: string;
  includes?: RequestInclusionItem[];
}

// One Leg payment stream snapshot (RequestSchema::sanitizeLegPaymentSummaries()).
export interface RequestLegPaymentSummary {
  source: string;
  billingCycle: string | null;
  price: number | null;
  startMonth: number;
  endMonth: number | null;
  isOngoing: boolean;
  occurrenceMonths: number[];
  subtotal: number | null;
}

// Matches RequestSchema::sanitizeItems()'s real stored shape exactly: a
// legacy Service/Bundle/Tier-add-on line and a `family_tier` line share
// tierTitle/tierId/price/billingCycle/features/offer_type/isAddon/
// promotion_id/billing_label/minimumTermValue/minimumTermUnit — every
// other field is present on exactly one of the two branches, never both
// (the legacy branch's serviceTitle/categoryName are explicitly unset for
// `family_tier`, and vice versa for serviceId/serviceDescription).
export interface RequestLine {
  offer_type: string;
  tierTitle: string;
  tierId: string;
  price: number | null;
  billingCycle: string;
  features: string[];
  isAddon: boolean;
  promotion_id: string;
  billing_label: string;
  minimumTermValue: number | null;
  minimumTermUnit: string | null;
  // Legacy Service/Bundle/Tier-add-on lines only.
  serviceId?: number;
  serviceTitle?: string;
  categoryName?: string;
  serviceDescription?: string | null;
  bundleDescription?: string | null;
  // `family_tier` lines only (Phase 8J-A/8J-B snapshot fields).
  familyId?: string;
  familyPlatformId?: string;
  familyTitle?: string;
  tierInstanceId?: string;
  tierInstancePlatformId?: string;
  tierOccupantId?: string;
  tierPlatformId?: string;
  tierEditionPlatformId?: string;
  tierEditionTitle?: string | null;
  // Request/PDF/email propagation phase: the composable ("Build Your Own")
  // occupant's own role discriminator, mirroring FamilyTierQuoteItem's own
  // isComposable — see RequestSchema::sanitizeItems() (PHP), the one
  // sanitisation gate that persists it. Optional/absent-as-false for every
  // Request submitted before this phase, none of which was ever composable.
  isComposable?: boolean;
  inclusionItems?: RequestInclusionItem[] | null;
  legPaymentSummaries?: RequestLegPaymentSummary[] | null;
}

export interface RequestEntry {
  quote_ref: string;
  platform_id: string;
  status: RequestStatus;
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
  platform_id: string;
  status: RequestStatus;
  type?: string;
  contact: string;
  company: string;
  email: string;
  submitted: string;
  // Site-local "submitted today" — derived server-side from `submitted`
  // against current_time('Y-m-d'), for the Requests summary cards' "New
  // Today" count. Display-only; never a filter or lifecycle status.
  is_today: boolean;
  item_count: number;
  total: number | null;
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

export interface AdminRequestsResponse {
  success: boolean;
  requests: RequestSummary[];
  total: number;
}

// Service contracts are owned by the Service Station and are NOT re-exported
// here. Import them from '@/service-station'.

// ── Category station (S6) ─────────────────────────────────────────────────────

export interface CategoryOverviewDraft {
  name:        string;
  description: string;
}

// The /admin/categories list-route projection: draft-preferred overview fields
// (name/description show the draft when one exists) + the lifecycle envelope.
// Slug is settled-only (immutable, D5). assigned_count is the D6 delete-guard
// predicate: services assigned to the term in any status. Category carries no
// group concept — the retired Service Category Group selector is gone.
export interface CategoryStationItem {
  id:                       number;
  platformId:               string;
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
  platformId: string;
}
