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
// Lifecycle actions (Publish/Disable/Enable/Archive/Restore/Move to Bin)
// are NOT rendered here (single-footer, scope-aware lifecycle command
// model, Phase 4) — they moved to the ONE pinned TierDrawerFooter, scoped to
// this selected Edition via buildTierLifecycleMenu (tierLifecycleMenu.ts).
// This component renders the child-chip strip and the two read/edit module
// cards, OR — exclusively, never alongside either (Edition lifecycle/Bin UX
// correction) — the Edition Bin, presented as its own focused drawer task
// (TierEditionBinFocusedView.tsx, reusing the SAME FocusedTaskShell the
// Edition module editor renders through) once the Bin icon (ChildChipStrip's
// fixed trailing control, visible only in the normal, non-Bin state) is
// activated. Activating the Bin therefore removes the ChildChipStrip band
// (chips + Bin icon) outright, the same exclusive-render guard the Edition
// module editor already applies to itself via `!editingModule` — there is
// only ONE visible Bin identity at a time, the focused task shell itself,
// never a second secondary-nav row sitting above it. Restore/Trash/
// Delete-permanently for a binned entry live entirely inside
// TierEditionBinList (rendered by TierEditionBinFocusedView); this
// component only decides WHICH of the three exclusive views renders, via
// the binActive/onBinActiveChange controlled prop below — the same
// controlled-prop pattern selectedId/onSelect already use, and for the
// identical reason (every Edition lifecycle mutation refetches and briefly
// unmounts this subtree — see useTierDrawerController's own
// editionBinActive comment).

import { useEffect, useState } from 'preact/hooks';
import { PlacedShell } from '@/drawer-kit/PlacedShell';
import { ChildChipStrip } from '@/drawer-kit/ui/ChildChipStrip';
import { TrashIcon } from '@/admin-station/shell/icons';
import type { EntityDrawerEditingModule } from '@/drawer-kit/EntityDrawer';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { PackageManagerItem, PackageRateSheet, TierEditionOverviewDraft } from '../../types';
import type { TierEditionsController } from '../../surface/tierSurface/useTierEditions';
import { TIER_EDITION_ENTITY } from '../schema/entities/tierEdition';
import { buildTierEditionDetail } from './tierEditionDetailModel';
import type { TierEditionEditorTab } from './TierEditionEditor';
import { draftFromTierEdition } from './tierEditionModel';
import { TierEditionBinFocusedView } from './TierEditionBinFocusedView';

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
  // Edition Bin exclusive-view toggle — a CONTROLLED prop sourced from
  // useTierDrawerController, the same reason selectedId/onSelect are
  // controlled rather than local state (see this file's own header
  // comment). Presentation/navigation state only: activating the Bin never
  // changes, clears, or repurposes selectedId.
  binActive:        boolean;
  onBinActiveChange: (active: boolean) => void;
  // Reports whether THIS component's own editingTab is non-null, so
  // TierDrawerContent can hide the parent drawer header/group chrome while
  // an Edition editor is open — editingTab below remains the sole authority
  // for the Edition editor itself; this is only a derived signal upward, the
  // same relationship selectedId/onSelect already have to the controller.
  onEditingActiveChange?: (active: boolean) => void;
}

export function TierEditionDeclarationSwitcher({
  ctl, rateSheetOptions, svc, selectedId, onSelect, scrollContainer, onEditingActiveChange,
  binActive, onBinActiveChange,
}: Props) {
  const [editingTab, setEditingTab] = useState<TierEditionEditorTab | null>(null);
  const [draft, setDraft] = useState<TierEditionOverviewDraft | null>(null);
  const [openPanel, setOpenPanel] = useState<'overview' | 'inclusions' | null>(null);

  // Mirrors editingTab on every change (covers open via Edit, close via
  // Save/Cancel/Back). A SEPARATE cleanup-only effect below guarantees a
  // `false` report specifically on unmount, independent of editingTab's own
  // transitions, so a concurrent refetch that tears down this whole subtree
  // mid-edit can never leave the parent believing an editor is still open.
  useEffect(() => {
    onEditingActiveChange?.(editingTab !== null);
  }, [editingTab, onEditingActiveChange]);
  useEffect(() => () => onEditingActiveChange?.(false), [onEditingActiveChange]);

  // Draft-preferred, same reason TierDrawerContent's selectedEdition reads
  // ctl.editionView() rather than ctl.editions.find() — a just-Saved (not
  // yet Published) draft must display immediately, matching the parent
  // occupant's own draftPreferredDetail()-backed read cards.
  const selected = selectedId ? ctl.editionView(selectedId) : null;

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
  // Draft-only — the module stays Pending after inline Save (matching the
  // occupant's own useTierModuleEditing.saveSection). Settling a pending
  // draft is the explicit Publish action's job (TierDrawerContent's
  // onPublish), not something an inline Save does silently, even when this
  // Edition is already Active. See docs/code-map/tier-edition.md.
  const saveEdit = async () => {
    if (!selected || !draft) return;
    await ctl.saveDraft(selected.id, draft);
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

  const toggleBin = () => onBinActiveChange(true);

  // Bin mode is its own exclusive focused drawer task (Edition lifecycle/Bin
  // UX correction) — mounted in place of BOTH the child chip strip and the
  // module cards, never alongside either. There is no longer a second
  // "Drawer Bin" row living above/alongside it; TierEditionBinFocusedView
  // carries its own title/state/Back/Close, the same focused-task structure
  // the Edition module editor below already uses.
  if (binActive) {
    return <TierEditionBinFocusedView ctl={ctl} onClose={() => onBinActiveChange(false)} />;
  }

  return (
    <div class="cz-shell-section">
      {/* Everything in this block is the Edition-browsing UI — the child
          nav (chips + Bin icon) and, if there are no Editions yet, the empty
          state. All of it is redundant chrome once an Edition's own module
          editor is open (the PlacedShell below already carries its own
          title/back/status/Save/Cancel), so it disappears as one unit while
          editingModule is set, leaving only the active editor — no separate
          guard per element. */}
      {!editingModule && (
        <>
          {ctl.error && <p class="cz-admin-error-msg">{ctl.error}</p>}

          <ChildChipStrip
            chips={ctl.editions.map((edition) => ({ id: edition.id, label: ctl.editionView(edition.id)?.title ?? edition.title }))}
            activeId={selectedId}
            ariaLabel="Editions"
            onSelect={(id) => { onSelect(id); setEditingTab(null); setDraft(null); }}
            scrollContainer={scrollContainer}
            trailing={
              <button
                type="button"
                class="cz-station-iconbtn cz-drawer-groups__bin-toggle"
                aria-pressed={false}
                aria-label="Edition Bin"
                title="Edition Bin"
                onClick={toggleBin}
              >
                <TrashIcon />
              </button>
            }
          />

          {ctl.editions.length === 0 && (
            <div class="cz-admin-empty" style="margin-top: var(--cz-space-2)">
              <p>No additional Editions yet. Use "+ Edition" to add one.</p>
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
