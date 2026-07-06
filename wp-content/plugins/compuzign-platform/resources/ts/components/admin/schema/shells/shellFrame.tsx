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

// Common props for both archetype renderers. `mode` is a prop until S3a
// introduces ModeContext; S2 surfaces render 'details' and 'edit'.
export interface ShellProps<T = unknown> {
  schema:  ShellSchema<T>;
  binding: ShellBinding<T>;
  mode:    ShellMode;
  // Notification-panel view state — surface state owned by the assembling
  // step (one open panel per surface), not DNA and not schema.
  panelOpen?:     boolean;
  onTogglePanel?: () => void;
  // Edit session — required when mode === 'edit' (Edit Granularity: the
  // draft envelope is per-module and owned by the step).
  editSession?: ShellEditSession;
}

// Footer Group × Action Group × ShellBinding.handlers → ActionFooter
// descriptors. Ordered by the Footer Group; filtered by each action's
// `when` gate; behaviour arrives exclusively as handlers from the station
// hook / step (a schema declares intent only).
function resolveFooterActions<T>(schema: ShellSchema<T>, binding: ShellBinding<T>): FooterAction[] {
  return schema.footer.actions
    .map((id) => schema.actions[id])
    .filter((a): a is ShellActionSchema => !!a && (!a.when || a.when(binding as ShellBinding)))
    .map((a) => ({
      id:       a.id,
      label:    a.label,
      onSelect: binding.handlers[a.id],
      disabled: !binding.handlers[a.id],
    }));
}

// Read frame — the canonical `.drawerModule` card. Status and notes render
// exactly as delivered by the DNA (`binding.state`); the count is suppressed
// while the authoritative detail is loading, matching the S1 cards.
export function ShellReadFrame<T>({ schema, binding, panelOpen, onTogglePanel, body }: {
  schema:  ShellSchema<T>;
  binding: ShellBinding<T>;
  panelOpen?:     boolean;
  onTogglePanel?: () => void;
  body: ComponentChildren;
}) {
  const loading = binding.state.status === 'loading';
  const count   = loading ? undefined : schema.header.count?.(binding.data) ?? undefined;
  return (
    <ReadBlock
      title={schema.header.title}
      subtitle={schema.header.subtitle}
      icon={MODULE_ICONS[schema.header.icon]}
      iconVariant={schema.header.iconVariant}
      scopeClass={schema.header.scopeClass}
      count={count}
      status={binding.state.status}
      notes={binding.state.notes}
      panelOpen={panelOpen}
      onTogglePanel={onTogglePanel}
      actions={resolveFooterActions(schema, binding)}
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
      title={schema.header.title}
      onSave={() => Promise.resolve(session.onSave())}
      onCancel={session.onCancel}
      saving={session.saving}
      saveErr={session.saveErr}
      isDirty={session.isDirty}
    >
      {editor.render(session)}
    </InlineEditorShell>
  );
}
