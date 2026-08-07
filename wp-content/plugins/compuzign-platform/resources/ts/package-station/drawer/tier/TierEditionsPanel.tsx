// Tier Editions panel — printed inside the individual-tier drawer's Details
// tab (Phase 6). An Edition is a genuine identified child entity with its
// own CZTE and its own StationLifecycle state, reusing the shared canonical
// status vocabulary (Active/Disabled/Archived/Trashed/restorable) — never a
// second Tier, never a Tier Add-on, never folded into TIER_MODULES. See
// docs/code-map/tiers.md and PackageSchema's SECTION: TIER_EDITION.
//
// This is the compact inline management surface: list + create + quick
// lifecycle actions. Full-form editing (TierEditionOverviewFields) is
// shared verbatim with the scoped tier-edition:{instance}:{slot}:{edition}
// drawer (drawer/tier-edition/) — the independently addressed surface that
// gives one Edition its own canonical StationLifecycle footer. Drawer
// content cannot open another drawer (no nesting — see
// StationDrawerLifecycleContract-v1.md), so this inline panel intentionally
// has no in-place trigger to that scoped drawer; reaching it is a Home-level
// (workspace) navigation concern, not this panel's.

import { useState } from 'preact/hooks';
import { AdminField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { PackageManagerItem, PackageRateSheet, TierEdition, TierEditionOverviewDraft } from '../../types';
import { useTierEditions } from '../../surface/tierSurface/useTierEditions';
import { TierEditionOverviewFields } from './TierEditionOverviewFields';
import { draftFromTierEdition, tierEditionStatusLabel } from './tierEditionModel';

interface Props {
  serviceId:      number;
  tierInstanceId: string;
  tierId:         string;
  editions:       TierEdition[];
  rateSheetOptions: AdminFieldOption[];
  // The same slice buildRateSheetCatalogue() already resolves the occupant's
  // own binding from — reused here, unchanged, for the Edition's own
  // (potentially different) rate_sheet_id.
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] };
  onMutated:      () => void;
}

export function TierEditionsPanel({
  serviceId, tierInstanceId, tierId, editions, rateSheetOptions, svc, onMutated,
}: Props) {
  const ctl = useTierEditions(serviceId, tierInstanceId, tierId, editions, onMutated);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TierEditionOverviewDraft | null>(null);

  const openEditor = (edition: TierEdition) => {
    setEditingId(edition.id);
    setDraft(draftFromTierEdition(edition));
  };
  const closeEditor = () => { setEditingId(null); setDraft(null); };

  const submitCreate = async () => {
    if (newTitle.trim() === '') return;
    const created = await ctl.create({ title: newTitle.trim() });
    if (created) { setNewTitle(''); setCreating(false); }
  };

  const saveDraft = async () => {
    if (editingId === null || draft === null) return;
    const ok = await ctl.saveDraft(editingId, draft);
    if (ok) await ctl.settle(editingId);
    closeEditor();
  };

  return (
    <div class="cz-shell-section">
      <p class="cz-shell-section__title">Payment Editions</p>
      <p class="drawerModule__value" style="margin-bottom: var(--cz-space-2)">
        Alternative commercial declarations of this same Tier — e.g. Monthly vs Annual. The
        customer selects this Tier once and switches between its Editions; each carries its
        own price, billing cycle, minimum commitment, and Platform identity.
      </p>

      {ctl.error && <p class="cz-admin-error-msg">{ctl.error}</p>}

      {ctl.editions.length === 0 && !creating && (
        <p class="drawerModule__empty-copy">No Editions yet — this Tier uses its own single declaration.</p>
      )}

      {ctl.editions.map((edition) => (
        <div key={edition.id} class="cz-shell-section cz-shell-section--no-border" style="border: 1px solid var(--cz-border); border-radius: var(--cz-radius-md); padding: var(--cz-space-3); margin-bottom: var(--cz-space-2)">
          {editingId === edition.id && draft ? (
            <>
              <TierEditionOverviewFields
                draft={draft}
                onChange={(patch) => setDraft({ ...draft, ...patch })}
                rateSheetOptions={rateSheetOptions}
                svc={svc}
              />
              <div style="display:flex; gap: var(--cz-space-2)">
                <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={ctl.saving} onClick={saveDraft}>Save</button>
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={closeEditor}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div style="display:flex; justify-content:space-between; align-items:center">
                <div>
                  <span class="cz-admin-status-dot" /> <strong>{edition.title}</strong>{' '}
                  <span class="drawerModule__value">({tierEditionStatusLabel(edition)})</span>
                </div>
                <div style="display:flex; gap: var(--cz-space-1)">
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => openEditor(edition)}>Edit</button>
                </div>
              </div>
              <p class="drawerModule__value">
                {edition.price != null ? `$${edition.price.toFixed(2)}` : edition.contact ? 'Contact' : 'Not configured'}
                {' · '}{edition.billing_cycle ?? 'No billing cycle'}
                {edition.minimum_term_value != null ? ` · Min ${edition.minimum_term_value} ${edition.minimum_term_unit ?? ''}` : ''}
                {edition.edition_platform_id ? ` · ${edition.edition_platform_id}` : ''}
                {' · '}{edition.rate_sheet_items.length} {edition.rate_sheet_items.length === 1 ? 'row' : 'rows'} selected
              </p>
              <div style="display:flex; gap: var(--cz-space-1); flex-wrap:wrap; margin-top: var(--cz-space-1)">
                {edition.platform_status === 'disabled' && (
                  <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.publish(edition.id)}>Publish</button>
                )}
                {edition.platform_status === 'active' && (
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.disable(edition.id)}>Disable</button>
                )}
                {edition.platform_status === 'disabled' && edition.previous_platform_status !== null && (
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.enable(edition.id)}>Enable</button>
                )}
                {(edition.platform_status === 'active' || edition.platform_status === 'disabled') && (
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.archive(edition.id)}>Archive</button>
                )}
                {edition.platform_status === 'archived' && (
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.trash(edition.id)}>Move to Trash</button>
                )}
                {(edition.platform_status === 'archived' || edition.platform_status === 'trashed') && (
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.restore(edition.id)}>Restore</button>
                )}
                {edition.platform_status === 'trashed' && (
                  <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.remove(edition.id)}>Delete permanently</button>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      {creating ? (
        <div class="cz-tf-form">
          <AdminField def={{ id: 'edt-new-title', type: 'text', label: 'New Edition title' }} value={newTitle} onChange={setNewTitle} />
          <div style="display:flex; gap: var(--cz-space-2)">
            <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={ctl.saving || newTitle.trim() === ''} onClick={submitCreate}>Create</button>
            <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => { setCreating(false); setNewTitle(''); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" onClick={() => setCreating(true)}>+ Add Edition</button>
      )}
    </div>
  );
}
