// Application-level state for the Admin Station: the active theme and the active
// destination. It knows nothing about Service, Package, Promotion, or any
// business concern — selecting a destination records which nav item is active
// and resolves it, through the destination resolver, to a StationDestination.
// No page is mounted yet; the resolved destination is the seam the shell regions
// will read once body / presentation / drawer projection is built.

import { createContext } from 'preact';
import { useContext, useState, useMemo, useCallback } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { useStationTheme } from './theme/useStationTheme';
import type { StationTheme } from './theme/useStationTheme';
import { resolveDestination } from './navigation/destinations';
import type { StationDestination } from './navigation/destinations';

export interface AdminStationContextValue {
  theme: StationTheme;
  toggleTheme: () => void;
  activeDestinationId: string | null;
  // activeDestinationId resolved through navigation/destinations.ts. Null when
  // nothing is selected or the key is unmapped — the Body then falls back to
  // Home. Exposing it is the resolver seam, not a mounted surface.
  activeDestination: StationDestination | null;
  navigate: (id: string) => void;
}

const AdminStationContext = createContext<AdminStationContextValue | null>(null);

export function AdminStationProvider({ children }: { children: ComponentChildren }) {
  const { theme, toggleTheme } = useStationTheme();
  const [activeDestinationId, setActiveDestinationId] = useState<string | null>(null);

  const navigate = useCallback((id: string) => setActiveDestinationId(id), []);
  const activeDestination = useMemo(
    () => resolveDestination(activeDestinationId),
    [activeDestinationId],
  );

  const value = useMemo<AdminStationContextValue>(
    () => ({ theme, toggleTheme, activeDestinationId, activeDestination, navigate }),
    [theme, toggleTheme, activeDestinationId, activeDestination, navigate],
  );

  return <AdminStationContext.Provider value={value}>{children}</AdminStationContext.Provider>;
}

export function useAdminStation(): AdminStationContextValue {
  const value = useContext(AdminStationContext);
  if (!value) {
    throw new Error('useAdminStation must be used within an AdminStationProvider.');
  }
  return value;
}
