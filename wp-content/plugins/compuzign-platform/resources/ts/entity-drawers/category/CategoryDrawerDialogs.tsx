import type { CategoryDrawerController } from './useCategoryDrawerController';

export function CategoryDrawerDialogs({ controller }: { controller: CategoryDrawerController }) {
  const c = controller;
  const name = c.station.displayName || 'this Category';
  const isNew = c.station.isNew;

  return (
    <>
      {c.confirmDialog === 'publish' && (
        <div class="cz-publish-confirm-overlay" onClick={(event) => { if (event.target === event.currentTarget) c.setConfirmDialog(null); }}>
          <div class="cz-publish-confirm" role="dialog" aria-modal="true">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">
                {isNew ? `Create ${name}?` : c.isActive ? `Settle changes to ${name}?` : `Ready to publish ${name}?`}
              </h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                {isNew
                  ? 'This creates the Category and enables the standard drawer lifecycle to continue from its real record.'
                  : c.isActive
                  ? 'This confirms the current Category Overview draft as settled.'
                  : 'This settles the Overview and enables the Category for the public Cost Builder.'}
              </p>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => c.setConfirmDialog(null)} disabled={c.station.loading.status}>Cancel</button>
              <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={c.handleConfirmPublish} disabled={c.station.loading.status}>
                {c.station.loading.status ? '…' : isNew ? 'Create' : c.isActive ? 'Settle' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {c.confirmDialog === 'discard' && (
        <div class="cz-publish-confirm-overlay" onClick={(event) => { if (event.target === event.currentTarget) c.setConfirmDialog(null); }}>
          <div class="cz-publish-confirm" role="dialog" aria-modal="true">
            <div class="cz-publish-confirm__header"><h3 class="cz-publish-confirm__title">Discard draft?</h3></div>
            <div class="cz-publish-confirm__body"><p class="cz-publish-confirm__lead">Return the Category Overview to its last settled version.</p></div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => c.setConfirmDialog(null)}>Cancel</button>
              <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={c.handleConfirmDiscard}>Discard Draft</button>
            </div>
          </div>
        </div>
      )}

      {(c.confirmDialog === 'trash' || c.confirmDialog === 'delete') && (
        <div class="cz-publish-confirm-overlay" onClick={(event) => { if (event.target === event.currentTarget) c.setConfirmDialog(null); }}>
          <div class="cz-publish-confirm" role="dialog" aria-modal="true">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">
                {c.confirmDialog === 'delete' ? `Permanently delete ${name}?` : `Move ${name} to Trash?`}
              </h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                {c.confirmDialog === 'delete'
                  ? 'This cannot be undone and is blocked while Services remain assigned.'
                  : 'Assigned Service relationships are preserved and the Category can be restored.'}
              </p>
              {c.actionError && <p class="cz-admin-error-msg" role="alert">{c.actionError}</p>}
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => c.setConfirmDialog(null)}>Cancel</button>
              <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={c.handleConfirmDestructive} disabled={c.station.loading.status || c.station.loading.deleting}>
                {c.station.loading.deleting ? 'Deleting…' : c.confirmDialog === 'delete' ? 'Delete permanently' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {c.exitDialog === 'unsaved' && (
        <div class="cz-publish-confirm-overlay" onClick={(event) => { if (event.target === event.currentTarget) c.setExitDialog(null); }}>
          <div class="cz-publish-confirm" role="dialog" aria-modal="true">
            <div class="cz-publish-confirm__header"><h3 class="cz-publish-confirm__title">Unsaved changes</h3></div>
            <div class="cz-publish-confirm__body"><p class="cz-publish-confirm__lead">Closing now will discard the unsaved Category Overview changes.</p></div>
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
