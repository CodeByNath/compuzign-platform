// Package-owned Tier Tool source. Phase 5 is instance-centric: it loads the
// independent instance/assignment collections, then opens exactly one instance
// through the established Package Station hook. Family workspace resolution is
// added separately in Phase 7; Rate Sheet provenance never chooses an instance.

import { useMemo } from 'preact/hooks';
import type { CategoryGroupCardItem } from '@/admin-station/presentation/category-groups/types';
import type { PackageRateSheet } from '../../types';
import { usePackageStation } from '../../usePackageStation';
import { useTierInstances } from '../tierInstance/useTierInstances';
import type { TierInstancesToolState } from '../tierInstance/useTierInstances';
import { useHostService } from '../tierSurface/useHostService';
import { toTierOccupantCard } from '../tierSurface/tierOccupantCard';
import {
  buildRateItemCategoryMap,
  projectTierDeck,
  type TierDeck,
} from './deck';

export interface PackageTierWorkspaceTool {
  kind: 'tier-instance-tool';
  tierInstances: TierInstancesToolState;
  occupants: CategoryGroupCardItem[];
  decks: Record<string, TierDeck>;
  rateSheets: PackageRateSheet[];
}

export interface PackageTierWorkspaceResult {
  items:   PackageTierWorkspaceTool[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function usePackageTierWorkspace(): PackageTierWorkspaceResult {
  const tierInstances = useTierInstances();
  const host = useHostService();
  const pkg = usePackageStation(
    host.service?.id ?? 0,
    tierInstances.selectedInstanceId,
  );

  const model = useMemo<PackageTierWorkspaceTool>(() => {
    const rateSheets = pkg.service?.rate_sheets ?? [];
    const relationships = pkg.service?.package_relationships ?? [];
    const categoryByRateItem = buildRateItemCategoryMap(
      rateSheets.flatMap((sheet) => sheet.items),
      relationships,
    );
    const decks: Record<string, TierDeck> = {};
    const occupants = pkg.tierOccupants.map(({ occupantId, slotId }) => {
      const view = pkg.tierView(slotId);
      decks[occupantId] = projectTierDeck(
        view?.detail.rate_sheet_selections ?? [],
        categoryByRateItem,
        rateSheets.find((sheet) => sheet.rate_sheet_id === view?.detail.rate_sheet_id) ?? null,
      );
      return toTierOccupantCard({
        occupantId,
        slotId,
        view,
        platformStatus: pkg.platformStatus,
      });
    });
    return {
      kind: 'tier-instance-tool',
      tierInstances,
      occupants,
      decks,
      rateSheets,
    };
  }, [
    tierInstances,
    pkg.service,
    pkg.tierOccupants,
    pkg.tierView,
    pkg.platformStatus,
    pkg.detailLoaded,
  ]);

  const waitingForInstance = tierInstances.selectedInstanceId !== null && !!host.service && !pkg.detailLoaded;
  return {
    items: [model],
    loading: tierInstances.loading || host.loading || waitingForInstance,
    error: tierInstances.error ?? host.error,
    refetch: () => {
      tierInstances.refetch();
      pkg.refetch();
    },
  };
}
