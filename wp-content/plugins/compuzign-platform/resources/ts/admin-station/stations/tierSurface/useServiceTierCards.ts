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
import { getTierNotes } from '@/drawer-kit/utils/moduleNotifications';
import { TIER_LABELS } from '@/entity-drawers/shared/serviceDrawerShared';
import { useHostService } from './useHostService';
import { useRetainedCollection } from '../useRetainedCollection';
import { TiersIcon, ViewIcon, PackagesIcon, RateSheetIcon } from '../../shell/icons';
import type {
  CategoryGroupCardItem,
  CategoryGroupStatus,
} from '../../presentation/category-groups/types';

export interface ServiceTierCardsResult {
  items:   CategoryGroupCardItem[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

// The tier resolver already returns the 5-state vocabulary; the card contract
// accepts four. 'not-configured' is the never-touched shell, which reads as the
// dim pending state — the same collapse the card kit makes elsewhere.
function toCardStatus(status: string): CategoryGroupStatus {
  switch (status) {
    case 'active':       return 'active';
    case 'disabled':     return 'disabled';
    case 'pending-full': return 'pending-full';
    default:             return 'pending-dim';
  }
}

export function useServiceTierCards(): ServiceTierCardsResult {
  const host = useHostService();
  // usePackageStation needs a numeric id; 0 is never a real service id, so the
  // station simply holds its unloaded state until the host resolves.
  const pkg = usePackageStation(host.service?.id ?? 0);

  const projected = useMemo<CategoryGroupCardItem[]>(() => {
    if (!host.service || !pkg.detailLoaded) return [];
    return pkg.tierOccupants.map(({ occupantId, slotId }) => {
      const view       = pkg.tierView(slotId);
      const detail     = view?.detail;
      const price      = detail?.price ?? null;
      const inclusions = detail?.inclusions_override.length ?? 0;
      const faqs       = detail?.faq_refs.length ?? 0;

      return {
        id:   occupantId,          // native stable occupant id, unchanged
        key:  occupantId,
        name: `Package ${detail?.label?.trim() || TIER_LABELS[slotId] || slotId}`,
        kind: 'Package tier',
        description: price == null
          ? 'Pricing not configured'
          : `$${price.toFixed(2)} · ${detail?.billing_cycle ?? 'Not available'}`,
        icon:   TiersIcon,
        status: toCardStatus(view?.status ?? 'pending-dim'),
        // The same notes the manager card shows, from the same generator.
        notifications: detail ? getTierNotes(detail, { platformStatus: pkg.platformStatus }) : [],
        metrics: [
          { id: 'features', label: 'Included features', value: inclusions, icon: PackagesIcon },
          { id: 'faqs',     label: 'Common questions',  value: faqs,       icon: RateSheetIcon },
        ],
        actions: [
          { id: 'view', label: 'View', icon: ViewIcon },
          { id: 'edit', label: 'Edit' },
        ],
      };
    });
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
