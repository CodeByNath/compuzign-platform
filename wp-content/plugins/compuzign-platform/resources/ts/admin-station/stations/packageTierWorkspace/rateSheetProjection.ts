// Package Tier workspace — the pure Rate Sheet projections for the lower deck.
//
// Companion to ./projection with the same discipline: given the focused
// workspace context (the focused Tier's already-resolved selections, the
// station's one Rate Sheet, its relationships, and the focused Family scope),
// decide EXACTLY what the Details and Connections tabs show — and nothing else.
// It fetches nothing, renders nothing, imports no drawer, and constructs no
// callback, so both projections are contract-testable in isolation
// (scripts/package-tier-workspace-contract.ts).
//
// Identity rule: every row keeps the Rate Sheet row's OWN `item_id` as
// `recordId` — the identity the rate-sheet-row drawer resolves. Never the Tier
// occupant_id, never a slot id, never the relationship's source_item_id, never
// the Service inclusion's source_id.
//
// The Tier-side resolution (selection → rate row → relationship) is NOT
// repeated here: usePackageStation.tierView() already computed it, and Details
// consumes those resolved selections as its base. This module adds only the
// provenance the resolved selection does not carry — the supplying Service,
// source categories, the sheet row's own authoritative quantity, and the
// resolved group label.

// ── Structural inputs ────────────────────────────────────────────────────────
// Kept local and structural (same rule as ./projection) so the pure functions
// depend on no API type module and the contract runs them with plain fixtures.

/** A focused-Tier selection as tierView resolves it (structural mirror of
 *  TierResolvedRateSheetSelection). `quantity` is the TIER's selected quantity. */
export interface WorkspaceResolvedSelection {
  item_id: string;
  quantity: number;
  source_type?: string | null;
  source_id?: string | null;
  resolved: boolean;
  label: string;
  unit_price: number | null;
  per: string | null;
  group_id: string | null;
  line_total: number | null;
}

/** One Package relationship with display label and Service provenance resolved. */
export interface WorkspaceRelationshipDetail {
  item_id: string;
  source_type: string;
  source_id: string;
  label: string;
  missing: boolean;
  disabled: boolean;
  source_service_id: number | null;
  source_service_title: string | null;
  source_categories: string[];
}

export interface WorkspaceRateSheetGroup {
  group_id: string;
  label: string;
  sort_order: number;
}

/** One Rate Sheet row. `quantity` here is the SHEET's own authoritative quantity. */
export interface WorkspaceRateSheetRow {
  item_id: string;
  source_item_id: string;
  unit_price: number;
  per: string;
  quantity: number;
  group_id: string | null;
  sort_order: number;
}

export interface WorkspaceRateSheet {
  title: string;
  groups: WorkspaceRateSheetGroup[];
  items: WorkspaceRateSheetRow[];
}

/** The station-level read context the lower workspace consumes. One Package
 *  Station owns ONE Rate Sheet configuration (or none) — this context carries
 *  that singleton honestly: no invented sheet id, no sheet catalogue. */
export interface WorkspaceStationContext {
  serviceId: number | null;
  serviceTitle: string | null;
  rateSheet: WorkspaceRateSheet | null;
  relationships: WorkspaceRelationshipDetail[];
}

// ── Details projection ───────────────────────────────────────────────────────

/** One compact Details row for the focused Tier. */
export interface TierDetailsRow {
  /** The Rate Sheet row's own item_id — the identity every action dispatches. */
  recordId: string;
  label: string;
  serviceTitle: string | null;
  categories: string[];
  /** Source inclusion id (provenance only — never a dispatch identity). */
  sourceId: string | null;
  unitPrice: number | null;
  per: string | null;
  /** The focused Tier's selected quantity for this row. */
  tierQuantity: number;
  /** The Rate Sheet row's own authoritative quantity (null when unresolved). */
  sheetQuantity: number | null;
  /** True when both quantities are known and materially different — the row
   *  presents both rather than silently collapsing them. */
  quantityDiffers: boolean;
  groupId: string | null;
  groupLabel: string | null;
  lineTotal: number | null;
  resolved: boolean;
  /** True when the row's supplying Service is one of the focused Family's
   *  related Services. Scope is a MARK, never a silent filter: a genuine Tier
   *  selection outside the Family's scope stays visible and is labelled. */
  inFamilyScope: boolean;
}

export interface TierDetailsInput {
  selections: readonly WorkspaceResolvedSelection[];
  station: WorkspaceStationContext;
  familyRelatedServiceIds: readonly number[];
}

/**
 * Project the focused Tier's INCLUSION selections into Details rows. FAQ-backed
 * selections are excluded (they are not Details rows); a selection whose source
 * type cannot be resolved at all stays visible, marked unresolved — exclusion
 * requires positive knowledge that the row is another source type.
 */
export function projectTierDetails(input: TierDetailsInput): TierDetailsRow[] {
  const { selections, station, familyRelatedServiceIds } = input;
  const relationshipById = new Map(station.relationships.map((item) => [item.item_id, item]));
  const sheetRowById = new Map((station.rateSheet?.items ?? []).map((item) => [item.item_id, item]));
  const groupLabelById = new Map((station.rateSheet?.groups ?? []).map((group) => [group.group_id, group.label]));
  const familyServices = new Set(familyRelatedServiceIds);

  return selections
    .filter((selection) => {
      const sourceType = selection.source_type ?? null;
      if (sourceType === 'inclusion') return true;
      // Unknown provenance is an unresolved row, not a silent drop.
      return sourceType === null && !selection.resolved;
    })
    .map((selection) => {
      const sheetRow = sheetRowById.get(selection.item_id);
      const relationship = sheetRow ? relationshipById.get(sheetRow.source_item_id) : undefined;
      const supplyingServiceId = relationship?.source_service_id ?? null;
      const sheetQuantity = sheetRow ? sheetRow.quantity : null;
      return {
        recordId:      selection.item_id,
        label:         selection.label,
        serviceTitle:  relationship?.source_service_title ?? null,
        categories:    relationship?.source_categories ?? [],
        sourceId:      selection.source_id ?? null,
        unitPrice:     selection.unit_price,
        per:           selection.per,
        tierQuantity:  selection.quantity,
        sheetQuantity,
        quantityDiffers: sheetQuantity !== null && sheetQuantity !== selection.quantity,
        groupId:       selection.group_id,
        groupLabel:    selection.group_id !== null ? groupLabelById.get(selection.group_id) ?? null : null,
        lineTotal:     selection.line_total,
        resolved:      selection.resolved,
        inFamilyScope: supplyingServiceId !== null && familyServices.has(supplyingServiceId),
      };
    });
}

// ── Connections projection ───────────────────────────────────────────────────

export interface ConnectionsGroupSummary {
  groupId: string;
  label: string;
  rowCount: number;
}

export interface ConnectionsProviderSummary {
  serviceId: number;
  title: string | null;
  rowCount: number;
}

/** One Rate Sheet row in the Connections view — the whole genuine sheet, not
 *  only the focused Tier's slice. */
export interface ConnectionsRow {
  /** The Rate Sheet row's own item_id — the identity every action dispatches. */
  recordId: string;
  label: string;
  sourceType: string | null;
  serviceTitle: string | null;
  groupLabel: string | null;
  unitPrice: number;
  per: string;
  quantity: number;
  resolved: boolean;
  /** True when the focused Tier currently selects this row. */
  tierSelected: boolean;
  tierQuantity: number | null;
  /** True when the row's supplying Service is in the focused Family's scope. */
  inFamilyScope: boolean;
}

/** The one genuine Rate Sheet, projected against the focused Family and Tier.
 *  The sheet has no standalone persisted id in the current schema, and none is
 *  invented here: it is the station-owned singleton configuration. */
export interface RateSheetConnectionsModel {
  configured: boolean;
  title: string | null;
  rowCount: number;
  resolvedCount: number;
  unresolvedCount: number;
  tierSelectedCount: number;
  familyApplicableCount: number;
  groups: ConnectionsGroupSummary[];
  ungroupedCount: number;
  providers: ConnectionsProviderSummary[];
  rows: ConnectionsRow[];
}

export interface RateSheetConnectionsInput {
  station: WorkspaceStationContext;
  /** The focused Tier's raw selections (item_id + tier quantity). */
  tierSelections: readonly { item_id: string; quantity: number }[];
  familyRelatedServiceIds: readonly number[];
}

export function projectRateSheetConnections(input: RateSheetConnectionsInput): RateSheetConnectionsModel {
  const { station, tierSelections, familyRelatedServiceIds } = input;
  const sheet = station.rateSheet;
  if (!sheet) {
    return {
      configured: false, title: null, rowCount: 0, resolvedCount: 0, unresolvedCount: 0,
      tierSelectedCount: 0, familyApplicableCount: 0, groups: [], ungroupedCount: 0,
      providers: [], rows: [],
    };
  }

  const relationshipById = new Map(station.relationships.map((item) => [item.item_id, item]));
  const tierQuantityByRow = new Map(tierSelections.map((selection) => [selection.item_id, selection.quantity]));
  const familyServices = new Set(familyRelatedServiceIds);
  const groupLabelById = new Map(sheet.groups.map((group) => [group.group_id, group.label]));

  const rows: ConnectionsRow[] = [...sheet.items]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => {
      const relationship = relationshipById.get(item.source_item_id);
      const resolved = !!relationship && !relationship.missing;
      const supplyingServiceId = relationship?.source_service_id ?? null;
      const tierQuantity = tierQuantityByRow.get(item.item_id) ?? null;
      return {
        recordId:      item.item_id,
        label:         relationship ? relationship.label : '(unresolved Rate Sheet item)',
        sourceType:    relationship?.source_type ?? null,
        serviceTitle:  relationship?.source_service_title ?? null,
        groupLabel:    item.group_id !== null ? groupLabelById.get(item.group_id) ?? null : null,
        unitPrice:     item.unit_price,
        per:           item.per,
        quantity:      item.quantity,
        resolved,
        tierSelected:  tierQuantity !== null,
        tierQuantity,
        inFamilyScope: supplyingServiceId !== null && familyServices.has(supplyingServiceId),
      };
    });

  const groupCounts = new Map<string, number>();
  let ungroupedCount = 0;
  for (const item of sheet.items) {
    if (item.group_id === null) ungroupedCount += 1;
    else groupCounts.set(item.group_id, (groupCounts.get(item.group_id) ?? 0) + 1);
  }

  const providerCounts = new Map<number, { title: string | null; rowCount: number }>();
  for (const item of sheet.items) {
    const relationship = relationshipById.get(item.source_item_id);
    const serviceId = relationship?.source_service_id ?? null;
    if (serviceId === null) continue;
    const entry = providerCounts.get(serviceId) ?? { title: relationship?.source_service_title ?? null, rowCount: 0 };
    entry.rowCount += 1;
    providerCounts.set(serviceId, entry);
  }

  return {
    configured: true,
    title: sheet.title,
    rowCount: rows.length,
    resolvedCount: rows.filter((row) => row.resolved).length,
    unresolvedCount: rows.filter((row) => !row.resolved).length,
    tierSelectedCount: rows.filter((row) => row.tierSelected).length,
    familyApplicableCount: rows.filter((row) => row.inFamilyScope).length,
    groups: [...sheet.groups]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((group) => ({
        groupId: group.group_id,
        label: group.label,
        rowCount: groupCounts.get(group.group_id) ?? 0,
      })),
    ungroupedCount,
    providers: [...providerCounts.entries()].map(([serviceId, entry]) => ({
      serviceId,
      title: entry.title,
      rowCount: entry.rowCount,
    })),
    rows,
  };
}
