import { useEffect } from 'preact/hooks';
import { CanonicalEntityFooter } from '@/drawer-kit/CanonicalEntityFooter';
import { EntityDrawer } from '@/drawer-kit/EntityDrawer';
import { PACKAGE_FAMILY_ENTITY } from '../schema/entities/packageFamily';
import { PackageFamilyDrawerDialogs } from './PackageFamilyDrawerDialogs';
import { usePackageFamilyDrawerController } from './usePackageFamilyDrawerController';
import type { PackageFamilyDrawerContentProps } from './packageFamilyDrawerTypes';

export function PackageFamilyDrawerContent(props: PackageFamilyDrawerContentProps) {
  const c = usePackageFamilyDrawerController(props);
  const { bridge } = props;

  useEffect(() => {
    if (c.editing) {
      bridge.setFooter(null);
      return () => bridge.setFooter(null);
    }
    bridge.setFooter(
      <CanonicalEntityFooter
        platformStatus={c.station.platformStatus}
        isDisabledMasked={c.isDisabledMasked}
        isNewNeverPublished={c.isNewNeverPublished}
        hasBeenPublished={c.hasBeenPublished}
        canPublish={c.canPublish}
        busy={c.station.loading.status || c.station.loading.deleting}
        splitOpen={c.splitOpen}
        setSplitOpen={c.setSplitOpen}
        onToggleActive={c.handleToggleActive}
        onArchive={c.handleArchive}
        onTrash={c.handleTrash}
        onRestore={c.handleRestore}
        onDelete={c.handleDelete}
        onPublish={c.openPublish}
        onClose={c.requestClose}
      />,
    );
    return () => bridge.setFooter(null);
  }, [
    bridge,
    c.editing,
    c.station.platformStatus,
    c.isDisabledMasked,
    c.station.loading.status,
    c.station.loading.deleting,
    c.isNewNeverPublished,
    c.hasBeenPublished,
    c.canPublish,
    c.splitOpen,
  ]);

  return (
    <>
      <EntityDrawer
        entity={PACKAGE_FAMILY_ENTITY}
        tab={c.tab}
        onSelectTab={c.selectTab}
        bindings={{
          overview: c.overviewBinding,
          relationships: c.relationshipsBinding,
          capabilities: c.capabilitiesBinding,
        }}
        openPanel={c.openPanel}
        onTogglePanel={(module) => c.setOpenPanel((open) => open === module ? null : module)}
        editing={c.editing && c.draft ? {
          module: 'overview',
          session: {
            draft: c.draft,
            patch: (patch) => c.setDraft((current) => current ? { ...current, ...patch } : current),
            replace: (next) => c.setDraft(next as typeof c.draft),
            onSave: c.saveOverview,
            onCancel: c.cancelEdit,
            saving: c.saving,
            saveErr: c.saveErr,
            isDirty: c.isDirty,
            saveDisabled: !c.isDirty || !c.draft.name.trim(),
          },
        } : null}
      >
        {c.saveOk && <div class="cz-admin-ok-msg">Changes saved.</div>}
        {c.actionError && !c.confirmDialog && <div class="cz-admin-error-msg" role="alert">{c.actionError}</div>}
        {c.capabilities.error && <div class="cz-admin-error-msg" role="alert">{c.capabilities.error}</div>}
        {c.capabilities.removeConfirm.pendingId && (
          <div class="cz-sc-table__confirm" role="alertdialog" aria-label="Remove Tier capability">
            <span class="cz-sc-table__confirm-label">Remove Tier capability? The Tier instance will remain unchanged.</span>
            <button type="button" class="button" onClick={c.capabilities.removeConfirm.cancel}>Cancel</button>
            <button
              type="button"
              class="button button-primary"
              disabled={c.capabilities.removeConfirm.busyId !== null}
              onClick={() => void c.capabilities.confirmRemoveTier()}
            >
              {c.capabilities.removeConfirm.busyId !== null ? 'Removing…' : 'Confirm'}
            </button>
          </div>
        )}
      </EntityDrawer>

      <PackageFamilyDrawerDialogs controller={c} />
    </>
  );
}
