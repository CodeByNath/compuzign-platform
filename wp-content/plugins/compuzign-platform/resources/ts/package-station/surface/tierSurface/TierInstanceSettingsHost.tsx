// Existing Tier drawer's persisted-identity branch. It composes the canonical
// Tier instance collection mutation owner with the selected instance's Rate
// Sheet inventory, then hands both to the SAME TierSystemContent composition
// the pending route mounts.

import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { TierSystemContent } from '../../drawer/tier/TierSystemContent';
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
  // The COLLECTION READ only — see TierRegistrationHost for why a rejected
  // mutation must not unmount the composition that owns its retry.
  if (tool.loadError) {
    return <div class="cz-station-drawer__state" role="alert">{tool.loadError}</div>;
  }
  if (!pkg.service) {
    return <div class="cz-station-drawer__state" role="alert">Rate Sheet access is unavailable.</div>;
  }

  const record = tool.instances.find((instance) => instance.tier_instance_id === instanceId) ?? null;
  if (record === null) {
    return <div class="cz-station-drawer__state">This Tier system no longer exists.</div>;
  }

  return (
    <TierSystemContent
      key={record.tier_instance_id}
      tool={tool}
      instance={record}
      initialFamilyId={null}
      rateSheets={pkg.service?.rate_sheets ?? []}
      refetchRateSheets={pkg.refetch}
      bridge={bridge}
    />
  );
}
