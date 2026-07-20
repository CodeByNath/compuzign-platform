import { useCallback, useMemo } from 'preact/hooks';
import { usePackageStation } from '@/hooks/usePackageStation';
import { getTierNotes } from '@/drawer-kit/utils/moduleNotifications';
import { TIER_KEYS, TIER_LABELS } from '@/entity-drawers/shared/serviceDrawerShared';
import { useRetainedCollection } from '../useRetainedCollection';
import { TiersIcon, ViewIcon, PackagesIcon, RateSheetIcon } from '../../shell/icons';
import { useHostService } from './useHostService';
import { filterTierOccupantsByConditions, tierScopeServiceIds } from './tierCollectionScope';
import type { TierCollectionItem, TierCollectionMeta } from './tierCollectionTypes';
import type { CategoryGroupStatus } from '../../presentation/category-groups/types';
import type { StationConditions } from '../../navigation/destinations';
import { usePackageCapabilities } from '../packageCapabilities/usePackageCapabilities';
import {
  PACKAGE_CAPABILITY_OWNER,
  resolvePackageCapability,
} from '../packageCapabilities/capabilityRegistry';

export interface PackageTierCollectionResult {
  items: TierCollectionItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  meta: TierCollectionMeta;
  capability: {
    enabled: boolean;
    loading: boolean;
    error: string | null;
  };
}

function toCardStatus(status: string): CategoryGroupStatus {
  switch (status) {
    case 'active':       return 'active';
    case 'disabled':     return 'disabled';
    case 'pending-full': return 'pending-full';
    default:             return 'pending-dim';
  }
}

/** Package-owned Tier occupant collection with optional Service/Family scope. */
export function usePackageTierCollection(
  conditions?: StationConditions,
): PackageTierCollectionResult {
  const definition = resolvePackageCapability('tiers');
  const capabilities = usePackageCapabilities();
  const host = useHostService(conditions?.serviceId);

  const relatedOwner = conditions?.relatedTo;
  const ownerType = PACKAGE_CAPABILITY_OWNER.ownerType;
  const ownerId = relatedOwner?.entity === ownerType && typeof relatedOwner.id === 'string'
    ? relatedOwner.id
    : PACKAGE_CAPABILITY_OWNER.ownerId;
  const enabled = capabilities.isEnabled(ownerType, ownerId, 'tiers');
  // The authority hook stays mounted (Rules of Hooks) but its read gate avoids
  // fetching Tier data until this Package capability is actually enabled.
  const pkg = usePackageStation(host.service?.id ?? 0, undefined, enabled);

  const scopeData = useMemo(() => ({
    packageSources: pkg.service?.package_sources ?? [],
    packageRelationships: pkg.service?.package_relationships ?? [],
    rateSheet: pkg.service?.rate_sheet ?? null,
  }), [pkg.service]);

  const scopedOccupants = useMemo(() => filterTierOccupantsByConditions(
    pkg.tierOccupants,
    conditions,
    scopeData,
  ), [pkg.tierOccupants, conditions, scopeData]);

  const scopedServiceIds = useMemo(
    () => tierScopeServiceIds(conditions, scopeData.packageSources),
    [conditions, scopeData.packageSources],
  );
  const parentServiceId = conditions?.serviceId
    ?? (scopedServiceIds ? [...scopedServiceIds][0] : undefined)
    ?? host.service?.id
    ?? null;

  const projected = useMemo<TierCollectionItem[]>(() => scopedOccupants.map(({ occupantId, slotId }) => {
    const view = pkg.tierView(slotId);
    const detail = view?.detail;
    const price = detail?.price ?? null;
    const inclusions = detail?.inclusions_override.length ?? 0;
    const faqs = detail?.faq_refs.length ?? 0;

    return {
      id: occupantId,
      key: occupantId,
      name: `Package ${detail?.label?.trim() || TIER_LABELS[slotId] || slotId}`,
      kind: 'Package tier',
      description: price == null
        ? 'Pricing not configured'
        : `$${price.toFixed(2)} · ${detail?.billing_cycle ?? 'Not available'}`,
      icon: TiersIcon,
      status: toCardStatus(view?.status ?? 'pending-dim'),
      notifications: detail ? getTierNotes(detail, { platformStatus: pkg.platformStatus }) : [],
      metrics: [
        { id: 'features', label: 'Included features', value: inclusions, icon: PackagesIcon },
        { id: 'faqs', label: 'Common questions', value: faqs, icon: RateSheetIcon },
      ],
      actions: [
        { id: 'view', label: 'View', icon: ViewIcon },
        { id: 'edit', label: 'Edit' },
      ],
      // occupantId above is identity. Everything below is parent/mutation
      // context and is never substituted for that id.
      context: {
        authorityKey: definition?.authorityKey ?? 'package-tier',
        ownerType,
        ownerId,
        serviceId: parentServiceId ?? 0,
        slotId,
        ...(conditions?.serviceId ? { scopeServiceId: conditions.serviceId } : {}),
        ...(conditions?.packageFamilyId ? { packageFamilyId: conditions.packageFamilyId } : {}),
      },
    };
  }), [scopedOccupants, pkg, definition, ownerType, ownerId, parentServiceId, conditions]);

  const authoringSlotId = TIER_KEYS.find((slotId) => {
    const slot = pkg.station?.tiers[slotId];
    return !slot?.occupant_id && Object.values(slot?.module_status ?? {}).some((status) => status === 'pending');
  }) ?? TIER_KEYS.find((slotId) => !pkg.station?.tiers[slotId]?.occupant_id) ?? null;

  const meta = useMemo<TierCollectionMeta>(() => ({
    emptyMessage: 'No tiers configured',
    createLabel: 'Create first tier',
    createRecordId: ownerId,
    createContext: authoringSlotId && parentServiceId
      ? {
          authorityKey: definition?.authorityKey ?? 'package-tier',
          ownerType,
          ownerId,
          serviceId: parentServiceId,
          slotId: authoringSlotId,
          create: true,
          ...(conditions?.serviceId ? { scopeServiceId: conditions.serviceId } : {}),
          ...(conditions?.packageFamilyId ? { packageFamilyId: conditions.packageFamilyId } : {}),
        }
      : null,
  }), [authoringSlotId, parentServiceId, definition, ownerType, ownerId, conditions]);

  const refetch = useCallback(() => {
    capabilities.refetch();
    host.refetch();
    pkg.refetch();
  }, [capabilities, host, pkg]);

  const loading = host.loading || (enabled && !!host.service && !pkg.detailLoaded);
  const retained = useRetainedCollection(projected, loading);
  const stationError = enabled && !host.loading && !host.service
    ? 'No package station is available.'
    : enabled && host.service && pkg.detailLoaded && !pkg.station
      ? 'No package station is available.'
      : null;

  return {
    items: retained.items,
    loading: retained.loading,
    error: host.error ?? stationError,
    refetch,
    meta,
    capability: {
      enabled,
      loading: capabilities.loading,
      error: capabilities.error,
    },
  };
}
