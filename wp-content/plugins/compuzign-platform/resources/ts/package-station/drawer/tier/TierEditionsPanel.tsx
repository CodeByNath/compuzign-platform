// Tier Editions panel — printed inside the individual-tier drawer's Details
// tab (Phase 6). An Edition is a genuine identified child entity with its
// own CZTE and its own StationLifecycle state, reusing the shared canonical
// status vocabulary (Active/Disabled/Archived/Trashed/restorable) — never a
// second Tier, never a Tier Add-on, never folded into TIER_MODULES. See
// docs/code-map/tiers.md and PackageSchema's SECTION: TIER_EDITION.
//
// This is a compact inline panel, not a scoped `tier-edition:{...}` drawer
// route with its own footer-slot takeover — see the Phase 6 completion
// report for why that fuller integration is deferred rather than rushed.

import { useState } from 'preact/hooks';
import { AdminField } from '@/drawer-kit/fields';
import type { AdminFieldOption } from '@/drawer-kit/fields';
import type { TierEdition, TierEditionOverviewDraft } from '../../types';
import { useTierEditions } from '../../surface/tierSurface/useTierEditions';

const BILLING_CYCLES: AdminFieldOption[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
  { value: 'one-time', label: 'One-time' },
];

const MINIMUM_TERM_UNITS: AdminFieldOption[] = [
  { value: 'month', label: 'Month(s)' },
  { value: 'year', label: 'Year(s)' },
];

function statusLabel(edition: TierEdition): string {
  switch (edition.platform_status) {
    case 'active':   return 'Active';
    case 'archived': return 'Archived';
    case 'trashed':  return 'Trashed';
    case 'disabled': return edition.previous_platform_status !== null ? 'Disabled' : 'Pending';
    default:         return edition.platform_status;
  }
}

function draftFromEdition(edition: TierEdition): TierEditionOverviewDraft {
  return {
    title: edition.title,
    admin_description: edition.admin_description,
    rate_sheet_id: edition.rate_sheet_id,
    rate_sheet_items: edition.rate_sheet_items,
    billing_cycle: edition.billing_cycle,
    contact: edition.contact,
    minimum_term_value: edition.minimum_term_value,
    minimum_term_unit: edition.minimum_term_unit,
    inclusions_override: edition.inclusions_override,
    faq_refs: edition.faq_refs,
  };
}

interface Props {
  serviceId:      number;
  tierInstanceId: string;
  tierId:         string;
  editions:       TierEdition[];
  defaultEditionId: string | null;
  rateSheetOptions: AdminFieldOption[];
  onMutated:      () => void;
}

export function TierEditionsPanel({
  serviceId, tierInstanceId, tierId, editions, defaultEditionId, rateSheetOptions, onMutated,
}: Props) {
  const ctl = useTierEditions(serviceId, tierInstanceId, tierId, editions, defaultEditionId, onMutated);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TierEditionOverviewDraft | null>(null);

  const openEditor = (edition: TierEdition) => {
    setEditingId(edition.id);
    setDraft(draftFromEdition(edition));
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
            <div class="cz-tf-form">
              <AdminField def={{ id: 'edt-title', type: 'text', label: 'Title' }} value={draft.title} onChange={(title: string) => setDraft({ ...draft, title })} />
              <AdminField def={{ id: 'edt-description', type: 'textarea', label: 'Admin description (optional)', rows: 2 }} value={draft.admin_description} onChange={(admin_description: string) => setDraft({ ...draft, admin_description })} />
              <AdminField def={{ id: 'edt-rate-sheet', type: 'select', label: 'Rate Sheet', unsetLabel: 'Inherit the Tier’s own binding', options: rateSheetOptions }} value={draft.rate_sheet_id ?? ''} onChange={(v: string) => setDraft({ ...draft, rate_sheet_id: v || null })} />
              <AdminField def={{ id: 'edt-billing-cycle', type: 'select', label: 'Billing Cycle', options: BILLING_CYCLES }} value={draft.billing_cycle ?? ''} onChange={(billing_cycle: string) => setDraft({ ...draft, billing_cycle })} />
              <AdminField def={{ id: 'edt-price', type: 'text', label: 'Price', readonly: true }} value="Derived from Rate Sheet selections" onChange={() => undefined} />
              <AdminField def={{ id: 'edt-min-term-value', type: 'text', label: 'Minimum commitment' }} value={draft.minimum_term_value != null ? String(draft.minimum_term_value) : ''} onChange={(v: string) => setDraft({ ...draft, minimum_term_value: v === '' ? null : Number(v) })} />
              <AdminField def={{ id: 'edt-min-term-unit', type: 'select', label: 'Commitment unit', unsetLabel: 'None', options: MINIMUM_TERM_UNITS }} value={draft.minimum_term_unit ?? ''} onChange={(v: string) => setDraft({ ...draft, minimum_term_unit: v || null })} />
              <div style="display:flex; gap: var(--cz-space-2)">
                <button type="button" class="cz-admin-btn cz-admin-btn--primary cz-admin-btn--sm" disabled={ctl.saving} onClick={saveDraft}>Save</button>
                <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={closeEditor}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div style="display:flex; justify-content:space-between; align-items:center">
                <div>
                  <span class="cz-admin-status-dot" /> <strong>{edition.title}</strong>{' '}
                  <span class="drawerModule__value">({statusLabel(edition)}{defaultEditionId === edition.id ? ' — Default' : ''})</span>
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
                {edition.platform_status === 'trashed' && defaultEditionId !== edition.id && (
                  <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.remove(edition.id)}>Delete permanently</button>
                )}
                {edition.platform_status === 'active' && defaultEditionId !== edition.id && (
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={ctl.saving} onClick={() => ctl.setDefault(edition.id)}>Make default</button>
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
