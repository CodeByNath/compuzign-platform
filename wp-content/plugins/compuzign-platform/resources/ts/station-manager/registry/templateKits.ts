// Template-kit registry — kit key to its presentation contract implementation.

import type { VNode } from 'preact';
import type { StationRecordId } from '../recordIdentity';

export type StationIntentDispatch = (recordId: StationRecordId, intentId: string) => void;

export interface TemplateKitProps {
  items: unknown[];
  loading: boolean;
  error: string | null;
  onIntent: StationIntentDispatch;
}

export type TemplateKit = (props: TemplateKitProps) => VNode;

const registeredTemplateKits = new Map<string, TemplateKit>();

let locked = false;
let resolversReady = false;
let templateKitIndex = new Map<string, TemplateKit>();

function assertRegistrationOpen(): void {
  if (locked) {
    throw new Error('[StationManager] template-kit registry is finalized.');
  }
}

function assertResolversReady(): void {
  if (!resolversReady) {
    throw new Error('[StationManager] station registry has not been finalized.');
  }
}

export function registerTemplateKits(record: Record<string, TemplateKit>): void {
  assertRegistrationOpen();

  const entries = Object.entries(record);
  for (const [key] of entries) {
    if (registeredTemplateKits.has(key)) {
      throw new Error(`[StationManager] duplicate template-kit key '${key}'.`);
    }
  }

  for (const [key, kit] of entries) {
    registeredTemplateKits.set(key, kit);
  }
}

export function resolveTemplateKit(key: string): TemplateKit {
  assertResolversReady();
  const kit = templateKitIndex.get(key);
  if (!kit) {
    throw new Error(`[StationManager] unknown template kit '${key}'.`);
  }
  return kit;
}

/** @internal Finalization is coordinated exclusively by registry/boot.ts. */
export function _finalizeTemplateKitRegistry(): void {
  locked = true;
  templateKitIndex = new Map(registeredTemplateKits);
}

/** @internal Used by boot assertions before public resolvers are enabled. */
export function _hasRegisteredTemplateKit(key: string): boolean {
  return templateKitIndex.has(key);
}

/** @internal Public resolvers open only after every finalize assertion passes. */
export function _enableTemplateKitResolvers(): void {
  resolversReady = true;
}
