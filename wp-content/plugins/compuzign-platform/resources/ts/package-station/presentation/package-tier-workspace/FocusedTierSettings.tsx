// Focused Tier System settings presentation.
//
// Package Home reads Rate Sheet access and opens the whole Tier-system module in
// the registered Tier drawer; it performs no access mutation. Fixed slots are
// not presented here: the engine above already lists every slot and dispatches
// the same occupant/slot drawer routes, so Settings would only restate it.

import type { VNode } from 'preact';
import type { TierInstanceRecord } from '../../types';
import type { TierRateSheetAccessProjection } from '../../surface/tierInstance/tierRateSheetAccessModel';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';
import { RateSheetIcon } from '@/admin-station/shell/icons';
import { TierDeckRowIdentity } from './TierDeckRowIdentity';

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
    <ul class="cz-station-list">
      <li class="cz-station-list__row cz-station-list__row--settings">
        <TierDeckRowIdentity
          icon={<RateSheetIcon />}
          name="Rate Sheet Access"
          reference={record.tier_instance_id}
          compact
        />
        <div class="cz-station-list__cell cz-tier-deck__field">
          <span class="cz-tier-deck__field-label">Policy</span>
          {projection.summary}
        </div>
        <span class="cz-station-list__cell">
          <span class="cz-tier-deck__status" data-status={projection.needsReview ? 'pending' : 'active'}>
            {projection.needsReview ? 'Review' : 'Configured'}
          </span>
        </span>
        <div class="cz-station-list__cell cz-tier-deck__row-actions">
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
