// Focused Tier System settings presentation.
//
// Package Home reads Rate Sheet access and opens the whole Tier-system module in
// the registered Tier drawer; it performs no access mutation. Fixed slots keep
// their existing canonical slot/occupant drawer dispatch.

import type { VNode } from 'preact';
import type { TierInstanceRecord } from '../../types';
import type { TierRateSheetAccessProjection } from '../../surface/tierInstance/tierRateSheetAccessModel';
import { tierSlotStates } from '../../surface/tierInstance/tierInstanceModel';
import { TIER_LABELS } from '../../vocabulary';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';
import { RateSheetIcon, TiersIcon } from '@/admin-station/shell/icons';
import { TierDeckRowIdentity } from './TierDeckRowIdentity';

const SLOT_ACTIONS = [
  { id: 'view', label: 'View' },
  { id: 'edit', label: 'Edit' },
];

const OCCUPANT_STATUS_TOKEN: Record<string, string> = {
  active:   'active',
  disabled: 'inactive',
  archived: 'inactive',
  trashed:  'inactive',
  draft:    'pending',
};

function statusLabel(status: string): string {
  return status.replace(/[-_]/g, ' ').replace(/^./, (first) => first.toUpperCase());
}

export function RateSheetAccessSummary({
  record, projection, loading, error, onView,
}: {
  record: TierInstanceRecord | null;
  projection: TierRateSheetAccessProjection | null;
  loading: boolean;
  error: string | null;
  onView: (instanceId: string) => void;
}): VNode {
  if (record === null) {
    return <p class="cz-station-empty">No Tier system is focused, so no Rate Sheet access is configured.</p>;
  }
  if (loading) {
    return <p class="cz-station-empty" aria-busy="true">Loading Rate Sheets…</p>;
  }
  if (error) {
    return <p class="cz-station-empty" role="alert">{error}</p>;
  }
  if (projection === null) {
    return <p class="cz-station-empty">Rate Sheet access is unavailable.</p>;
  }

  return (
    <ul class="cz-tier-deck__list cz-tier-deck__list--compact">
      <li class="cz-tier-deck__row cz-tier-settings__row cz-tier-deck__row--compact">
        <TierDeckRowIdentity
          icon={<RateSheetIcon />}
          name="Rate Sheet Access"
          reference={record.tier_instance_id}
          compact
        />
        <div class="cz-tier-deck__field">
          <span class="cz-tier-deck__field-label">Policy</span>
          {projection.summary}
        </div>
        <span class="cz-tier-deck__status" data-status={projection.needsReview ? 'pending' : 'active'}>
          {projection.needsReview ? 'Review' : 'Configured'}
        </span>
        <div class="cz-tier-deck__row-actions">
          <StationSplitAction
            actions={[{ id: 'view', label: 'View' }]}
            controlLabel="Rate Sheet Access"
            onAction={() => onView(record.tier_instance_id)}
          />
        </div>
      </li>
    </ul>
  );
}

export function FixedTierSlots({ record, onTierAction }: {
  record: TierInstanceRecord | null;
  onTierAction: (
    instanceId: string,
    slotId: string,
    occupantId: string | null,
    actionId: 'view' | 'edit',
  ) => void;
}): VNode {
  if (record === null) {
    return <p class="cz-station-empty">No Tier system is focused, so there are no slots to configure.</p>;
  }

  return (
    <ul class="cz-tier-deck__list cz-tier-deck__list--compact">
      {tierSlotStates(record).map((slot) => {
        const label = TIER_LABELS[slot.slotId] ?? slot.slotId;
        return (
          <li key={slot.slotId} class="cz-tier-deck__row cz-tier-deck__row--connection cz-tier-deck__row--compact">
            <TierDeckRowIdentity icon={<TiersIcon />} name={label} reference={slot.slotId} compact />
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
