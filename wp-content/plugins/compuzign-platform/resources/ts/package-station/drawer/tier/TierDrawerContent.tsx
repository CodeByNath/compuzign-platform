// Neutral Tier drawer composition — the mature Package Station tier drawer,
// owned by the entity and mountable under any host.
//
// Two screens: the package overview (Details = tier occupant cards + Pricing
// Summary, or the occupant Bin; Connections = the parent service), unchanged;
// and the individual-tier screen, which composes its own four groups —
// Details / Options / Connections / Support — directly through PlacedShell
// (drawer refinement blueprint) rather than mounting EntityDrawer's fixed
// Details/Connections bar. Imports neither host: all coordination goes
// through useTierDrawerController, all host concerns through the
// EntityDrawerHostBridge.

import { useEffect, useState } from 'preact/hooks';
import { AsyncLoading } from '@/drawer-kit/ui/AsyncSection';
import { ReadBlock } from '@/drawer-kit/ReadBlock';
import { DrawerTabs } from '@/drawer-kit/DrawerTabs';
import type { EntityDrawerEditingModule } from '@/drawer-kit/EntityDrawer';
import { PlacedShell } from '@/drawer-kit/PlacedShell';
import { DrawerGroupTabs } from '@/drawer-kit/ui/DrawerGroupTabs';
import { DrawerGroupAccordion } from '@/drawer-kit/ui/DrawerGroupAccordion';
import type { DrawerGroup } from '@/drawer-kit/ui/drawerGroups';
import { ModeProvider } from '@/drawer-kit/schema/modeContext';
import { OverviewShell } from '@/drawer-kit/schema/shells/overviewShell';
import { serviceOverviewShell } from '@/service-station';
import { TIER_ENTITY } from '../schema/entities/tier';
import { statusDotClass } from '@/drawer-kit/utils/moduleStatus';
import { MODULE_ICONS } from '@/drawer-kit/schema/icons';
import { TiersIcon, ServicesIcon } from '@/admin-station/shell/icons';
import { getTierNotes } from '@/drawer-kit/utils/moduleNotifications';
import type { TierRateSheetSelection } from '../../types';
import type { TierOverviewEditDraft } from '../editors/TierOverviewEditor';
import type { TierPricingRulesEditDraft } from '../editors/TierPricingRulesEditor';
import { TIER_KEYS, TIER_LABELS } from '../../vocabulary';
import { useTierDrawerController } from './useTierDrawerController';
import { TierDrawerFooter } from './TierDrawerFooter';
import { TierBinList } from './TierBinList';
import { TierDrawerDialogs } from './TierDrawerDialogs';
import { TierEditionDeclarationSwitcher } from './TierEditionDeclarationSwitcher';
import type { TierDrawerContentProps, TierDrawerGroupId } from './tierDrawerTypes';
import { selectableRateSheets } from '../../surface/tierInstance/tierInstanceModel';
import { useTierEditions } from '../../surface/tierSurface/useTierEditions';
import { tierEditionModuleState } from './tierEditionDetailModel';
import { deriveTierEditionFooterState, tierEditionDisabledMasked } from './tierEditionModel';
import type { SelectedEditionLifecycleInputs } from './tierLifecycleMenu';

export function TierDrawerContent(props: TierDrawerContentProps) {
  const { bridge } = props;
  const c = useTierDrawerController(props);

  // Presentation wiring only (UI refinement — Edition secondary-nav
  // scroll-hide, Tabs-only): resolves the drawer's own scrolling body
  // element once, from a ref on this screen's own root, so ChildChipStrip's
  // hide-on-scroll behavior can listen to it without performing its own
  // DOM-ancestor lookup. Only resolved while Tabs mode is active — Accordion
  // mode gets `null`, which useScrollHide treats as "disabled", leaving its
  // chip strip sticky-only with no hide/reveal, no separate flag needed
  // anywhere else. Recomputed on every render from render state; no
  // effect/timing hazard.
  const [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const scrollContainer = c.tierGroupView === 'tabs'
    ? (rootEl?.closest<HTMLElement>('.cz-station-drawer__body') ?? null)
    : null;

  // Single-footer lifecycle command model, Phase 2: useTierEditions is
  // called ONCE, here, rather than inside TierEditionDeclarationSwitcher —
  // so the pinned TierDrawerFooter (Phase 4) can drive the selected
  // Edition's own lifecycle actions through the SAME controller/local state
  // TierEditionDeclarationSwitcher's cards and bin list already render from,
  // never a second instance that could drift. useTierEditions itself is
  // unchanged and remains the sole Edition-mutation owner. Called
  // unconditionally (rules of hooks) with null/empty fallbacks when no tier
  // is open — the hook already no-ops every mutation when tierId is null.
  const editionCtl = useTierEditions(
    props.serviceId,
    props.tierInstanceId,
    c.editingTierId,
    c.tierDetail?.detail.tier_editions ?? [],
    c.tierDetail?.detail.tier_edition_bin ?? [],
    c.pkg.refetch,
  );

  // Single-footer lifecycle command model, Phase 4: derives the selected
  // Edition's own scoped lifecycle inputs for the pinned footer, reusing the
  // SAME handlers/state buildTierEditionDetail and the switcher's own
  // read-mode cards already use — no new controller, no new derivation of
  // "is this disabled" (tierEditionDisabledMasked stays the one authority).
  // Only primitive fields (never the freshly-built object itself) enter the
  // effect's dependency array below, the same discipline every other footer
  // dependency here already follows — an object literal identity changing
  // every render would refire the effect every render (the exact defect
  // scripts/tier-system-footer-loop-regression.mjs proves against).
  // Draft-preferred — matches the parent occupant's own tierView(), so the
  // footer's Publish-eligibility/status derivation below reads the same
  // just-Saved draft content the read cards show, not a stale settled row.
  const selectedEdition = c.selectedDeclarationId ? editionCtl.editionView(c.selectedDeclarationId) : null;
  const selectedEditionFooterState = selectedEdition
    ? deriveTierEditionFooterState(
        selectedEdition,
        tierEditionModuleState(selectedEdition).status,
        // Loose nullish check, matching useTierInclusionDrawerController's own
        // hasFeaturesDraft (`!= null`) — a freshly created Edition's
        // drafts.overview is absent (undefined), not null; a strict `!==
        // null` check misreads that as "has a draft" and would make Publish
        // appear before anything was ever saved.
        selectedEdition.drafts.overview != null,
      )
    : null;
  const selectedEditionCanPublish = selectedEditionFooterState?.canPublish ?? false;
  const selectedEditionHasBeenPublished = selectedEditionFooterState?.hasBeenPublished ?? false;
  const selectedEditionLifecycle: SelectedEditionLifecycleInputs | null = selectedEdition ? {
    id:             selectedEdition.id,
    title:          selectedEdition.title,
    platformStatus: selectedEdition.platform_status,
    disabledMasked: tierEditionDisabledMasked(selectedEdition),
    hasBeenPublished: selectedEditionHasBeenPublished,
    canPublish:     selectedEditionCanPublish,
    // Settle the pending module draft first, THEN transition platform_status
    // — the two existing endpoints (settleTierEditionModule,
    // updateTierEditionStatus) simply sequenced correctly, moved here from
    // where inline Save used to auto-settle. A failed settle must never be
    // followed by activating a record whose draft did not actually commit —
    // canPublish already covers "already Active with nothing pending" (a
    // no-op settle is harmless there; publish() then re-confirms 'active').
    onPublish:      async () => {
      const settled = await editionCtl.settle(selectedEdition.id);
      if (settled) await editionCtl.publish(selectedEdition.id);
    },
    onDisable:      () => editionCtl.disable(selectedEdition.id),
    onEnable:       () => editionCtl.enable(selectedEdition.id),
    // Independent of the Tier's own cascading "Archive Tier" — this
    // archives ONLY the selected Edition, never the parent occupant.
    onArchive:      () => editionCtl.archive(selectedEdition.id),
    onRestore:      () => editionCtl.restore(selectedEdition.id),
    // The one action that leaves the active workspace, from ANY status —
    // editionCtl.moveToBin now drives the atomic server-composed command
    // (moveTierEditionToBinCommand), so this is correct unconditionally,
    // with no frontend branching on the Edition's current status. Same
    // clear-selection-on-success behavior the standalone "Move to bin"
    // button used before this correction — the moved Edition leaves
    // tier_editions[], so the prior selection would otherwise name nothing.
    onMoveToBin:    async () => { const ok = await editionCtl.moveToBin(selectedEdition.id); if (ok) c.setSelectedDeclarationId(null); },
  } : null;

  // Publish the record footer through the host. Mirrors the old host's footer
  // effect deps; edit mode ('none') leaves the slot to InlineEditorShell.
  useEffect(() => {
    bridge.setFooter(c.footerMode === 'none' ? null :
      <TierDrawerFooter
        mode={c.footerMode}
        enabled={c.footerEnabled}
        hasContent={c.footerHasContent}
        hasBeenPublished={c.footerHasBeenPublished}
        saving={c.pkg.saving || editionCtl.saving}
        splitOpen={c.splitOpen}
        setSplitOpen={c.setSplitOpen}
        publishSplitOpen={c.publishSplitOpen}
        setPublishSplitOpen={c.setPublishSplitOpen}
        onToggleEnabled={c.handleToggleEnabled}
        onArchive={() => c.handleArchive()}
        onPublish={() => c.setConfirmModal('publish')}
        onClose={c.requestClose}
        selectedEdition={selectedEditionLifecycle}
      />,
    );
    return () => bridge.setFooter(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    c.footerMode, c.footerEnabled, c.footerHasContent, c.footerHasBeenPublished,
    c.pkg.saving, editionCtl.saving, c.splitOpen, c.publishSplitOpen, bridge,
    selectedEdition?.id, selectedEdition?.title, selectedEdition?.platform_status,
    selectedEdition?.previous_platform_status, selectedEditionCanPublish, selectedEditionHasBeenPublished,
  ]);

  // Ask the host to hide its own header while ANY focused drawer task owns
  // the body — the parent Tier's own module editor (editingSection), the
  // selected Edition's own module editor (editionModuleEditing, reported up
  // from TierEditionDeclarationSwitcher), or the Edition Bin
  // (editionBinActive). c.focusedTaskActive combines all three into the one
  // signal this effect and the --editing class below both key on — never a
  // fourth independently-drifting flag for the Bin's own chrome suppression.
  // The cleanup resets to false on unmount as a second line of defense
  // alongside AdminStationDrawer's own content-identity reset — this drawer
  // never relies on only one of them.
  useEffect(() => {
    bridge.setHeaderHidden?.(c.focusedTaskActive);
    return () => bridge.setHeaderHidden?.(false);
  }, [bridge, c.focusedTaskActive]);

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
        extras: {
          pool: [], onCreate: async () => null,
          rateSheetCatalogue: rateSheetCatalogue.filter((item) => item.resolved),
          // Multi-Cycle Mode only — the settled record's own legs (not the
          // Commercial Schedule module's own pending draft, if any: Features
          // and Commercial Schedule save independently, and a leg add/remove
          // there only takes effect for assignment here once it settles).
          commercialLegs: detail.commercial_legs,
        },
      },
    };
  } else if (c.editingSection === 'tier-commercial-schedule' && c.commercialScheduleDraft) {
    // Selectable sheets: active ones plus the current binding (even if archived,
    // so it still displays). Switching clears the Tier's selections at settle.
    // Rate Sheet binding moved here from Overview — see
    // docs/code-map/tier-pricing-rules-plan.md.
    const boundId = detail.rate_sheet_id;
    const rateSheetOptions = selectableRateSheets(
      svc.rate_sheets,
      station.allowed_rate_sheet_ids ?? [],
      boundId,
    )
      .map((sheet) => ({ id: sheet.rate_sheet_id, title: sheet.title, status: sheet.status }));
    editing = {
      module: 'commercial_schedule',
      session: {
        draft: c.commercialScheduleDraft,
        patch: (patch) => c.setCommercialScheduleDraft((current) => current ? { ...current, ...(patch as Partial<TierPricingRulesEditDraft>) } : current),
        replace: (next) => c.setCommercialScheduleDraft(next as TierPricingRulesEditDraft),
        onSave: c.saveSection,
        onCancel: c.cancelSection,
        saving: c.pkg.saving,
        saveErr: c.saveErr,
        isDirty: true,
        extras: { rateSheets: rateSheetOptions, hasSelections: detail.rate_sheet_items.length > 0 },
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
  // Default Tier Inclusions and Common Questions already behave.
  //
  // Composed directly through PlacedShell (drawer refinement blueprint,
  // Phase 3) instead of EntityDrawer's fixed Details/Connections bar, so the
  // screen can present the four-group Details/Options/Connections/Support
  // model. PlacedShell is the same primitive EntityDrawer itself renders
  // through — every module-editing-lock, notification-panel, and viewpoint
  // guarantee this screen relied on stays intact; only the tab bar around it
  // changed. Options owns Edition management as a drawer information group
  // only — Edition data remains owned by the Tier occupant / Package Station
  // exactly as today (useTierEditions, the occupant's own tier_editions[]/
  // tier_edition_bin[]); moving the switcher's rendering location changes
  // nothing about who persists, validates, or lifecycles that data. Support
  // owns Common Questions the same way: same faqs module key, same
  // tierFaqsShell, same PlacedShell viewpoint (mode: 'details' — Support is
  // a presentation grouping, not a connections viewpoint) — only which group
  // renders it changed. Details/Support are mutually exclusive at any one
  // moment (single active group, both Tabs and Accordion), the same way
  // Details/Connections always were; regression:tier-occupant-lifecycle
  // reflects this by checking each group's pills while that group is active,
  // not all three simultaneously.
  const togglePanel = (module: string) => () =>
    c.setOpenTierPanel((p) => (p === module ? null : module));

  const tierGroups: DrawerGroup<TierDrawerGroupId>[] = [
    {
      id: 'details',
      label: 'Details',
      content: (
        <>
          {/* Sibling-suppression: while one Details module is editing, the
              other's own read card is not rendered — the same guarantee
              TierEditionDeclarationSwitcher's ternary already gives the
              Options group. `editing` is the existing authoritative signal
              (derived from c.editingSection); this adds no new flag. The
              currently-editing module's own PlacedShell line stays fully
              unconditional and at the same tree position whether editing or
              not, so it is never reparented/remounted by this guard. */}
          {(!editing || editing.module === 'overview') && (
            <PlacedShell
              entity={TIER_ENTITY}
              slot={{ module: 'overview', mode: 'details' }}
              binding={td.overviewBinding}
              panelOpen={c.openTierPanel === 'overview'}
              onTogglePanel={togglePanel('overview')}
              editing={editing}
            />
          )}
          {(!editing || editing.module === 'commercial_schedule') && (
            <PlacedShell
              entity={TIER_ENTITY}
              slot={{ module: 'commercial_schedule', mode: 'details' }}
              binding={td.commercialScheduleBinding}
              panelOpen={c.openTierPanel === 'commercial_schedule'}
              onTogglePanel={togglePanel('commercial_schedule')}
              editing={editing}
            />
          )}
          {(!editing || editing.module === 'features') && (
            <PlacedShell
              entity={TIER_ENTITY}
              slot={{ module: 'features', mode: 'details' }}
              binding={td.featuresBinding}
              panelOpen={c.openTierPanel === 'features'}
              onTogglePanel={togglePanel('features')}
              editing={editing}
            />
          )}
          {/* Suppressed while editing: InlineEditorShell already shows
              saveErr inside the open editor itself; this outer block would
              otherwise duplicate it. */}
          {!editing && (c.saveErr || c.saveOk) && (
            <div class="cz-shell-section cz-shell-section--no-border">
              {c.saveErr && <p class="cz-admin-error-msg">{c.saveErr}</p>}
              {c.saveOk  && <p class="cz-admin-ok-msg">Saved.</p>}
            </div>
          )}
        </>
      ),
    },
    {
      id: 'options',
      label: 'Options',
      content: (
        // Editions are occupant-scoped: only a real, settled occupant (a
        // stable occupant_id) can own child records — an empty slot or a
        // not-yet-first-saved shell has nothing to attach them to. Options
        // is a drawer information group only; the switcher, its hook
        // (useTierEditions), and the data it renders (tier_editions[],
        // tier_edition_bin[]) remain exactly as owned by the Tier occupant /
        // Package Station as before this relocation.
        detail.occupant_id && (
          <TierEditionDeclarationSwitcher
            ctl={editionCtl}
            rateSheetOptions={selectableRateSheets(
              svc.rate_sheets,
              station.allowed_rate_sheet_ids ?? [],
              detail.rate_sheet_id,
            ).map((sheet) => ({
              value: sheet.rate_sheet_id,
              label: `${sheet.title || '(untitled)'}${sheet.status === 'archived' ? ' (archived)' : ''}`,
            }))}
            svc={svc}
            selectedId={c.selectedDeclarationId}
            onSelect={c.setSelectedDeclarationId}
            scrollContainer={scrollContainer}
            binActive={c.editionBinActive}
            onBinActiveChange={c.setEditionBinActive}
            onEditingActiveChange={c.setEditionModuleEditing}
          />
        )
      ),
    },
    {
      id: 'connections',
      label: 'Connections',
      content: (
        <PlacedShell
          entity={TIER_ENTITY}
          slot={{ module: 'service', mode: 'connections' }}
          binding={c.serviceConnectionBinding()}
          panelOpen={c.openTierPanel === 'service'}
          onTogglePanel={togglePanel('service')}
          editing={editing}
        />
      ),
    },
    {
      id: 'support',
      label: 'Support',
      content: (
        <>
          <PlacedShell
            entity={TIER_ENTITY}
            slot={{ module: 'faqs', mode: 'details' }}
            binding={td.faqsBinding}
            panelOpen={c.openTierPanel === 'faqs'}
            onTogglePanel={togglePanel('faqs')}
            editing={editing}
          />
          {/* saveErr/saveOk is coordinator-owned (useTierModuleEditing),
              shared across Overview/Inclusions/FAQ saves alike — repeated
              here so a FAQ save shows its own confirmation in the group the
              admin is actually viewing, the same guarantee Details already
              gives Overview/Inclusions saves. Suppressed while editing —
              InlineEditorShell already shows saveErr inside the open editor
              itself, so this outer block would otherwise duplicate it. */}
          {!editing && (c.saveErr || c.saveOk) && (
            <div class="cz-shell-section cz-shell-section--no-border">
              {c.saveErr && <p class="cz-admin-error-msg">{c.saveErr}</p>}
              {c.saveOk  && <p class="cz-admin-ok-msg">Saved.</p>}
            </div>
          )}
        </>
      ),
    },
  ];

  // View toggle (Phase 4; compact-icon refinement). Presentation-only: both
  // renderers consume the identical tierGroups array and the identical
  // activeId/onSelect pair, so switching modes changes only which primitive
  // draws the nav — never which content exists or which group is active. The
  // icon shown is the AVAILABLE ALTERNATE view, not the current one — the
  // same convention AdminStationHeader's own theme toggle already uses (Sun
  // shown while dark is active, Moon while light is active). It is passed
  // through DrawerGroupTabs/DrawerGroupAccordion's shared `trailing` slot
  // (a small, generic addition to those two renderers) rather than living in
  // shared drawer chrome — AdminStationDrawer's header still has no action
  // slot (title + close only).
  const viewToggleTarget = c.tierGroupView === 'tabs' ? 'accordion' : 'tabs';
  const viewToggleLabel  = viewToggleTarget === 'accordion' ? 'Switch to accordion view' : 'Switch to tabs view';
  const viewToggle = (
    <button
      type="button"
      class="cz-station-iconbtn cz-drawer-groups__view-toggle"
      aria-label={viewToggleLabel}
      title={viewToggleLabel}
      onClick={() => c.setTierGroupView(viewToggleTarget)}
    >
      {viewToggleTarget === 'accordion' ? <TiersIcon /> : <ServicesIcon />}
    </button>
  );

  // "+ Edition" (UI refinement, Phase 2) — relocated off Options' own
  // content into the drawer's top nav chrome, beside the view toggle,
  // reachable only while Options is the active group and a real occupant
  // exists to own the new Edition (same eligibility Options' content itself
  // was already gated on). Same handler/state (handleAddEdition/
  // addingEdition) — only where the trigger renders changed.
  const showAddEdition = c.tierTab === 'options' && !!detail.occupant_id;
  const trailing = (
    <>
      {viewToggle}
      {showAddEdition && (
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
          disabled={c.addingEdition}
          onClick={c.handleAddEdition}
        >
          {c.addingEdition ? '…' : '+ Edition'}
        </button>
      )}
    </>
  );

  return (
    <div
      class={`cz-req-detail${c.focusedTaskActive ? ' cz-req-detail--editing' : ''}`}
      key={c.initialOccupantId ?? detail.occupant_id ?? c.editingTierId}
      ref={setRootEl}
    >
      {/* While any focused drawer task owns the body (parent Tier module
          edit, selected Edition module edit, or the Edition Bin —
          c.focusedTaskActive), the four-group Tabs/Accordion chrome
          (including the view toggle and "+ Edition" carried in `trailing`)
          is redundant above a task that already has its own
          title/back/status/footer (FocusedTaskShell — drawer-kit). This
          deliberately does NOT swap which renderer mounts —
          DrawerGroupTabs/DrawerGroupAccordion and every group's content stay
          mounted at the exact same tree position whether a task is focused
          or not, so its own local state (e.g.
          TierEditionDeclarationSwitcher's editingTab/draft) is never wiped
          by a reparenting remount the instant it starts.
          `.cz-req-detail--editing` (drawer-kit.css) hides the chrome purely
          in CSS instead. The Edition Bin additionally removes its own
          ChildChipStrip band outright (TierEditionDeclarationSwitcher's own
          `!editingModule && !binActive` guard) rather than relying on CSS
          alone — there must be only one visible Bin identity, the focused
          task shell itself, not a second secondary-nav row underneath it. */}
      {c.tierGroupView === 'accordion' ? (
        <DrawerGroupAccordion groups={tierGroups} activeId={c.tierTab} onSelect={c.selectTierTab} trailing={trailing} />
      ) : (
        <DrawerGroupTabs groups={tierGroups} activeId={c.tierTab} onSelect={c.selectTierTab} trailing={trailing} />
      )}
      <TierDrawerDialogs c={c} />
    </div>
  );
}
