import type { StationManagerScope } from './types';
import { providerHasManagementCapability } from './types';
import type { ManagerProviderAdapter } from './coordinator';
import { packageRelationProvider } from './providers/package';
import { promotionRelationProvider } from './providers/promotion';

// Compile-time provider registry, matching the existing ENTITIES and
// STATIONS registration model.
export const STATION_RELATION_PROVIDERS = [
  packageRelationProvider,
  promotionRelationProvider,
] as const;

export type RegisteredStationRelationProvider = typeof STATION_RELATION_PROVIDERS[number];

export function relationProvidersFor(scope: StationManagerScope): ManagerProviderAdapter[] {
  return [...STATION_RELATION_PROVIDERS]
    .filter((provider) => provider.appliesTo(scope) && provider.profile(scope).applicable)
    .map((provider) => {
      const profile = provider.profile(scope);
      return {
        key: provider.key,
        label: provider.label,
        access: profile.access,
        capabilities: profile.capabilities,
        manager: provider.manager,
        load: (candidate, signal) => provider.load(candidate as never, signal),
        ...(provider.access === 'writable' && profile.access === 'writable' ? {
          createDraft: (readModel: unknown, candidate: StationManagerScope) => provider.createDraft(readModel as never, candidate as never),
          isDirty: (draft: unknown, original: unknown, readModel: unknown) => provider.isDirty(draft as never, original as never, readModel as never),
          validate: (draft: unknown, readModel: unknown, candidate: StationManagerScope) => provider.validate(draft as never, readModel as never, candidate as never),
          save: (candidate: StationManagerScope, draft: unknown, original: unknown, readModel: unknown) => provider.save(candidate as never, draft as never, original as never, readModel as never),
        } : {}),
      } satisfies ManagerProviderAdapter;
    })
    .sort((left, right) => left.manager.order - right.manager.order || left.key.localeCompare(right.key));
}

export function providersExposeManager(providers: readonly ManagerProviderAdapter[]): boolean {
  return providers.some(providerHasManagementCapability);
}
