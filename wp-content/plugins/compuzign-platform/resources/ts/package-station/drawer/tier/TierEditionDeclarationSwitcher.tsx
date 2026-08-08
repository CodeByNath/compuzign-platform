// Additional Editions — a Tier occupant's alternate commercial declarations.
// Replaces the old standalone "Payment Editions" panel
// (docs/code-map/tier-edition.md): no explanatory essay, no stacked list of
// every Edition's editor printed one below another, no raw lifecycle rail
// running the length of the module. A compact [Nath] [Edition 2] [Edition 3]
// child-chip strip (ChildChipStrip, drawer-kit/ui — UI refinement, Phase 3;
// the shared child/subsection navigation primitive, replacing this
// component's former hand-rolled use of Cost Builder's own public
// `cz-cost-builder__tier-edition*` classes) shows ONE Edition at a time —
// Default's own content lives in Default Tier Inclusions under Details and
// is never a row of this strip; this switcher is the sole content of the
// Options group (drawer refinement blueprint, Phase 5) — a presentation
// grouping only, not a change of who owns Edition data. "+ Edition" no
// longer renders here (UI refinement, Phase 2 — see its own comment below).
//
// The selected Edition's own read surface is two mature module cards
// (Edition Overview, Edition Inclusions — TIER_EDITION_ENTITY, PlacedShell,
// the SAME renderer machinery the parent occupant's own Tier Overview/
// Default Tier Inclusions cards render through), not a bespoke summary
// block. Both cards' "Edit" actions open ONE shared inline editor
// (TierEditionEditor.tsx) presenting Overview/Inclusions as two tabs over
// the SAME TierEditionOverviewDraft — one draft, one dirty state, one Save,
// one Cancel, one settle/revert path; there is still exactly one Edition
// module and one editing.module, matching PlacedShell's own one-module-
// editing-at-a-time contract. Whichever card's Edit was clicked decides only
// which tab opens first (session.extras.initialTab, UI-only).
//
// "+ Edition" (useTierDrawerController.ts's handleAddEdition) no longer
// renders inside this module (UI refinement, Phase 2) — it lives in the
// drawer's own top nav chrome, beside the Tabs/Accordion view toggle
// (TierDrawerContent.tsx's `trailing` slot), reachable only while Options is
// the active group. This component still never returns null with zero
// Editions — it renders its own empty state instead — since Options must
// always show something meaningful even before the first Edition exists.
//
// The selected declaration id is a CONTROLLED prop, not local state: every
// Edition lifecycle mutation refetches through usePackageStation, and while
// that refetch is in flight TierDrawerContent briefly renders <AsyncLoading/>
// in place of its whole child tree — which would unmount this component and
// silently wipe any local "which tab is selected" state back to unselected
// after every single Publish/Disable/Archive/etc. click. useTierDrawerController
// owns it instead, the same reason editingSection/openTierPanel live there.
//
// Whenever Editions exist but selectedId names none of them (fresh mount,
// or the previously selected row just left tier_editions[] via delete/
// move-to-bin/etc.), the effect below auto-selects the first Edition — there
// is no Default to fall back to inside Options, and a real Edition should
// never sit unreachable behind a blank selection.
//
// Lifecycle actions (Publish/Disable/Enable/Archive/Restore/Trash/Move to
// Bin) are NOT rendered here (single-footer, scope-aware lifecycle command
// model, Phase 4) — they moved to the ONE pinned TierDrawerFooter, scoped to
// this selected Edition via buildTierLifecycleMenu (tierLifecycleMenu.ts).
// This component renders only the two read/edit module cards, the tab
// strip, and the Edition bin's own restore/trash/delete row actions (a
// separate, occupant-owned physical list, deliberately untouched by this
// correction — see tierLifecycleMenu.ts's own header comment).

import { useEffect, useState } from 'preact/hooks';
import { PlacedShell } from '@/drawer-kit/PlacedShell';
import { ChildChipStrip } from '@/drawer-kit/ui/ChildChipStrip';
import { TravelStatusPill } from '@/drawer-kit/ui/TravelStatusPill';
import type { EntityDrawerEditingModule } from '@/drawer-kit/EntityDrawer';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { PackageManagerItem, PackageRateSheet, TierEditionOverviewDraft } from '../../types';
import type { TierEditionsController } from '../../surface/tierSurface/useTierEditions';
import { TIER_EDITION_ENTITY } from '../schema/entities/tierEdition';
import { buildTierEditionDetail } from './tierEditionDetailModel';
import type { TierEditionEditorTab } from './TierEditionEditor';
import { draftFromTierEdition } from './tierEditionModel';

interface Props {
  // Single-footer lifecycle command model, Phase 2: the controller is built
  // ONCE by TierDrawerContent (not here) so the pinned footer and this
  // switcher share the exact same instance/local state — useTierEditions
  // itself is unchanged and remains the sole Edition-mutation owner, only
  // its call site moved up one level.
  ctl: TierEditionsController;
  rateSheetOptions: AdminFieldOption[];
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] };
  // Default is never a row of this strip — its own content lives in Default
  // Tier Inclusions under Details. null here means no Edition is selected.
  selectedId:     string | null;
  onSelect:       (id: string | null) => void;
  // Presentation wiring only, forwarded to ChildChipStrip's scroll-hide
  // behavior — resolved once by TierDrawerContent (Tabs mode only; null in
  // Accordion mode), which already knows the drawer's DOM shape and the
  // active view mode. Not a Tier/Edition concept.
  scrollContainer?: HTMLElement | null;
  // Reports whether THIS component's own editingTab is non-null, so
  // TierDrawerContent can hide the parent drawer header/group chrome while
  // an Edition editor is open — editingTab below remains the sole authority
  // for the Edition editor itself; this is only a derived signal upward, the
  // same relationship selectedId/onSelect already have to the controller.
  onEditingActiveChange?: (active: boolean) => void;
}

export function TierEditionDeclarationSwitcher({
  ctl, rateSheetOptions, svc, selectedId, onSelect, scrollContainer, onEditingActiveChange,
}: Props) {
  const [editingTab, setEditingTab] = useState<TierEditionEditorTab | null>(null);
  const [draft, setDraft] = useState<TierEditionOverviewDraft | null>(null);
  const [openPanel, setOpenPanel] = useState<'overview' | 'inclusions' | null>(null);
  const [showBin, setShowBin] = useState(false);

  // Mirrors editingTab on every change (covers open via Edit, close via
  // Save/Cancel/Back). A SEPARATE cleanup-only effect below guarantees a
  // `false` report specifically on unmount, independent of editingTab's own
  // transitions, so a concurrent refetch that tears down this whole subtree
  // mid-edit can never leave the parent believing an editor is still open.
  useEffect(() => {
    onEditingActiveChange?.(editingTab !== null);
  }, [editingTab, onEditingActiveChange]);
  useEffect(() => () => onEditingActiveChange?.(false), [onEditingActiveChange]);

  const selected = ctl.editions.find((e) => e.id === selectedId) ?? null;

  useEffect(() => {
    if (ctl.editions.length === 0) return;
    if (ctl.editions.some((e) => e.id === selectedId)) return;
    onSelect(ctl.editions[0].id);
    setEditingTab(null);
    setDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctl.editions, selectedId]);

  const openEdit = (tab: TierEditionEditorTab) => {
    if (!selected) return;
    setDraft(draftFromTierEdition(selected));
    setEditingTab(tab);
  };
  const cancelEdit = () => { setEditingTab(null); setDraft(null); };
  const saveEdit = async () => {
    if (!selected || !draft) return;
    const ok = await ctl.saveDraft(selected.id, draft);
    if (ok) await ctl.settle(selected.id);
    setEditingTab(null);
    setDraft(null);
  };

  const detail = selected ? buildTierEditionDetail(selected, svc, {
    onEdit:         openEdit,
    onDiscardDraft: () => ctl.revert(selected.id),
  }) : null;

  // Still exactly one editing.module — PlacedShell's own one-module-editing
  // contract is unchanged; the tab lives entirely inside the editor
  // (TierEditionEditor.tsx), never as a second module key here.
  const editingModule: EntityDrawerEditingModule | null = (selected && editingTab) ? {
    module: 'overview',
    session: {
      draft,
      patch:   (patch) => setDraft((cur) => cur ? { ...cur, ...(patch as Partial<TierEditionOverviewDraft>) } : cur),
      replace: (next) => setDraft(next as TierEditionOverviewDraft),
      onSave:  saveEdit,
      onCancel: cancelEdit,
      saving:  ctl.saving,
      saveErr: ctl.error,
      isDirty: true,
      extras:  { initialTab: editingTab, rateSheetOptions, svc },
    },
  } : null;

  const togglePanel = (module: 'overview' | 'inclusions') => () =>
    setOpenPanel((p) => (p === module ? null : module));

  return (
    <div class="cz-shell-section">
      {/* Everything in this block is the Edition-browsing UI — the child nav,
          the empty state, and the occupant's own Edition bin. All of it is
          redundant chrome once an Edition's own module editor is open (the
          PlacedShell below already carries its own title/back/status/Save/
          Cancel), so it disappears as one unit while editingModule is set,
          leaving only the active editor — no separate guard per element. */}
      {!editingModule && (
        <>
          {ctl.error && <p class="cz-admin-error-msg">{ctl.error}</p>}

          <ChildChipStrip
            chips={ctl.editions.map((edition) => ({ id: edition.id, label: edition.title }))}
            activeId={selectedId}
            ariaLabel="Editions"
            onSelect={(id) => { onSelect(id); setEditingTab(null); setDraft(null); }}
            scrollContainer={scrollContainer}
          />

          {ctl.editions.length === 0 && (
            <div class="cz-admin-empty" style="margin-top: var(--cz-space-2)">
              <p>No additional Editions yet. Use "+ Edition" to add one.</p>
            </div>
          )}

          {/* Minimal functional access to the occupant's own Edition bin:
              identify, restore, and trash/delete where lifecycle rules permit —
              the SAME travel-status pill (TravelStatusPill/TRAVEL_PILL) the
              occupant's own bin (TierBinList.tsx) already uses for Archived/
              Trashed, instead of raw text (UI refinement, Phase 7). Presentation
              only — no change to moveToBin/restoreFromBin/trashBinEntry/
              deleteBinEntry, tier_edition_bin[] storage, or ordering. */}
          {ctl.editionBin.length > 0 && (
            <div style="margin-top: var(--cz-space-2)">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => setShowBin((v) => !v)}>
                {showBin ? 'Hide' : 'Show'} Edition bin ({ctl.editionBin.length})
              </button>
              {showBin && (
                <ul class="cz-tier-edition-bin" style="margin-top: var(--cz-space-1); list-style:none; padding:0; display:flex; flex-direction:column; gap: var(--cz-space-2)">
                  {ctl.editionBin.map((entry) => (
                    <li key={entry.bin_id} class="cz-tier-edition-bin__row" style="display:flex; flex-direction:column; gap: var(--cz-space-1)">
                      <div style="display:flex; justify-content:space-between; align-items:center; gap: var(--cz-space-1)">
                        <span class="drawerModule__value">
                          {entry.edition.title || '(untitled)'}
                          {entry.edition.edition_platform_id ? ` · ${entry.edition.edition_platform_id}` : ''}
                        </span>
                        <TravelStatusPill status={entry.status} />
                      </div>
                      <span style="display:flex; gap: var(--cz-space-1); flex-wrap:wrap">
                        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.restoreFromBin(entry.bin_id)}>Restore</button>
                        {entry.status === 'archived' && (
                          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.trashBinEntry(entry.bin_id)}>Move to Trash</button>
                        )}
                        {entry.status === 'trashed' && (
                          <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.deleteBinEntry(entry.bin_id)}>Delete permanently</button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {selected && detail && (
        editingModule ? (
          <PlacedShell
            entity={TIER_EDITION_ENTITY}
            slot={{ module: 'overview', mode: 'details' }}
            binding={detail.overviewBinding}
            panelOpen={openPanel === 'overview'}
            onTogglePanel={togglePanel('overview')}
            editing={editingModule}
          />
        ) : (
          <>
            <PlacedShell
              entity={TIER_EDITION_ENTITY}
              slot={{ module: 'overview', mode: 'details' }}
              binding={detail.overviewBinding}
              panelOpen={openPanel === 'overview'}
              onTogglePanel={togglePanel('overview')}
            />
            <PlacedShell
              entity={TIER_EDITION_ENTITY}
              slot={{ module: 'inclusions', mode: 'details' }}
              binding={detail.inclusionsBinding}
              panelOpen={openPanel === 'inclusions'}
              onTogglePanel={togglePanel('inclusions')}
            />
          </>
        )
      )}
    </div>
  );
}
