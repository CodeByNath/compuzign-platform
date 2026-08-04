// Focused Package settings presentation.
//
// The whole focus the Package Family Group leads, in the two categories the
// workspace already names: the Stations it is connected to, and the Tools it may
// use. It reads both and opens the drawer that owns each — the mature Package
// Family drawer for the Family Group, the registered Tier drawer for the whole
// system's Rate Sheet access — and mutates neither.
//
// One Tier slot's own connections are not presented here: the Connections lane
// beside it reads that narrower scope through the same typed rows. Fixed slots
// are not presented here either: the engine above already lists every slot and
// dispatches the same occupant/slot drawer routes.

import type { VNode } from 'preact';
import type { TierInstanceRecord } from '../../types';
import type {
  ConnectionActionId,
  ConnectionTarget,
  FamilyConnectionRow,
  TierGroupConnectionRow,
} from '../../surface/packageTierWorkspace/connectionNavigation';
import type { TierRateSheetAccessProjection } from '../../surface/tierInstance/tierRateSheetAccessModel';
import { PRESENTATION_PILL } from '@/drawer-kit/schema/presentation';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';
import { RateSheetIcon } from '@/admin-station/shell/icons';
import { TierConnectionRow } from './TierConnectionRow';
import { TierDeckRowIdentity } from './TierDeckRowIdentity';

/**
 * The Stations this focus is connected to. The Family Group leads the focus, so
 * it is the connection this scope reports; the assignment itself is made in the
 * Package Family drawer this row opens, never here.
 */
export function ConnectedStationsSummary({ rows, onIntent }: {
  rows: FamilyConnectionRow[];
  onIntent: (target: ConnectionTarget, actionId: ConnectionActionId) => void;
}): VNode {
  if (rows.length === 0) {
    return (
      <p class="cz-station-empty">
        This Tier system is being operated directly, so no Package Family Group leads this focus.
      </p>
    );
  }
  return (
    <ul class="cz-station-list">
      {rows.map((row) => <TierConnectionRow key={row.id} row={row} onIntent={onIntent} />)}
    </ul>
  );
}

/**
 * The Tier Group pool, listed as the parent Tier System records themselves.
 *
 * It renders the same shared connected-record row the Family Group list uses, so
 * a Tier Group reports the same identity/Platform ID/status-pill/split-action
 * grammar as every other Package-owned record. View addresses the parent system
 * through the instance dispatcher the workspace already owns — never one of the
 * system's Tier occupants or fixed slots, and never a route of this lane's own.
 */
export function TierGroupPoolSummary({ rows, loading, onIntent }: {
  rows: TierGroupConnectionRow[];
  loading: boolean;
  onIntent: (target: ConnectionTarget, actionId: ConnectionActionId) => void;
}): VNode {
  if (loading) {
    return <p class="cz-station-empty" aria-busy="true">Loading Tier Groups…</p>;
  }
  if (rows.length === 0) {
    return <p class="cz-station-empty">No Tier Group matches this filter.</p>;
  }
  return (
    <ul class="cz-station-list">
      {rows.map((row) => <TierConnectionRow key={row.id} row={row} onIntent={onIntent} />)}
    </ul>
  );
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
          <span class={`cz-module-status-pill ${
            projection.needsReview ? PRESENTATION_PILL.pending.cls : PRESENTATION_PILL.active.cls
          }`}>
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
