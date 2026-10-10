// Neutral Account drawer composition — host-agnostic, mirroring
// PackageFamilyDrawerContent.tsx. One module (Brand), no Connections content,
// no travel actions.

import { useEffect } from 'preact/hooks';
import { EntityDrawer } from '@/drawer-kit/EntityDrawer';
import { ACCOUNT_ENTITY } from './schema/entities/account';
import { AccountDrawerFooter } from './AccountDrawerFooter';
import { AccountDrawerDialogs } from './AccountDrawerDialogs';
import { useAccountDrawerController } from './useAccountDrawerController';
import type { AccountDrawerContentProps } from './accountDrawerTypes';

export function AccountDrawerContent(props: AccountDrawerContentProps) {
  const c = useAccountDrawerController(props);
  const { bridge } = props;

  useEffect(() => {
    if (c.editing) {
      bridge.setFooter(null);
      return () => bridge.setFooter(null);
    }
    bridge.setFooter(
      <AccountDrawerFooter
        isDisabledMasked={c.station.isDisabledMasked}
        canPublish={c.station.canPublish}
        busy={c.station.loading.status}
        splitOpen={c.splitOpen}
        setSplitOpen={c.setSplitOpen}
        onToggleActive={c.handleToggleActive}
        onPublish={c.openPublishModal}
        onClose={c.requestClose}
      />,
    );
    return () => bridge.setFooter(null);
  }, [
    bridge, c.editing, c.station.isDisabledMasked, c.station.canPublish, c.station.loading.status, c.splitOpen,
  ]);

  return (
    <>
      <EntityDrawer
        entity={ACCOUNT_ENTITY}
        tab={c.tab}
        onSelectTab={c.selectTab}
        bindings={{ brand: c.brandBinding }}
        openPanel={c.openPanel}
        onTogglePanel={(module) => c.togglePanel(module)}
        editing={c.editing && c.draft ? {
          module: 'brand',
          session: {
            draft: c.draft,
            patch: (patch) => c.setDraft((current) => current ? { ...current, ...patch } : current),
            replace: (next) => c.setDraft(next as typeof c.draft),
            onSave: c.saveBrand,
            onCancel: c.cancelEdit,
            saving: c.saving,
            saveErr: c.saveErr,
            isDirty: c.isDirty,
            saveDisabled: !c.isDirty,
          },
        } : null}
      >
        {c.saveOk && <div class="cz-admin-ok-msg">Changes saved.</div>}
        {c.actionError && !c.showPublishModal && <div class="cz-admin-error-msg" role="alert">{c.actionError}</div>}
      </EntityDrawer>

      <AccountDrawerDialogs controller={c} />
    </>
  );
}
