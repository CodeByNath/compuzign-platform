// Package Tier workspace — the pure focused-Tier deck projection.
//
// The lower deck beneath the Tier Workspace Engine shows the ONE Tier currently
// focused in the engine, split into the mockup's three reading lanes:
//
//   Details      — the Tier's inclusion rows, resolved through Service identity
//                  and priced from the Rate Sheet rows it selects.
//   Connections  — what the focused Tier is actually connected to: the Rate Sheet
//                  it binds and the Rate Sheet groups its selections draw from,
//                  each carrying its own stored identity and status. (The Package
//                  Family connection is workspace-level, resolved through the
//                  assignment ledger, and is not projected here.)
//   Settings     — Package Manager tools (handled entirely in presentation; this
//                  module derives no settings, since none are per-Tier data).
//
// Like ./projection this module is PURE: it fetches nothing, renders nothing, and
// holds no state, so it is testable in isolation (scripts/package-tier-workspace-
// contract.ts) and can never drift from the contracts it mirrors.
//
// IT INVENTS NO DATA AND NO SECOND PRICE. Every inclusion row is one of the
// Tier's already-resolved `rate_sheet_selections` (usePackageStation.tierView),
// re-read here — its label, resolution, unit price, per, quantity and line total
// are carried through untouched. Source provenance is the only thing added, on one
// two-hop read: a Rate Sheet row (`item_id`) → its priced relationship
// (`source_item_id`) → that relationship's admin-read-model `source_categories`
// (display) plus `source_service_platform_id` / `source_category_platform_ids`
// (identity). Nothing is recomputed.

// ── Structural inputs ─────────────────────────────────────────────────────────
// Kept local and structural (like ./projection) so the pure functions carry no
// dependency on the full API types and the contract script can run them with
// plain fixtures. The Package read model's real shapes satisfy these by width.

import type { PackageRateSheetStatus } from '../../types';

export interface WorkspaceRateItem {
  item_id: string;
  source_item_id: string;
}

/** A resolved Tier selection, exactly as `tierView().detail.rate_sheet_selections` holds it. */
export interface DeckSelection {
  item_id:      string;                    // Rate Sheet row id — the Tier's selection key
  source_type?: 'inclusion' | 'faq' | null;
  source_id?:   string | null;             // Service pool identity (inclusion/FAQ id)
  quantity:     number;
  resolved:     boolean;
  label:        string;                    // Service-resolved label (or unresolved fallback)
  unit_price:   number | null;             // Rate Sheet row's own unit price
  per:          string | null;
  line_total:   number | null;             // already-derived unit_price × quantity
  group_id:     string | null;             // Rate Sheet group the row belongs to
}

/** A relationship carrying the admin-read-model source provenance for a row. */
export interface DeckCategoryRelationship {
  item_id:           string;
  source_categories?: string[] | null;
  // Permanent downstream identity of the same source: the supplying Service's
  // CZS and the CZC of each category-role term it carries.
  source_service_platform_id?:   string | null;
  source_category_platform_ids?: string[] | null;
}

/**
 * What one Rate Sheet row represents downstream, resolved through the
 * relationship it prices. The Rate Sheet Engine built the row from an existing
 * Service Category → Service structure, so the row does not own these — it
 * carries them, and a reader collating rows identifies them by Platform ID.
 *
 * `categories` stays the display facet the Details lane already renders.
 * `servicePlatformId` / `categoryPlatformIds` are the identity facet: empty
 * when the owning record holds no Platform ID yet, never back-filled from a
 * name, slug, or native id.
 */
export interface RateItemProvenance {
  categories:          string[];
  servicePlatformId:   string;
  categoryPlatformIds: string[];
}

const EMPTY_RATE_ITEM_PROVENANCE: RateItemProvenance = {
  categories: [], servicePlatformId: '', categoryPlatformIds: [],
};

/** The Rate Sheet the focused Tier is bound to, as the connections lane reads it. */
export interface DeckRateSheet {
  rate_sheet_id: string;
  // The sheet's own output-only Platform ID (CZPRC), carried through unchanged.
  platform_id?: string;
  title:  string;
  status: PackageRateSheetStatus;
  groups: { group_id: string; label: string; sort_order: number; platform_id?: string }[];
}

// ── Deck shapes ───────────────────────────────────────────────────────────────

/** One inclusion row in the Details lane. Identity is the Service pool id / row id. */
export interface DeckInclusion {
  // The Tier's Rate Sheet selection id — shown as the row's reference code and
  // used only for stable keying. The Tier owns this selection.
  itemId:     string;
  // The Service inclusion pool id this selection references (source identity).
  sourceId:   string | null;
  name:       string;          // Service-owned label
  categories: string[];        // admin-read-model source categories (may be empty)
  // The row's downstream identity, carried through unchanged from the
  // relationship it prices. Collating readers (the Family summary) count these;
  // they never count `categories`, which are display names.
  servicePlatformId:   string;   // supplying Service's CZS ('' when unassigned)
  categoryPlatformIds: string[]; // that Service's category-role CZCs
  quantity:   number;
  unitPrice:  number | null;   // Rate Sheet row unit price, carried through
  per:        string | null;
  lineTotal:  number | null;   // already-derived line total, carried through
  // Honest status: a selection whose Rate Sheet row + Service source both resolve
  // is 'active'; one that does not is 'unresolved'. No Active/Draft is invented.
  resolved:   boolean;
}

/**
 * One Rate Sheet GROUP the focused Tier connects to.
 *
 * Identity is the stored `group_id` inside its stored `rate_sheet_id` — the pair
 * a group drawer needs to address it. Rows the sheet leaves ungrouped are NOT a
 * group and produce no entry here; they are counted on the sheet connection
 * below, so no group identity is fabricated for them.
 *
 * `status` is the group's PARENT SHEET status, carried through unchanged. A Rate
 * Sheet group has no lifecycle of its own (`PackageManagerGroup` stores only
 * `group_id`, `label`, `sort_order`), so the sheet's status is the only honest
 * status a group row can report — it is inherited, never derived or invented.
 */
export interface DeckRateSheetGroupConnection {
  rateSheetId:   string;
  groupId:       string;
  // The group's own output-only Platform ID (CZPRCG), carried through
  // unchanged. Empty when the stored group has none.
  platformId:    string;
  title:         string;       // stored group label
  status:        PackageRateSheetStatus; // inherited from the parent Rate Sheet
  connectedRows: number;       // resolved selections the focused Tier draws from this group
  coverage:      number;       // summed quantity the Tier commits across those rows
  // Of those resolved selections, the ones sourced from an inclusion — the same
  // inclusion/FAQ distinction the sheet connection already counts.
  connectedInclusions: number;
}

/**
 * The Rate Sheet the focused Tier is bound to. A Tier occupant binds to exactly
 * one sheet (`SurfaceTierDetail.rate_sheet_id`), so this is one connection or
 * none — never a scan across sheets.
 */
export interface DeckRateSheetConnection {
  rateSheetId:         string;
  // The sheet's own output-only Platform ID (CZPRC), carried through
  // unchanged. Empty for an unresolved sheet, which stores none to carry.
  platformId:          string;
  title:               string;
  status:              PackageRateSheetStatus | 'unresolved';
  resolved:            boolean;
  connectedRows:       number;   // every resolved selection the Tier draws from the sheet
  connectedInclusions: number;   // of those, the ones sourced from an inclusion
}

/** The focused Tier's whole lower deck. */
export interface TierDeck {
  inclusions:  DeckInclusion[];
  // The one bound Rate Sheet, or null when the Tier binds none.
  rateSheet:   DeckRateSheetConnection | null;
  // Every group inside that sheet the Tier actually draws rows from.
  groups:      DeckRateSheetGroupConnection[];
  // The distinct categories present across the inclusions, for the Details filter.
  categories:  string[];
}

export const EMPTY_TIER_DECK: TierDeck = {
  inclusions: [], rateSheet: null, groups: [], categories: [],
};

// ── Category provenance ───────────────────────────────────────────────────────

/**
 * Map each Rate Sheet row id → what it represents downstream, via the
 * relationship it prices. THE single two-hop read: presentation (`categories`)
 * and identity (`servicePlatformId`, `categoryPlatformIds`) come from the same
 * relationship in the same pass, so no second, drifting resolution of "what is
 * this row?" can appear. A row whose relationship carries no provenance simply
 * contributes none — the same silence the backend read model keeps.
 */
export function buildRateItemProvenanceMap(
  rateItems: readonly WorkspaceRateItem[],
  relationships: readonly DeckCategoryRelationship[],
): Map<string, RateItemProvenance> {
  const byRelationship = new Map<string, RateItemProvenance>();
  for (const relationship of relationships) {
    const categories = Array.isArray(relationship.source_categories) ? relationship.source_categories : [];
    const categoryPlatformIds = Array.isArray(relationship.source_category_platform_ids)
      ? relationship.source_category_platform_ids.filter((id) => id !== '')
      : [];
    const servicePlatformId = relationship.source_service_platform_id ?? '';
    if (categories.length === 0 && categoryPlatformIds.length === 0 && servicePlatformId === '') continue;
    byRelationship.set(relationship.item_id, { categories, servicePlatformId, categoryPlatformIds });
  }

  const byRateItem = new Map<string, RateItemProvenance>();
  for (const item of rateItems) {
    const provenance = byRelationship.get(item.source_item_id);
    if (provenance !== undefined) {
      byRateItem.set(item.item_id, provenance);
    }
  }
  return byRateItem;
}

// ── Lane projections ──────────────────────────────────────────────────────────

/**
 * The Details lane: the focused Tier's inclusion selections. Only `inclusion`
 * selections appear (FAQs are not inclusions); each carries its Service-resolved
 * identity and its Rate Sheet-derived pricing exactly as the Tier already holds
 * them. Ordering follows the Tier's own selection order.
 */
export function projectTierInclusions(
  selections: readonly DeckSelection[],
  provenanceByRateItem: ReadonlyMap<string, RateItemProvenance>,
): DeckInclusion[] {
  return selections
    .filter((selection) => selection.source_type === 'inclusion')
    .map((selection) => {
    const provenance = provenanceByRateItem.get(selection.item_id) ?? EMPTY_RATE_ITEM_PROVENANCE;
    return {
      itemId:     selection.item_id,
      sourceId:   selection.source_id ?? null,
      name:       selection.label,
      categories: provenance.categories,
      servicePlatformId:   provenance.servicePlatformId,
      categoryPlatformIds: provenance.categoryPlatformIds,
      quantity:   selection.quantity,
      unitPrice:  selection.unit_price,
      per:        selection.per,
      lineTotal:  selection.line_total,
      resolved:   selection.resolved,
    };
  });
}

/**
 * The Connections lane, Groups section: the Rate Sheet groups the focused Tier's
 * RESOLVED selections draw from. Only resolved selections connect a Rate Sheet
 * row (an unresolved selection references no live row), so an unresolved-only
 * Tier connects to no group.
 *
 * A group entry is produced only for a `group_id` the bound sheet actually
 * stores. A selection carrying no group, or one naming a group the sheet no
 * longer holds, contributes to the sheet connection but never mints a group
 * identity here. Counts are aggregations of the Tier's own selections, never a
 * re-derived price.
 */
export function projectTierRateSheetGroups(
  selections: readonly DeckSelection[],
  rateSheet: DeckRateSheet | null,
): DeckRateSheetGroupConnection[] {
  if (rateSheet === null) return [];
  const groupById = new Map(rateSheet.groups.map((group) => [group.group_id, group]));

  const buckets = new Map<string, { connectedRows: number; coverage: number; connectedInclusions: number }>();
  for (const selection of selections) {
    if (!selection.resolved) continue;
    const groupId = selection.group_id;
    if (groupId === null || !groupById.has(groupId)) continue;
    const bucket = buckets.get(groupId) ?? { connectedRows: 0, coverage: 0, connectedInclusions: 0 };
    bucket.connectedRows += 1;
    bucket.coverage += selection.quantity;
    if (selection.source_type === 'inclusion') bucket.connectedInclusions += 1;
    buckets.set(groupId, bucket);
  }

  return [...buckets.entries()]
    .map(([groupId, bucket]) => ({
      rateSheetId:   rateSheet.rate_sheet_id,
      groupId,
      platformId:    groupById.get(groupId)!.platform_id ?? '',
      title:         groupById.get(groupId)!.label,
      status:        rateSheet.status,
      connectedRows: bucket.connectedRows,
      coverage:      bucket.coverage,
      connectedInclusions: bucket.connectedInclusions,
    }))
    .sort((a, b) => {
      const aOrder = groupById.get(a.groupId)!.sort_order;
      const bOrder = groupById.get(b.groupId)!.sort_order;
      return aOrder - bOrder || a.title.localeCompare(b.title);
    });
}

/**
 * The Connections lane, Rate Sheets section: the ONE sheet the focused Tier is
 * bound to, with the volume of that Tier's own connection to it. Identity and
 * status are the sheet's stored `rate_sheet_id` and `status`, carried through.
 */
export function projectTierRateSheet(
  selections: readonly DeckSelection[],
  rateSheet: DeckRateSheet | null,
  boundRateSheetId: string | null = rateSheet?.rate_sheet_id ?? null,
): DeckRateSheetConnection | null {
  if (rateSheet === null) {
    return boundRateSheetId === null ? null : {
      rateSheetId:         boundRateSheetId,
      platformId:          '',
      title:               'Unresolved Rate Sheet',
      status:              'unresolved',
      resolved:            false,
      connectedRows:       0,
      connectedInclusions: 0,
    };
  }
  let connectedRows = 0;
  let connectedInclusions = 0;
  for (const selection of selections) {
    if (!selection.resolved) continue;
    connectedRows += 1;
    if (selection.source_type === 'inclusion') connectedInclusions += 1;
  }
  return {
    rateSheetId: rateSheet.rate_sheet_id,
    platformId:  rateSheet.platform_id ?? '',
    title:       rateSheet.title.trim() || 'Untitled Rate Sheet',
    status:      rateSheet.status,
    resolved:    true,
    connectedRows,
    connectedInclusions,
  };
}

/**
 * The whole focused-Tier deck. `categories` is the distinct, sorted union of the
 * inclusion categories, so the Details filter offers exactly the categories the
 * loaded rows actually carry — never a fabricated taxonomy.
 */
export function projectTierDeck(
  selections: readonly DeckSelection[],
  provenanceByRateItem: ReadonlyMap<string, RateItemProvenance>,
  rateSheet: DeckRateSheet | null,
  boundRateSheetId: string | null = rateSheet?.rate_sheet_id ?? null,
): TierDeck {
  const inclusions = projectTierInclusions(selections, provenanceByRateItem);
  const categories = [...new Set(inclusions.flatMap((inclusion) => inclusion.categories))].sort((a, b) =>
    a.localeCompare(b),
  );
  return {
    inclusions,
    rateSheet: projectTierRateSheet(selections, rateSheet, boundRateSheetId),
    groups:    projectTierRateSheetGroups(selections, rateSheet),
    categories,
  };
}
