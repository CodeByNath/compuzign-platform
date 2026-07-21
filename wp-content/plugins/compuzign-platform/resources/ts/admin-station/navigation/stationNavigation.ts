// Admin Station navigation definition — a new source, local to the new tree.
//
// It is the single origin for both the Header navigation pills and the slide
// menu, so the two can never drift. It deliberately does NOT import or reuse the
// old entity registry, the old station registry, the Station Manager
// registry, relation providers, or any old admin navigation state.
//
// Navigation selects the active station. AdminStationBody resolves that station's
// ordered presentation composition; some destination metadata remains declarative
// or reserved.

import type { ComponentType } from 'preact';
import { ServicesIcon, PackagesIcon, PromotionsIcon } from '../shell/icons';

export interface StationNavItem {
  // Stable identifier and active-destination key.
  id: string;
  // Human-readable label used by both surfaces.
  label: string;
  // Glyph from the Admin Station icon set (repository SVG icon system).
  icon: ComponentType<{ class?: string }>;
  // Target / activation key. Reserved for future routing; selecting an item sets
  // this as the active destination for AdminStationBody to resolve.
  activationKey: string;
  // Whether the item appears as a Header pill.
  showInHeader: boolean;
  // Whether the item appears in the slide menu.
  showInMenu: boolean;
  // Sort order within each surface.
  order: number;
}

export const stationNavItems: StationNavItem[] = [
  {
    id: 'services',
    label: 'Services',
    icon: ServicesIcon,
    activationKey: 'services',
    showInHeader: true,
    showInMenu: true,
    order: 10,
  },
  {
    id: 'packages',
    label: 'Packages',
    icon: PackagesIcon,
    activationKey: 'packages',
    showInHeader: true,
    showInMenu: true,
    order: 20,
  },
  {
    id: 'promotions',
    label: 'Promotions',
    icon: PromotionsIcon,
    activationKey: 'promotions',
    showInHeader: true,
    showInMenu: true,
    order: 30,
  },
];

const byOrder = (a: StationNavItem, b: StationNavItem) => a.order - b.order;

export const headerNavItems = stationNavItems.filter((item) => item.showInHeader).sort(byOrder);
export const menuNavItems = stationNavItems.filter((item) => item.showInMenu).sort(byOrder);
