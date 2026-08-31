// CRM-1C: the two admin-driven lifecycle mutations against a durable
// Request — pending -> approved, pending -> cancelled. Owns only busy/error/
// confirm-dialog UI state; the transition rules themselves live entirely in
// RequestRepository::updateStatus() on the server.

import { useState } from 'preact/hooks';
import { updateRequestStatus } from '@/api/endpoints/admin';
import { openRequestPrintWindow, finishRequestPrint } from './printRequestProposal';
import type { RequestEntry } from '@/api/types/admin';

export type RequestPendingAction = 'approve' | 'cancel' | null;
export type RequestConfirmDialog = 'cancel' | null;

export interface RequestDrawerController {
  pendingAction: RequestPendingAction;
  confirmDialog: RequestConfirmDialog;
  error: string | null;
  handleApprove: () => void;
  openCancelConfirm: () => void;
  handleConfirmCancel: () => void;
  closeConfirm: () => void;
  // Printing doesn't mutate server state, so it isn't part of the
  // approve/cancel pendingAction machine above — it takes the full,
  // currently-displayed Request directly rather than re-reading it.
  handlePrint: (request: RequestEntry) => void;
}

interface UseRequestDrawerActionsArgs {
  ref: string;
  // Hands the freshly returned Request detail straight back to the host —
  // the mutation response already carries it, so there is no need for a
  // second round trip through fetchAdminRequest().
  onUpdated: (request: RequestEntry) => void;
  // Refreshes the originating Requests wall (list + summary counts) only —
  // see DrawerContentProps.onSaved.
  onSaved: () => void;
}

export function useRequestDrawerActions({ ref, onUpdated, onSaved }: UseRequestDrawerActionsArgs): RequestDrawerController {
  const [pendingAction, setPendingAction] = useState<RequestPendingAction>(null);
  const [confirmDialog, setConfirmDialog] = useState<RequestConfirmDialog>(null);
  const [error, setError] = useState<string | null>(null);

  async function transition(action: 'approve' | 'cancel', status: 'approved' | 'cancelled'): Promise<void> {
    setPendingAction(action);
    setError(null);
    try {
      const response = await updateRequestStatus(ref, status);
      onUpdated(response.request);
      onSaved();
      setConfirmDialog(null);
    } catch {
      setError(
        action === 'approve'
          ? 'Could not approve this Request — it may already have changed status.'
          : 'Could not cancel this Request — it may already have changed status.',
      );
    } finally {
      setPendingAction(null);
    }
  }

  // Deliberately NOT async: openRequestPrintWindow() runs synchronously, in
  // the same call as handlePrint below. Only the continuation after a
  // genuinely open window is async — see printRequestProposal.tsx's own
  // comment (the actual CRM-1C print-activation defect was elsewhere, in
  // openIsolatedPrintDocument.ts's window-feature string, not here).
  function runPrint(request: RequestEntry): void {
    const opened = openRequestPrintWindow(request);
    if (!opened.ok) {
      if (opened.reason === 'popup-blocked') {
        window.alert("Could not open the print window — check your browser's popup blocker.");
      } else {
        window.alert('Print is unavailable right now — required asset configuration is missing.');
      }
      return;
    }
    finishRequestPrint(opened, request).catch(() => {
      opened.printWindow.close();
      window.alert('Could not prepare the print preview. Please try again.');
    });
  }

  return {
    pendingAction,
    confirmDialog,
    error,
    handleApprove: () => { void transition('approve', 'approved'); },
    openCancelConfirm: () => setConfirmDialog('cancel'),
    handleConfirmCancel: () => { void transition('cancel', 'cancelled'); },
    closeConfirm: () => setConfirmDialog(null),
    handlePrint: (request: RequestEntry) => runPrint(request),
  };
}
