// Service Tier cards — the read boundary for the Tier presentation wall.
//
// Reads the host service's Package Station and projects each TIER OCCUPANT into
// the shared card contract. The presentation deliberately mirrors the Command
// Centre's PackageManagerTierCards — same title ("Package <label>"), same
// pricing and includes lines, same resolved status and notes, same View/Edit
// pair — because that is the established Tier card, not a new one.
//
// Identity, the part that matters: the card carries `occupant_id`, the Package
// Station's own stable occupant key. NOT the tier slot name ('basic',
// 'standard', …), which is a position and can be reassigned by a bin
// swap/retarget. The drawer re-resolves the slot from this occupant id after the
// station loads, so a stale card can never address a mutation at the wrong shell.
//
// Empty shells carry no occupant id and are omitted by deriveTierOccupants —
// they are absent from the wall exactly as they are absent from the manager grid.

import { useMemo } from 'preact/hooks';
import { usePackageStation } from '@/hooks/usePackageStation';
import { useHostService } from './useHostService';
import { useRetainedCollection } from '../useRetainedCollection';
import { toTierOccupantCard } from './tierOccupantCard';
import type { CategoryGroupCardItem } from '../../presentation/category-groups/types';

export interface ServiceTierCardsResult {
  items:   CategoryGroupCardItem[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useServiceTierCards(): ServiceTierCardsResult {
  const host = useHostService();
  // usePackageStation needs a numeric id; 0 is never a real service id, so the
  // station simply holds its unloaded state until the host resolves.
  const pkg = usePackageStation(host.service?.id ?? 0);

  const projected = useMemo<CategoryGroupCardItem[]>(() => {
    if (!host.service || !pkg.detailLoaded) return [];
    // The shared Tier card builder — the same projection the Package Station Tier
    // tool renders, so the two walls can never disagree about a Tier card.
    return pkg.tierOccupants.map(({ occupantId, slotId }) =>
      toTierOccupantCard({
        occupantId,
        slotId,
        view: pkg.tierView(slotId),
        platformStatus: pkg.platformStatus,
      }),
    );
  }, [host.service, pkg.detailLoaded, pkg.tierOccupants, pkg.tierView, pkg.platformStatus]);

  const loading  = host.loading || (!!host.service && !pkg.detailLoaded);
  const retained = useRetainedCollection(projected, loading);

  return {
    items:   retained.items,
    loading: retained.loading,
    error:   host.error,
    refetch: pkg.refetch,
  };
}
