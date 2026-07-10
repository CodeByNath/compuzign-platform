import type { StationManagerScope } from './types';
import { providerHasManagementCapability } from './types';
import { packageRelationProvider } from './providers/package';

// Compile-time provider registry, matching the existing ENTITIES and
// WORKSTATIONS registration model. Promotion joins here in its later phase.
export const STATION_RELATION_PROVIDERS = [
  packageRelationProvider,
] as const;

export type RegisteredStationRelationProvider = typeof STATION_RELATION_PROVIDERS[number];

export function relationProvidersFor(scope: StationManagerScope): RegisteredStationRelationProvider[] {
  return STATION_RELATION_PROVIDERS.filter((provider) => provider.appliesTo(scope));
}

export function providersExposeManager(providers: readonly RegisteredStationRelationProvider[]): boolean {
  return providers.some(providerHasManagementCapability);
}
