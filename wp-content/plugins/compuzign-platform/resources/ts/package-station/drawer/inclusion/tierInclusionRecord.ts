// One Tier's use of one inclusion — the pure resolution behind the Inclusion
// drawer.
//
// Like surface/packageTierWorkspace/deck.ts this module is PURE: it fetches
// nothing, renders nothing, holds no state. It reads the SAME already-resolved
// selections the focused-Tier deck reads, and adds only the two relationship
// hops the row itself drops: the Rate Sheet the selection was priced from, and
// the supplying Service / categories recorded on the relationship it prices.
//
// IT INVENTS NO PRICE AND NO IDENTITY. Resolution is by stored id, in one
// direction, and never widens:
//
//   selection.item_id  →  the BOUND sheet's row      (rate sheet passed in; no other sheet is read)
//   row.source_item_id →  the priced relationship    (Map lookup by id)
//   relationship       →  source_service_id / _title / _categories
//
// A label is never used to find anything, and no collection is scanned to guess
// which record was meant. An absent relationship stays absent.

import type {
  PackageManagerItem,
  PackageRateSheet,
  TierResolvedRateSheetSelection,
} from '../../types';

/** The supplying Service, as the Package read model records it. */
export interface TierInclusionServiceLink {
  id:    number;
  title: string;
}

/** The Rate Sheet the Tier priced this inclusion from. */
export interface TierInclusionRateSheetLink {
  id:    string;
  title: string;
}

/** One Tier's use of one Rate Sheet row, fully resolved. */
export interface TierInclusionRecord {
  // The Tier's selection key — the Rate Sheet row id. Scoped by the bound sheet.
  itemId:     string;
  // The Service inclusion pool id this row prices (the inclusion's own identity).
  sourceId:   string | null;
  name:       string;          // Service-owned label, carried through
  quantity:   number;          // the TIER's quantity, not the sheet's default
  unitPrice:  number | null;   // Rate Sheet row unit price, carried through
  per:        string | null;
  lineTotal:  number | null;   // already-derived line total, carried through
  resolved:   boolean;         // row + Service source both resolve
  // Stored relationships. `null` / `[]` mean not configured — never a stand-in.
  categories: string[];
  service:    TierInclusionServiceLink | null;
  rateSheet:  TierInclusionRateSheetLink | null;
}

/**
 * Resolve one inclusion the addressed Tier selects.
 *
 * `selections` are the Tier's own resolved selections (usePackageStation
 * .tierView().detail.rate_sheet_selections); `rateSheet` is the ONE sheet that
 * Tier is bound to; `relationships` is the admin read model's relationship
 * list. Returns null when the Tier does not select this row as an inclusion —
 * the drawer then reports the record as unavailable rather than showing a
 * neighbouring row.
 */
export function resolveTierInclusion(
  itemId: string,
  selections: readonly TierResolvedRateSheetSelection[],
  rateSheet: PackageRateSheet | null,
  relationships: readonly PackageManagerItem[],
): TierInclusionRecord | null {
  const selection = selections.find(
    (candidate) => candidate.item_id === itemId && candidate.source_type === 'inclusion',
  );
  if (!selection) return null;

  // The bound sheet only. A row absent from it is an unresolved selection, not
  // an invitation to look in another sheet.
  const row = rateSheet?.items.find((candidate) => candidate.item_id === itemId) ?? null;
  const relationship = row
    ? relationships.find((candidate) => candidate.item_id === row.source_item_id) ?? null
    : null;

  const serviceId = relationship?.source_service_id ?? null;
  const serviceTitle = relationship?.source_service_title ?? null;

  return {
    itemId:     selection.item_id,
    sourceId:   selection.source_id ?? null,
    name:       selection.label,
    quantity:   selection.quantity,
    unitPrice:  selection.unit_price,
    per:        selection.per,
    lineTotal:  selection.line_total,
    resolved:   selection.resolved,
    categories: relationship?.source_categories ?? [],
    service:    serviceId !== null && serviceTitle !== null ? { id: serviceId, title: serviceTitle } : null,
    rateSheet:  rateSheet ? { id: rateSheet.rate_sheet_id, title: rateSheet.title } : null,
  };
}
