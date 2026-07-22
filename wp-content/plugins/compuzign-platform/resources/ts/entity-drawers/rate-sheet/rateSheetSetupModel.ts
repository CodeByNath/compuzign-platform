// Rate Sheet setup — the pure model behind the setup drawer.
//
// The Package Station owns ONE Rate Sheet configuration, and the manager commit
// (PackageManagerSchema::commitConfiguration) materialises a Rate Sheet row for
// every live relationship item whenever a sheet is saved. The setup drawer must
// therefore be honest in three directions: BEFORE setup it previews the rows
// the save will connect, AFTER setup it shows the configured result instead of
// silently closing, and when a sheet already exists it offers no form at all.
// This module owns those decisions as pure functions so the drawer's behaviour
// is contract-testable without a DOM
// (scripts/rate-sheet-row-drawer-contract.ts).

/** The configured sheet as the host summarises it for this drawer. */
export interface RateSheetSetupSheetSummary {
  title: string;
  rowCount: number;
  groupCount: number;
}

/** One relationship row that setup will connect as a Rate Sheet row. */
export interface RateSheetSetupEligibleRow {
  /** The relationship's own item_id — display context only, never dispatched. */
  id: string;
  label: string;
  serviceTitle: string | null;
}

export type RateSheetSetupStage = 'form' | 'success' | 'already-configured';

/**
 * Which surface the setup drawer shows. `justConfigured` is the drawer's own
 * transient "this open performed the setup" flag: it wins over the configured
 * check so the user sees the success state rather than the passive
 * already-configured state their own action produced.
 */
export function resolveRateSheetSetupStage(
  sheetConfigured: boolean,
  justConfigured: boolean,
): RateSheetSetupStage {
  if (justConfigured) return 'success';
  return sheetConfigured ? 'already-configured' : 'form';
}

/**
 * The relationship rows the manager commit will materialise into Rate Sheet
 * rows. Live items only: a `missing` relationship is a persisted decision whose
 * source pool entry is gone, and the commit's live-id materialisation skips it.
 */
export function projectEligibleSetupRows(
  relationships: readonly {
    item_id: string;
    label: string;
    missing: boolean;
    source_service_title: string | null;
  }[],
): RateSheetSetupEligibleRow[] {
  return relationships
    .filter((item) => !item.missing)
    .map((item) => ({
      id: item.item_id,
      label: item.label,
      serviceTitle: item.source_service_title,
    }));
}

/** The distinct supplying Services behind the eligible rows. */
export function countEligibleServices(rows: readonly RateSheetSetupEligibleRow[]): number {
  return new Set(rows.map((row) => row.serviceTitle).filter((title) => title !== null)).size;
}
