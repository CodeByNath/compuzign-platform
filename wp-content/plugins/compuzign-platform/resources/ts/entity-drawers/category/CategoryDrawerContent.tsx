import { useEffect } from 'preact/hooks';
import { EntityDrawer } from '@/drawer-kit/EntityDrawer';
import { CATEGORY_DRAWER_ENTITY } from '../schema/entities/category';
import { CategoryDrawerFooter } from './CategoryDrawerFooter';
import { CategoryDrawerDialogs } from './CategoryDrawerDialogs';
import { useCategoryDrawerController } from './useCategoryDrawerController';
import type { CategoryDrawerContentProps } from './categoryDrawerTypes';

export function CategoryDrawerContent(props: CategoryDrawerContentProps) {
  const c = useCategoryDrawerController(props);
  const { bridge } = props;

  useEffect(() => {
    if (c.editing) {
      bridge.setFooter(null);
      return () => bridge.setFooter(null);
    }
    bridge.setFooter(
      <CategoryDrawerFooter
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
        entity={CATEGORY_DRAWER_ENTITY}
        tab={c.tab}
        onSelectTab={c.selectTab}
        bindings={{ overview: c.overviewBinding, services: c.servicesBinding }}
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
      </EntityDrawer>

      <CategoryDrawerDialogs controller={c} />
    </>
  );
}
