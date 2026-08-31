// CRM-1C: the pending-only action set — Approve (prominent) and Cancel
// Request (destructive) — reusing SupportedActionFooter/EntityActionFooter,
// the same grammar Category/Service already use for record-level footers.
// No third footer shape: this is the plain single-split shape (no
// splitForward), same as every non-Tier drawer footer today.
//
// Print/Save PDF is deliberately not wired here — see the CRM-1C work file
// (project-work/2026-08-31-crm-request-actions.md) for the bundle-boundary
// finding that blocked it. Approved/cancelled Requests currently render
// Close only.

import { SupportedActionFooter, type SupportedFooterAction } from '@/drawer-kit/SupportedActionFooter';
import type { RequestPendingAction } from './useRequestDrawerActions';
import type { RequestStatus } from '@/api/types/admin';

interface RequestDrawerFooterProps {
  status: RequestStatus;
  pendingAction: RequestPendingAction;
  onClose: () => void;
  onApprove: () => void;
  onCancelRequest: () => void;
}

export function RequestDrawerFooter({ status, pendingAction, onClose, onApprove, onCancelRequest }: RequestDrawerFooterProps) {
  const busy = pendingAction !== null;

  const actions: SupportedFooterAction[] = [
    { id: 'close', label: 'Close', placement: 'close', onSelect: onClose, disabled: busy },
  ];

  if (status === 'pending') {
    actions.push(
      {
        id: 'approve',
        label: 'Approve',
        placement: 'primary',
        onSelect: onApprove,
        disabled: busy,
        busy: pendingAction === 'approve',
        busyLabel: 'Approving…',
      },
      {
        id: 'cancel-request',
        label: 'Cancel Request',
        placement: 'split',
        tone: 'danger',
        danger: true,
        overflow: [],
        onSelect: onCancelRequest,
        disabled: busy,
        busy: pendingAction === 'cancel',
        busyLabel: 'Cancelling…',
      },
    );
  }

  return <SupportedActionFooter actions={actions} />;
}
