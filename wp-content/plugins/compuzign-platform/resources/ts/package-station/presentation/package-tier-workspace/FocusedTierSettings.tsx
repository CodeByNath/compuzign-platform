// Tier Workspace Settings — the Focused Tier System sections.
//
// Both sections describe the ONE Tier system the workspace above has focused, and
// neither reaches past it. Rate Sheet Access edits that system's own allow-list;
// Fixed Tier Slots lists its five fixed slots and hands each one to the mature
// Tier drawer. Nothing here creates a Rate Sheet, creates a Tier, assigns a
// Family, or infers a slot occupant: an absent record reports itself absent.
//
// Presentation-only. Every write goes through the Tier tool's existing
// `updateInstance` mutation; every drawer hand-off goes through the orchestrator's
// `onTierAction`, addressed by (instance, slot, occupant).

import type { VNode } from 'preact';
import type { PackageRateSheet, TierInstanceRecord } from '../../types';
import { tierSlotStates } from '../../surface/tierInstance/tierInstanceModel';
import { TIER_LABELS } from '../../vocabulary';

interface AccessProps {
  record:     TierInstanceRecord | null;
  rateSheets: PackageRateSheet[];
  saving:     boolean;
  loading:    boolean;
  error:      string | null;
  onAllow:    (allowedRateSheetIds: string[]) => void;
}

/** Which Rate Sheets the focused Tier system may reach. Not which sheet a Tier
 *  binds — that stays the Tier's own overview picker. */
export function RateSheetAccess({
  record, rateSheets, saving, loading, error, onAllow,
}: AccessProps): VNode {
  const activeRateSheets = rateSheets.filter((sheet) => sheet.status === 'active');

  if (record === null) {
    return <p class="cz-station-empty">No Tier system is focused, so no Rate Sheet access is configured.</p>;
  }
  if (loading) {
    return <p class="cz-station-empty" aria-busy="true">Loading Rate Sheets…</p>;
  }
  if (error) {
    return <p class="cz-station-empty" role="alert">{error}</p>;
  }
  if (activeRateSheets.length === 0) {
    return <p class="cz-station-empty">No active Rate Sheet exists, so this Tier system can reach none.</p>;
  }

  const allowed = new Set(record.allowed_rate_sheet_ids);

  // Access is either "every active sheet" or an explicit allow-list. Narrowing
  // seeds the list from the sheets already reachable, so the act itself changes
  // nothing but the rule.
  if (allowed.size === 0) {
    return (
      <>
        <p class="cz-tier-settings__muted">
          This Tier system can use every active Rate Sheet. Each Tier chooses its own Rate Sheet when configured.
        </p>
        <button
          type="button"
          class="cz-tier-deck__button cz-tier-deck__button--secondary"
          disabled={saving}
          onClick={() => onAllow(activeRateSheets.map((sheet) => sheet.rate_sheet_id))}
        >
          Limit Rate Sheet access
        </button>
      </>
    );
  }

  // At least one active sheet must remain reachable, so the last selected sheet
  // cannot be unchecked. Widening back is the explicit action below it.
  const selectedActive = activeRateSheets.filter((sheet) => allowed.has(sheet.rate_sheet_id));
  const toggle = (sheetId: string) => {
    const next = new Set(allowed);
    if (next.has(sheetId)) {
      if (selectedActive.length <= 1) return;
      next.delete(sheetId);
    } else {
      next.add(sheetId);
    }
    onAllow([...next]);
  };

  return (
    <>
      <p class="cz-tier-settings__muted">
        This Tier system can use only the selected active Rate Sheets. At least one must remain available.
      </p>
      <div class="cz-tier-settings__checks">
        {activeRateSheets.map((sheet) => (
          <label key={sheet.rate_sheet_id}>
            <input
              type="checkbox"
              checked={allowed.has(sheet.rate_sheet_id)}
              disabled={saving || (selectedActive.length <= 1 && allowed.has(sheet.rate_sheet_id))}
              onChange={() => toggle(sheet.rate_sheet_id)}
            />
            <span>{sheet.title}</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        class="cz-tier-deck__button cz-tier-deck__button--secondary"
        disabled={saving}
        onClick={() => onAllow([])}
      >
        Allow all active sheets
      </button>
    </>
  );
}

interface SlotProps {
  record: TierInstanceRecord | null;
  onTierAction: (
    instanceId: string,
    slotId: string,
    occupantId: string | null,
    actionId: 'view' | 'edit',
  ) => void;
}

/** The focused system's five fixed slots, in canonical order. An empty slot is
 *  reported empty and never given a fabricated occupant. */
export function FixedTierSlots({ record, onTierAction }: SlotProps): VNode {
  if (record === null) {
    return <p class="cz-station-empty">No Tier system is focused, so there are no slots to configure.</p>;
  }

  return (
    <ul class="cz-tier-settings__slots">
      {tierSlotStates(record).map((slot) => (
        <li key={slot.slotId}>
          <span>{TIER_LABELS[slot.slotId] ?? slot.slotId}</span>
          <span class="cz-tier-settings__slot-action">
            <strong>{slot.occupied ? 'Configured' : 'Empty'}</strong>
            <button
              type="button"
              class="cz-tier-deck__button cz-tier-deck__button--secondary"
              onClick={() => onTierAction(
                record.tier_instance_id,
                slot.slotId,
                slot.occupantId,
                slot.occupied ? 'view' : 'edit',
              )}
            >
              {slot.occupied ? 'View' : 'Configure'}
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}
