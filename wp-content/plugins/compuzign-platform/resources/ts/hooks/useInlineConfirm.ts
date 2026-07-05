// Per-row inline confirm state (Schema architecture S1c).
//
// The pending/busy two-step confirm previously hand-copied by every travel
// surface (Bin / Archived / Trash tables, tier occupant-bin cards, promotion
// bin rows): a row action first arms a per-row confirm (`request`), then the
// Confirm button runs the destructive action with per-row busy tracking.
// Rendering stays with the surface — this hook owns only the state machine.

import { useState, useCallback } from 'preact/hooks';

export function useInlineConfirm<Id = number>() {
  const [pendingId, setPendingId] = useState<Id | null>(null);
  const [busyId,    setBusyId]    = useState<Id | null>(null);

  const request = useCallback((id: Id) => setPendingId(id), []);
  const cancel  = useCallback(() => setPendingId(null), []);

  // Runs a row action with per-row busy tracking. Clears the pending confirm
  // only when it belongs to the same row — a Restore on one row must not close
  // another row's open confirm.
  const run = useCallback(async (id: Id, action: () => Promise<unknown> | void) => {
    setBusyId(id);
    try {
      await action();
      setPendingId((prev) => (prev === id ? null : prev));
    } finally {
      setBusyId(null);
    }
  }, []);

  return { pendingId, busyId, request, cancel, run };
}
