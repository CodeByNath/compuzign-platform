// Package Tier workspace — the pure focused-Tier deck projection.
//
// The lower deck beneath the Tier Workspace Engine shows the ONE Tier currently
// focused in the engine, split into the mockup's three reading lanes:
//
//   Details      — the Tier's inclusion rows, resolved through Service identity
//                  and priced from the Rate Sheet rows it selects.
//   Connections  — the Rate Sheet(s) those selections draw from, grouped by the
//                  Package Station's own Rate Sheet groups.
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
// are carried through untouched. Category is the only field added, resolved from
// the SAME provenance chain ./projection uses for Service scope: a Rate Sheet row
// (`item_id`) → its priced relationship (`source_item_id`) → that relationship's
// admin-read-model `source_categories`. Nothing is recomputed.

import type { WorkspaceRateItem } from './projection';

// ── Structural inputs ─────────────────────────────────────────────────────────
// Kept local and structural (like ./projection) so the pure functions carry no
// dependency on the full API types and the contract script can run them with
// plain fixtures. The Package read model's real shapes satisfy these by width.

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

/** A relationship carrying the admin-read-model source categories for a row. */
export interface DeckCategoryRelationship {
  item_id:           string;
  source_categories?: string[] | null;
}

/** The Package Station's single Rate Sheet, as the connections lane groups it. */
export interface DeckRateSheet {
  title:  string;
  groups: { group_id: string; label: string; sort_order: number }[];
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
  quantity:   number;
  unitPrice:  number | null;   // Rate Sheet row unit price, carried through
  per:        string | null;
  lineTotal:  number | null;   // already-derived line total, carried through
  // Honest status: a selection whose Rate Sheet row + Service source both resolve
  // is 'active'; one that does not is 'unresolved'. No Active/Draft is invented.
  resolved:   boolean;
}

/** One Rate Sheet connection in the Connections lane (one Rate Sheet group). */
export interface DeckRateSheetConnection {
  // The Rate Sheet group id, or null for rows the sheet leaves ungrouped. Used as
  // the row's reference code and for stable keying.
  groupId:       string | null;
  title:         string;       // group label, or the Rate Sheet title when ungrouped
  connectedRows: number;       // resolved selections the focused Tier draws from this group
  coverage:      number;       // summed quantity the Tier commits across those rows
}

/** The focused Tier's whole lower deck. */
export interface TierDeck {
  inclusions:  DeckInclusion[];
  rateSheets:  DeckRateSheetConnection[];
  // The distinct categories present across the inclusions, for the Details filter.
  categories:  string[];
}

export const EMPTY_TIER_DECK: TierDeck = { inclusions: [], rateSheets: [], categories: [] };

// ── Category provenance ───────────────────────────────────────────────────────

/**
 * Map each Rate Sheet row id → its source categories, via the relationship it
 * prices. This is the SAME two-hop chain buildRateItemServiceMap uses, reading
 * `source_categories` instead of `source_service_id`. A row whose relationship
 * carries no categories simply contributes none, so its inclusion shows no
 * category — the same silence the backend read model keeps.
 */
export function buildRateItemCategoryMap(
  rateItems: readonly WorkspaceRateItem[],
  relationships: readonly DeckCategoryRelationship[],
): Map<string, string[]> {
  const categoriesByRelationship = new Map<string, string[]>();
  for (const relationship of relationships) {
    const categories = relationship.source_categories;
    if (Array.isArray(categories) && categories.length > 0) {
      categoriesByRelationship.set(relationship.item_id, categories);
    }
  }

  const categoriesByRateItem = new Map<string, string[]>();
  for (const item of rateItems) {
    const categories = categoriesByRelationship.get(item.source_item_id);
    if (categories !== undefined) {
      categoriesByRateItem.set(item.item_id, categories);
    }
  }
  return categoriesByRateItem;
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
  categoryByRateItem: ReadonlyMap<string, string[]>,
): DeckInclusion[] {
  return selections
    .filter((selection) => selection.source_type === 'inclusion')
    .map((selection) => ({
      itemId:     selection.item_id,
      sourceId:   selection.source_id ?? null,
      name:       selection.label,
      categories: categoryByRateItem.get(selection.item_id) ?? [],
      quantity:   selection.quantity,
      unitPrice:  selection.unit_price,
      per:        selection.per,
      lineTotal:  selection.line_total,
      resolved:   selection.resolved,
    }));
}

/**
 * The Connections lane: the Rate Sheet groups the focused Tier's RESOLVED
 * selections draw from. Only resolved selections connect a Rate Sheet row (an
 * unresolved selection references no live row), so an unresolved-only Tier shows
 * no connections. Rows the sheet leaves ungrouped collapse into one entry titled
 * by the Rate Sheet itself. Counts are aggregations of the Tier's own selections,
 * never a re-derived price.
 */
export function projectTierRateSheetConnections(
  selections: readonly DeckSelection[],
  rateSheet: DeckRateSheet | null,
): DeckRateSheetConnection[] {
  const labelByGroup = new Map((rateSheet?.groups ?? []).map((group) => [group.group_id, group.label]));
  const orderByGroup = new Map((rateSheet?.groups ?? []).map((group) => [group.group_id, group.sort_order]));
  const sheetTitle = rateSheet?.title?.trim() || 'Rate Sheet';

  // Bucket key '' is the ungrouped bucket; a real group_id keys its own bucket.
  const buckets = new Map<string, { connectedRows: number; coverage: number }>();
  for (const selection of selections) {
    if (!selection.resolved) continue;
    const key = selection.group_id ?? '';
    const bucket = buckets.get(key) ?? { connectedRows: 0, coverage: 0 };
    bucket.connectedRows += 1;
    bucket.coverage += selection.quantity;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .map(([key, bucket]) => ({
      groupId:       key === '' ? null : key,
      title:         key === '' ? sheetTitle : labelByGroup.get(key) ?? sheetTitle,
      connectedRows: bucket.connectedRows,
      coverage:      bucket.coverage,
    }))
    .sort((a, b) => {
      const aOrder = a.groupId === null ? Number.MAX_SAFE_INTEGER : orderByGroup.get(a.groupId) ?? 0;
      const bOrder = b.groupId === null ? Number.MAX_SAFE_INTEGER : orderByGroup.get(b.groupId) ?? 0;
      return aOrder - bOrder || a.title.localeCompare(b.title);
    });
}

/**
 * The whole focused-Tier deck. `categories` is the distinct, sorted union of the
 * inclusion categories, so the Details filter offers exactly the categories the
 * loaded rows actually carry — never a fabricated taxonomy.
 */
export function projectTierDeck(
  selections: readonly DeckSelection[],
  categoryByRateItem: ReadonlyMap<string, string[]>,
  rateSheet: DeckRateSheet | null,
): TierDeck {
  const inclusions = projectTierInclusions(selections, categoryByRateItem);
  const categories = [...new Set(inclusions.flatMap((inclusion) => inclusion.categories))].sort((a, b) =>
    a.localeCompare(b),
  );
  return {
    inclusions,
    rateSheets: projectTierRateSheetConnections(selections, rateSheet),
    categories,
  };
}
