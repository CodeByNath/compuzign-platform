// ModeContext — the active shell viewpoint (Schema architecture S3a, §7/§10).
//
// Groups decide where shells appear and in which mode (§8): a placement wraps
// its shells in <ModeProvider mode=…> and every shell inside reads the active
// viewpoint from context. This replaces the hand-rolled
// `mode='details'|'connection'` prop branching — shells no longer take a mode
// prop at all. The default is `details`, the Details group's canonical
// viewpoint.

import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { ShellMode } from './types';

const ModeContext = createContext<ShellMode>('details');

export function ModeProvider({ mode, children }: { mode: ShellMode; children: ComponentChildren }) {
  return <ModeContext.Provider value={mode}>{children}</ModeContext.Provider>;
}

export function useShellMode(): ShellMode {
  return useContext(ModeContext);
}
