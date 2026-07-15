// Admin Station navigation registry — the single source of truth for the new
// administration environment's destinations. It drives BOTH the sidebar
// navigation and the routed outlet, so navigation and routing can never drift
// into two competing systems.
//
// A destination only belongs in this list when its new implementation is ready.
// New business areas (Service Catalogue, Package Manager, …) are added here one
// at a time as they are rebuilt inside the Admin Station.

import type { ComponentType } from 'preact';
import { HomeIcon } from './shell/icons';
import { AdminStationHome } from './surfaces/AdminStationHome';

export interface AdminStationDestination {
  // Stable identifier — used as the active-destination key and React key.
  id: string;
  // Human-readable label shown in the sidebar.
  label: string;
  // Location path. Reserved for future deep-linking; the current outlet
  // resolves by `id`, but paths are kept stable so URLs can be introduced
  // without renumbering destinations.
  path: string;
  // Sidebar icon.
  icon: ComponentType;
  // The surface mounted into the Body when this destination is active.
  component: ComponentType;
}

export const adminStationDestinations: AdminStationDestination[] = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: HomeIcon,
    component: AdminStationHome,
  },
];

// The destination shown on first load and whenever an unknown destination is
// requested.
export const defaultDestinationId = adminStationDestinations[0].id;

export function findDestination(id: string): AdminStationDestination | undefined {
  return adminStationDestinations.find((destination) => destination.id === id);
}
