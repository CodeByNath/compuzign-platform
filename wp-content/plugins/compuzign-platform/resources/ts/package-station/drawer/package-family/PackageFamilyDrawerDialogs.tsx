import type { PackageFamilyDrawerController } from './usePackageFamilyDrawerController';

export function PackageFamilyDrawerDialogs({ controller }: { controller: PackageFamilyDrawerController }) {
  const c = controller;
  const name = c.station.family.label || 'this Package Family';
  const isNew = c.station.family.group_id === '';

  return (
    <>
      {c.confirmDialog === 'publish' && (
        <div class="cz-publish-confirm-overlay" onClick={(event) => { if (event.target === event.currentTarget) c.setConfirmDialog(null); }}>
          <div class="cz-publish-confirm" role="dialog" aria-modal="true">
            <div class="cz-publish-confirm__header">
              <h3 class="cz-publish-confirm__title">
                {isNew ? `Create ${name}?` : c.station.isActive ? `Settle changes to ${name}?` : `Ready to publish ${name}?`}
              </h3>
            </div>
            <div class="cz-publish-confirm__body">
              <p class="cz-publish-confirm__lead">
                {isNew
                  ? 'This creates the Package Family and enables it.'
                  : c.station.isActive
                  ? 'This applies the current Family Overview draft as the settled Package Station state.'
                  : 'This settles the Family Overview and enables this Package Family.'}
              </p>
            </div>
            <div class="cz-publish-confirm__footer">
              <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={() => c.setConfirmDialog(null)} disabled={c.station.loading.status}>Cancel</button>
              <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={c.handleConfirmPublish} disabled={c.station.loading.status}>
                {c.station.loading.status ? '…' : isNew ? 'Create' : c.station.isActive ? 'Settle' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {c.confirmDialog === 'discard' && (
        <div class="cz-publish-confirm-overlay" onClick={(event) => { if (event.target === event.currentTarget) c.setConfirmDialog(null); }}>
          <div class="cz-publish-confirm" role="dialog" aria-modal="true">
            <div class="cz-publish-confirm__header"><h3 class="cz-publish-confirm__title">Discard draft?</h3></div>
            <div class="cz-publish-confirm__body"><p class="cz-publish-confirm__lead">Return the Family Overview to its last settled version.</p></div>
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
                  ? 'This cannot be undone. Services, Rate Sheet rows, or Tier selections block deletion while they still depend on this Family.'
                  : `Connected records remain intact (${c.dependentsSummary}); the Family can be restored from Trash.`}
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
            <div class="cz-publish-confirm__body"><p class="cz-publish-confirm__lead">Closing now will discard the unsaved Family Overview changes.</p></div>
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
