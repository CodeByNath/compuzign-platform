// Surface-binding registry — station placement to source/kit presentation rows.

import type { StationConditions, StationPlacement } from './destinations';
import type { DrawerTemplateKey } from '../drawerTypes';

export type DataSourceKey = string;
export type TemplateKitKey = string;

export interface StationActionIntent {
  id: string;
  target: 'drawer';
  mode: string;
  // Optional per-intent drawer override. When set, this intent opens the named
  // registered drawer instead of the binding's own `drawerTemplateKey`, so one
  // surface can dispatch to more than one registered drawer (e.g. a workspace
  // whose cards open the entity drawer while a tool action opens another). It
  // stays pure coordination: the coordinator still owns no entity, only routing.
  drawerTemplateKey?: DrawerTemplateKey;
}

export interface AdminStationSurfaceBinding {
  stationId: string;
  surfaceId: string;
  placement: StationPlacement;
  order: number;
  dataSourceKey: DataSourceKey;
  templateKitKey: TemplateKitKey;
  conditions?: StationConditions;
  actionIntents: StationActionIntent[];
  drawerTemplateKey?: DrawerTemplateKey;
  title?: string;
}

const registeredBindings: AdminStationSurfaceBinding[] = [];

let locked = false;
let resolversReady = false;
let defaultHomeStationId: string | null = null;
let bindingIndex = new Map<string, AdminStationSurfaceBinding[]>();

function bindingKey(binding: AdminStationSurfaceBinding): string {
  return `${binding.stationId}::${binding.surfaceId}::${binding.placement}`;
}

function placementKey(stationId: string, placement: StationPlacement): string {
  return `${stationId}::${placement}`;
}

function assertRegistrationOpen(): void {
  if (locked) {
    throw new Error('[StationManager] surface-binding registry is finalized.');
  }
}

function assertResolversReady(): void {
  if (!resolversReady) {
    throw new Error('[StationManager] station registry has not been finalized.');
  }
}

function assertBindingsWellFormed(list: AdminStationSurfaceBinding[]): void {
  const seen = new Set<string>();
  const dupes: string[] = [];

  for (const binding of list) {
    const key = bindingKey(binding);
    if (seen.has(key)) dupes.push(key);
    else seen.add(key);
  }

  if (dupes.length) {
    throw new Error(
      `[AdminStation] surface binding table is malformed — duplicate station::surface::placement: ${dupes.join(', ')}.`,
    );
  }
}

export function registerSurfaceBindings(list: AdminStationSurfaceBinding[]): void {
  assertRegistrationOpen();
  assertBindingsWellFormed([...registeredBindings, ...list]);
  registeredBindings.push(...list);
}

export function resolveSurfaceBindings(
  stationId: string,
  placement: StationPlacement,
): AdminStationSurfaceBinding[] {
  assertResolversReady();
  return bindingIndex.get(placementKey(stationId, placement)) ?? [];
}

export function setDefaultHomeStation(id: string): void {
  assertRegistrationOpen();
  if (defaultHomeStationId !== null) {
    throw new Error('[StationManager] default home station has already been set.');
  }
  defaultHomeStationId = id;
}

export function defaultHomeStation(): string {
  assertResolversReady();
  if (defaultHomeStationId === null) {
    throw new Error('[StationManager] default home station has not been set.');
  }
  return defaultHomeStationId;
}

/** @internal Finalization is coordinated exclusively by registry/boot.ts. */
export function _finalizeSurfaceBindingRegistry(): AdminStationSurfaceBinding[] {
  locked = true;

  const nextIndex = new Map<string, Array<{ binding: AdminStationSurfaceBinding; registrationOrder: number }>>();
  registeredBindings.forEach((binding, registrationOrder) => {
    const key = placementKey(binding.stationId, binding.placement);
    const rows = nextIndex.get(key) ?? [];
    rows.push({ binding, registrationOrder });
    nextIndex.set(key, rows);
  });

  bindingIndex = new Map(
    Array.from(
      nextIndex,
      ([key, rows]): [string, AdminStationSurfaceBinding[]] => [
        key,
        rows
          .sort(
            (a, b) =>
              a.binding.order - b.binding.order
              || a.registrationOrder - b.registrationOrder,
          )
          .map(({ binding }) => binding),
      ],
    ),
  );

  return registeredBindings;
}

/** @internal Public resolvers open only after every finalize assertion passes. */
export function _enableSurfaceBindingResolvers(): void {
  resolversReady = true;
}
