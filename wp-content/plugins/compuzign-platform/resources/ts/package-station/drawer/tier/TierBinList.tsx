// Occupant bin — displaced occupants with Restore / Trash / Delete and the D3
// conflict prompts (target_occupied → Swap/retarget, origin_unknown → retarget,
// pending_drafts → confirm discard and retry). Pure presentation over the
// controller; every lifecycle call and conflict decision lives in the controller.

import { TravelStatusPill } from '@/drawer-kit/ui/TravelStatusPill';
import { TIER_KEYS, TIER_LABELS } from '../../vocabulary';
import { slotOccupied } from './useTierDrawerController';
import type { TierDrawerController } from './useTierDrawerController';

export function TierBinList({ c }: { c: TierDrawerController }) {
  const { pkg, station, binPrompt, binDeleteConfirm, saveErr } = c;
  if (!station) return null;

  return (
    <>
      {pkg.occupantBin.length === 0 && (
        <div class="cz-admin-empty"><p>The bin is empty.</p></div>
      )}
      {pkg.occupantBin.map((entry) => {
        const occ        = entry.occupant;
        const originKey  = entry.origin_tier;
        const originName = originKey ? (TIER_LABELS[originKey] ?? originKey) : null;
        const priceText  = occ.contact
          ? 'Contact'
          : occ.price != null ? `$${Number(occ.price).toFixed(2)}` : '—';
        const inclCount  = occ.inclusions_override?.length ?? 0;
        const faqCount   = occ.faq_refs?.length ?? 0;
        const prompt     = binPrompt?.binId === entry.bin_id ? binPrompt : null;
        const emptyTiers = TIER_KEYS.filter((k) => !slotOccupied(station.tiers[k]));
        return (
          <div key={entry.bin_id} class="drawerModule drawerOverview tier">
            <div class="drawerModule__header">
              <span class="drawerModule__icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="drawerModule__icon-svg" aria-hidden="true" focusable="false">
                  <path d="M12.378 1.602a.75.75 0 00-.756 0L3.366 6.39a.75.75 0 000 1.298l8.256 4.768a.75.75 0 00.756 0l8.256-4.768a.75.75 0 000-1.298L12.378 1.602zM3 9.46v7.788a.75.75 0 00.378.65l8.25 4.764V13.41L3 9.46zm9.75 13.452l8.25-4.764a.75.75 0 00.378-.65V9.46l-8.628 4.984v8.468z" />
                </svg>
              </span>
              <div class="drawerModule__heading">
                <p class="drawerModule__title">{occ.label?.trim() || (originName ? `${originName} occupant` : 'Occupant')}</p>
                <p class="drawerModule__subtitle">
                  {originName ? `From ${originName}` : 'Origin unknown'}
                  {entry.displaced_at ? ` · ${entry.displaced_at.slice(0, 10)}` : ''}
                </p>
              </div>
              <div class="drawerModule__status"><TravelStatusPill status={entry.status} /></div>
            </div>
            <div class="drawerModule__body">
              <div class="drawerModule__fields">
                <div class="drawerModule__field">
                  <p class="drawerModule__label">Pricing</p>
                  <p class="drawerModule__value">
                    <span>{priceText}</span>
                    {occ.billing_cycle ? <>{' · '}<span>{occ.billing_cycle}</span></> : null}
                  </p>
                </div>
                <div class="drawerModule__field">
                  <p class="drawerModule__label">Includes</p>
                  <p class="drawerModule__value">
                    {inclCount} {inclCount === 1 ? 'feature' : 'features'} | {faqCount} {faqCount === 1 ? 'common question' : 'common questions'}
                  </p>
                </div>
              </div>
            </div>
            <div class="drawerModule__footer">
              {prompt ? (
                prompt.code === 'pending_drafts' ? (
                  <>
                    <span class="cz-sc-table__confirm-label">Target tier has unsettled changes. Discard them?</span>
                    <button
                      type="button"
                      class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm"
                      disabled={pkg.saving}
                      onClick={() => c.handleRestoreBin(entry.bin_id, prompt.mode, prompt.targetTier, true)}
                    >
                      {pkg.saving ? '…' : 'Discard & Restore'}
                    </button>
                    <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={pkg.saving} onClick={() => c.setBinPrompt(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span class="cz-sc-table__confirm-label">
                      {prompt.code === 'target_occupied' ? `${originName ?? 'Origin tier'} is occupied.` : 'Choose a tier to restore into.'}
                    </span>
                    {prompt.code === 'target_occupied' && (
                      <button
                        type="button"
                        class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm"
                        disabled={pkg.saving}
                        onClick={() => c.handleRestoreBin(entry.bin_id, 'swap')}
                      >
                        {pkg.saving ? '…' : 'Swap'}
                      </button>
                    )}
                    <select
                      class="cz-tf-select"
                      style="width:auto"
                      value=""
                      disabled={pkg.saving || emptyTiers.length === 0}
                      onChange={(e) => {
                        const sel = e.target as HTMLSelectElement;
                        if (sel.value) c.handleRestoreBin(entry.bin_id, 'retarget', sel.value);
                        sel.value = '';
                      }}
                    >
                      <option value="">{emptyTiers.length === 0 ? 'No empty tier' : 'Restore into…'}</option>
                      {emptyTiers.map((k) => (
                        <option key={k} value={k}>{TIER_LABELS[k]}</option>
                      ))}
                    </select>
                    <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={pkg.saving} onClick={() => c.setBinPrompt(null)}>
                      Cancel
                    </button>
                  </>
                )
              ) : binDeleteConfirm.pendingId === entry.bin_id ? (
                <>
                  <span class="cz-sc-table__confirm-label">Delete permanently?</span>
                  <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm" disabled={pkg.saving} onClick={() => c.handleDeleteBin(entry.bin_id)}>
                    {pkg.saving ? '…' : 'Confirm'}
                  </button>
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={pkg.saving} onClick={() => binDeleteConfirm.cancel()}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={pkg.saving} onClick={() => c.handleRestoreBin(entry.bin_id)}>
                    Restore
                  </button>
                  {entry.status === 'archived' && (
                    <button type="button" class="cz-admin-btn cz-admin-btn--secondary cz-admin-btn--sm" disabled={pkg.saving} onClick={() => c.handleTrashBin(entry.bin_id)}>
                      Move to Trash
                    </button>
                  )}
                  {entry.status === 'trashed' && (
                    <button type="button" class="cz-admin-btn cz-admin-btn--danger cz-admin-btn--sm" disabled={pkg.saving} onClick={() => binDeleteConfirm.request(entry.bin_id)}>
                      Delete Permanently
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
      {saveErr && <p class="cz-admin-error-msg">{saveErr}</p>}
    </>
  );
}
