import type { ModuleNote, ModuleState } from '../../utils/moduleNotifications';
import type {
  ReadOnlyRelationProvider,
  RelationHealth,
  StationManagerScope,
} from '../types';

export type ActivePackageBlockerCode =
  | 'package_inactive'
  | 'no_ready_tiers'
  | 'tier_disabled'
  | 'unresolved_item'
  | 'unavailable_item'
  | 'invalid_option'
  | 'incomplete_pricing';

export interface ActivePackageBlocker {
  code: ActivePackageBlockerCode;
  path: string;
  item_id: string | null;
}

export interface ActivePackageSelection {
  item_id: string;
  quantity: number;
  option_selections: readonly string[];
}

export interface ActivePackageTierContract {
  enabled: boolean;
  contact: boolean;
  selections: readonly ActivePackageSelection[];
  readiness: {
    ready: boolean;
    blockers: readonly ActivePackageBlocker[];
  };
}

export interface ActivePackageContractFixture {
  package_id: string;
  lifecycle: { status: string };
  rate_sheet: {
    items: readonly {
      item_id: string;
      available: boolean;
    }[];
  } | null;
  tiers: Readonly<Record<string, ActivePackageTierContract>>;
  activation: {
    active: boolean;
    blockers: Readonly<Record<string, readonly ActivePackageBlocker[]>>;
    projection: ActivePackageCommercialProjection | null;
  };
}

export interface ActivePackageCommercialProjection {
  tiers: Readonly<Record<string, {
    tier_id: string;
    selections: readonly ActivePackageSelection[];
    pricing: { mode: 'catalogue' | 'contact'; total: number | null };
  }>>;
  popular_tier: string | null;
}

export interface ActivePackageManagerRow {
  row_id: string;
  tier_id: string;
  item_id: string | null;
  quantity: number | null;
  option_selections: readonly string[];
  resolved: boolean;
  available: boolean;
  contact: boolean;
  ready: boolean;
  blockers: readonly ActivePackageBlocker[];
}

export interface ActivePackageManagerReadModel {
  package_id: string;
  lifecycle_status: string;
  active: boolean;
  rows: readonly ActivePackageManagerRow[];
  readiness: {
    ready: boolean;
    blockers: Readonly<Record<string, readonly ActivePackageBlocker[]>>;
  };
  commercial_projection: ActivePackageCommercialProjection | null;
}

export type ActivePackageReadScope = StationManagerScope & {
  stationContext: { type: 'service'; id: number };
};

export interface ActivePackageReadLoader {
  (scope: ActivePackageReadScope, signal?: AbortSignal): Promise<ActivePackageContractFixture>;
}

function blockerMessage(blocker: ActivePackageBlocker): string {
  switch (blocker.code) {
    case 'package_inactive': return 'Package lifecycle is not active.';
    case 'no_ready_tiers': return 'Package has no Tier ready for commercial projection.';
    case 'tier_disabled': return 'Tier is disabled.';
    case 'unresolved_item': return 'Rate Sheet item is unresolved.';
    case 'unavailable_item': return 'Rate Sheet item is unavailable.';
    case 'invalid_option': return 'Tier contains an invalid option selection.';
    case 'incomplete_pricing': return 'Priced Tier does not have complete authoritative pricing.';
  }
}

function healthState(row: ActivePackageManagerRow, lifecycleStatus: string): ModuleState {
  const disabled = lifecycleStatus !== 'active'
    || row.blockers.some((blocker) => blocker.code === 'tier_disabled' || blocker.code === 'package_inactive');
  const notes: ModuleNote[] = row.blockers.map((blocker) => ({
    id: `active-package.${row.tier_id}.${blocker.code}.${blocker.item_id ?? 'tier'}`,
    message: blockerMessage(blocker),
    type: blocker.code === 'tier_disabled' || blocker.code === 'package_inactive' ? 'info' : 'error',
  }));
  return { status: disabled ? 'disabled' : row.ready ? 'active' : 'pending-full', notes };
}

export function adaptActivePackageForManager(fixture: ActivePackageContractFixture): ActivePackageManagerReadModel {
  const items = new Map((fixture.rate_sheet?.items ?? []).map((item) => [item.item_id, item]));
  const rows: ActivePackageManagerRow[] = [];
  for (const [tierId, tier] of Object.entries(fixture.tiers)) {
    const selections = tier.selections.length > 0 ? tier.selections : [null];
    selections.forEach((selection, index) => {
      const item = selection ? items.get(selection.item_id) : undefined;
      const blockers = tier.readiness.blockers.filter((blocker) => (
        blocker.item_id === null || blocker.item_id === selection?.item_id
      ));
      rows.push({
        row_id: `${tierId}:${selection?.item_id ?? 'tier'}:${index}`,
        tier_id: tierId,
        item_id: selection?.item_id ?? null,
        quantity: selection?.quantity ?? null,
        option_selections: selection ? [...selection.option_selections] : [],
        resolved: selection === null || item !== undefined,
        available: selection === null || !!item?.available,
        contact: tier.contact,
        ready: tier.readiness.ready,
        blockers: blockers.map((blocker) => ({ ...blocker })),
      });
    });
  }
  return {
    package_id: fixture.package_id,
    lifecycle_status: fixture.lifecycle.status,
    active: fixture.activation.active,
    rows,
    readiness: {
      ready: fixture.activation.active,
      blockers: Object.fromEntries(Object.entries(fixture.activation.blockers).map(([key, blockers]) => (
        [key, blockers.map((blocker) => ({ ...blocker }))]
      ))),
    },
    commercial_projection: fixture.activation.projection,
  };
}

export function createActivePackageReadOnlyProvider(loadPackage: ActivePackageReadLoader): ReadOnlyRelationProvider<
  ActivePackageReadScope,
  ActivePackageManagerReadModel,
  ActivePackageManagerRow,
  { tierId: string; itemId: string | null }
> {
  return {
    key: 'active-package', label: 'Active Package', stationType: 'service', access: 'read-only',
    capabilities: { fields: [] },
    profile: (scope) => ({
      applicable: scope.stationContext.type === 'service' && scope.kind === 'connection-graph',
      access: 'read-only', capabilities: { fields: [] },
    }),
    manager: { order: 110, sections: [] },
    appliesTo: (scope): scope is ActivePackageReadScope => scope.stationContext.type === 'service'
      && typeof scope.stationContext.id === 'number' && Number.isInteger(scope.stationContext.id)
      && scope.stationContext.id > 0 && scope.kind === 'connection-graph',
    async load(scope, signal) {
      if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
      const fixture = await loadPackage(scope, signal);
      if (signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError');
      return adaptActivePackageForManager(fixture);
    },
    rows: (readModel) => [...readModel.rows],
    identity: (row) => ({ tierId: row.tier_id, itemId: row.item_id }),
    identityKey: (identity) => `${identity.tierId}:${identity.itemId ?? 'tier'}`,
    display: (row) => ({
      label: row.item_id ?? `${row.tier_id} contact Tier`,
      description: row.resolved ? `Tier ${row.tier_id}` : '(unresolved Rate Sheet item)',
    }),
    health: (row, readModel): RelationHealth => {
      const state = healthState(row, readModel.lifecycle_status);
      return { state, notes: state.notes };
    },
  };
}
