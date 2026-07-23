// Destination registration and activation-key resolution.

import type { ShellMode } from '@/drawer-kit/schema/types';

export type StationPlacement = 'presentation' | 'body' | 'drawer';

export interface StationConditions {
  scope?: 'current' | 'archived' | 'trashed';
  recordId?: string | number;
  categoryTermId?: number;
  relatedTo?: { entity: string; id: string | number };
}

export interface StationDestination {
  id: string;
  stationId: string;
  surfaceId: string;
  placement: StationPlacement;
  mode: ShellMode;
  conditions?: StationConditions;
}

const registeredDestinations: StationDestination[] = [];

let locked = false;
let resolversReady = false;
let destinationIndex = new Map<string, StationDestination>();

function projectionKey(destination: StationDestination): string {
  const conditions = destination.conditions;
  const conditionsKey = conditions
    ? [
        conditions.scope ?? '',
        conditions.recordId ?? '',
        conditions.categoryTermId ?? '',
        conditions.relatedTo
          ? `${conditions.relatedTo.entity}#${conditions.relatedTo.id}`
          : '',
      ].join('|')
    : '';

  return [
    destination.stationId,
    destination.surfaceId,
    destination.placement,
    destination.mode,
    conditionsKey,
  ].join('::');
}

function assertRegistrationOpen(): void {
  if (locked) {
    throw new Error('[StationManager] destination registry is finalized.');
  }
}

function assertResolversReady(): void {
  if (!resolversReady) {
    throw new Error('[StationManager] station registry has not been finalized.');
  }
}

function assertDestinationsWellFormed(list: StationDestination[]): void {
  const ids = new Set<string>();
  const projections = new Set<string>();
  const dupIds: string[] = [];
  const dupProjections: string[] = [];

  for (const destination of list) {
    if (ids.has(destination.id)) dupIds.push(destination.id);
    else ids.add(destination.id);

    const key = projectionKey(destination);
    if (projections.has(key)) dupProjections.push(key);
    else projections.add(key);
  }

  const problems: string[] = [];
  if (dupIds.length) problems.push(`duplicate destination id(s): ${dupIds.join(', ')}`);
  if (dupProjections.length) {
    problems.push(
      `duplicate projection(s) [station::surface::placement::mode::conditions]: ${dupProjections.join(', ')}`,
    );
  }
  if (problems.length) {
    throw new Error(`[AdminStation] destination table is malformed — ${problems.join('; ')}.`);
  }
}

export function registerDestinations(list: StationDestination[]): void {
  assertRegistrationOpen();
  assertDestinationsWellFormed([...registeredDestinations, ...list]);
  registeredDestinations.push(...list);
}

export function resolveDestination(activation: string | null): StationDestination | null {
  assertResolversReady();
  if (!activation) return null;
  return destinationIndex.get(activation) ?? null;
}

/** @internal Finalization is coordinated exclusively by registry/boot.ts. */
export function _finalizeDestinationRegistry(): void {
  locked = true;
  destinationIndex = new Map(
    registeredDestinations.map((destination) => [destination.id, destination]),
  );
}

/** @internal Used by boot assertions before public resolvers are enabled. */
export function _hasRegisteredDestination(activation: string): boolean {
  return destinationIndex.has(activation);
}

/** @internal Public resolvers open only after every finalize assertion passes. */
export function _enableDestinationResolvers(): void {
  resolversReady = true;
}
