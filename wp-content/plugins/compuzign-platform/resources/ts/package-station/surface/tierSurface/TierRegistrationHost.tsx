// TierRegistrationHost — the Tier drawer's pending-identity branch.
//
// It exists as its own component so the Tier instance collection loads ONLY
// when a Tier system is being published. The ordinary slot and occupant
// addresses read one instance through the composition's own usePackageStation
// and need no Family collection; mounting that read beside them would make
// every Tier drawer open pay for three Family fetches it never uses.
//
// It renders the SAME TierSystemContent the persisted route mounts, with
// instance=null: registration is the pending state of the Tier System
// lifecycle, not a separate composition. Publish then mints the instance
// inside this same mounted composition, so this host supplies the Rate Sheet
// inventory too — the Rate Sheet Access module needs it the moment the system
// becomes persisted, and this route never re-mounts as the persisted host.

import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { TierSystemContent } from '../../drawer/tier/TierSystemContent';
import { useTierInstances } from '../tierInstance/useTierInstances';
import { useTierRateSheetInventory } from '../tierInstance/useTierRateSheetInventory';

export function TierRegistrationHost({ initialFamilyId, bridge }: {
  initialFamilyId: string | null;
  bridge:          EntityDrawerHostBridge;
}): VNode {
  const tierInstances = useTierInstances();
  const inventory = useTierRateSheetInventory();

  if (tierInstances.loading || inventory.loading) {
    return <div class="cz-station-drawer__state">Loading Package Families…</div>;
  }
  // The COLLECTION READ only. A rejected mutation reports inside the mounted
  // composition (TierSystemContent renders the controller's own error); taking
  // this branch for one would discard the drawer's pending→persisted identity
  // and strand the Tier System that Publish just created.
  if (tierInstances.loadError) {
    return <div class="cz-station-drawer__state" role="alert">{tierInstances.loadError}</div>;
  }

  return (
    <TierSystemContent
      tool={tierInstances}
      instance={null}
      initialFamilyId={initialFamilyId}
      rateSheets={inventory.rateSheets}
      refetchRateSheets={inventory.refetch}
      bridge={bridge}
    />
  );
}
