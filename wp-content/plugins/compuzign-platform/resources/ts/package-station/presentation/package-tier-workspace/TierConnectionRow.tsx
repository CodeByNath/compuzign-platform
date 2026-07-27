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

import type { VNode } from 'preact';
import type {
  ConnectionActionId,
  ConnectionRow,
  ConnectionTarget,
} from '../../surface/packageTierWorkspace/connectionNavigation';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';
import { RateSheetIcon, ServicesIcon } from '@/admin-station/shell/icons';
import { TierDeckRowIdentity } from './TierDeckRowIdentity';

const ACTION_LABELS: Record<ConnectionActionId, string> = {
  view: 'View',
  edit: 'Edit',
};

const CONNECTION_STATUS_TOKEN: Record<string, string> = {
  active:         'active',
  archived:       'inactive',
  disabled:       'inactive',
  unresolved:     'pending',
  'pending-dim':  'pending',
  'pending-full': 'pending',
};

function connectionStatus(status: string): { label: string; token: string } {
  return {
    label: status.replace(/-/g, ' ').replace(/^./, (first) => first.toUpperCase()),
    token: CONNECTION_STATUS_TOKEN[status] ?? 'pending',
  };
}

export function TierConnectionRow({ row, onIntent }: {
  row: ConnectionRow;
  onIntent: (target: ConnectionTarget, actionId: ConnectionActionId) => void;
}): VNode {
  const icon = row.kind === 'family' ? <ServicesIcon /> : <RateSheetIcon />;
  const meta = connectionStatus(row.status);
  return (
    <li class="cz-station-list__row cz-station-list__row--connection">
      <TierDeckRowIdentity icon={icon} name={row.name} reference={row.reference} compact />
      {row.kind === 'family' ? (
        <>
          <div class="cz-station-list__cell cz-tier-deck__field">
            <span class="cz-tier-deck__field-label">Summary</span>
            {row.description || '—'}
          </div>
          <div class="cz-station-list__cell cz-tier-deck__field">
            <span class="cz-tier-deck__field-label">Assigned Services</span>
            <span class="cz-tier-deck__money">{row.assignedServices}</span>
          </div>
        </>
      ) : row.kind === 'group' ? (
        <>
          <div class="cz-station-list__cell cz-tier-deck__field">
            <span class="cz-tier-deck__field-label">Connected rows</span>
            <span class="cz-tier-deck__money">{row.connectedRows}</span>
          </div>
          <div class="cz-station-list__cell cz-tier-deck__field">
            <span class="cz-tier-deck__field-label">Coverage</span>
            {row.coverage} selected
          </div>
        </>
      ) : (
        <>
          <div class="cz-station-list__cell cz-tier-deck__field">
            <span class="cz-tier-deck__field-label">Connected inclusions</span>
            <span class="cz-tier-deck__money">{row.connectedInclusions}</span>
          </div>
          <div class="cz-station-list__cell cz-tier-deck__field">
            <span class="cz-tier-deck__field-label">Connected rows</span>
            {row.connectedRows}
          </div>
        </>
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
