// CRM-1C: Cancel Request is the only confirmed action here — it is
// terminal (RequestLifecycle never allows cancelled -> approved), matching
// the same cz-publish-confirm* dialog convention CategoryDrawerDialogs.tsx
// uses for its own destructive (trash) confirmation. Approve fires directly,
// the same way Category's own non-destructive Enable does.

import type { RequestDrawerController } from './useRequestDrawerActions';

export function RequestDrawerDialogs({ controller }: { controller: RequestDrawerController }) {
  const c = controller;

  if (c.confirmDialog !== 'cancel') {
    return null;
  }

  const busy = c.pendingAction !== null;

  return (
    <div class="cz-publish-confirm-overlay" onClick={(event) => { if (event.target === event.currentTarget) c.closeConfirm(); }}>
      <div class="cz-publish-confirm" role="dialog" aria-modal="true">
        <div class="cz-publish-confirm__header">
          <h3 class="cz-publish-confirm__title">Cancel this Request?</h3>
        </div>
        <div class="cz-publish-confirm__body">
          <p class="cz-publish-confirm__lead">This cannot be undone — a cancelled Request can never be approved.</p>
          {c.error && <p class="cz-admin-error-msg" role="alert">{c.error}</p>}
        </div>
        <div class="cz-publish-confirm__footer">
          <button type="button" class="cz-admin-btn cz-admin-btn--secondary" onClick={c.closeConfirm} disabled={busy}>Keep Request</button>
          <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={c.handleConfirmCancel} disabled={busy}>
            {c.pendingAction === 'cancel' ? 'Cancelling…' : 'Cancel Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
