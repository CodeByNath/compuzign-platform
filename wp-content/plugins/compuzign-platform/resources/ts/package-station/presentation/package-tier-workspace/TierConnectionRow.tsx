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
import type { PillMeta } from '@/drawer-kit/schema/presentation';
import {
  PILL_FALLBACK,
  PILL_META,
  PRESENTATION_PILL,
  TRAVEL_PILL,
} from '@/drawer-kit/schema/presentation';
import { StationSplitAction } from '@/admin-station/presentation/StationSplitAction';
import { RateSheetIcon, ServicesIcon, TiersIcon } from '@/admin-station/shell/icons';
import { TierDeckRowIdentity } from './TierDeckRowIdentity';

const ACTION_LABELS: Record<ConnectionActionId, string> = {
  view: 'View',
  edit: 'Edit',
};

// The Presentation Status Contract owns every status→label/class mapping in the
// platform; this file defines none. It previously carried its own token map and
// derived the label by un-hyphenating the status, so the resolver's internal
// `pending-dim`/`pending-full` keys surfaced verbatim as user-facing state
// names. That split is an opacity flavour, not a state a record can be in: the
// contract collapses both to Pending, so delegating removes those labels.
//
// Archived and Trashed are travel data labels, not lifecycle pills: these pool
// lists show binned records, so TRAVEL_PILL names them honestly rather than
// flattening them into Disabled. Anything else falls back to Pending.
export function connectionStatus(status: string): PillMeta {
  return PILL_META[status]                                        // 5-state resolver keys
    ?? PRESENTATION_PILL[status as keyof typeof PRESENTATION_PILL] // canonical 3-state
    ?? TRAVEL_PILL[status as keyof typeof TRAVEL_PILL]             // bin/travel data labels
    ?? PILL_FALLBACK;
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

// A parent Tier Group reports how much of itself is registered, in the same
// column position the other kinds use for their count. Tiers and Add-ons are one
// occupant population split by selection mode, so they read as one `4/1` value
// rather than two columns that would break the shared row's alignment.
function TierGroupConnectionFields({ row }: { row: TierGroupConnectionRow }): VNode {
  return (
    <>
      <PlatformIdField platformId={row.platformId} />
      <div class="cz-station-list__cell cz-tier-deck__field">
        <span class="cz-tier-deck__field-label">Tiers / Add-ons</span>
        <span class="cz-tier-deck__money">{row.tierCount}/{row.addonCount}</span>
      </div>
    </>
  );
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
        <span class={`cz-module-status-pill ${meta.cls}`}>{meta.label}</span>
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
