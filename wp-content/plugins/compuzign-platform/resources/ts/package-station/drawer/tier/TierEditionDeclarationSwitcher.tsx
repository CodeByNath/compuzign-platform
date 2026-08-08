// Additional Editions — a Tier occupant's alternate commercial declarations.
// Replaces the old standalone "Payment Editions" panel
// (docs/code-map/tier-edition.md): no explanatory essay, no stacked list of
// every Edition's editor printed one below another, no raw lifecycle rail
// running the length of the module. A compact [Edition 2] [Edition 3] tab
// strip plus a "+ Edition" trigger shows ONE Edition at a time — Default's
// own content lives in Default Tier Inclusions under Details and is never a
// row of this strip; this switcher is the sole content of the Options group
// (drawer refinement blueprint, Phase 5) — a presentation grouping only, not
// a change of who owns Edition data.
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
// "+ Edition" is Options' own creation control (relocated off Overview's
// footer — see useTierDrawerController.ts's handleAddEdition) and is always
// reachable here, including with zero Editions — the component no longer
// returns null in that case, since Options must always offer a way in.
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

import { useEffect, useState } from 'preact/hooks';
import { PlacedShell } from '@/drawer-kit/PlacedShell';
import { CanonicalEntityFooter } from '@/drawer-kit/CanonicalEntityFooter';
import { TravelStatusPill } from '@/drawer-kit/ui/TravelStatusPill';
import type { EntityDrawerEditingModule } from '@/drawer-kit/EntityDrawer';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { PackageManagerItem, PackageRateSheet, TierEdition, TierEditionBinEntry, TierEditionOverviewDraft } from '../../types';
import { useTierEditions } from '../../surface/tierSurface/useTierEditions';
import { TIER_EDITION_ENTITY } from '../schema/entities/tierEdition';
import { buildTierEditionDetail } from './tierEditionDetailModel';
import type { TierEditionEditorTab } from './TierEditionEditor';
import { deriveTierEditionFooterState, draftFromTierEdition, tierEditionDisabledMasked } from './tierEditionModel';

interface Props {
  serviceId:      number;
  tierInstanceId: string;
  tierId:         string;
  editions:       TierEdition[];
  editionBin:     TierEditionBinEntry[];
  rateSheetOptions: AdminFieldOption[];
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] };
  onMutated:      () => void;
  // Default is never a row of this strip — its own content lives in Default
  // Tier Inclusions under Details. null here means no Edition is selected.
  selectedId:     string | null;
  onSelect:       (id: string | null) => void;
  onAddEdition:   () => void;
  addingEdition:  boolean;
}

export function TierEditionDeclarationSwitcher({
  serviceId, tierInstanceId, tierId, editions, editionBin, rateSheetOptions, svc, onMutated, selectedId, onSelect,
  onAddEdition, addingEdition,
}: Props) {
  const ctl = useTierEditions(serviceId, tierInstanceId, tierId, editions, editionBin, onMutated);
  const [editingTab, setEditingTab] = useState<TierEditionEditorTab | null>(null);
  const [draft, setDraft] = useState<TierEditionOverviewDraft | null>(null);
  const [openPanel, setOpenPanel] = useState<'overview' | 'inclusions' | null>(null);
  const [showBin, setShowBin] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);

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
      {ctl.error && !editingModule && <p class="cz-admin-error-msg">{ctl.error}</p>}

      <div style="display:flex; align-items:center; justify-content:space-between; gap: var(--cz-space-2); flex-wrap:wrap">
        <div class="cz-cost-builder__tier-editions" role="tablist" aria-label="Editions">
          {ctl.editions.map((edition) => (
            <button
              key={edition.id}
              type="button"
              role="tab"
              aria-selected={selectedId === edition.id}
              class={`cz-cost-builder__tier-edition${selectedId === edition.id ? ' is-active' : ''}`}
              onClick={() => { onSelect(edition.id); setEditingTab(null); setDraft(null); }}
            >
              {edition.title}
            </button>
          ))}
        </div>
        <button
          type="button"
          class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
          disabled={addingEdition}
          onClick={onAddEdition}
        >
          {addingEdition ? '…' : '+ Edition'}
        </button>
      </div>

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

      {/* Lifecycle actions — the platform's canonical action grammar
          (CanonicalEntityFooter, already used by Package Family and
          Category), mounted inline rather than pinned since Options has no
          record of its own to close. Hidden while editing, the same way the
          parent occupant's own record footer disappears during a module
          edit. No separate lifecycle-status text here — neither Package
          Family nor Category prints one; the module pill (Edition Overview/
          Edition Inclusions, above) and this footer's own action label
          (Restore/Enable/Disable) are the single presentation of the
          Edition's current state, per tierEditionDisabledMasked. */}
      {selected && detail && !editingModule && (
        <div class="cz-tier-edition-declaration cz-tier-edition-declaration--view" style="margin-top: var(--cz-space-2)">
          <CanonicalEntityFooter
            inline
            platformStatus={selected.platform_status}
            isDisabledMasked={tierEditionDisabledMasked(selected)}
            {...deriveTierEditionFooterState(selected, detail.overviewBinding.state.status, detail.overviewBinding.hasDraft)}
            busy={ctl.saving}
            splitOpen={splitOpen}
            setSplitOpen={setSplitOpen}
            onToggleActive={() => (tierEditionDisabledMasked(selected) ? ctl.enable(selected.id) : ctl.disable(selected.id))}
            onArchive={() => ctl.archive(selected.id)}
            onTrash={() => ctl.trash(selected.id)}
            onRestore={() => ctl.restore(selected.id)}
            onDelete={() => ctl.remove(selected.id)}
            onPublish={() => ctl.publish(selected.id)}
          />
          {/* A narrow, separate physical relocation, not a status
              transition: only an already archived/trashed Edition is
              eligible, and moving it here never itself changes
              platform_status — Phase 7 brings its presentation in line with
              the rest of this card without changing this behavior. */}
          {(selected.platform_status === 'archived' || selected.platform_status === 'trashed') && (
            <div style="margin-top: var(--cz-space-1)">
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                disabled={ctl.saving}
                onClick={async () => { const ok = await ctl.moveToBin(selected.id); if (ok) onSelect(null); }}
              >
                Move to bin
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
