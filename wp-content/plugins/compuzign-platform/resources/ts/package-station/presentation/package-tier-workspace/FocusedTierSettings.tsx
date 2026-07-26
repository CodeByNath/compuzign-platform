// Tier Workspace Settings — the Focused Tier System sections.
//
// Both sections describe the ONE Tier system the workspace above has focused, and
// neither reaches past it. Rate Sheet Access edits that system's own allow-list;
// Fixed Tier Slots lists its five fixed slots and hands each one to the mature
// Tier drawer. Nothing here creates a Rate Sheet, creates a Tier, assigns a
// Family, or infers a slot occupant.
//
// Every row reports the record's OWN stored identity — a `rs_…` Rate Sheet id, a
// fixed slot key, an `occ_…` occupant id — beside its label, and a record the
// station no longer stores is reported unresolved rather than given a borrowed
// title. Both sections use the deck's existing row grammar, so a Settings row and
// a Connections row read the same way.
//
// Presentation-only. Access writes through the Tier tool's existing
// `updateInstance` mutation; every drawer hand-off goes through the orchestrator's
// `onTierAction`, addressed by (instance, slot, occupant).

import type { VNode } from 'preact';
import type { PackageRateSheet, TierInstanceRecord } from '../../types';
import { tierSlotStates } from '../../surface/tierInstance/tierInstanceModel';
import { TIER_LABELS } from '../../vocabulary';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';
import { RateSheetIcon, TiersIcon } from '@/admin-station/shell/icons';

const SLOT_ACTIONS = [
  { id: 'view', label: 'View' },
  { id: 'edit', label: 'Edit' },
];

// The occupant's own stored lifecycle status, mapped onto the deck's pill tokens.
// A status the station does not store resolves to `pending`, never to `active`.
const OCCUPANT_STATUS_TOKEN: Record<string, string> = {
  active:   'active',
  disabled: 'inactive',
  archived: 'inactive',
  trashed:  'inactive',
  draft:    'pending',
};

/** The stored status value, presented as written — capitalised, never renamed. */
function statusLabel(status: string): string {
  return status.replace(/[-_]/g, ' ').replace(/^./, (first) => first.toUpperCase());
}

function RowIdentity({ icon, name, reference }: {
  icon: VNode;
  name: string;
  reference: string;
}): VNode {
  return (
    <div class="cz-tier-deck__identity">
      <span class="cz-tier-deck__identity-icon" aria-hidden="true">{icon}</span>
      <div class="cz-tier-deck__identity-copy">
        <strong class="cz-tier-deck__identity-name">{name}</strong>
        <small class="cz-tier-deck__identity-ref">{reference}</small>
      </div>
    </div>
  );
}

// ── Rate Sheet Access ─────────────────────────────────────────────────────────

interface AccessProps {
  record:     TierInstanceRecord | null;
  rateSheets: PackageRateSheet[];
  saving:     boolean;
  loading:    boolean;
  error:      string | null;
  onAllow:    (allowedRateSheetIds: string[]) => void;
}

interface AccessRow {
  rateSheetId: string;
  /** The sheet's stored title, or null when the allow-list names a sheet the
   *  Package Manager no longer stores. */
  title:       string | null;
  status:      PackageRateSheet['status'] | null;
  allowed:     boolean;
}

/**
 * Which Rate Sheets the focused Tier system may reach — not which sheet a Tier
 * binds, which stays the Tier's own overview picker.
 *
 * Two honest states: an empty allow-list means every active sheet, and a
 * non-empty one means exactly the sheets it names. An id in the allow-list that
 * no longer resolves to an active sheet is still listed, by its stored id, so a
 * stale grant is visible and removable rather than silently dropped.
 */
export function RateSheetAccess({
  record, rateSheets, saving, loading, error, onAllow,
}: AccessProps): VNode {
  if (record === null) {
    return <p class="cz-station-empty">No Tier system is focused, so no Rate Sheet access is configured.</p>;
  }
  if (loading) {
    return <p class="cz-station-empty" aria-busy="true">Loading Rate Sheets…</p>;
  }
  if (error) {
    return <p class="cz-station-empty" role="alert">{error}</p>;
  }

  const activeRateSheets = rateSheets.filter((sheet) => sheet.status === 'active');
  if (activeRateSheets.length === 0) {
    return <p class="cz-station-empty">No active Rate Sheet exists, so this Tier system can reach none.</p>;
  }

  const allowed = new Set(record.allowed_rate_sheet_ids);
  const unrestricted = allowed.size === 0;
  const byId = new Map(rateSheets.map((sheet) => [sheet.rate_sheet_id, sheet]));

  const rows: AccessRow[] = [
    ...activeRateSheets.map((sheet) => ({
      rateSheetId: sheet.rate_sheet_id,
      title:       sheet.title,
      status:      sheet.status,
      allowed:     unrestricted || allowed.has(sheet.rate_sheet_id),
    })),
    ...record.allowed_rate_sheet_ids
      .filter((id) => !activeRateSheets.some((sheet) => sheet.rate_sheet_id === id))
      .map((id) => ({
        rateSheetId: id,
        title:       byId.get(id)?.title ?? null,
        status:      byId.get(id)?.status ?? null,
        allowed:     true,
      })),
  ];

  // At least one active sheet must stay reachable, so the last allowed active
  // sheet cannot be removed. Widening back is the explicit action below.
  const allowedActiveCount = activeRateSheets.filter((sheet) => allowed.has(sheet.rate_sheet_id)).length;
  const toggle = (row: AccessRow) => {
    const next = new Set(allowed);
    if (next.has(row.rateSheetId)) {
      if (row.status === 'active' && allowedActiveCount <= 1) return;
      next.delete(row.rateSheetId);
    } else {
      next.add(row.rateSheetId);
    }
    onAllow([...next]);
  };

  return (
    <>
      <p class="cz-tier-settings__muted">
        {unrestricted
          ? 'This Tier system can use every active Rate Sheet. Each Tier chooses its own Rate Sheet when configured.'
          : 'This Tier system can use only the Rate Sheets it allows. At least one active sheet must remain available.'}
      </p>

      <ul class="cz-tier-deck__list">
        {rows.map((row) => {
          const locked = unrestricted
            || (row.allowed && row.status === 'active' && allowedActiveCount <= 1);
          return (
            <li key={row.rateSheetId} class="cz-tier-deck__row cz-tier-settings__row">
              <RowIdentity
                icon={<RateSheetIcon />}
                name={row.title ?? 'Unresolved Rate Sheet'}
                reference={row.rateSheetId}
              />
              <div class="cz-tier-deck__field">
                <span class="cz-tier-deck__field-label">Sheet status</span>
                {row.status === null ? 'Not stored' : row.status === 'active' ? 'Active' : 'Archived'}
              </div>
              <span
                class="cz-tier-deck__status"
                data-status={row.allowed ? 'active' : 'inactive'}
              >
                {row.allowed ? 'Allowed' : 'Not allowed'}
              </span>
              <div class="cz-tier-deck__row-actions">
                <button
                  type="button"
                  class="cz-tier-deck__button cz-tier-deck__button--secondary"
                  disabled={saving || locked}
                  onClick={() => toggle(row)}
                >
                  {row.allowed ? 'Remove' : 'Allow'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        class="cz-tier-deck__button cz-tier-deck__button--secondary"
        disabled={saving}
        onClick={() => onAllow(unrestricted
          ? activeRateSheets.map((sheet) => sheet.rate_sheet_id)
          : [])}
      >
        {unrestricted ? 'Limit Rate Sheet access' : 'Allow all active sheets'}
      </button>
    </>
  );
}

// ── Fixed Tier Slots ──────────────────────────────────────────────────────────

interface SlotProps {
  record: TierInstanceRecord | null;
  onTierAction: (
    instanceId: string,
    slotId: string,
    occupantId: string | null,
    actionId: 'view' | 'edit',
  ) => void;
}

/**
 * The focused system's five fixed slots, in canonical order.
 *
 * An occupied slot reports its occupant's own label, `occ_…` id, stored status,
 * and bound Rate Sheet, and offers View and Edit into the mature Tier drawer. An
 * empty slot says so and offers only Configure — there is nothing to view, and
 * no occupant identity is fabricated to open one.
 */
export function FixedTierSlots({ record, onTierAction }: SlotProps): VNode {
  if (record === null) {
    return <p class="cz-station-empty">No Tier system is focused, so there are no slots to configure.</p>;
  }

  return (
    <ul class="cz-tier-deck__list">
      {tierSlotStates(record).map((slot) => {
        const label = TIER_LABELS[slot.slotId] ?? slot.slotId;
        return (
          <li key={slot.slotId} class="cz-tier-deck__row cz-tier-deck__row--connection">
            <RowIdentity icon={<TiersIcon />} name={label} reference={slot.slotId} />
            <div class="cz-tier-deck__field">
              <span class="cz-tier-deck__field-label">Occupant</span>
              {slot.occupantId === null ? '—' : slot.occupantLabel || slot.occupantId}
            </div>
            <div class="cz-tier-deck__field cz-tier-deck__field--hide-sm">
              <span class="cz-tier-deck__field-label">Rate Sheet</span>
              {slot.rateSheetId ?? '—'}
            </div>
            <span
              class="cz-tier-deck__status"
              data-status={slot.occupied
                ? OCCUPANT_STATUS_TOKEN[slot.occupantStatus ?? ''] ?? 'pending'
                : 'inactive'}
            >
              {slot.occupied
                ? slot.occupantStatus ? statusLabel(slot.occupantStatus) : 'Configured'
                : 'Not configured'}
            </span>
            <div class="cz-tier-deck__row-actions">
              {slot.occupied ? (
                <StationSplitAction
                  actions={SLOT_ACTIONS}
                  controlLabel={`${label} Tier`}
                  onAction={(actionId) => onTierAction(
                    record.tier_instance_id,
                    slot.slotId,
                    slot.occupantId,
                    actionId as 'view' | 'edit',
                  )}
                />
              ) : (
                <button
                  type="button"
                  class="cz-tier-deck__button cz-tier-deck__button--secondary"
                  onClick={() => onTierAction(record.tier_instance_id, slot.slotId, null, 'edit')}
                >
                  Configure
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
