// Tier-system settings inside the existing registered `tier` drawer.
//
// The module opens readable. Edit enters the manifest-declared editor through
// EntityDrawer/InlineEditorShell; the host footer withdraws, Save/Cancel own the
// session, and persistence remains useTierInstances.updateInstance.

import { useEffect, useMemo, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { DrawerBaseTabId } from '@/drawer-kit/DrawerTabs';
import { EntityActionFooter } from '@/drawer-kit/EntityActionFooter';
import { EntityDrawer } from '@/drawer-kit/EntityDrawer';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import { evaluateModule, tierRateSheetAccessModule } from '@/drawer-kit/utils/moduleNotifications';
import type { PackageRateSheet } from '../../types';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';
import {
  projectTierRateSheetAccess,
  tierRateSheetAccessDraft,
  tierRateSheetAccessIsDirty,
  tierRateSheetAccessIsValid,
  tierRateSheetAccessPayload,
  type TierRateSheetAccessDraft,
} from '../../surface/tierInstance/tierRateSheetAccessModel';
import { tierRateSheetAccessShell } from '../schema/bindings/tierInstance';
import type { TierRateSheetAccessShellData } from '../schema/bindings/tierInstance';
import { TIER_INSTANCE_ENTITY } from '../schema/entities/tierInstance';

export function TierInstanceSettingsContent({
  tool,
  instanceId,
  rateSheets,
  refetchRateSheets,
  bridge,
}: {
  tool: TierInstancesToolState;
  instanceId: string;
  rateSheets: PackageRateSheet[];
  refetchRateSheets: () => void;
  bridge: EntityDrawerHostBridge;
}): VNode {
  const record = tool.instances.find((instance) => instance.tier_instance_id === instanceId) ?? null;
  const projection = useMemo(
    () => record ? projectTierRateSheetAccess(record, rateSheets) : null,
    [rateSheets, record],
  );
  const [draft, setDraft] = useState<TierRateSheetAccessDraft | null>(null);
  const [tab, setTab] = useState<DrawerBaseTabId>('details');
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const editing = draft !== null;

  useEffect(() => {
    bridge.setFooter(editing ? null : (
      <EntityActionFooter close={{ id: 'close', label: 'Close', onSelect: bridge.close }} />
    ));
    return () => bridge.setFooter(null);
  }, [bridge, editing]);

  useEffect(() => {
    const protectNavigation = (event: BeforeUnloadEvent) => {
      if (!editing) return;
      event.preventDefault();
      event.returnValue = '';
    };
    bridge.setCloseGuard(editing
      ? () => window.confirm('Discard unsaved Tier system changes?')
      : null);
    window.addEventListener('beforeunload', protectNavigation);
    return () => {
      bridge.setCloseGuard(null);
      window.removeEventListener('beforeunload', protectNavigation);
    };
  }, [bridge, editing]);

  if (record === null || projection === null) {
    return <div class="cz-station-drawer__state">This Tier system no longer exists.</div>;
  }

  const shellData: TierRateSheetAccessShellData = {
    mode: projection.unrestricted ? 'All active Rate Sheets' : 'Limited',
    availability: projection.summary,
    activeCount: projection.activeCount,
    unresolvedCount: projection.unresolvedCount,
  };
  const binding: ShellBinding<TierRateSheetAccessShellData> = {
    data: shellData,
    state: evaluateModule(tierRateSheetAccessModule, {
      allowedActiveCount: projection.allowedActiveCount,
      activeCount: projection.activeCount,
      unresolvedCount: projection.unresolvedCount,
    }, {
      // Access has no enable/disable lifecycle of its own. A resolved policy is
      // evaluated in its module-local active context so the generic lifecycle
      // tail cannot invent a parent-instance activation note.
      platformStatus: 'active',
      platformLabel: 'Tier system',
    }),
    hasDraft: false,
    handlers: { edit: () => setDraft(tierRateSheetAccessDraft(projection)) },
  };
  const dirty = draft ? tierRateSheetAccessIsDirty(draft, record) : false;
  const valid = draft ? tierRateSheetAccessIsValid(draft, projection) : true;

  const selectTab = (next: DrawerBaseTabId) => {
    if (editing && !window.confirm('Discard unsaved Tier system changes?')) return;
    if (editing) setDraft(null);
    setTab(next);
  };

  return (
    <EntityDrawer
      key={record.tier_instance_id}
      entity={TIER_INSTANCE_ENTITY}
      tab={tab}
      onSelectTab={selectTab}
      bindings={{ 'rate-sheet-access': binding }}
      openPanel={openPanel}
      onTogglePanel={(module) => setOpenPanel((current) => current === module ? null : module)}
      editing={draft ? {
        module: 'rate-sheet-access',
        session: {
          draft,
          replace: (next) => setDraft(next as TierRateSheetAccessDraft),
          onSave: async () => {
            const saved = await tool.updateInstance(record.tier_instance_id, {
              allowed_rate_sheet_ids: tierRateSheetAccessPayload(draft),
            });
            if (!saved) return;
            refetchRateSheets();
            bridge.onMutationComplete?.();
            setDraft(null);
          },
          onCancel: () => setDraft(null),
          saving: tool.saving,
          saveErr: tool.error,
          isDirty: dirty,
          saveDisabled: !dirty || !valid,
          title: tierRateSheetAccessShell.header.title,
          extras: { projection },
        },
      } : null}
    />
  );
}
