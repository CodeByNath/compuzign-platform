import type { ComponentChildren } from 'preact';
import { useCallback, useMemo, useRef, useState } from 'preact/hooks';
import type { ExitGuard, ExitIntent } from '../ActionShell';
import type { ManagerShellContext } from './DynamicStationManager';

// Page adapter for manager drafts. ActionShell supplies this contract to drawer
// steps; stations use the same guard/footer semantics without acquiring any
// provider or persistence responsibility.
export function usePageManagerShell(): { shell: ManagerShellContext; footer: ComponentChildren } {
  const exitGuardRef = useRef<ExitGuard | null>(null);
  const pendingExitRef = useRef<(() => void) | null>(null);
  const [footer, setFooterState] = useState<ComponentChildren>(null);

  const setExitGuard = useCallback((guard: ExitGuard | null) => {
    exitGuardRef.current = guard;
    if (guard === null) pendingExitRef.current = null;
  }, []);
  const requestExit = useCallback((intent: ExitIntent, continuation: () => void) => {
    const allowed = exitGuardRef.current ? exitGuardRef.current(intent) : true;
    if (!allowed) {
      pendingExitRef.current = continuation;
      return;
    }
    pendingExitRef.current = null;
    continuation();
  }, []);
  const confirmPendingExit = useCallback(() => {
    const continuation = pendingExitRef.current;
    pendingExitRef.current = null;
    continuation?.();
  }, []);
  const cancelPendingExit = useCallback(() => {
    pendingExitRef.current = null;
  }, []);
  const setFooter = useCallback((content: ComponentChildren) => setFooterState(content), []);

  const shell = useMemo<ManagerShellContext>(
    () => ({ setExitGuard, requestExit, confirmPendingExit, cancelPendingExit, setFooter }),
    [setExitGuard, requestExit, confirmPendingExit, cancelPendingExit, setFooter],
  );
  return { shell, footer };
}
