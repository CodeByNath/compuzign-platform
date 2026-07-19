// Neutral Service drawer composition — the mature Service drawer, owned by the
// entity and mountable under any host.
//
// It reuses the already-approved presentation unchanged: EntityDrawer assembles
// the Overview / Included Features / Common Questions modules (status pills,
// notification panels, module ActionFooters) from the Service manifest; the
// Connections tab carries the Pricing Summary; each module edits in place through
// OverviewShell / ChildShell + InlineEditorShell while the others stay readable.
//
// It imports NEITHER host — not the old StepContext/ActionShell, not the Admin
// Station shell. All coordination goes through useServiceDrawerController; all
// host concerns (record footer, close-guard, close, refresh) go through the
// EntityDrawerHostBridge. That is what lets the old ServiceViewStep adapter and a
// future Admin Station adapter render exactly this composition.

import { useEffect } from 'preact/hooks';
import { EntityDrawer } from '@/drawer-kit/EntityDrawer';
import { SERVICE_ENTITY } from '../schema/entities/service';
import { ModeProvider } from '@/drawer-kit/schema/modeContext';
import { OverviewShell } from '@/drawer-kit/schema/shells/overviewShell';
import { ChildShell } from '@/drawer-kit/schema/shells/childShell';
import {
  serviceOverviewShell,
  serviceInclusionsShell,
  serviceFaqsShell,
} from '../schema/bindings/service';
import { TIER_KEYS, TIER_LABELS } from '../shared/serviceDrawerShared';
import type { OverviewDraft, InclusionsDraft, FaqsDraft } from '@/admin-station/stations/service';
import { useServiceDrawerController } from './useServiceDrawerController';
import { ServiceDrawerFooter } from './ServiceDrawerFooter';
import { ServiceDrawerDialogs } from './ServiceDrawerDialogs';
import type { ServiceDrawerContentProps } from './serviceDrawerTypes';

export function ServiceDrawerContent(props: ServiceDrawerContentProps) {
  const { bridge } = props;
  const c = useServiceDrawerController(props);

  // Publish the record-level footer into the host's footer region. Re-runs on
  // the same gating inputs the old host's footer effect used; edit mode leaves
  // the slot to InlineEditorShell's own Save/Cancel footer (handled below).
  useEffect(() => {
    bridge.setFooter(
      <ServiceDrawerFooter
        tab={c.tab}
        platformStatus={c.platformStatus}
        isNewNeverPublished={c.isNewNeverPublished}
        hasBeenPublished={c.hasBeenPublished}
        canPublish={c.canPublish}
        loadingStatus={c.station.loading.status}
        splitOpen={c.splitOpen}
        setSplitOpen={c.setSplitOpen}
        onToggleActive={c.handleToggleActive}
        onArchive={c.handleArchive}
        onTrash={c.handleTrash}
        onPublish={c.openPublishModal}
        onClose={c.requestClose}
      />,
    );
    return () => bridge.setFooter(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.tab, c.platformStatus, c.splitOpen, c.station.loading.status, c.canPublish, c.hasBeenPublished, c.isNewNeverPublished, bridge]);

  return (
    <>
      <EntityDrawer
        entity={SERVICE_ENTITY}
        tab={c.tab}
        onSelectTab={c.selectServiceTab}
        bindings={{
          overview:   c.overviewShellBinding,
          inclusions: c.inclusionsShellBinding,
          faqs:       c.faqsShellBinding,
        }}
        openPanel={c.openPanel}
        onTogglePanel={c.togglePanel}
        trailing={{
          connections: (
            <>
              {c.relatedPkg && (
                <div class="cz-shell-section cz-shell-section--no-border">
                  <p class="cz-shell-section__title">Pricing Summary</p>
                  <div class="cz-sp-tier-table-wrap">
                    <table class="cz-sp-tier-table">
                      <thead>
                        <tr>
                          <th>Tier</th>
                          <th>Price</th>
                          <th>Cycle</th>
                          <th class="cz-sp-tier-table__center">Features</th>
                        </tr>
                      </thead>
                      <tbody>
                        {TIER_KEYS.map((tierId) => {
                          const tier = c.relatedPkg!.tiers[tierId];
                          return (
                            <tr key={tierId}>
                              <td class="cz-sp-tier-table__name">{TIER_LABELS[tierId]}</td>
                              <td>
                                <span class={`cz-price-tag${tier?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                                  {tier?.price != null ? `$${tier.price.toLocaleString()}` : '—'}
                                </span>
                              </td>
                              <td class="cz-sp-tier-table__muted">{tier?.billing_cycle ?? '—'}</td>
                              <td class="cz-sp-tier-table__center cz-sp-tier-table__muted">
                                {tier?.inclusion_count ? tier.inclusion_count : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ),
        }}
      >
        {c.saveOk && <div class="cz-admin-ok-msg">Changes saved.</div>}
      </EntityDrawer>

      <ServiceDrawerDialogs c={c} />

      {/* Module-level edit — the active module's shell in `edit` mode
          (InlineEditorShell). One module edits while the others stay readable. */}
      {c.editingSection === 'overview' && c.overviewDraft && (
        <ModeProvider mode="edit">
          <OverviewShell
            schema={serviceOverviewShell}
            binding={c.overviewShellBinding}
            editSession={{
              draft:    c.overviewDraft,
              patch:    (p) => c.setOverviewDraft((d) => d ? { ...d, ...(p as Partial<OverviewDraft>) } : d),
              replace:  (next) => c.setOverviewDraft(next as OverviewDraft),
              onSave:   c.handleSaveOverview,
              onCancel: c.handleCancelEdit,
              saving:   c.saving,
              saveErr:  c.saveErr,
              isDirty:  c.isEditorDirty,
              extras: {
                categories:             c.localCategories,
                catDescription:         c.catDesc,
                onCatDescriptionChange: c.setCatDesc,
              },
            }}
          />
        </ModeProvider>
      )}

      {c.editingSection === 'inclusions' && c.inclusionsDraft && (
        <ModeProvider mode="edit">
          <ChildShell
            schema={serviceInclusionsShell}
            binding={c.inclusionsShellBinding}
            editSession={{
              draft:    c.inclusionsDraft,
              patch:    (p) => c.setInclusionsDraft((d) => d ? { ...d, ...(p as Partial<InclusionsDraft>) } : d),
              replace:  (next) => c.setInclusionsDraft(next as InclusionsDraft),
              onSave:   c.handleSaveInclusions,
              onCancel: c.handleCancelEdit,
              saving:   c.saving,
              saveErr:  c.saveErr,
              isDirty:  c.isEditorDirty,
            }}
          />
        </ModeProvider>
      )}

      {c.editingSection === 'faqs' && c.faqsDraft && (
        <ModeProvider mode="edit">
          <ChildShell
            schema={serviceFaqsShell}
            binding={c.faqsShellBinding}
            editSession={{
              draft:    c.faqsDraft,
              patch:    (p) => c.setFaqsDraft((d) => d ? { ...d, ...(p as Partial<FaqsDraft>) } : d),
              replace:  (next) => c.setFaqsDraft(next as FaqsDraft),
              onSave:   c.handleSaveFaqs,
              onCancel: c.handleCancelEdit,
              saving:   c.saving,
              saveErr:  c.saveErr,
              isDirty:  c.isEditorDirty,
            }}
          />
        </ModeProvider>
      )}
    </>
  );
}
