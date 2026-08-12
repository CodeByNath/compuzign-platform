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
  cz_platform_id?:      string;
  addon_platform_id?:   string;
  platform_status?:     string;
  // Occupant-level selection mode, stored on the occupant and carried through
  // `ensureTierLifecycle()` untouched: false is an exclusive normal Tier, true a
  // stackable Add-on. Optional because pre-occupant-write slots omit it, which
  // reads as a normal Tier — never inferred from lifecycle or shell position.
  is_addon?:            boolean;
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
  tier_instance_id?: string;
  allowed_rate_sheet_ids?: string[];
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
  tier_instance_id?: string;
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
  tier_instance_id?:    string;
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
  platform_id?: string;
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
  // The permanent identity behind the two display facets above: the supplying
  // Service's own CZS, and the CZC of each category-role term it carries.
  // Output-only. Empty when the owning record holds no Platform ID yet — a
  // reader must never substitute the name, slug, or native id for it.
  source_service_platform_id?:   string;
  source_category_platform_ids?: string[];
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

/** Occupied ACTIVE Tier slots vs. fixed slot capacity for the one Tier
 *  instance assigned to this Family. Zero of zero when unassigned — a
 *  Family with no assignment owns no Tier system to report slots for. */
export interface ActiveTierSlots {
  occupied: number;
  capacity: number;
}

export interface PackageFamilyItem {
  group_id:                 string;
  platform_id:              string;
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
  active_tier_slots?:       ActiveTierSlots;
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
  platform_id:            string;
  title:                  string;
  description:            string;
  status:                 TierInstanceStatus;
  allowed_rate_sheet_ids: string[];
  popular_tier:           string | null;
  popular_label:          string;
  readiness:              'ready' | 'not-ready';
  occupant_count:         number;
  bin_count:              number;
}

/** Stored instance shape returned by the Package-owned collection endpoint. */
export interface TierInstanceRecord {
  tier_instance_id:       string;
  cz_platform_id:         string;
  title:                  string;
  description:            string;
  status:                 TierInstanceStatus;
  allowed_rate_sheet_ids: string[];
  popular_tier:           string | null;
  popular_label:          string;
  tiers: Record<string, {
    current_occupant?: BinnedOccupant | null;
    history?: BinnedOccupant[];
    drafts?: TierDrafts;
    module_status?: Record<string, string>;
  }>;
  occupant_bin: OccupantBinEntry[];
}

export interface TierInstancesResponse {
  success:        boolean;
  tier_instances: TierInstanceRecord[];
}

export interface TierInstanceMutationResponse {
  success:       boolean;
  tier_instance: TierInstanceRecord;
}

// A guard failure is an HTTP 409 — apiClient throws, and the error text
// carries the JSON body { code, message }, same parsing contract as
// PackageFamilyDeleteResponse.
export interface TierInstanceDeleteResponse {
  success: boolean;
  deleted: string;
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

/**
 * The units every Package Manager understands without being told. Always
 * offered, never removable, so a sheet is never left with no vocabulary.
 */
export const BUILT_IN_RATE_SHEET_UNITS = [
  'Per VM', 'Per GB', 'Per TB', 'Per vCPU', 'Per user', 'Per month', 'Per item',
] as const;

/**
 * A unit label. The vocabulary is DATA — the built-in seven plus whatever this
 * Manager curated — so this is deliberately not a closed union: the frontend
 * cannot enumerate at compile time what an admin will store at runtime. The
 * closed check lives where the vocabulary lives, in `PackageManagerSchema`,
 * which drops a `per` its stored vocabulary does not know.
 */
export type PackageRateSheetUnit = string;

/**
 * An alternative unit price for one Rate Sheet Item row — a child of that
 * row, never a second row, never Rate-Sheet-wide. Not the row's Default
 * Price: the row's own `unit_price` is untouched by an option's presence.
 * `option_id` and `platform_id` are both output-only/backend-derived, never
 * from the editable `label`.
 */
export interface PackageRateSheetPriceOption {
  option_id: string;
  platform_id?: string;
  label: string;
  unit_price: number;
}

export interface PackageRateSheetItem {
  item_id: string;
  platform_id?: string;
  source_item_id: string;
  unit_price: number;
  per: PackageRateSheetUnit;
  quantity: number;
  group_id: string | null;
  sort_order: number;
  price_options: PackageRateSheetPriceOption[];
}

export type PackageRateSheetStatus = 'active' | 'archived';

export interface PackageRateSheet {
  rate_sheet_id: string;
  platform_id?: string;
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
  /** The full vocabulary a row's `per` may hold: built-ins then curated units. */
  rate_sheet_units:  PackageRateSheetUnit[];
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
  // Curated units only — the built-in seven are never submitted, because they
  // are not stored. Omitting this key leaves the stored vocabulary untouched;
  // sending it replaces it, subject to the backend keeping any unit a surviving
  // row still carries.
  rate_sheet_units?:    PackageRateSheetUnit[];
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
  // Selection mode: false = exclusive normal Tier, true = stackable add-on.
  // Orthogonal to `enabled`.
  is_addon: boolean;
  // The canonical Disabled fact — see SurfaceTierDetail.is_explicitly_disabled.
  // Optional for the same pre-repair-response reason as drafts/module_status.
  is_explicitly_disabled?: boolean;
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
  /** Output-only permanent primary Tier identity. */
  platform_id: string;
  /** Output-only permanent Add-on identity; dormant while is_addon is false. */
  addon_platform_id: string;
  label: string;
  ideal_for: string;
  audience_group: 'personal_business' | 'enterprise';
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
  // The canonical Disabled fact (PackageSchema::isExplicitlyDisabled): true
  // only via an explicit Disable action, never inferred from `enabled`/
  // platform_status — a Pending, never-yet-published occupant also carries
  // `enabled: false` but is not Disabled. Optional for the same pre-repair-
  // response reason as drafts/module_status below.
  is_explicitly_disabled?: boolean;
  // Selection mode, orthogonal to `enabled`/platform_status: false selects
  // this occupant as the customer's one exclusive normal Tier; true offers it
  // as a stackable add-on alongside whichever normal Tier is chosen. Never
  // inferred from lifecycle, Rate Sheet binding, or shell position.
  is_addon: boolean;
  // Phase 2 (P3) additive read exposure: the tier's pending per-module drafts and
  // module lifecycle status, returned alongside the settled fields above. Optional
  // because pre-P3 responses (and locally-constructed fallbacks) omit them; the
  // draft-preferred merge is performed client-side by usePackageStation.
  drafts?: TierDrafts;
  module_status?: Record<string, string>;
  // Tier Edition (Phase 1+) — independently addressed, independently
  // lifecycled child records nested inside this occupant. Absent/empty for
  // every occupant that has never used this capability; optional so a
  // legacy locally-constructed detail (e.g. emptyTierDetail's client-side
  // mirror) never needs to fabricate it. Each Edition is always an alternate
  // to the occupant's own permanent Default declaration (this record's own
  // label/price/billing_cycle/etc. above) — there is no stored pointer that
  // lets an Edition become "the" default.
  tier_editions?: TierEdition[];
  // Phase 6 — this occupant's own physical Edition bin: Editions explicitly
  // moved out of tier_editions[] (never auto-migrated). Absent/empty for
  // every occupant that has never used this capability.
  tier_edition_bin?: TierEditionBinEntry[];
}

// ── Tier Edition (Phase 1+) ──────────────────────────────────────────────────
//
// A Tier Edition is not another Tier and not a Tier Add-on: it is one
// mutually exclusive commercial declaration owned by a Tier occupant,
// carrying its own canonical CZTE identity and its own StationLifecycle
// state, reusing the occupant's own Rate Sheet binding/selection shape and
// the occupant's own inherit-when-empty declaration-override rule. See
// docs/code-map/tiers.md and PackageSchema's SECTION: TIER_EDITION.
export interface TierEdition {
  id: string;
  /** Output-only permanent identity; empty until first Publish (Active). */
  edition_platform_id: string;
  title: string;
  admin_description: string;
  platform_status: 'draft' | 'active' | 'disabled' | 'archived' | 'trashed';
  previous_platform_status: string | null;
  is_explicitly_disabled: boolean;
  module_status: Record<string, string>;
  drafts: Record<string, TierEditionOverviewDraft | null>;
  rate_sheet_id: string | null;
  rate_sheet_items: TierRateSheetSelection[];
  price: number | null;
  contact: boolean;
  billing_cycle: string | null;
  minimum_term_value: number | null;
  minimum_term_unit: string | null;
  // Empty means inherit the parent occupant's own inclusions_override/
  // faq_refs; non-empty is this Edition's deliberate declaration override.
  inclusions_override: InclusionItem[];
  faq_refs: string[];
}

// The Edition's one consolidated module — mirrors Package Family's own
// single 'overview' module, not the parent occupant's three-module
// Overview/Features/FAQs split (an Edition's total editable surface is
// closer in size to a Family row than to a whole Tier occupant).
export interface TierEditionOverviewDraft {
  title: string;
  admin_description: string;
  rate_sheet_id: string | null;
  rate_sheet_items: TierRateSheetSelection[];
  billing_cycle: string | null;
  contact: boolean;
  minimum_term_value: number | null;
  minimum_term_unit: string | null;
  inclusions_override: InclusionItem[];
  faq_refs: string[];
}

// Phase 6 — a narrow, occupant-owned physical bin entry. Deliberately
// carries only what the bin's own lifecycle/audit needs: no origin_tier,
// previous_enabled, or cascaded_edition_ids — none of those have meaning for
// an Edition that never leaves its parent occupant. `status` is the bin
// entry's own travel state, mirrored from `edition.platform_status` at
// move-to-bin time and kept in sync by the bin's own trash transition.
export interface TierEditionBinEntry {
  bin_id:       string;
  edition:      TierEdition;
  status:       'archived' | 'trashed';
  displaced_at: string | null;
}

export interface TierEditionBinResponse {
  success:     boolean;
  tier_instance_id?: string;
  tier_id:     string;
  bin_id?:     string;
  edition_id?: string;
  edition?:    TierEdition;
  bin_entry?:  TierEditionBinEntry;
  tier_editions?:    TierEdition[];
  tier_edition_bin?: TierEditionBinEntry[];
  deleted?:    boolean;
  code?:       string;
  message?:    string;
}

export interface TierEditionResponse {
  success:     boolean;
  tier_instance_id?: string;
  tier_id:     string;
  edition_id:  string;
  edition?:    TierEdition;
  message?:    string;
}

// Phase 2 (P3/P4) tier lifecycle shapes — the per-module draft payloads/response
// carried by the package station. `overview` holds tier-owned scalars; `features`
// and `faqs` hold references into the service pool (anchor/consumer model).
export interface TierOverviewDraft {
  label: string;
  ideal_for: string;
  audience_group?: 'personal_business' | 'enterprise';
  price: number | null;
  contact: boolean;
  billing_cycle: string;
  // The occupant's bound Rate Sheet. Edited in the overview module so a switch
  // commits (and clears selections) before new rows are chosen.
  rate_sheet_id?: string | null;
  // Selection mode — see SurfaceTierDetail.is_addon. Optional here only
  // because it rides the same generic draft payload shape; the editor always
  // supplies an explicit boolean.
  is_addon?: boolean;
}

export interface TierRateSheetSelection {
  item_id: string;
  quantity: number;
  // Absent/null selects the row's own Default Price; present selects one of
  // the row's price_options[] by option_id. An id that no longer resolves
  // against the bound sheet is left as-is — never silently coerced back to
  // Default Price. See docs/code-map/rate-sheet.md.
  price_option_id?: string | null;
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
  // The row's own alternative-price children, carried through so the editor
  // can offer a Price Option selector without a second lookup. Empty for a
  // row with no options.
  price_options?: PackageRateSheetPriceOption[];
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
  tier_instance_id?: string;
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
  tier_instance_id?: string;
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
  tier_instance_id?: string;
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
  tier_instance_id?: string;
  message?:      string;
  code?:         string;
  bin_id?:       string;
  bin_entry?:    OccupantBinEntry;
  occupant_bin?: OccupantBinEntry[];
}

export interface BinDeleteResponse {
  success:       boolean;
  tier_instance_id?: string;
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
