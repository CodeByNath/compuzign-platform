// Package Station Rate Sheet transforms — the pure half of the station's
// Rate Sheet commands (usePackageStation.updateRateSheetRow / initialiseRateSheet
// / createRateSheetGroup).
//
// The manager save endpoint is atomic: it always receives the COMPLETE
// { sources, groups, item_decisions, rate_sheet } configuration. These functions
// own the only part of that round-trip that varies — transforming the Rate Sheet
// — plus the decision projection that keeps every already-persisted item
// decision intact. They hold no state, call no endpoint, and render nothing, so
// the identity/validation rules are contract-testable in isolation
// (scripts/rate-sheet-row-command-contract.ts).
//
// The validation is deliberately the SAME set of rules the Package relation
// provider enforces before its own manager save (providers/package.ts →
// validate, rateSheet items): finite non-negative unit price, a known unit, an
// integer quantity of at least 1, and a group that exists on the sheet. They are
// restated here (not imported) because the provider's validator is
// Command-Centre-owned and whole-manager-shaped; the rules themselves are
// host-neutral and must not drift — the contract pins them.

import { PACKAGE_RATE_SHEET_UNITS } from '@/api/types/admin';
import type {
  PackageManagerItem,
  PackageManagerItemDecision,
  PackageRateSheet,
  PackageRateSheetUnit,
} from '@/api/types/admin';

// The only fields a Rate Sheet row command may change. Identity
// (item_id / source_item_id) and placement (sort_order) are never patchable.
export interface RateSheetRowPatch {
  unit_price?: number;
  per?:        PackageRateSheetUnit;
  quantity?:   number;
  group_id?:   string | null;
}

// One failure vocabulary for every Rate Sheet command outcome, so callers key
// behaviour on `code` rather than parsing messages. The transform stage can only
// produce the identity/validation codes; the hook command adds the two
// round-trip codes ('load-failed' / 'save-failed').
export type RateSheetCommandFailureCode =
  | 'row-not-found'
  | 'duplicate-row'
  | 'invalid-patch'
  | 'no-rate-sheet'
  | 'already-configured'
  | 'invalid-title'
  | 'invalid-label'
  | 'load-failed'
  | 'save-failed';

export type RateSheetTransformResult =
  | { ok: true; rateSheet: PackageRateSheet }
  | { ok: false; code: RateSheetCommandFailureCode; message: string };

// What a hook-level Rate Sheet command resolves to. Success carries no payload:
// the command's job is to advance the station's own read model; consumers react
// to `ok` / `code`, never to a returned manager snapshot.
export type RateSheetCommandResult =
  | { ok: true }
  | { ok: false; code: RateSheetCommandFailureCode; message: string };

/**
 * Patch exactly one Rate Sheet row by its own `item_id`. Rejects a missing or
 * duplicated identity outright — never falls back to another row — and patches
 * only the approved editable fields, so `item_id`, `source_item_id` and
 * `sort_order` survive untouched along with every other row, the sheet title,
 * and the sheet groups.
 */
export function applyRateSheetRowPatch(
  rateSheet: PackageRateSheet | null,
  rowId: string,
  patch: RateSheetRowPatch,
): RateSheetTransformResult {
  if (!rateSheet) {
    return { ok: false, code: 'no-rate-sheet', message: 'This Package Station has no Rate Sheet configured.' };
  }

  const matches = rateSheet.items.filter((item) => item.item_id === rowId);
  if (matches.length === 0) {
    return { ok: false, code: 'row-not-found', message: 'This Rate Sheet row could not be found.' };
  }
  if (matches.length > 1) {
    return { ok: false, code: 'duplicate-row', message: 'This Rate Sheet row identity is duplicated; the sheet needs repair before editing.' };
  }

  // Approved fields only — an explicit allowlist, so a wider object can never
  // smuggle an identity or ordering change through the spread below.
  const fields: RateSheetRowPatch = {};
  if ('unit_price' in patch) {
    if (typeof patch.unit_price !== 'number' || !Number.isFinite(patch.unit_price) || patch.unit_price < 0) {
      return { ok: false, code: 'invalid-patch', message: 'Unit Price must be zero or greater.' };
    }
    fields.unit_price = patch.unit_price;
  }
  if ('per' in patch) {
    if (!PACKAGE_RATE_SHEET_UNITS.includes(patch.per as PackageRateSheetUnit)) {
      return { ok: false, code: 'invalid-patch', message: 'Select a valid Rate Sheet unit.' };
    }
    fields.per = patch.per;
  }
  if ('quantity' in patch) {
    if (typeof patch.quantity !== 'number' || !Number.isInteger(patch.quantity) || patch.quantity < 1) {
      return { ok: false, code: 'invalid-patch', message: 'Quantity must be a whole number of at least 1.' };
    }
    fields.quantity = patch.quantity;
  }
  if ('group_id' in patch) {
    const groupId = patch.group_id ?? null;
    if (groupId !== null && !rateSheet.groups.some((group) => group.group_id === groupId)) {
      return { ok: false, code: 'invalid-patch', message: 'Select a valid Rate Sheet group.' };
    }
    fields.group_id = groupId;
  }
  if (Object.keys(fields).length === 0) {
    return { ok: false, code: 'invalid-patch', message: 'No editable Rate Sheet row fields were supplied.' };
  }

  return {
    ok: true,
    rateSheet: {
      ...rateSheet,
      groups: rateSheet.groups.map((group) => ({ ...group })),
      items:  rateSheet.items.map((item) => (item.item_id === rowId ? { ...item, ...fields } : { ...item })),
    },
  };
}

/**
 * The station-owned singleton Rate Sheet's initial shape. Refuses to replace an
 * existing sheet (the station models ONE Rate Sheet configuration, never a
 * catalogue of them) and requires a title, because the backend sanitizer drops
 * a fully-empty sheet back to null.
 *
 * The submitted shape carries no rows DELIBERATELY: row materialisation is the
 * manager commit's own authority (PackageManagerSchema::commitConfiguration
 * appends a row per live relationship item at the domain defaults), so the
 * configured sheet the save returns already carries its connected rows.
 * Restating that rule here would be a second implementation of it.
 */
export function initialRateSheet(
  current: PackageRateSheet | null,
  title: string,
): RateSheetTransformResult {
  if (current) {
    return { ok: false, code: 'already-configured', message: 'A Rate Sheet is already configured for this Package Station.' };
  }
  const trimmed = title.trim();
  if (!trimmed) {
    return { ok: false, code: 'invalid-title', message: 'Rate Sheet title is required.' };
  }
  return { ok: true, rateSheet: { title: trimmed, groups: [], items: [] } };
}

/**
 * Append one Rate Sheet group. The id-minting convention is the mature Rate
 * Sheet editor's own (`rate_group_` + timestamp + position), so groups created
 * here are indistinguishable from groups created through the Command Centre
 * editor. Rows are never touched.
 */
export function appendRateSheetGroup(
  rateSheet: PackageRateSheet | null,
  label: string,
): RateSheetTransformResult {
  if (!rateSheet) {
    return { ok: false, code: 'no-rate-sheet', message: 'Set up the Rate Sheet before adding a Rate Sheet group.' };
  }
  const trimmed = label.trim();
  if (!trimmed) {
    return { ok: false, code: 'invalid-label', message: 'Rate Sheet group label is required.' };
  }
  const groupId = `rate_group_${Date.now()}_${rateSheet.groups.length}`;
  return {
    ok: true,
    rateSheet: {
      ...rateSheet,
      groups: [
        ...rateSheet.groups.map((group) => ({ ...group })),
        { group_id: groupId, label: trimmed, sort_order: rateSheet.groups.length },
      ],
      items: rateSheet.items.map((item) => ({ ...item })),
    },
  };
}

/**
 * Project the manager's items into the explicit-decision payload the save
 * endpoint expects — the same rule the Package relation provider applies when
 * it builds its draft: every already-persisted decision (module_transition
 * other than 'not-configured') is resent verbatim, and provisional rows are
 * omitted so they never enter storage as a side effect of a Rate Sheet command.
 */
export function managerItemDecisions(items: readonly PackageManagerItem[]): PackageManagerItemDecision[] {
  return items
    .filter((item) => item.module_transition !== 'not-configured')
    .map((item) => ({
      item_id:         item.item_id,
      source_type:     item.source_type,
      source_id:       item.source_id,
      group_id:        item.group_id,
      sort_order:      item.sort_order,
      disabled:        item.disabled,
      decorated_label: item.decorated_label,
    }))
    .sort((a, b) => a.item_id.localeCompare(b.item_id));
}
