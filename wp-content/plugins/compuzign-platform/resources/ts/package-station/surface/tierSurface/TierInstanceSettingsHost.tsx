// Existing Tier drawer's whole-instance adapter. It composes the canonical Tier
// instance collection mutation owner with the selected instance's Rate Sheet
// inventory, then hands both to the manifest-driven drawer composition.

import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { TierInstanceSettingsContent } from '../../drawer/tier/TierInstanceSettingsContent';
import { usePackageStation } from '../../usePackageStation';
import { useTierInstances } from '../tierInstance/useTierInstances';

export function TierInstanceSettingsHost({ serviceId, instanceId, bridge }: {
  serviceId: number;
  instanceId: string;
  bridge: EntityDrawerHostBridge;
}): VNode {
  const tool = useTierInstances();
  const pkg = usePackageStation(serviceId, instanceId);

  if (tool.loading || !pkg.detailLoaded) {
    return <div class="cz-station-drawer__state">Loading Tier system settings…</div>;
  }
  if (tool.error) {
    return <div class="cz-station-drawer__state" role="alert">{tool.error}</div>;
  }
  if (!pkg.service) {
    return <div class="cz-station-drawer__state" role="alert">Rate Sheet access is unavailable.</div>;
  }

  return (
    <TierInstanceSettingsContent
      tool={tool}
      instanceId={instanceId}
      rateSheets={pkg.service?.rate_sheets ?? []}
      refetchRateSheets={pkg.refetch}
      bridge={bridge}
    />
  );
}
