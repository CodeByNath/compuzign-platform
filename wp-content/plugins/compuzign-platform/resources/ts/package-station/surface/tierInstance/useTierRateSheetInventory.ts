// The Package Manager's own Rate Sheet inventory, read WITHOUT a Tier
// instance.
//
// A Tier System's Rate Sheet Access module selects from this inventory —
// `allowed_rate_sheet_ids` is a per-instance selection FROM it, never a
// per-instance collection of its own — so the inventory itself is
// instance-independent and resolves by host Service alone. The persisted
// route already gets it for free, folded into the instance-scoped
// `usePackageStation` read; registration has no instance to read through,
// yet its drawer becomes persisted IN PLACE the moment Publish mints one
// (useTierSystemController's `createdInstance`). Without this read, that
// just-published system opens its Rate Sheet Access editor against an empty
// inventory and can only report "Choose at least one active Rate Sheet"
// with nothing to choose.
//
// One responsibility: read the inventory. No selection, no draft, no
// validation, no write — those stay with tierRateSheetAccessModel and the
// Tier System footer.

import { useCallback, useEffect, useState } from 'preact/hooks';
import { fetchPackageStationManager } from '../../api';
import type { PackageRateSheet } from '../../types';
import { useHostService } from '../tierSurface/useHostService';

export interface TierRateSheetInventoryState {
  rateSheets: PackageRateSheet[];
  loading: boolean;
  refetch: () => void;
}

export function useTierRateSheetInventory(): TierRateSheetInventoryState {
  const host = useHostService();
  const serviceId = host.service?.id ?? 0;
  const [rateSheets, setRateSheets] = useState<PackageRateSheet[]>([]);
  // True only until the FIRST read settles, and never again after — the same
  // rule, for the same reason, as useTierInstances' own `initialized`. A host
  // gates mounting the Tier System composition on this, and Apply calls
  // refetch(); re-entering a blocking loading state over an already-mounted
  // composition would unmount it and discard the controller's local
  // pending→persisted transition (`createdInstance`). A later read swaps the
  // inventory in place instead.
  const [initialized, setInitialized] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (serviceId <= 0) {
      setRateSheets([]);
      // Still resolving which Service hosts the station, so the inventory has
      // no answer yet — but once the catalogue itself has settled, "there are
      // none" IS the answer and must not hold the drawer open forever.
      if (!host.loading) setInitialized(true);
      return;
    }
    let active = true;
    fetchPackageStationManager(serviceId)
      .then((response) => {
        if (!active) return;
        setRateSheets(response.success ? response.manager.rate_sheets : []);
      })
      // A failed inventory read leaves the module reporting no sheets rather
      // than replacing the drawer: the Tier System itself is unaffected, and
      // its Overview, Publish and Apply all stay usable.
      .catch(() => { if (active) setRateSheets([]); })
      .finally(() => { if (active) setInitialized(true); });
    return () => { active = false; };
  }, [host.loading, serviceId, revision]);

  const refetch = useCallback(() => setRevision((value) => value + 1), []);

  return { rateSheets, loading: !initialized, refetch };
}
