// Package Tier workspace — the read boundary for the Station-level Tier tool.
//
// This is the data source the `packages` station's Tier tool binds to. It
// composes three EXISTING authoritative reads and adds no persistence of its own:
//
//   • fetchPackageFamilies()      — the Package Family scope + authoritative
//                                    `related_service_ids` and `dependents`.
//   • useHostService()            — the single Package Station's host Service (the
//                                    same rule the Tier wall and Command Centre use).
//   • usePackageStation(hostId)   — the shared Tier occupants and the station's
//                                    Rate Sheet rows / relationships used to
//                                    resolve each occupant's supplying Services.
//
// It then runs the PURE Family-scope projection (./projection) and returns one
// row per Family, each carrying its authoritative summary and the Tier occupant
// cards connected to it. The selected Family lives in the KIT as transient state;
// this source supplies every Family so switching selection needs no refetch and
// writes nothing. `occupant_id` stays the card identity throughout.

import { useMemo } from 'preact/hooks';
import { useApi } from '@/hooks/useApi';
import { fetchPackageFamilies } from '../../api';
import { usePackageStation } from '../../usePackageStation';
import { useHostService } from '../tierSurface/useHostService';
import { toTierOccupantCard } from '../tierSurface/tierOccupantCard';
import { resolvePackageFamilyCardStatus } from '../packageFamily/cardAdapter';
import { useRetainedCollection } from '@/admin-station/stations/useRetainedCollection';
import {
  buildRateItemServiceMap,
  occupantSupplyingServiceIds,
  projectFamilyTierWorkspace,
  type PackageTierWorkspaceFamily,
  type WorkspaceFamilyScope,
  type WorkspaceOccupant,
} from './projection';

export interface PackageTierWorkspaceResult {
  items:   PackageTierWorkspaceFamily[];
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function usePackageTierWorkspace(): PackageTierWorkspaceResult {
  const families = useApi(() => fetchPackageFamilies());
  const host = useHostService();
  // usePackageStation needs a numeric id; 0 is never a real service id, so the
  // station holds its unloaded state until the host resolves — the same guard the
  // Tier wall uses.
  const pkg = usePackageStation(host.service?.id ?? 0);

  const projected = useMemo<PackageTierWorkspaceFamily[]>(() => {
    // Resolve each Rate Sheet row to its supplying Service once, from the station
    // read model — the exact provenance the backend uses for `tier_selections`.
    const serviceByRateItem = buildRateItemServiceMap(
      pkg.service?.rate_sheet?.items ?? [],
      pkg.service?.package_relationships ?? [],
    );

    // The shared Tier occupants, each with the card the grid renders and the
    // Services its selections resolve to. Empty shells are already absent from
    // `tierOccupants`, so no placeholder occupant is ever created here.
    const occupants: WorkspaceOccupant[] = pkg.tierOccupants.map(({ occupantId, slotId }) => {
      const view = pkg.tierView(slotId);
      return {
        occupantId,
        card: toTierOccupantCard({ occupantId, slotId, view, platformStatus: pkg.platformStatus }),
        supplyingServiceIds: occupantSupplyingServiceIds(
          (view?.detail.rate_sheet_items ?? []).map((selection) => selection.item_id),
          serviceByRateItem,
        ),
      };
    });

    // Package Families as WORKING SCOPE: native id, authoritative summary, and the
    // authoritative Service relationship. Never a tier owner.
    const familyScopes: WorkspaceFamilyScope[] = (families.data?.package_category_groups ?? []).map(
      (family) => ({
        id:                family.group_id,
        name:              family.label,
        description:       family.description,
        status:            resolvePackageFamilyCardStatus(family),
        relatedServiceIds: family.related_service_ids,
        dependents:        family.dependents,
      }),
    );

    return projectFamilyTierWorkspace(familyScopes, occupants);
  }, [
    families.data,
    pkg.service,
    pkg.tierOccupants,
    pkg.tierView,
    pkg.platformStatus,
    pkg.detailLoaded,
  ]);

  // Loading until the Families AND the host's Package Station have both resolved,
  // so the kit never flashes a false "no Tier selections" state mid-load.
  const loading  = families.loading || host.loading || (!!host.service && !pkg.detailLoaded);
  const retained = useRetainedCollection(projected, loading);

  return {
    items:   retained.items,
    loading: retained.loading,
    error:   families.error ?? host.error,
    // A Tier drawer save refreshes THIS wall: reload the station (new occupant
    // state) and the Families (their `tier_selections` dependents may change).
    refetch: () => {
      pkg.refetch();
      families.refetch();
    },
  };
}
