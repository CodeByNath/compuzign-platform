// Child Shell — archetype renderer (Schema architecture S2, §5).
//
// Belongs to a parent station and presents child capability data
// (collections, references) as a bare collection body — no field labels.
// Modes: Details · Edit (inline). Appears inside the parent Overview's
// Connections placement (S3a).
//
// Used by: Service Features · Service FAQs (S2) · Tier/Promotion Feature and
// FAQ Refs (S3a bindings) · future child/reference groups.

import { resolveModeRenderer } from '../elements/modeRenderers';
import { ShellEditFrame, ShellReadFrame } from './shellFrame';
import type { ShellProps } from './shellFrame';

export function ChildShell<T>({ schema, binding, mode, panelOpen, onTogglePanel, editSession }: ShellProps<T>) {
  if (mode === 'edit') {
    return <ShellEditFrame schema={schema} session={editSession} />;
  }

  const ctx = { loading: binding.state.status === 'loading' };
  const body = schema.content
    .filter((el) => !el.when || el.when(binding.data))
    .map((el) => {
      const render = resolveModeRenderer(el.element, mode);
      if (!render) return null;     // no renderer for (element, mode) = absent from this viewpoint
      return render(el.bind(binding.data), ctx);
    });

  return (
    <ShellReadFrame
      schema={schema}
      binding={binding}
      panelOpen={panelOpen}
      onTogglePanel={onTogglePanel}
      body={body}
    />
  );
}
