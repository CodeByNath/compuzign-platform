// Application-level state for the Admin Station: the active theme and the active
// destination. It knows nothing about Service, Package, Promotion, or any
// business concern — selecting a destination only records which nav item is
// active; no page is mounted yet.

import { createContext } from 'preact';
import { useContext, useState, useMemo, useCallback } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { useStationTheme } from './theme/useStationTheme';
import type { StationTheme } from './theme/useStationTheme';

export interface AdminStationContextValue {
  theme: StationTheme;
  toggleTheme: () => void;
  activeDestinationId: string | null;
  navigate: (id: string) => void;
}

const AdminStationContext = createContext<AdminStationContextValue | null>(null);

export function AdminStationProvider({ children }: { children: ComponentChildren }) {
  const { theme, toggleTheme } = useStationTheme();
  const [activeDestinationId, setActiveDestinationId] = useState<string | null>(null);

  const navigate = useCallback((id: string) => setActiveDestinationId(id), []);

  const value = useMemo<AdminStationContextValue>(
    () => ({ theme, toggleTheme, activeDestinationId, navigate }),
    [theme, toggleTheme, activeDestinationId, navigate],
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
