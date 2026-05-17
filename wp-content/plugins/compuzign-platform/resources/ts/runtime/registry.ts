// Module registry — the single source of truth for all mountable frontend modules.
// Each module declares what it is (id + component) and where it should mount
// (one or more ordered conditions). The registry resolves conditions and
// delegates rendering to the mount layer.
//
// Usage:
//   import { registry } from '@/runtime/registry';
//   registry.register({ id: 'cost-builder', component: CostBuilderApp, conditions: [...] });

import type { ComponentType } from 'preact';
import type { MountCondition } from './conditions';
import { resolveCondition } from './conditions';
import { mountOnReady } from './mount';

export interface ModuleDefinition {
  // Unique module identifier — used for deduplication warnings.
  id: string;
  // The root Preact component. Must accept no required props.
  component: ComponentType;
  // Ordered list of mount conditions. First resolved condition wins.
  conditions: MountCondition[];
}

class ModuleRegistry {
  private readonly registered = new Map<string, ModuleDefinition>();

  register(definition: ModuleDefinition): void {
    if (this.registered.has(definition.id)) {
      console.warn(`[CompuZign] Module "${definition.id}" is already registered. Skipping.`);
      return;
    }

    this.registered.set(definition.id, definition);
    this.tryMount(definition);
  }

  private tryMount(definition: ModuleDefinition): void {
    for (const condition of definition.conditions) {
      const element = resolveCondition(condition);
      if (element) {
        mountOnReady(definition.component, element);
        return; // first resolved condition wins
      }
    }
    // No condition resolved on this page — module does not mount here.
  }
}

// Singleton registry shared across all modules within the same bundle.
export const registry = new ModuleRegistry();
