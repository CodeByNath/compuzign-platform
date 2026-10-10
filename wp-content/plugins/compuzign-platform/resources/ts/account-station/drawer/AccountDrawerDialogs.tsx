// Account drawer confirm/exit dialogs — hand-authored per
// StationDrawerLifecycleContract-v1 §11, sharing only the cz-publish-confirm*
// convention. No shared modal component is extracted here.

import type { AccountDrawerController } from './useAccountDrawerController';

export function AccountDrawerDialogs({ controller: c }: { controller: AccountDrawerController }) {
  return (
    <>
      {c.showPublishModal && (
        <div class="cz-publish-confirm-overlay" onClick={(event) => { if (event.target === event.currentTarget) c.setShowPublishModal(false); }}>
          <div class="cz-publish-confirm" role="dialog" aria-modal="true">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">
                {c.station.isActive ? 'Settle changes to the Account Profile?' : 'Ready to publish the Account Profile?'}
              </h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                {c.station.isActive
                  ? 'This applies the current Brand draft as the settled Account Profile state.'
                  : 'This settles the Brand draft and activates the Account Profile.'}
              </p>
              {c.actionError && <p class="cz-admin-error-msg" role="alert">{c.actionError}</p>}
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => c.setShowPublishModal(false)} disabled={c.station.loading.status}>Cancel</button>
              <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={c.handleConfirmPublish} disabled={c.station.loading.status}>
                {c.station.loading.status ? '…' : c.station.isActive ? 'Settle' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {c.exitDialog === 'unsaved' && (
        <div class="cz-publish-confirm-overlay" onClick={(event) => { if (event.target === event.currentTarget) c.setExitDialog(null); }}>
          <div class="cz-publish-confirm" role="dialog" aria-modal="true">
            <div class="cz-publish-confirm__header"><h3 class="cz-publish-confirm__title">Unsaved changes</h3></div>
            <div class="cz-publish-confirm__body"><p class="cz-publish-confirm__lead">Closing now will discard the unsaved Brand changes.</p></div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={c.handleExitDiscard}>Discard and continue</button>
              <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={() => c.setExitDialog(null)}>Keep editing</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
