// Neutral Tier drawer composition — the mature Package Station tier drawer,
// owned by the entity and mountable under any host.
//
// Reuses the approved presentation unchanged: the package overview (Details =
// tier occupant cards + Pricing Summary, or the occupant Bin; Connections = the
// parent service), the individual-tier EntityDrawer (Tier Overview / Features /
// FAQs with status pills, notifications, module footers), and the in-place module
// editors. Imports neither host: all coordination goes through
// useTierDrawerController, all host concerns through the EntityDrawerHostBridge.

import { useEffect } from 'preact/hooks';
import { AsyncLoading } from '@/drawer-kit/ui/AsyncSection';
import { ReadBlock } from '@/drawer-kit/ReadBlock';
import { DrawerTabs } from '@/drawer-kit/DrawerTabs';
import { EntityDrawer } from '@/drawer-kit/EntityDrawer';
import type { EntityDrawerEditingModule } from '@/drawer-kit/EntityDrawer';
import { ModeProvider } from '@/drawer-kit/schema/modeContext';
import { OverviewShell } from '@/drawer-kit/schema/shells/overviewShell';
import { serviceOverviewShell } from '@/service-station';
import { TIER_ENTITY } from '../schema/entities/tier';
import { statusDotClass } from '@/drawer-kit/utils/moduleStatus';
import { MODULE_ICONS } from '@/drawer-kit/schema/icons';
import { getTierNotes } from '@/drawer-kit/utils/moduleNotifications';
import type { TierRateSheetSelection } from '../../types';
import type { TierOverviewEditDraft } from '../editors/TierOverviewEditor';
import { TIER_KEYS, TIER_LABELS } from '../../vocabulary';
import { useTierDrawerController } from './useTierDrawerController';
import { TierDrawerFooter } from './TierDrawerFooter';
import { TierBinList } from './TierBinList';
import { TierDrawerDialogs } from './TierDrawerDialogs';
import { TierEditionsPanel } from './TierEditionsPanel';
import type { TierDrawerContentProps } from './tierDrawerTypes';
import { selectableRateSheets } from '../../surface/tierInstance/tierInstanceModel';

export function TierDrawerContent(props: TierDrawerContentProps) {
  const { bridge } = props;
  const c = useTierDrawerController(props);

  // Publish the record footer through the host. Mirrors the old host's footer
  // effect deps; edit mode ('none') leaves the slot to InlineEditorShell.
  useEffect(() => {
    bridge.setFooter(c.footerMode === 'none' ? null :
      <TierDrawerFooter
        mode={c.footerMode}
        enabled={c.footerEnabled}
        hasContent={c.footerHasContent}
        hasBeenPublished={c.footerHasBeenPublished}
        saving={c.pkg.saving}
        splitOpen={c.splitOpen}
        setSplitOpen={c.setSplitOpen}
        onToggleEnabled={c.handleToggleEnabled}
        onArchive={() => c.handleArchive()}
        onPublish={() => c.setConfirmModal('publish')}
        onClose={c.requestClose}
      />,
    );
    return () => bridge.setFooter(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.footerMode, c.footerEnabled, c.footerHasContent, c.footerHasBeenPublished, c.pkg.saving, c.splitOpen, bridge]);

  if (!c.pkg.detailLoaded) return <AsyncLoading label="Loading tiers…" />;

  const { station, svc } = c;
  // Defensive guard: the endpoint returns success:false with no station when
  // cz_service_package_station was never seeded — a clear empty state, never a
  // fallback to legacy data.
  if (!station || !svc) {
    return (
      <div class="cz-req-detail">
        <ReadBlock
          title="Tier configuration unavailable"
          subtitle="This service has no Package Station yet."
          actions={[{ id: 'refresh', label: 'Refresh', onSelect: () => c.pkg.refetch() }]}
        >
          <div class="drawerModule__empty">
            <p class="drawerModule__empty-title">Package Station not found</p>
            <p class="drawerModule__empty-copy">
              This service’s pricing station has not been initialised, which can happen if
              migration has not completed for it. Refresh to try again; if the problem
              persists, contact an administrator.
            </p>
          </div>
        </ReadBlock>
      </div>
    );
  }

  // ── Package overview (no tier open) ──────────────────────────────────────────
  if (!c.editingTierId) {
    return (
      <div class="cz-req-detail">
        <DrawerTabs active={c.overviewTab} onSelect={c.selectOverviewTab} />

        {c.overviewTab === 'details' && (
          <>
            {(c.pkg.occupantBin.length > 0 || c.listView === 'bin') && (
              <div style="display:flex; gap: var(--cz-space-2); margin-bottom: var(--cz-space-3)">
                <button
                  type="button"
                  class={`cz-admin-btn cz-admin-btn--sm ${c.listView === 'current' ? 'cz-admin-btn--primary' : 'cz-admin-btn--secondary'}`}
                  onClick={() => { c.setListView('current'); c.setBinPrompt(null); c.binDeleteConfirm.cancel(); }}
                >
                  Current ({TIER_KEYS.length})
                </button>
                <button
                  type="button"
                  class={`cz-admin-btn cz-admin-btn--sm ${c.listView === 'bin' ? 'cz-admin-btn--primary' : 'cz-admin-btn--secondary'}`}
                  onClick={() => c.setListView('bin')}
                >
                  Bin ({c.pkg.occupantBin.length})
                </button>
              </div>
            )}

            {c.listView === 'bin' && <TierBinList c={c} />}

            {c.listView === 'current' && (
              <>
                {c.pkg.tierOccupants.map(({ occupantId, slotId: tierId }) => {
                  const view       = c.pkg.tierView(tierId);
                  const detail     = view?.detail;
                  const status     = view ? view.status : 'not-configured';
                  const showData   = !!(detail && (detail.price !== null || detail.billing_cycle || detail.contact));
                  const priceText  = detail?.contact && detail.price === null
                    ? 'Contact'
                    : detail?.price != null ? `$${detail.price.toFixed(2)}` : '$0.00';
                  const cycleText  = detail?.billing_cycle ?? 'Not available';
                  const inclCount  = detail?.inclusions_override?.length ?? 0;
                  const faqCount   = detail?.faq_refs?.length ?? 0;
                  const featLabel  = `${inclCount} ${inclCount === 1 ? 'feature' : 'features'}`;
                  const faqLabel   = `${faqCount} ${faqCount === 1 ? 'common question' : 'common questions'}`;
                  // Occupant truth, not the parent Tier Group/station status —
                  // the same ctx usePackageStation.tierView derives per module.
                  const tierNotes  = detail ? getTierNotes(detail, {
                    platformStatus: detail.enabled ? 'active' : 'disabled',
                    disabled:       detail.is_explicitly_disabled,
                  }) : [];
                  return (
                    <ReadBlock
                      key={occupantId}
                      title={`Package ${detail?.label?.trim() || TIER_LABELS[tierId]}`}
                      subtitle="Pricing and inclusions for this tier."
                      icon={MODULE_ICONS.package}
                      scopeClass="drawerOverview tier"
                      status={status}
                      notes={tierNotes}
                      panelOpen={c.openSummaryTier === tierId}
                      onTogglePanel={() => c.setOpenSummaryTier((p) => p === tierId ? null : tierId)}
                      actions={[{ id: 'view', label: 'View', onSelect: () => c.openTierEdit(tierId) }]}
                    >
                      <div class="drawerModule__fields">
                        <div class="drawerModule__field">
                          <p class="drawerModule__label">Pricing</p>
                          {showData ? (
                            <p class="drawerModule__value"><span>{priceText}</span>{' · '}<span>{cycleText}</span></p>
                          ) : (
                            <p class="drawerModule__value">View Tier Overview and manage pricing.</p>
                          )}
                        </div>
                        <div class="drawerModule__field">
                          <p class="drawerModule__label">Includes</p>
                          <p class="drawerModule__value">{featLabel} | {faqLabel}</p>
                        </div>
                      </div>
                    </ReadBlock>
                  );
                })}

                <div class="cz-shell-section cz-shell-section--no-border">
                  <p class="cz-shell-section__title">Pricing Summary</p>
                  <div class="cz-sp-tier-table-wrap">
                    <table class="cz-sp-tier-table">
                      <thead>
                        <tr>
                          <th>Tier</th><th>Price</th><th>Cycle</th><th class="cz-sp-tier-table__center">Features</th>
                        </tr>
                      </thead>
                      <tbody>
                        {TIER_KEYS.map((tierId) => {
                          const view   = c.pkg.tierView(tierId);
                          const detail = view?.detail;
                          const status = view ? view.status : 'not-configured';
                          return (
                            <tr key={tierId}>
                              <td class="cz-sp-tier-table__name">
                                <div class="cz-sp-tier-table__name-inner">
                                  <span class={`cz-admin-status-dot ${statusDotClass(status)}`} />
                                  <span>{TIER_LABELS[tierId]}</span>
                                </div>
                              </td>
                              <td>
                                <span class={`cz-price-tag${detail?.price != null ? ' cz-price-tag--has-price' : ''}`}>
                                  {detail?.price != null ? `$${detail.price.toLocaleString()}` : '—'}
                                </span>
                              </td>
                              <td class="cz-sp-tier-table__muted">{detail?.billing_cycle ?? '—'}</td>
                              <td class="cz-sp-tier-table__center cz-sp-tier-table__muted">
                                {detail?.inclusions_override?.length ? detail.inclusions_override.length : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {c.overviewTab === 'connections' && (
          <ModeProvider mode="connections">
            <OverviewShell schema={serviceOverviewShell} binding={c.serviceConnectionBinding()} />
          </ModeProvider>
        )}
      </div>
    );
  }

  // ── Individual tier ──────────────────────────────────────────────────────────
  const td = c.tierDetail;
  if (!td) return null;
  const { detail, rateSheetCatalogue } = td;

  let editing: EntityDrawerEditingModule | null = null;
  if (c.editingSection === 'tier-overview' && c.overviewDraft) {
    // Selectable sheets: active ones plus the current binding (even if archived,
    // so it still displays). Switching clears the Tier's selections at settle.
    const boundId = detail.rate_sheet_id;
    const rateSheetOptions = selectableRateSheets(
      svc.rate_sheets,
      station.allowed_rate_sheet_ids ?? [],
      boundId,
    )
      .map((sheet) => ({ id: sheet.rate_sheet_id, title: sheet.title, status: sheet.status }));
    editing = {
      module: 'overview',
      session: {
        draft: c.overviewDraft,
        patch: (patch) => c.setOverviewDraft((current) => current ? { ...current, ...(patch as Partial<TierOverviewEditDraft>) } : current),
        replace: (next) => c.setOverviewDraft(next as TierOverviewEditDraft),
        onSave: c.saveSection,
        onCancel: c.cancelSection,
        saving: c.pkg.saving,
        saveErr: c.saveErr,
        isDirty: true,
        extras: { rateSheets: rateSheetOptions, hasSelections: detail.rate_sheet_items.length > 0 },
      },
    };
  } else if (c.editingSection === 'tier-inclusions' && c.featuresDraft) {
    const activeIds = new Set(rateSheetCatalogue.filter((item) => item.resolved).map((item) => item.item_id));
    const suspended = c.featuresDraft.filter((item) => !activeIds.has(item.item_id));
    editing = {
      module: 'features',
      session: {
        draft: c.featuresDraft.filter((item) => activeIds.has(item.item_id)),
        replace: (next) => c.setFeaturesDraft([...(next as TierRateSheetSelection[]), ...suspended]),
        onSave: c.saveSection,
        onCancel: c.cancelSection,
        saving: c.pkg.saving,
        saveErr: c.saveErr,
        isDirty: true,
        extras: { pool: [], onCreate: async () => null, rateSheetCatalogue: rateSheetCatalogue.filter((item) => item.resolved) },
      },
    };
  } else if (c.editingSection === 'tier-faqs' && c.faqsDraft) {
    editing = {
      module: 'faqs',
      session: {
        draft: c.faqsDraft,
        replace: (next) => c.setFaqsDraft(next as string[]),
        onSave: c.saveSection,
        onCancel: c.cancelSection,
        saving: c.pkg.saving,
        saveErr: c.saveErr,
        isDirty: true,
        extras: { pool: svc.faqs, onCreate: (question: string, answer: string) => c.pkg.createFaq(question, answer) },
      },
    };
  }

  // View mode — the Individual Tier drawer body. Keyed by stable occupant
  // identity so content edits do not remount; the resolved shell id addresses
  // all mutations.
  //
  // An empty fixed slot renders this same readable body: its Tier Overview
  // module is simply empty, and the module's own Pending pill carries the
  // guidance (`Edit and configure this tier.`) that a separate explanation block
  // used to duplicate above it. Edit is the only way into the editor, exactly as
  // Included Features and Common Questions already behave.
  return (
    <EntityDrawer
      key={c.initialOccupantId ?? detail.occupant_id ?? c.editingTierId}
      entity={TIER_ENTITY}
      tab={c.tierTab}
      onSelectTab={c.selectTierTab}
      bindings={{
        overview: td.overviewBinding,
        features: td.featuresBinding,
        faqs:     td.faqsBinding,
        service:  c.serviceConnectionBinding(),
      }}
      openPanel={c.openTierPanel}
      onTogglePanel={(m) => c.setOpenTierPanel((p) => (p === m ? null : m))}
      editing={editing}
      trailing={{
        details: (
          <>
            {(c.saveErr || c.saveOk) && (
              <div class="cz-shell-section cz-shell-section--no-border">
                {c.saveErr && <p class="cz-admin-error-msg">{c.saveErr}</p>}
                {c.saveOk  && <p class="cz-admin-ok-msg">Saved.</p>}
              </div>
            )}
            {/* Editions are occupant-scoped: only a real, settled occupant
                (a stable occupant_id) can own child records — an empty slot
                or a not-yet-first-saved shell has nothing to attach them to. */}
            {detail.occupant_id && (
              <TierEditionsPanel
                serviceId={props.serviceId}
                tierInstanceId={props.tierInstanceId}
                tierId={c.editingTierId}
                editions={detail.tier_editions ?? []}
                defaultEditionId={detail.default_edition_id ?? null}
                rateSheetOptions={selectableRateSheets(
                  svc.rate_sheets,
                  station.allowed_rate_sheet_ids ?? [],
                  detail.rate_sheet_id,
                ).map((sheet) => ({
                  value: sheet.rate_sheet_id,
                  label: `${sheet.title || '(untitled)'}${sheet.status === 'archived' ? ' (archived)' : ''}`,
                }))}
                onMutated={c.pkg.refetch}
              />
            )}
          </>
        ),
      }}
    >
      <TierDrawerDialogs c={c} />
    </EntityDrawer>
  );
}
