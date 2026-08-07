// Inclusions & Editions — additional declarations. Replaces the old
// standalone "Payment Editions" panel (docs/code-map/tier-edition.md):
// no explanatory essay, no stacked list of every Edition's editor printed
// one below another, no raw lifecycle rail running the length of the
// module. A compact [Default] [Edition 2] [Edition 3] tab strip shows ONE
// declaration at a time — Default's own content already lives in the
// renamed Inclusions & Editions module immediately above this block in the
// Details tab; selecting an Edition switches this block to that ONE
// Edition's own compact read/edit surface, reusing the same
// TierEditionOverviewFields form (and therefore the same PoolInclusionsEditor
// row/quantity selection) an Edition has always used.
//
// Renders nothing at all when the occupant has never used this capability —
// the Tier behaves exactly as it did before Editions existed.
//
// The selected declaration id is a CONTROLLED prop, not local state: every
// Edition lifecycle mutation refetches through usePackageStation, and while
// that refetch is in flight TierDrawerContent briefly renders <AsyncLoading/>
// in place of its whole child tree — which would unmount this component and
// silently wipe any local "which tab is selected" state back to Default
// after every single Publish/Disable/Archive/etc. click. useTierDrawerController
// owns it instead, the same reason editingSection/openTierPanel live there.

import { useState } from 'preact/hooks';
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
  svc: { rate_sheets: PackageRateSheet[]; package_relationships: PackageManagerItem[] };
  onMutated:      () => void;
  // null = Default. Default's own content lives in the module above; this
  // block never edits it — selecting Default here just confirms that.
  selectedId:     string | null;
  onSelect:       (id: string | null) => void;
}

export function TierEditionDeclarationSwitcher({
  serviceId, tierInstanceId, tierId, editions, rateSheetOptions, svc, onMutated, selectedId, onSelect,
}: Props) {
  const ctl = useTierEditions(serviceId, tierInstanceId, tierId, editions, onMutated);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TierEditionOverviewDraft | null>(null);

  // Nothing to show — this Tier uses only its own Default declaration.
  if (ctl.editions.length === 0) return null;

  const selected = ctl.editions.find((e) => e.id === selectedId) ?? null;

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

      <div class="cz-cost-builder__tier-editions" role="tablist" aria-label="Declarations">
        <button
          type="button"
          role="tab"
          aria-selected={selectedId === null}
          class={`cz-cost-builder__tier-edition${selectedId === null ? ' is-active' : ''}`}
          onClick={() => { onSelect(null); setEditing(false); setDraft(null); }}
        >
          Default
        </button>
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

      {selectedId === null && (
        <p class="drawerModule__value" style="margin-top: var(--cz-space-2)">
          Showing the Default declaration — edit it in Inclusions &amp; Editions above.
        </p>
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
