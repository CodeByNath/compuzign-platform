// PlacedShell — resolves one placement slot to a rendered shell.
//
// Extracted unchanged from EntityDrawer.tsx (drawer refinement blueprint,
// Phase 2) so a drawer composition that stops using EntityDrawer's own
// Details/Connections tab bar can still render each shell through the exact
// module-editing-lock / ModeProvider-viewpoint / notification-panel wiring
// EntityDrawer itself relies on, instead of re-deriving equivalent logic.
// EntityDrawer.tsx imports this back and is otherwise unchanged — every
// other drawer (Service, Category, Package Family) keeps rendering through
// it with no behavioural difference.
//
// The manifest resolves the slot's module key to a ShellSchema; the
// archetype picks the renderer; the slot's mode is provided as the
// viewpoint (§7 — placements decide the mode, shells never branch).

import { ModeProvider } from './schema/modeContext';
import { OverviewShell } from './schema/shells/overviewShell';
import { ChildShell } from './schema/shells/childShell';
import type { EntitySchema, ShellBinding, ShellSlot } from './schema/types';
import type { EntityDrawerEditingModule } from './EntityDrawer';

export function PlacedShell({ entity, slot, binding, panelOpen, onTogglePanel, editing }: {
  entity:  EntitySchema;
  slot:    ShellSlot;
  binding: ShellBinding<any> | undefined;
  panelOpen:      boolean;
  onTogglePanel?: () => void;
  editing?: EntityDrawerEditingModule | null;
}) {
  const schema = entity.shells[slot.module];
  if (!schema || !binding) return null;
  const Shell = schema.archetype === 'overview' ? OverviewShell : ChildShell;
  const isEditing = editing?.module === slot.module;
  return (
    <ModeProvider mode={isEditing ? 'edit' : slot.mode}>
      <Shell
        schema={schema}
        binding={binding}
        panelOpen={panelOpen}
        onTogglePanel={onTogglePanel}
        footer={slot.footer}
        editSession={isEditing ? editing.session : undefined}
      />
    </ModeProvider>
  );
}
