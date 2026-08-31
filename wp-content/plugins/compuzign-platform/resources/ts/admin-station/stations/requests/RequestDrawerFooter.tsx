// CRM-1C audit correction (live layout review): the pinned Request footer
// is now exactly two plain record-level actions for a PENDING Request only —
// destructive Cancel Request on the left, primary Approve on the right. No
// footer Close (the header × already closes the drawer) and no footer Print
// (Print / Save PDF moved to a header icon action — see RequestDrawerHost.tsx
// / admin-station/shell/IconButton.tsx). A terminal (approved/cancelled)
// Request has no mutation actions left to offer, so RequestDrawerHost
// publishes no footer at all for it — this component is never called there.
//
// Composed directly from the shared `cz-tf-footer` / `cz-tf-footer__spacer` /
// `cz-admin-btn*` primitives — the same low-level vocabulary
// EntityActionFooter itself renders from (drawer-kit/InlineEditorShell.tsx's
// own Save/Cancel footer is the established precedent for composing directly
// at this level) — rather than through SupportedActionFooter/
// EntityActionFooter: those enforce exactly one Close slot and/or the
// split-button chevron grammar, and the audit explicitly rules out both for
// this shape ("Remove footer Close... Do not use a split button").

import type { RequestPendingAction } from './useRequestDrawerActions';

interface RequestDrawerFooterProps {
  pendingAction: RequestPendingAction;
  onApprove: () => void;
  onCancelRequest: () => void;
}

export function RequestDrawerFooter({ pendingAction, onApprove, onCancelRequest }: RequestDrawerFooterProps) {
  const busy = pendingAction !== null;

  return (
    <div class="cz-tf-footer">
      <button type="button" class="cz-admin-btn cz-admin-btn--danger" onClick={onCancelRequest} disabled={busy}>
        {pendingAction === 'cancel' ? 'Cancelling…' : 'Cancel Request'}
      </button>
      <div class="cz-tf-footer__spacer" />
      <button type="button" class="cz-admin-btn cz-admin-btn--primary" onClick={onApprove} disabled={busy}>
        {pendingAction === 'approve' ? 'Approving…' : 'Approve'}
      </button>
    </div>
  );
}
