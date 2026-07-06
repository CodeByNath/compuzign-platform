// Child Shell — archetype renderer (Schema architecture S2/S3a, §5).
//
// Belongs to a parent station and presents child capability data
// (collections, references) as a bare collection body — no field labels.
// Modes: Details · Edit (inline) — the active viewpoint arrives via
// ModeContext (§7). Appears inside the parent Overview's Connections
// placement (manifest phase, S4).
//
// Used by: Service Features · Service FAQs · Tier/Promotion Feature and FAQ
// Refs · future child/reference groups.

import { useShellMode } from '../modeContext';
import { resolveModeRenderer } from '../elements/modeRenderers';
import { ShellEditFrame, ShellReadFrame } from './shellFrame';
import type { ShellProps } from './shellFrame';

export function ChildShell<T>({ schema, binding, panelOpen, onTogglePanel, editSession }: ShellProps<T>) {
  const mode = useShellMode();

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
      mode={mode}
      panelOpen={panelOpen}
      onTogglePanel={onTogglePanel}
      body={body}
    />
  );
}
