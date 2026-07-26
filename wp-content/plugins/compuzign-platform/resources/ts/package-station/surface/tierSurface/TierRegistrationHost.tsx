// TierRegistrationHost — the Tier drawer's registration branch.
//
// It exists as its own component so the Tier instance collection loads ONLY when
// a Tier system is being registered. The ordinary slot and occupant addresses
// read one instance through the composition's own usePackageStation and need no
// Family collection; mounting that read beside them would make every Tier drawer
// open pay for three Family fetches it never uses.

import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { TierRegistrationContent } from '../../drawer/tier/TierRegistrationContent';
import { useTierInstances } from '../tierInstance/useTierInstances';

export function TierRegistrationHost({ initialFamilyId, bridge }: {
  initialFamilyId: string | null;
  bridge:          EntityDrawerHostBridge;
}): VNode {
  const tierInstances = useTierInstances();

  if (tierInstances.loading) {
    return <div class="cz-station-drawer__state">Loading Package Families…</div>;
  }
  if (tierInstances.error) {
    return <div class="cz-station-drawer__state" role="alert">{tierInstances.error}</div>;
  }

  return (
    <TierRegistrationContent
      tool={tierInstances}
      initialFamilyId={initialFamilyId}
      bridge={bridge}
    />
  );
}
