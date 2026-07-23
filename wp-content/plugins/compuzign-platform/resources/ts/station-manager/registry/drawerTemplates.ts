// Drawer-template registry — drawer key to its owning Station's host contract.

import type { DrawerTemplateRegistration } from '../drawerTypes';

export type {
  DrawerMode,
  DrawerTemplateKey,
  DrawerContentProps,
  DrawerContent,
  DrawerTemplateRegistration,
} from '../drawerTypes';

const registeredDrawerTemplates = new Map<string, DrawerTemplateRegistration>();

let locked = false;
let resolversReady = false;
let drawerTemplateIndex = new Map<string, DrawerTemplateRegistration>();

function assertRegistrationOpen(): void {
  if (locked) {
    throw new Error('[StationManager] drawer-template registry is finalized.');
  }
}

function assertResolversReady(): void {
  if (!resolversReady) {
    throw new Error('[StationManager] station registry has not been finalized.');
  }
}

export function registerDrawerTemplates(list: DrawerTemplateRegistration[]): void {
  assertRegistrationOpen();

  const pendingKeys = new Set<string>();
  for (const registration of list) {
    if (
      registeredDrawerTemplates.has(registration.key)
      || pendingKeys.has(registration.key)
    ) {
      throw new Error(`[StationManager] duplicate drawer-template key '${registration.key}'.`);
    }
    if (registration.supportedModes.length === 0) {
      throw new Error(
        `[AdminStation] drawer template registry is malformed — '${registration.key}' supports no modes.`,
      );
    }
    pendingKeys.add(registration.key);
  }

  for (const registration of list) {
    registeredDrawerTemplates.set(registration.key, registration);
  }
}

export function resolveDrawerTemplate(
  key: string | null | undefined,
): DrawerTemplateRegistration | null {
  assertResolversReady();
  if (!key) return null;
  return drawerTemplateIndex.get(key) ?? null;
}

/** @internal Finalization is coordinated exclusively by registry/boot.ts. */
export function _finalizeDrawerTemplateRegistry(): void {
  locked = true;
  drawerTemplateIndex = new Map(registeredDrawerTemplates);
}

/** @internal Public resolvers open only after every finalize assertion passes. */
export function _enableDrawerTemplateResolvers(): void {
  resolversReady = true;
}
