// Connected-record row — the one row grammar for a record this workspace is
// connected TO.
//
// Two lanes read that relationship at two scopes: Connections reads what the
// focused Tier is connected to, and Settings reads what the whole focus the
// Package Family leads is connected to. Both render this row, so the same
// record reports the same identity, fields, status and actions in either place.
//
// It owns selection of neither. The typed projection supplies the row and its
// canonical target; this component renders it and forwards the chosen action.
// Family Group, Group and Rate Sheet connections require their own visible
// columns, so the shared row shell branches on `row.kind` into a
// connection-type field set rather than forcing every kind through one
// generic label/value layout.

import type { VNode } from 'preact';
import type {
  ConnectionActionId,
  ConnectionRow,
  ConnectionTarget,
  FamilyConnectionRow,
  GroupConnectionRow,
  RateSheetConnectionRow,
  TierGroupConnectionRow,
} from '../../surface/packageTierWorkspace/connectionNavigation';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';
import { RateSheetIcon, ServicesIcon, TiersIcon } from '@/admin-station/shell/icons';
import { TierDeckRowIdentity } from './TierDeckRowIdentity';

const ACTION_LABELS: Record<ConnectionActionId, string> = {
  view: 'View',
  edit: 'Edit',
};

const CONNECTION_STATUS_TOKEN: Record<string, string> = {
  active:         'active',
  archived:       'inactive',
  disabled:       'inactive',
  trashed:        'inactive',
  pending:        'pending',
  unresolved:     'pending',
  'pending-dim':  'pending',
  'pending-full': 'pending',
};

export function connectionStatus(status: string): { label: string; token: string } {
  return {
    label: status.replace(/-/g, ' ').replace(/^./, (first) => first.toUpperCase()),
    token: CONNECTION_STATUS_TOKEN[status] ?? 'pending',
  };
}

// The project's established visible unavailable-value treatment for an
// existing record whose Platform ID is not set — the same fallback the Rate
// Sheet tool already shows for a stored sheet or group (RateSheetTool.tsx,
// rateSheetParts.tsx). Never an empty cell.
const PLATFORM_ID_FALLBACK = 'Not assigned';

function PlatformIdField({ platformId }: { platformId: string }): VNode {
  return (
    <div class="cz-station-list__cell cz-tier-deck__field">
      <span class="cz-tier-deck__field-label">Platform ID</span>
      {platformId || PLATFORM_ID_FALLBACK}
    </div>
  );
}

function FamilyGroupConnectionFields({ row }: { row: FamilyConnectionRow }): VNode {
  return (
    <>
      <PlatformIdField platformId={row.platformId} />
      <div class="cz-station-list__cell cz-tier-deck__field">
        <span class="cz-tier-deck__field-label">Services</span>
        <span class="cz-tier-deck__money">{row.assignedServices ?? 0}</span>
      </div>
    </>
  );
}

// A parent Tier Group reports its Platform ID and nothing else beside it: its
// occupant and Rate Sheet counts belong to the system's own drawer and to the
// engine above, not to this row's identity.
function TierGroupConnectionFields({ row }: { row: TierGroupConnectionRow }): VNode {
  return <PlatformIdField platformId={row.platformId} />;
}

function GroupConnectionFields({ row }: { row: GroupConnectionRow }): VNode {
  return (
    <>
      <PlatformIdField platformId={row.platformId} />
      <div class="cz-station-list__cell cz-tier-deck__field">
        <span class="cz-tier-deck__field-label">Inclusions</span>
        <span class="cz-tier-deck__money">{row.connectedInclusions ?? 0}</span>
      </div>
    </>
  );
}

function RateSheetConnectionFields({ row }: { row: RateSheetConnectionRow }): VNode {
  return (
    <>
      <PlatformIdField platformId={row.platformId} />
      <div class="cz-station-list__cell cz-tier-deck__field">
        <span class="cz-tier-deck__field-label">Inclusions</span>
        <span class="cz-tier-deck__money">{row.connectedInclusions ?? 0}</span>
      </div>
    </>
  );
}

export function TierConnectionRow({ row, onIntent }: {
  row: ConnectionRow;
  onIntent: (target: ConnectionTarget, actionId: ConnectionActionId) => void;
}): VNode {
  const icon = row.kind === 'family'
    ? <ServicesIcon />
    : row.kind === 'tier-group' ? <TiersIcon /> : <RateSheetIcon />;
  const meta = connectionStatus(row.status);
  return (
    <li class="cz-station-list__row cz-station-list__row--connection">
      <TierDeckRowIdentity icon={icon} name={row.name} reference={row.reference} compact />
      {row.kind === 'family' ? (
        <FamilyGroupConnectionFields row={row} />
      ) : row.kind === 'tier-group' ? (
        <TierGroupConnectionFields row={row} />
      ) : row.kind === 'group' ? (
        <GroupConnectionFields row={row} />
      ) : (
        <RateSheetConnectionFields row={row} />
      )}
      <span class="cz-station-list__cell">
        <span class="cz-tier-deck__status" data-status={meta.token}>{meta.label}</span>
      </span>
      <div class="cz-station-list__cell cz-tier-deck__row-actions">
        <StationSplitAction
          actions={row.actions.map((actionId) => ({ id: actionId, label: ACTION_LABELS[actionId] }))}
          controlLabel={row.name}
          onAction={(actionId) => onIntent(row.target, actionId as ConnectionActionId)}
        />
      </div>
    </li>
  );
}
