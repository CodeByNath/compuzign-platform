// Additional Editions — a Tier occupant's alternate commercial declarations.
// Replaces the old standalone "Payment Editions" panel
// (docs/code-map/tier-edition.md): no explanatory essay, no stacked list of
// every Edition's editor printed one below another, no raw lifecycle rail
// running the length of the module. A compact [Edition 2] [Edition 3] tab
// strip plus a "+ Edition" trigger shows ONE Edition at a time — Default's
// own content lives in Default Tier Inclusions under Details and is never a
// row of this strip; this switcher is the sole content of the Options group
// (drawer refinement blueprint, Phase 5) — a presentation grouping only, not
// a change of who owns Edition data. Selecting an Edition switches this
// block to that ONE Edition's own compact read/edit surface, reusing the
// same TierEditionOverviewFields form (and therefore the same
// PoolInclusionsEditor row/quantity selection) an Edition has always used.
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
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { PackageManagerItem, PackageRateSheet, TierEdition, TierEditionBinEntry, TierEditionOverviewDraft } from '../../types';
import { useTierEditions } from '../../surface/tierSurface/useTierEditions';
import { TierEditionOverviewFields } from './TierEditionOverviewFields';
import { draftFromTierEdition, tierEditionStatusLabel } from './tierEditionModel';

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
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TierEditionOverviewDraft | null>(null);
  const [showBin, setShowBin] = useState(false);

  const selected = ctl.editions.find((e) => e.id === selectedId) ?? null;

  useEffect(() => {
    if (ctl.editions.length === 0) return;
    if (ctl.editions.some((e) => e.id === selectedId)) return;
    onSelect(ctl.editions[0].id);
    setEditing(false);
    setDraft(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctl.editions, selectedId]);

  const startEdit = () => {
    if (!selected) return;
    setDraft(draftFromTierEdition(selected));
    setEditing(true);
  };
  const cancelEdit = () => { setEditing(false); setDraft(null); };
  const saveEdit = async () => {
    if (!selected || !draft) return;
    const ok = await ctl.saveDraft(selected.id, draft);
    if (ok) await ctl.settle(selected.id);
    setEditing(false);
    setDraft(null);
  };

  return (
    <div class="cz-shell-section">
      <p class="cz-shell-section__title">Inclusions &amp; Editions — additional declarations</p>

      {ctl.error && <p class="cz-admin-error-msg">{ctl.error}</p>}

      <div style="display:flex; align-items:center; justify-content:space-between; gap: var(--cz-space-2); flex-wrap:wrap">
        <div class="cz-cost-builder__tier-editions" role="tablist" aria-label="Editions">
          {ctl.editions.map((edition) => (
            <button
              key={edition.id}
              type="button"
              role="tab"
              aria-selected={selectedId === edition.id}
              class={`cz-cost-builder__tier-edition${selectedId === edition.id ? ' is-active' : ''}`}
              onClick={() => { onSelect(edition.id); setEditing(false); setDraft(null); }}
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

      {/* Phase 6 — minimal functional access to the occupant's own Edition
          bin: identify, restore, and trash/delete where lifecycle rules
          permit. Final visual polish is out of scope for this phase. */}
      {ctl.editionBin.length > 0 && (
        <div style="margin-top: var(--cz-space-2)">
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => setShowBin((v) => !v)}>
            {showBin ? 'Hide' : 'Show'} Edition bin ({ctl.editionBin.length})
          </button>
          {showBin && (
            <ul class="cz-tier-edition-bin" style="margin-top: var(--cz-space-1); list-style:none; padding:0; display:flex; flex-direction:column; gap: var(--cz-space-1)">
              {ctl.editionBin.map((entry) => (
                <li key={entry.bin_id} class="cz-tier-edition-bin__row" style="display:flex; justify-content:space-between; align-items:center; gap: var(--cz-space-1)">
                  <span class="drawerModule__value">
                    {entry.edition.title || '(untitled)'}
                    {' · '}{entry.status === 'archived' ? 'Archived' : 'Trashed'}
                    {entry.edition.edition_platform_id ? ` · ${entry.edition.edition_platform_id}` : ''}
                  </span>
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

      {selected && !editing && (
        <div class="cz-tier-edition-declaration cz-tier-edition-declaration--view" style="margin-top: var(--cz-space-2)">
          <div style="display:flex; justify-content:space-between; align-items:center">
            <span class="cz-tier-edition-declaration__status drawerModule__value">
              <span class="cz-admin-status-dot" /> {tierEditionStatusLabel(selected)}
            </span>
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={startEdit}>Edit</button>
          </div>
          <p class="cz-tier-edition-declaration__detail drawerModule__value">
            {selected.price != null ? `$${selected.price.toFixed(2)}` : selected.contact ? 'Contact' : 'Not configured'}
            {' · '}{selected.billing_cycle ?? 'No billing cycle'}
            {selected.minimum_term_value != null ? ` · Min ${selected.minimum_term_value} ${selected.minimum_term_unit ?? ''}` : ''}
            {selected.edition_platform_id ? ` · ${selected.edition_platform_id}` : ''}
            {' · '}{selected.rate_sheet_items.length} {selected.rate_sheet_items.length === 1 ? 'row' : 'rows'} selected
          </p>
          <div style="display:flex; gap: var(--cz-space-1); flex-wrap:wrap; margin-top: var(--cz-space-1)">
            {selected.platform_status === 'disabled' && (
              <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.publish(selected.id)}>Publish</button>
            )}
            {selected.platform_status === 'active' && (
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.disable(selected.id)}>Disable</button>
            )}
            {selected.platform_status === 'disabled' && selected.previous_platform_status !== null && (
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.enable(selected.id)}>Enable</button>
            )}
            {(selected.platform_status === 'active' || selected.platform_status === 'disabled') && (
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.archive(selected.id)}>Archive</button>
            )}
            {selected.platform_status === 'archived' && (
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.trash(selected.id)}>Move to Trash</button>
            )}
            {(selected.platform_status === 'archived' || selected.platform_status === 'trashed') && (
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.restore(selected.id)}>Restore</button>
            )}
            {selected.platform_status === 'trashed' && (
              <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.remove(selected.id)}>Delete permanently</button>
            )}
            {/* Phase 6 — a narrow, separate physical relocation: only an
                already archived/trashed Edition is eligible, and moving it
                here never itself changes platform_status. */}
            {(selected.platform_status === 'archived' || selected.platform_status === 'trashed') && (
              <button
                type="button"
                class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm"
                disabled={ctl.saving}
                onClick={async () => { const ok = await ctl.moveToBin(selected.id); if (ok) onSelect(null); }}
              >
                Move to bin
              </button>
            )}
          </div>
        </div>
      )}

      {selected && editing && draft && (
        <div class="cz-tier-edition-declaration cz-tier-edition-declaration--edit" style="margin-top: var(--cz-space-2)">
          <TierEditionOverviewFields
            draft={draft}
            onChange={(patch) => setDraft({ ...draft, ...patch })}
            rateSheetOptions={rateSheetOptions}
            svc={svc}
          />
          <div style="display:flex; gap: var(--cz-space-2)">
            <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={ctl.saving} onClick={saveEdit}>Save</button>
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
