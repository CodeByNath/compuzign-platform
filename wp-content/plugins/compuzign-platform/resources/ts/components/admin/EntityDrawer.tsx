// EntityDrawer — manifest-driven drawer body assembly (Schema architecture S4).
//
// Consumes `EntitySchema.placements.drawer` and assembles the drawer body:
// the Drawer Tab Contract bar (DrawerTabs — fixed Details | Connections,
// renderer-encoded, never configurable) and, per tab, the placement group's
// ShellSlots rendered through the two archetype renderers in each slot's
// viewpoint. Replaces the per-step tab state and hand-assembled drawer
// bodies in the three station drawers.
//
// What stays with the assembling step (surface state / DNA, never schema):
// - ShellBindings — Station DNA delivered by the station hooks at render time
// - edit-mode overlays — the per-module edit session is step-owned (Edit
//   Granularity, locked) and renders outside the drawer body
// - bespoke non-shell tail content (pricing summaries, save feedback,
//   commercial blocks pending DNA) via the per-tab `trailing` slots — surface
//   content, out of schema, the same boundary S3b drew for table selection
// - step chrome (confirm modals) via `children`, kept inside the body wrapper
//   so the DOM structure of the migrated drawers is unchanged.

import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { DrawerTabs } from './DrawerTabs';
import type { DrawerBaseTabId, DrawerTabId } from './DrawerTabs';
import { ModeProvider } from './schema/modeContext';
import { OverviewShell } from './schema/shells/overviewShell';
import { ChildShell } from './schema/shells/childShell';
import type { EntitySchema, ShellBinding, ShellSlot } from './schema/types';

export interface EntityDrawerProps<T extends DrawerTabId = DrawerBaseTabId> {
  entity: EntitySchema;
  // Station DNA per module key. A slot whose binding was not delivered
  // renders nothing — the module is not available on this surface.
  bindings: Record<string, ShellBinding<any> | undefined>;
  // Tab state: pass both to control it (a step whose footer gates on the
  // active tab); omit and the drawer owns it — reset by remounting via `key`.
  tab?:         T;
  onSelectTab?: (tab: T) => void;
  showManager?: boolean;
  // Manager is station-level infrastructure and deliberately lives outside
  // EntitySchema placements and shell assembly.
  managerContent?: ComponentChildren;
  // Single-open notification-panel accordion, keyed by module key.
  openPanel?:     string | null;
  onTogglePanel?: (module: string) => void;
  // Bespoke non-shell tail content per tab (surface content, not schema).
  trailing?: Partial<Record<DrawerBaseTabId, ComponentChildren>>;
  // Step-owned chrome rendered inside the body wrapper after the tab content.
  children?: ComponentChildren;
}

// One placed shell: the manifest resolves the slot's module key to a
// ShellSchema; the archetype picks the renderer; the slot's mode is provided
// as the viewpoint (§7 — placements decide the mode, shells never branch).
function PlacedShell({ entity, slot, binding, panelOpen, onTogglePanel }: {
  entity:  EntitySchema;
  slot:    ShellSlot;
  binding: ShellBinding<any> | undefined;
  panelOpen:      boolean;
  onTogglePanel?: () => void;
}) {
  const schema = entity.shells[slot.module];
  if (!schema || !binding) return null;
  const Shell = schema.archetype === 'overview' ? OverviewShell : ChildShell;
  return (
    <ModeProvider mode={slot.mode}>
      <Shell
        schema={schema}
        binding={binding}
        panelOpen={panelOpen}
        onTogglePanel={onTogglePanel}
        footer={slot.footer}
      />
    </ModeProvider>
  );
}

export function EntityDrawer<T extends DrawerTabId = DrawerBaseTabId>({
  entity, bindings, tab, onSelectTab, showManager = false, managerContent,
  openPanel, onTogglePanel, trailing, children,
}: EntityDrawerProps<T>) {
  const [internalTab, setInternalTab] = useState<DrawerTabId>('details');
  const activeTab: DrawerTabId = tab ?? internalTab;
  const selectTab = (nextTab: DrawerTabId) => {
    if (onSelectTab) onSelectTab(nextTab as T);
    else setInternalTab(nextTab);
  };

  const baseTab = activeTab === 'manager' ? null : activeTab;
  const slots = baseTab ? entity.placements.drawer?.[baseTab] ?? [] : [];

  return (
    <div class="cz-req-detail">
      <DrawerTabs active={activeTab} onSelect={selectTab} showManager={showManager} />

      {slots.map((slot) => (
        <PlacedShell
          key={`${activeTab}:${slot.module}`}
          entity={entity}
          slot={slot}
          binding={bindings[slot.module]}
          panelOpen={openPanel === slot.module}
          onTogglePanel={onTogglePanel ? () => onTogglePanel(slot.module) : undefined}
        />
      ))}

      {baseTab && trailing?.[baseTab]}
      {activeTab === 'manager' && showManager && managerContent}
      {children}
    </div>
  );
}
