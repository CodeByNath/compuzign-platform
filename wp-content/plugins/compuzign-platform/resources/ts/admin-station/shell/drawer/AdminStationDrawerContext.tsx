// Admin Station drawer controller — the generic drawer state layer.
//
// It owns exactly one thing: which drawer (if any) is open, over which numeric
// record, in which mode. It is entity-agnostic — it holds a drawer template KEY,
// never an entity — so the shell and controller can drive any registered drawer.
//
// It consumes a ResolvedStationIntent (emitted by a template kit through the
// surface host) and preserves the numeric recordId across mode switches. Closing
// clears the state completely, so no stale intent, record, or mode survives to
// bleed into the next open.

import { createContext } from 'preact';
import type { ComponentChildren } from 'preact';
import { useContext, useState, useMemo, useCallback } from 'preact/hooks';
import type { ResolvedStationIntent } from '../../stations/StationSurfaceHost';
import type { DrawerMode } from '../../stations/drawers/drawerTypes';

// The open-drawer state. Null when nothing is open. recordId stays numeric.
export interface OpenDrawerState {
  drawerTemplateKey: string;
  recordId:          number;
  mode:              DrawerMode;
}

export interface AdminStationDrawerContextValue {
  open: OpenDrawerState | null;
  // Open (or replace) the drawer from a resolved intent. An intent with no
  // drawer target is ignored — nothing opens.
  openFromIntent: (intent: ResolvedStationIntent) => void;
  // Switch tab without losing identity: only the mode changes; the drawer
  // template and numeric recordId are preserved.
  setMode: (mode: DrawerMode) => void;
  close:   () => void;
}

const AdminStationDrawerContext = createContext<AdminStationDrawerContextValue | null>(null);

// A resolved intent's mode arrives as a free string (the binding's action
// intent). Narrow it to a DrawerMode; anything else is treated as 'view' so a
// stray mode opens the safe, read-only tab rather than a broken editor.
function toDrawerMode(mode: string): DrawerMode {
  return mode === 'edit' ? 'edit' : 'view';
}

export function AdminStationDrawerProvider({ children }: { children: ComponentChildren }) {
  const [open, setOpen] = useState<OpenDrawerState | null>(null);

  const openFromIntent = useCallback((intent: ResolvedStationIntent) => {
    // Only drawer-targeted intents with a template key open a drawer.
    if (intent.intent.target !== 'drawer' || !intent.drawerTemplateKey) return;
    setOpen({
      drawerTemplateKey: intent.drawerTemplateKey,
      recordId:          intent.recordId,
      mode:              toDrawerMode(intent.intent.mode),
    });
  }, []);

  const setMode = useCallback((mode: DrawerMode) => {
    setOpen((prev) => (prev ? { ...prev, mode } : prev));
  }, []);

  const close = useCallback(() => setOpen(null), []);

  const value = useMemo<AdminStationDrawerContextValue>(
    () => ({ open, openFromIntent, setMode, close }),
    [open, openFromIntent, setMode, close],
  );

  return <AdminStationDrawerContext.Provider value={value}>{children}</AdminStationDrawerContext.Provider>;
}

export function useAdminStationDrawer(): AdminStationDrawerContextValue {
  const value = useContext(AdminStationDrawerContext);
  if (!value) {
    throw new Error('useAdminStationDrawer must be used within an AdminStationDrawerProvider.');
  }
  return value;
}
