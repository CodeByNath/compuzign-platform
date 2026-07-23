// Station navigation registry — the single source for header and menu rows.

import type { ComponentType } from 'preact';

export interface StationNavItem {
  id: string;
  label: string;
  icon: ComponentType<{ class?: string }>;
  activationKey: string;
  showInHeader: boolean;
  showInMenu: boolean;
  order: number;
}

const registeredNavItems: StationNavItem[] = [];
const registeredNavIds = new Set<string>();

let locked = false;
let resolversReady = false;
let finalizedHeaderNavItems: StationNavItem[] = [];
let finalizedMenuNavItems: StationNavItem[] = [];

function assertRegistrationOpen(): void {
  if (locked) {
    throw new Error('[StationManager] navigation registry is finalized.');
  }
}

function assertResolversReady(): void {
  if (!resolversReady) {
    throw new Error('[StationManager] station registry has not been finalized.');
  }
}

function sortedForNavigation(items: StationNavItem[]): StationNavItem[] {
  return items
    .map((item, registrationOrder) => ({ item, registrationOrder }))
    .sort((a, b) => a.item.order - b.item.order || a.registrationOrder - b.registrationOrder)
    .map(({ item }) => item);
}

export function registerNavItems(items: StationNavItem[]): void {
  assertRegistrationOpen();

  const pendingIds = new Set<string>();
  for (const item of items) {
    if (registeredNavIds.has(item.id) || pendingIds.has(item.id)) {
      throw new Error(`[StationManager] duplicate navigation id '${item.id}'.`);
    }
    pendingIds.add(item.id);
  }

  for (const item of items) {
    registeredNavItems.push(item);
    registeredNavIds.add(item.id);
  }
}

export function headerNavItems(): StationNavItem[] {
  assertResolversReady();
  return finalizedHeaderNavItems;
}

export function menuNavItems(): StationNavItem[] {
  assertResolversReady();
  return finalizedMenuNavItems;
}

/** @internal Finalization is coordinated exclusively by registry/boot.ts. */
export function _finalizeNavigationRegistry(): StationNavItem[] {
  locked = true;
  finalizedHeaderNavItems = sortedForNavigation(
    registeredNavItems.filter((item) => item.showInHeader),
  );
  finalizedMenuNavItems = sortedForNavigation(
    registeredNavItems.filter((item) => item.showInMenu),
  );
  return registeredNavItems;
}

/** @internal Public resolvers open only after every finalize assertion passes. */
export function _enableNavigationResolvers(): void {
  resolversReady = true;
}
