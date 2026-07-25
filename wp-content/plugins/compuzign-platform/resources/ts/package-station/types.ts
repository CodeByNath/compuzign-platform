import type { PromotionTier } from '@/api/types/admin';
import type { InclusionItem, FaqItem } from '@/api/types/pools';

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
  rate_sheet_id?:       string | null;
  inclusions_override?: InclusionItem[];
  rate_sheet_items?: TierRateSheetSelection[];
  ideal_for?: string;
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
    rate_sheets: PackageRateSheet[];
    package_relationships: PackageManagerItem[];
  };
}

export interface ServiceTierSaveResponse {
  success:              boolean;
  station:              ServicePackageStationData;
  new_inclusions_added: number;
  new_faqs_added:       number;
}

// ── Package Station Manager (Phase B) ───────────────────────────────────────
// Operational facts only — no presentation status/notes here by design (see
// PackageManagerSchema.php's Phase A audit correction). Presentation status
// is computed client-side via packageManagerItemModule/
// packageManagerSummaryModule (moduleNotifications.ts), from these same facts.

export type PackageManagerSourceType = 'inclusion' | 'faq';
export type PackageManagerModuleTransition = 'not-configured' | 'pending' | 'settled';

export interface PackageManagerGroup {
  group_id:   string;
  label:      string;
  sort_order: number;
}

export interface PackageManagerItem {
  item_id:            string;
  source_type:        PackageManagerSourceType;
  source_id:           string;
  // Live-resolved source content, shape per source_type; null when missing.
  resolved:            { label: string } | { question: string; answer: string } | null;
  decorated_label:     string | null;
  group_id:            string | null;
  sort_order:          number;
  disabled:            boolean;
  missing:             boolean;
  available?:          boolean;
  module_transition:   PackageManagerModuleTransition;
  // Supplying-Service provenance (admin read model only) — drives the Rate
  // Sheet filters and group dependency displays. Null for missing sources or
  // pools built without provenance.
  source_service_id?:    number | null;
  source_service_title?: string | null;
  source_categories?:    string[];
}

// ── Package Family station (Package-owned commercial buckets) ─────────
// A Package Family (e.g. KAIROS) groups connected Services
// commercially. Full StationLifecycle participation; overview draft/settle
// mechanics mirror the taxonomy Service Category Group station.

export type PackageFamilyStatus = 'active' | 'disabled' | 'archived' | 'trashed';

export interface PackageFamilyDependents {
  services:        number;
  rate_sheet_rows: number;
  tier_selections: number;
}

export interface PackageFamilyItem {
  group_id:                 string;
  label:                    string;
  description:              string;
  platform_status:          PackageFamilyStatus;
  previous_platform_status: 'active' | 'disabled' | null;
  module_status:            { overview: string };
  has_draft:                boolean;
  sort_order:               number;
  assigned_service_count:   number;
  dependents:               PackageFamilyDependents;
  /** Capability use is not a readiness/dependency metric. */
  tier_assignment_count?:   number;
}

/** Package Family list row with Package-owned Service relationship identity. */
export interface PackageFamilyListItem extends PackageFamilyItem {
  related_service_ids: number[];
}

export interface PackageFamilyListResponse {
  package_category_groups: PackageFamilyListItem[];
}

export interface PackageFamilyMutationResponse {
  success:  boolean;
  message?: string;
  group:    PackageFamilyItem | null;
}

// A dependency-guard failure is an HTTP 409 — apiClient throws, and the error
// text carries the JSON body { message, assigned_count, dependents }, same
// parsing contract as ServiceCategoryGroupDeleteResponse.
export interface PackageFamilyDeleteResponse {
  success: boolean;
  deleted: string;
}

export type TierInstanceStatus = 'draft' | 'active' | 'disabled' | 'archived' | 'trashed';

/** Package-owned Tier capability instance. Consumer use is a separate assignment. */
export interface TierInstanceSummary {
  tier_instance_id:       string;
  title:                  string;
  status:                 TierInstanceStatus;
  allowed_rate_sheet_ids: string[];
  popular_tier:           string | null;
  popular_label:          string;
  readiness:              'ready' | 'not-ready';
  occupant_count:         number;
  bin_count:              number;
}

export type TierAssignmentConsumerType = 'package_family';

export interface TierAssignment {
  assignment_id:    string;
  consumer_type:    TierAssignmentConsumerType;
  consumer_id:      string;
  tier_instance_id: string;
}

export interface TierAssignmentsResponse {
  success:          boolean;
  tier_assignments: TierAssignment[];
}

export interface TierAssignmentMutationResponse extends TierAssignmentsResponse {
  assignment: TierAssignment | null;
}

export interface TierAssignmentDeleteResponse extends TierAssignmentsResponse {
  deleted: string;
}

export interface PackageManagerProjectionInclusion {
  id:    string;
  label: string;
}

export interface PackageManagerProjectionFaq {
  id:       string;
  question: string;
  answer:   string;
}

export const PACKAGE_RATE_SHEET_UNITS = [
  'Per VM', 'Per GB', 'Per TB', 'Per vCPU', 'Per user', 'Per month', 'Per item',
] as const;
export type PackageRateSheetUnit = typeof PACKAGE_RATE_SHEET_UNITS[number];

export interface PackageRateSheetItem {
  item_id: string;
  source_item_id: string;
  unit_price: number;
  per: PackageRateSheetUnit;
  quantity: number;
  group_id: string | null;
  sort_order: number;
}

export type PackageRateSheetStatus = 'active' | 'archived';

export interface PackageRateSheet {
  rate_sheet_id: string;
  title: string;
  status: PackageRateSheetStatus;
  groups: PackageManagerGroup[];
  items: PackageRateSheetItem[];
}

export interface PackageManagerReadModel {
  service_id:        number;
  platform_status:   string;
  has_configuration: boolean;
  sources:           PackageSourceRelationship[];
  groups:            PackageManagerGroup[];
  category_groups:   PackageFamilyItem[];
  items:             PackageManagerItem[];
  rate_sheets:       PackageRateSheet[];
  projections: {
    inclusions: PackageManagerProjectionInclusion[];
    faqs:       PackageManagerProjectionFaq[];
  };
}

export interface PackageSourceRelationship {
  relationship_id: string;
  provider_key: string;
  entity_type: string;
  entity_id: string | number;
  sort_order: number;
  // Package-owned commercial bucket assignment (Package Family,
  // e.g. KAIROS); null = connected but unassigned.
  category_group_id?: string | null;
}

export interface PackageManagerResponse {
  success: boolean;
  manager: PackageManagerReadModel;
}

export interface PackageManagerItemDecision {
  item_id:          string;
  source_type:      PackageManagerSourceType;
  source_id:        string;
  group_id?:        string | null;
  sort_order?:      number;
  disabled?:        boolean;
  decorated_label?: string | null;
}

export interface PackageManagerSavePayload {
  sources:        PackageSourceRelationship[];
  groups:         PackageManagerGroup[];
  item_decisions: PackageManagerItemDecision[];
  // Partial upsert set (only sheets being created/updated; may be empty) plus an
  // explicit deletion list. Unmentioned stored sheets are preserved. A new sheet
  // carries a blank rate_sheet_id — the backend mints it (the Tool never mints).
  rate_sheets:          PackageRateSheet[];
  rate_sheet_deletions: string[];
}

export type PackageManagerSaveResponse =
  | { success: true; manager: PackageManagerReadModel }
  | { success: false; message: string };

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

export interface SurfaceTierDetail {
  // Stable identity of the settled occupant. Null identifies an empty shell;
  // the containing record key remains the slot id used by mutations.
  occupant_id: string | null;
  label: string;
  ideal_for: string;
  price: number | null;
  contact: boolean;
  billing_cycle: string | null;
  // The Rate Sheet this occupant's selections resolve against. Null when the
  // occupant is unbound (no selections). Switching it clears the selections.
  rate_sheet_id: string | null;
  inclusions_override: InclusionItem[];
  rate_sheet_items: TierRateSheetSelection[];
  rate_sheet_selections: TierResolvedRateSheetSelection[];
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
  ideal_for: string;
  price: number | null;
  contact: boolean;
  billing_cycle: string;
  // The occupant's bound Rate Sheet. Edited in the overview module so a switch
  // commits (and clears selections) before new rows are chosen.
  rate_sheet_id?: string | null;
}

export interface TierRateSheetSelection {
  item_id: string;
  quantity: number;
}

export interface TierResolvedRateSheetSelection extends TierRateSheetSelection {
  source_type?: PackageManagerSourceType | null;
  source_id?: string | null;
  resolved: boolean;
  label: string;
  unit_price: number | null;
  per: PackageRateSheetUnit | null;
  group_id: string | null;
  line_total: number | null;
}

export interface TierDrafts {
  overview: TierOverviewDraft | null;
  features: TierRateSheetSelection[] | null;
  faqs:     string[] | null;
}

export type TierModuleKey = 'overview' | 'features' | 'faqs';

export type TierModuleSavePayload =
  | TierOverviewDraft
  | { rate_sheet_items: TierRateSheetSelection[] }
  | { faq_refs: string[] };

// Response of the per-module save and settle endpoints. `tier` is the settled
// detail (unchanged by a draft save; rewritten by settle); `drafts`/`module_status`
// are the full updated maps for the tier.
export interface TierLifecycleResponse {
  success:       boolean;
  tier_id:       string;
  platform_status?: string;
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
