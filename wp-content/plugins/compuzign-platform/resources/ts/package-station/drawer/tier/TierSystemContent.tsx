// Tier System drawer — the ONE composition for both a pending (not yet
// published) and a persisted Tier System.
//
// It opens READABLE, on the Overview screen: a pending system states what it
// will be, carries its own Pending pill and that pill's message, and offers
// Edit; only Edit opens the editor. Registering is the pending state of this
// same lifecycle rather than a separate creation form, so there is exactly
// one module cycle before and after Publish — never a bespoke form.
//
// Footer: readable state publishes the mature Tier System footer (Publish
// while pending; Apply + destructive cascade Delete once persisted); editing withdraws
// it, because InlineEditorShell owns Save/Cancel for whichever module is
// open. One footer is present at a time.
//
// Individual Basic / Standard / Premium / Enterprise / Ultimate fixed-slot
// modules are never placed here — those stay on TIER_ENTITY / TierDrawerContent.

import { useEffect, useState } from 'preact/hooks';
import type { VNode } from 'preact';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';
import { EntityDrawer } from '@/drawer-kit/EntityDrawer';
import { evaluateModule } from '@/drawer-kit/utils/moduleNotifications';
import { tierSystemOverviewModule, tierRateSheetAccessModule } from '@/drawer-kit/utils/moduleNotifications';
import type { ShellBinding } from '@/drawer-kit/schema/types';
import { TIER_SYSTEM_ENTITY } from '../schema/entities/tierSystem';
import type {
  TierRateSheetAccessShellData,
  TierSystemOverviewShellData,
} from '../schema/bindings/tierSystem';
import type { TierSystemOverviewDraftFields } from '../editors/TierSystemOverviewEditor';
import type { TierRateSheetAccessDraft } from '../../surface/tierInstance/tierRateSheetAccessModel';
import type { PackageRateSheet, TierInstanceRecord } from '../../types';
import type { TierInstancesToolState } from '../../surface/tierInstance/useTierInstances';
import { useTierSystemController } from './useTierSystemController';
import { TierSystemFooter } from './TierSystemFooter';

export function TierSystemContent({
  tool, instance, initialFamilyId, rateSheets, refetchRateSheets, bridge,
}: {
  tool:                TierInstancesToolState;
  /** null = pending (not yet published) Tier System. */
  instance:            TierInstanceRecord | null;
  initialFamilyId:     string | null;
  rateSheets?:         PackageRateSheet[];
  refetchRateSheets?:  () => void;
  bridge:              EntityDrawerHostBridge;
}): VNode {
  const c = useTierSystemController({
    tool, instance, initialFamilyId, rateSheets: rateSheets ?? [], refetchRateSheets, bridge,
  });
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  useEffect(() => {
    bridge.setFooter(
      <TierSystemFooter
        mode={c.footerMode}
        saving={c.saving}
        deleting={c.deleting}
        canPublish={c.canPublish}
        canApply={c.canApply}
        onPublish={c.publish}
        onApply={c.apply}
        onDelete={c.requestDelete}
        onClose={c.requestClose}
      />,
    );
    return () => bridge.setFooter(null);
  }, [
    bridge, c.footerMode, c.saving, c.deleting, c.canPublish, c.canApply,
    c.publish, c.apply, c.requestDelete, c.requestClose,
  ]);

  useEffect(() => {
    const blocked = c.editingModule !== null || c.hasUnappliedChanges;
    const protectNavigation = (event: BeforeUnloadEvent) => {
      if (!blocked) return;
      event.preventDefault();
      event.returnValue = '';
    };
    bridge.setCloseGuard(blocked
      ? () => window.confirm('Discard unsaved Tier system changes?')
      : null);
    window.addEventListener('beforeunload', protectNavigation);
    return () => {
      bridge.setCloseGuard(null);
      window.removeEventListener('beforeunload', protectNavigation);
    };
  }, [bridge, c.editingModule, c.hasUnappliedChanges]);

  const overviewData: TierSystemOverviewShellData = {
    title:       c.overview.title,
    description: c.overview.description,
    familyLabel: c.familyLabel,
    reference:   c.instance?.tier_instance_id ?? null,
    platformId:  c.instance?.cz_platform_id || null,
    platformIdFallback: c.isPersisted ? 'Not assigned' : 'Assigned after Publish',
  };
  const overviewState = evaluateModule(tierSystemOverviewModule, { titled: c.overview.title.trim().length > 0 }, {
    platformStatus: c.instance?.status ?? 'draft',
    platformLabel:  'Tier system',
  });
  if (c.isPersisted && c.instance?.status === 'disabled' && overviewState.status === 'pending-full') {
    overviewState.notes = [{
      id: 'tier-system-overview.occupants.activation',
      message: 'This Tier Group becomes active through its active Tier occupants.',
      type: 'info',
    }];
  }
  const overviewBinding: ShellBinding<TierSystemOverviewShellData> = {
    data: overviewData,
    state: overviewState,
    hasDraft: c.overviewHasUnappliedChanges,
    handlers: { edit: c.openOverviewEditor },
  };

  const accessData: TierRateSheetAccessShellData = c.projection === null
    ? { mode: 'Unavailable', availability: 'Available once this Tier system is published.', activeCount: 0, unresolvedCount: 0 }
    : {
        // There is only one mode now — explicit selection — so this row
        // states whether anything has been configured yet rather than
        // naming a mode that no longer exists.
        mode:            c.projection.allowedActiveCount === 0 ? 'Not configured' : 'Explicit selection',
        availability:    c.projection.summary,
        activeCount:     c.projection.activeCount,
        unresolvedCount: c.projection.unresolvedCount,
      };
  const accessBinding: ShellBinding<TierRateSheetAccessShellData> = {
    data: accessData,
    // Access has no enable/disable lifecycle of its own. A resolved policy is
    // evaluated in its module-local active context so the generic lifecycle
    // tail cannot invent a parent-instance activation note — unchanged from
    // the prior persisted-only composition.
    state: c.projection === null
      ? { status: 'pending-dim', notes: [] }
      : evaluateModule(tierRateSheetAccessModule, {
          allowedActiveCount: c.projection.allowedActiveCount,
          activeCount:        c.projection.activeCount,
          unresolvedCount:    c.projection.unresolvedCount,
        }, { platformStatus: 'active', platformLabel: 'Tier system' }),
    hasDraft: c.rateSheetHasUnappliedChanges,
    // No `edit` handler pre-publish: the action renders (disabled) rather
    // than vanishing, per the shared Module entry contract, and no slot
    // identity or endpoint is fabricated before the instance exists.
    handlers: c.projection !== null ? { edit: c.openRateSheetEditor } : {},
  };

  const name = c.overview.title.trim() || 'this Tier system';

  return (
    <>
      <EntityDrawer
        entity={TIER_SYSTEM_ENTITY}
        bindings={{ overview: overviewBinding, 'rate-sheet-access': accessBinding }}
        openPanel={openPanel}
        onTogglePanel={(module) => setOpenPanel((current) => current === module ? null : module)}
        editing={c.editingModule === 'overview' ? {
          module: 'overview',
          session: {
            draft:   c.overview,
            patch:   (partial) => c.patchOverview(partial as Partial<TierSystemOverviewDraftFields>),
            replace: (next) => c.patchOverview(next as TierSystemOverviewDraftFields),
            onSave:  () => { c.saveOverviewDraft(); },
            onCancel: c.cancelOverviewEdit,
            saving:  false,
            saveErr: c.error,
            isDirty: c.isDirty,
            saveDisabled: c.overview.title.trim() === '',
            title: c.isPersisted ? 'Tier System' : 'New Tier System',
            extras: { selectable: c.selectable },
          },
        } : c.editingModule === 'rate-sheet-access' && c.rateSheetAccess !== null ? {
          module: 'rate-sheet-access',
          session: {
            draft:   c.rateSheetAccess,
            replace: (next) => c.replaceRateSheetDraft(next as TierRateSheetAccessDraft),
            onSave:  () => { c.saveRateSheetDraft(); },
            onCancel: c.cancelRateSheetEdit,
            saving:  false,
            saveErr: null,
            isDirty: c.isDirty,
            // Any subset of the candidate pool, including empty, is a valid
            // draft now — nothing to reject beyond "no change to save".
            saveDisabled: !c.isDirty,
            title: 'Rate Sheet Access',
            extras: { projection: c.projection },
          },
        } : null}
      >
        {c.saveOk && !c.editingModule && <div class="cz-admin-ok-msg">Changes saved.</div>}
        {c.error && !c.editingModule && <div class="cz-admin-error-msg" role="alert">{c.error}</div>}
      </EntityDrawer>

      {c.deleteDialogOpen && (
        <div
          class="cz-publish-confirm-overlay"
          onClick={(event) => { if (event.target === event.currentTarget) c.cancelDeleteDialog(); }}
        >
          <div class="cz-publish-confirm" role="dialog" aria-modal="true">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">Permanently delete {name}?</h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                This cannot be undone. Deleting this Tier Group will also permanently remove every
                Default Tier occupant and occupant-bin record it owns, and disconnect its Package
                Family assignment if it has one.
              </p>
              {c.deleteError && <p class="cz-admin-error-msg" role="alert">{c.deleteError}</p>}
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={c.cancelDeleteDialog} disabled={c.deleting}>
                Cancel
              </button>
              <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={() => void c.confirmDelete()} disabled={c.deleting}>
                {c.deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
