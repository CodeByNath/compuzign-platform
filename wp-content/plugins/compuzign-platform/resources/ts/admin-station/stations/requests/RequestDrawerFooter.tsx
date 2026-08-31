// CRM-1C: reuses SupportedActionFooter/EntityActionFooter, the same
// grammar Category/Service already use for record-level footers — no third
// footer shape. Pending uses the dual-independent-split shape (primary +
// split + splitForward + close, the same shape Tier's own footer uses):
// Approve (primary, prominent), Cancel Request (split, destructive, left),
// Print / Save PDF (splitForward, secondary, right). Approved/cancelled
// Requests drop to the plain single-action shape: Print (primary) + Close.

import { SupportedActionFooter, type SupportedFooterAction } from '@/drawer-kit/SupportedActionFooter';
import type { RequestPendingAction } from './useRequestDrawerActions';
import type { RequestStatus } from '@/api/types/admin';

interface RequestDrawerFooterProps {
  status: RequestStatus;
  pendingAction: RequestPendingAction;
  onClose: () => void;
  onApprove: () => void;
  onCancelRequest: () => void;
  onPrint: () => void;
}

export function RequestDrawerFooter({ status, pendingAction, onClose, onApprove, onCancelRequest, onPrint }: RequestDrawerFooterProps) {
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
      {
        id: 'print',
        label: 'Print / Save PDF',
        placement: 'split-forward',
        tone: 'secondary',
        overflow: [],
        onSelect: onPrint,
        // Honors the same busy-state action lock as Approve/Cancel — while
        // a lifecycle mutation is in flight, every footer action disables.
        disabled: busy,
      },
    );
  } else {
    actions.push({
      id: 'print',
      label: 'Print / Save PDF',
      placement: 'primary',
      onSelect: onPrint,
    });
  }

  return <SupportedActionFooter actions={actions} />;
}
