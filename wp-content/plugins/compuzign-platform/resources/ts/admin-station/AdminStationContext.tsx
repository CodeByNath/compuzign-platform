// Application-level state for the Admin Station. Owns navigation (the active
// destination) and responsive sidebar state. It deliberately knows nothing
// about Service, Package, Tier, Promotion, or pricing — business surfaces read
// only what they need through the navigation API.

import { createContext } from 'preact';
import { useContext, useState, useMemo, useCallback } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { defaultDestinationId, findDestination } from './AdminStationRegistry';
import type { AdminStationDestination } from './AdminStationRegistry';

export interface AdminStationContextValue {
  // Navigation.
  activeDestinationId: string;
  activeDestination: AdminStationDestination | undefined;
  navigate: (id: string) => void;

  // Responsive sidebar state. `collapsed` is the persistent rail width on wide
  // displays; `mobileOpen` is the overlay drawer used on narrow displays.
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const AdminStationContext = createContext<AdminStationContextValue | null>(null);

export function AdminStationProvider({ children }: { children: ComponentChildren }) {
  const [activeDestinationId, setActiveDestinationId] = useState<string>(defaultDestinationId);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = useCallback((id: string) => {
    // Unknown destinations fall back to the default rather than mounting an
    // empty outlet. Navigating always dismisses the mobile drawer.
    setActiveDestinationId(findDestination(id) ? id : defaultDestinationId);
    setMobileOpen(false);
  }, []);

  const toggleCollapsed = useCallback(() => setCollapsed((value) => !value), []);

  const value = useMemo<AdminStationContextValue>(() => ({
    activeDestinationId,
    activeDestination: findDestination(activeDestinationId),
    navigate,
    collapsed,
    toggleCollapsed,
    mobileOpen,
    setMobileOpen,
  }), [activeDestinationId, navigate, collapsed, toggleCollapsed, mobileOpen]);

  return (
    <AdminStationContext.Provider value={value}>
      {children}
    </AdminStationContext.Provider>
  );
}

export function useAdminStation(): AdminStationContextValue {
  const value = useContext(AdminStationContext);
  if (!value) {
    throw new Error('useAdminStation must be used within an AdminStationProvider.');
  }
  return value;
}
