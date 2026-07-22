// Rate Sheet row manifest (Schema architecture S4, §9).
//
// One row of the Package Station's singleton Rate Sheet configuration. The row
// is station-owned configuration, not a travelling record: it exists exactly
// while its source relationship is priced on the sheet, so it participates as
// a shell-occupant-style configuration entry with live/disabled states only —
// no draft instance, no archive travel, no canonical lifecycle.
//
// Identity is the row's OWN string `item_id` (never a Tier occupant_id, slot
// id, or relationship source_item_id) — the same invariant the drawer host and
// the rate-sheet-row contracts pin.

import type { EntitySchema } from '@/drawer-kit/schema/types';
import {
  rateSheetRowOverviewShell,
  rateSheetRowCommercialShell,
  rateSheetRowProvenanceShell,
  rateSheetRowConnectionShell,
} from '../bindings/rateSheetRow';
import type { RateSheetRowModel } from '../../rate-sheet-row/RateSheetRowDrawerContent';

export const RATE_SHEET_ROW_ENTITY: EntitySchema = {
  id: 'rate-sheet-row',
  label: { singular: 'Rate Sheet Row', plural: 'Rate Sheet Rows' },
  identity: {
    idOf: (data: RateSheetRowModel) => data.itemId,
    titleOf: (data: RateSheetRowModel) => data.optionLabel,
  },

  lifecycle: {
    participation: 'shell-occupant',
    statuses: ['active', 'disabled'],
  },

  ownership: { parent: 'service', label: 'Package Station' },

  shells: {
    overview: rateSheetRowOverviewShell,
    commercial: rateSheetRowCommercialShell,
    provenance: rateSheetRowProvenanceShell,
    connection: rateSheetRowConnectionShell,
  },

  // The row neither travels nor deletes from this drawer; sheet-level repair
  // stays with the manager authority.
  actions: {},

  placements: {
    drawer: {
      details: [
        { module: 'overview', mode: 'details' },
        { module: 'commercial', mode: 'details' },
      ],
      connections: [
        { module: 'provenance', mode: 'connections' },
        { module: 'connection', mode: 'connections' },
      ],
    },
  },
};
