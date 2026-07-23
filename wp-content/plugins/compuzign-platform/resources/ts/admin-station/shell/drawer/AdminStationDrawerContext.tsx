// Admin Station drawer controller — the generic drawer state layer.
//
// It owns exactly one thing: which drawer (if any) is open, over which record,
// in which mode. It is entity-agnostic — it holds a drawer template KEY, never
// an entity — so the shell and controller can drive any registered drawer.
//
// It consumes a ResolvedStationIntent (emitted by a template kit through the
// surface host) and preserves the recordId across mode switches. Closing clears
// the state completely, so no stale intent, record, or mode survives to bleed
// into the next open.

import { createContext } from 'preact';
import type { ComponentChildren } from 'preact';
import { useContext, useState, useMemo, useCallback, useRef } from 'preact/hooks';
import type { ResolvedStationIntent } from '@/station-manager/StationSurfaceHost';
import type { DrawerMode } from '@/station-manager/drawerTypes';
import type { StationRecordId } from '@/station-manager/recordIdentity';

// The open-drawer state. Null when nothing is open. The controller stores the
// record id exactly as the intent delivered it — it is opaque here, never
// parsed or compared, so both native id forms pass through untouched.
export interface OpenDrawerState {
  drawerTemplateKey: string;
  recordId:          StationRecordId;
  mode:              DrawerMode;
}

export interface AdminStationDrawerContextValue {
  open: OpenDrawerState | null;
  // Open (or replace) the drawer from a resolved intent. An intent with no
  // drawer target is ignored — nothing opens. `refetchSurface` is the ORIGINATING
  // wall's refresh handle, remembered for the life of this open.
  openFromIntent: (intent: ResolvedStationIntent, refetchSurface?: () => void) => void;
  // Switch tab without losing identity: only the mode changes; the drawer
  // template and the record's own id are preserved.
  setMode: (mode: DrawerMode) => void;
  close:   () => void;
  // Announce that the open drawer saved its record. Refreshes exactly the wall
  // that opened it — see the note on the handle ref below.
  notifySaved: () => void;
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

  // The refresh handle of the wall that opened the current drawer. Held in a ref,
  // not in state, for two reasons: it is a side-effect handle rather than
  // rendered data (storing it in `open` would make every wall's re-render churn
  // the drawer state), and a save must reach the wall that is actually open now.
  //
  // Targeting is structural: the handle can only be the one the originating wall
  // passed with its own dispatch, so a Package Family save refreshes the Package
  // Family wall and nothing else. There is no broadcast and no registry to
  // mis-key.
  const refetchSurfaceRef = useRef<(() => void) | null>(null);

  const openFromIntent = useCallback((intent: ResolvedStationIntent, refetchSurface?: () => void) => {
    // Only drawer-targeted intents with a template key open a drawer.
    if (intent.intent.target !== 'drawer' || !intent.drawerTemplateKey) return;
    refetchSurfaceRef.current = refetchSurface ?? null;
    setOpen({
      drawerTemplateKey: intent.drawerTemplateKey,
      recordId:          intent.recordId,
      mode:              toDrawerMode(intent.intent.mode),
    });
  }, []);

  const setMode = useCallback((mode: DrawerMode) => {
    setOpen((prev) => (prev ? { ...prev, mode } : prev));
  }, []);

  const close = useCallback(() => {
    // Dropped with the state: a save that resolves after close (a late async
    // response) then refreshes nothing, rather than a wall the user has left.
    refetchSurfaceRef.current = null;
    setOpen(null);
  }, []);

  const notifySaved = useCallback(() => {
    refetchSurfaceRef.current?.();
  }, []);

  const value = useMemo<AdminStationDrawerContextValue>(
    () => ({ open, openFromIntent, setMode, close, notifySaved }),
    [open, openFromIntent, setMode, close, notifySaved],
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
