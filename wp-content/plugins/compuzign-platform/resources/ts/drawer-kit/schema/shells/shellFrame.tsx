// Internal shared frame for the two shell archetypes (Schema architecture S2).
//
// OverviewShell and ChildShell differ only in how their Content Group is laid
// out (labelled fields vs bare collection body); everything else — header
// identity, status/notification chrome, footer assembly, edit dispatch — is
// this frame, which renders through the existing ReadBlock / InlineEditorShell
// (the shells evolve ReadBlock, per the renderer map §10). Not an archetype:
// archetypes are the two exported shells; this file is their plumbing.

import type { ComponentChildren } from 'preact';
import { ReadBlock } from '../../ReadBlock';
import { InlineEditorShell } from '../../InlineEditorShell';
import type { FooterAction } from '../../ActionFooter';
import { MODULE_ICONS } from '../icons';
import type {
  ShellBinding,
  ShellEditSession,
  ShellMode,
  ShellSchema,
  ShellActionSchema,
} from '../types';

// Common props for both archetype renderers. The active viewpoint comes from
// ModeContext (S3a) — placements wrap their shells in <ModeProvider>; shells
// take no mode prop.
export interface ShellProps<T = unknown> {
  schema:  ShellSchema<T>;
  binding: ShellBinding<T>;
  // Notification-panel view state — surface state owned by the assembling
  // step (one open panel per surface), not DNA and not schema.
  panelOpen?:     boolean;
  onTogglePanel?: () => void;
  // Edit session — required in the `edit` viewpoint (Edit Granularity: the
  // draft envelope is per-module and owned by the step).
  editSession?: ShellEditSession;
  // v1.2 (Collection placement amendment): the placed slot's footer
  // re-selection (ShellSlot.footer) — select-only against the schema's Action
  // Group. Passed by EntityDrawer's PlacedShell and by collection surfaces;
  // absent → the schema's own Footer Group.
  footer?: string[];
}

// Existing related-record shells keep their View-only connections footer.
// A relationship shell without a `view` action (for example a capability
// relationship owned by the open record) uses its own declared actions.
const CONNECTIONS_FOOTER = ['view'];

// Footer Group × Action Group × ShellBinding.handlers → ActionFooter
// descriptors. Ordered by the Footer Group; filtered by each action's
// `when` gate; behaviour arrives exclusively as handlers from the station
// hook / step (a schema declares intent only). An action is disabled while
// it is the one in flight (`binding.busy`) or when no handler was delivered.
function resolveFooterActions<T>(schema: ShellSchema<T>, binding: ShellBinding<T>, mode: ShellMode, footer?: string[]): FooterAction[] {
  const ids = mode === 'connections' && schema.actions.view
    ? CONNECTIONS_FOOTER
    : (footer ?? schema.footer.actions);
  return ids
    .map((id) => schema.actions[id])
    .filter((a): a is ShellActionSchema => !!a && (!a.when || a.when(binding as ShellBinding)))
    .map((a) => ({
      id:       a.id,
      label:    a.label,
      onSelect: binding.handlers[a.id],
      disabled: !binding.handlers[a.id] || binding.busy === a.id,
    }));
}

// Read frame — the canonical `.drawerModule` card. Status and notes render
// exactly as delivered by the DNA (`binding.state`).
export function ShellReadFrame<T>({ schema, binding, mode, panelOpen, onTogglePanel, body, footer }: {
  schema:  ShellSchema<T>;
  binding: ShellBinding<T>;
  mode:    ShellMode;
  panelOpen?:     boolean;
  onTogglePanel?: () => void;
  body: ComponentChildren;
  footer?: string[];   // v1.2 slot-footer re-selection (see ShellProps)
}) {
  return (
    <ReadBlock
      title={schema.header.title}
      subtitle={schema.header.subtitle}
      icon={MODULE_ICONS[schema.header.icon]}
      iconVariant={schema.header.iconVariant}
      scopeClass={schema.header.scopeClass}
      status={binding.state.status}
      notes={binding.state.notes}
      panelOpen={panelOpen}
      onTogglePanel={onTogglePanel}
      actions={resolveFooterActions(schema, binding, mode, footer)}
    >
      {body}
    </ReadBlock>
  );
}

// Edit frame — the module-level inline editor (the existing universal edit
// flow, unchanged). The schema declares which editor renders; the session
// (draft, save/cancel, dirty state) is owned by the assembling step.
export function ShellEditFrame<T>({ schema, session }: {
  schema:   ShellSchema<T>;
  session?: ShellEditSession;
}) {
  if (!schema.editor || !session) return null;
  const editor = schema.editor;
  return (
    <InlineEditorShell
      title={session.title ?? schema.header.title}
      onSave={() => Promise.resolve(session.onSave())}
      onCancel={session.onCancel}
      saving={session.saving}
      saveErr={session.saveErr}
      isDirty={session.isDirty}
      saveDisabled={session.saveDisabled}
    >
      {editor.render(session)}
    </InlineEditorShell>
  );
}
