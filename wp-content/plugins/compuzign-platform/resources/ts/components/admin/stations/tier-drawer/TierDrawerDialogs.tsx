// Tier confirm dialogs — publish/settle and archive-with-pending-drafts. Pure
// presentation over the controller; behaviour is owned by the controller and
// usePackageStation. Rendered inside the individual-tier EntityDrawer body.

import { TIER_LABELS } from '../serviceDrawerShared';
import type { TierDrawerController } from './useTierDrawerController';

export function TierDrawerDialogs({ c }: { c: TierDrawerController }) {
  if (!c.tierDetail || !c.editingTierId) return null;
  const { detail, view } = c.tierDetail;
  const saving = c.pkg.saving;
  const tierLabel = detail.label.trim() || TIER_LABELS[c.editingTierId];

  return (
    <>
      {c.confirmModal === 'publish' && (
        <div class="cz-publish-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) c.setConfirmModal(null); }}>
          <div class="cz-publish-confirm">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">Publish changes to {tierLabel}?</h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                This commits the pending changes as the settled state for each module.
                The tier's live state is not changed by publishing.
              </p>
              <ul class="cz-publish-confirm__summary">
                <li><strong>Tier Overview:</strong> {view.drafts.overview ? 'Pending changes' : (detail.price !== null || detail.contact) && detail.billing_cycle ? 'Ready' : 'Not configured'}</li>
                <li><strong>Included Features:</strong> {view.drafts.features ? 'Pending changes' : `${detail.inclusions_override.length} added`}</li>
                <li><strong>Common Questions:</strong> {view.drafts.faqs ? 'Pending changes' : `${detail.faq_refs.length} added`}</li>
              </ul>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => c.setConfirmModal(null)} disabled={saving}>
                Cancel
              </button>
              <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={c.handleConfirmPublish} disabled={saving}>
                {saving ? '…' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {c.confirmModal === 'archive-discard' && (
        <div class="cz-publish-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) c.setConfirmModal(null); }}>
          <div class="cz-publish-confirm">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">Archive {tierLabel}'s occupant?</h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                This tier has unsettled changes. Archiving moves the settled occupant
                to the bin and discards the pending changes — they cannot be recovered.
              </p>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => c.setConfirmModal(null)} disabled={saving}>
                Cancel
              </button>
              <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={() => c.handleArchive(true)} disabled={saving}>
                {saving ? '…' : 'Discard & Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
