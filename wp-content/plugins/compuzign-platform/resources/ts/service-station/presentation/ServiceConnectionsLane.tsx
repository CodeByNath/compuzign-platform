// Service Home Connections lane — a read-only projection of Categories
// currently connected to the full Service Catalogue (assigned_count > 0).
//
// Renders through the shared station list system (`cz-station-list`,
// `cz-station-list__cell`, `StationSplitAction`, `StationStatusPill`'s status
// vocabulary) exactly as Package Home's Connections lane does, under Service's
// own row/column classes — no Package presentation import, no copied Package
// CSS. View opens the existing mature Category drawer by its real numeric id;
// this lane invents no second Category relationship model and performs no
// mutation of its own.

import type { VNode } from 'preact';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';
import { PackagesIcon } from '@/admin-station/shell/icons';
import { ServiceDeckRowIdentity } from './ServiceDeckRowIdentity';
import { useServiceHomeConnections } from '../surface/serviceHomeConnections';
import type { ServiceHomeConnectionRow } from '../surface/serviceHomeConnections';
import type { StationIntentDispatch } from '@/station-manager/registry/templateKits';

const STATUS_LABEL: Record<string, string> = {
  active:   'Active',
  disabled: 'Disabled',
};

const STATUS_TOKEN: Record<string, string> = {
  active:   'active',
  disabled: 'inactive',
};

function ServiceConnectionRow({ row, onIntent }: {
  row: ServiceHomeConnectionRow;
  onIntent: StationIntentDispatch;
}): VNode {
  const token = STATUS_TOKEN[row.status] ?? 'pending';
  const label = STATUS_LABEL[row.status] ?? row.status;
  return (
    <li class="cz-station-list__row cz-station-list__row--service-connections">
      <ServiceDeckRowIdentity icon={<PackagesIcon />} name={row.name} reference={`${row.connectedCount} connected Service${row.connectedCount === 1 ? '' : 's'}`} />
      <div class="cz-station-list__cell cz-service-deck__field">
        <span class="cz-service-deck__field-label">Connected Services</span>
        <span class="cz-service-deck__count">{row.connectedCount}</span>
      </div>
      <span class="cz-station-list__cell">
        <span class="cz-service-deck__status" data-status={token}>{label}</span>
      </span>
      <div class="cz-station-list__cell cz-service-deck__row-actions">
        <StationSplitAction
          actions={[{ id: 'view-category', label: 'View' }]}
          controlLabel={row.name}
          onAction={(actionId) => onIntent(row.id, actionId)}
        />
      </div>
    </li>
  );
}

export function ServiceConnectionsLane({ onIntent }: { onIntent: StationIntentDispatch }): VNode {
  const { rows, initialLoading, error } = useServiceHomeConnections();

  if (initialLoading) return <p class="cz-station-empty">Loading Category connections…</p>;
  if (error) return <p class="cz-station-empty" role="alert">{error}</p>;
  if (rows.length === 0) return <p class="cz-station-empty">No Categories are connected to a Service yet.</p>;

  return (
    <ul class="cz-station-list">
      {rows.map((row) => <ServiceConnectionRow key={row.id} row={row} onIntent={onIntent} />)}
    </ul>
  );
}
