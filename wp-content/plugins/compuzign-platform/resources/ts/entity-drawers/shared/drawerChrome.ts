// Shared drawer-controller chrome — the coordination machinery that was
// repeated near-verbatim across the Service, Category, and Package Family
// drawer controllers. State/derivation only; nothing here renders, calls an
// endpoint, or knows an entity. The Tier controller deliberately keeps its own
// window.confirm guard and does not use useGuardedClose.

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { EntityDrawerHostBridge } from '@/drawer-kit/entityDrawerHost';

// Auto-clear a transient flag (the "Changes saved." toast) after `ms`.
export function useAutoDismiss(active: boolean, dismiss: () => void, ms: number): void {
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  useEffect(() => {
    if (!active) return;
    const timeout = setTimeout(() => dismissRef.current(), ms);
    return () => clearTimeout(timeout);
  }, [active, ms]);
}

// Dismiss an open split-dropdown on any outside click. The zero-delay timeout
// keeps the opening click itself from immediately closing it.
export function useOutsideClickDismiss(open: boolean, close: () => void): void {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const handle = () => closeRef.current();
    const timeout = setTimeout(() => document.addEventListener('click', handle), 0);
    return () => { clearTimeout(timeout); document.removeEventListener('click', handle); };
  }, [open]);
}

export interface GuardedClose {
  // Run a continuation now if the guard allows exit; otherwise stash it for
  // resolveExit. Used for guarded tab switches (and anything else that must
  // respect the exit dialogs).
  guard: (continuation: () => void) => void;
  // Run the stashed continuation (close or tab switch) with the guard bypassed,
  // then restore the guard for whatever surface remains.
  resolveExit: () => void;
  // Close through the host bypassing the guard — for terminal lifecycle actions
  // (archive/trash), which must never re-raise the exit dialog on the record
  // they just left.
  closeBypassingGuard: () => void;
}

// The guarded-exit machinery: a bypass ref, a pending continuation stashed while
// an exit dialog is open, host close-guard registration, and guarded runs.
// `evaluate` is the entity's own policy: return true to allow exit now, or raise
// the matching dialog and return false. It is read through a ref, so it may
// freely close over current render state.
export function useGuardedClose(bridge: EntityDrawerHostBridge, evaluate: () => boolean): GuardedClose {
  const bypassRef = useRef(false);
  const pendingContinuationRef = useRef<null | (() => void)>(null);
  const evaluateRef = useRef(evaluate);
  evaluateRef.current = evaluate;

  const evaluateExit = useCallback((): boolean => {
    if (bypassRef.current) return true;
    return evaluateRef.current();
  }, []);

  // Registered with the host: consulted on Escape / backdrop / header + footer
  // Close. Blocking stashes the actual close as the pending continuation.
  useEffect(() => {
    bridge.setCloseGuard(() => {
      const allowed = evaluateExit();
      if (!allowed) pendingContinuationRef.current = () => bridge.close();
      return allowed;
    });
    return () => bridge.setCloseGuard(null);
  }, [bridge, evaluateExit]);

  const guard = useCallback((continuation: () => void) => {
    if (evaluateExit()) continuation();
    else pendingContinuationRef.current = continuation;
  }, [evaluateExit]);

  const resolveExit = useCallback(() => {
    bypassRef.current = true;
    const continuation = pendingContinuationRef.current;
    pendingContinuationRef.current = null;
    continuation?.();
    bypassRef.current = false;
  }, []);

  const closeBypassingGuard = useCallback(() => {
    bypassRef.current = true;
    bridge.close();
  }, [bridge]);

  return { guard, resolveExit, closeBypassingGuard };
}

export interface LifecycleRunner {
  actionError: string | null;
  setActionError: (error: string | null) => void;
  // Run a station lifecycle operation: clear the previous error, surface a
  // thrown error's message (or the entity's fallback), and close bypassing the
  // guard when a terminal action succeeds.
  run: (operation: () => Promise<unknown>, closeAfter?: boolean) => Promise<void>;
}

export function useLifecycleRunner(
  closeBypassingGuard: () => void,
  fallbackError: string,
  onStart?: () => void,
): LifecycleRunner {
  const [actionError, setActionError] = useState<string | null>(null);
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;

  const run = useCallback(async (operation: () => Promise<unknown>, closeAfter = false) => {
    onStartRef.current?.();
    setActionError(null);
    try {
      const result = await operation();
      if (result && closeAfter) closeBypassingGuard();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : fallbackError);
    }
  }, [closeBypassingGuard, fallbackError]);

  return { actionError, setActionError, run };
}
