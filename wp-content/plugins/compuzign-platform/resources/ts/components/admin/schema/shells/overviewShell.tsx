// Overview Shell — archetype renderer (Schema architecture S2, §5).
//
// Receives entity identity (the station's primary module) and lays its
// Content Group out as labelled fields. Modes: Details · Edit (inline) ·
// Connections · Summary — S2 renders Details and Edit; Connections/Summary
// arrive with S3a (ModeContext). In its Connections viewpoint this shell
// will also host related Child Shells (S3a).
//
// Used by: Service Overview (S2) · Tier Overview · Promotion Overview (S3a
// bindings) · future Category / Bundle / Case Study Overview.

import { resolveModeRenderer } from '../elements/modeRenderers';
import { ShellEditFrame, ShellReadFrame } from './shellFrame';
import type { ShellProps } from './shellFrame';

export function OverviewShell<T>({ schema, binding, mode, panelOpen, onTogglePanel, editSession }: ShellProps<T>) {
  if (mode === 'edit') {
    return <ShellEditFrame schema={schema} session={editSession} />;
  }

  const ctx = { loading: binding.state.status === 'loading' };
  const body = (
    <div class="drawerModule__fields">
      {schema.content
        .filter((el) => !el.when || el.when(binding.data))
        .map((el) => {
          const render = resolveModeRenderer(el.element, mode);
          if (!render) return null;   // no renderer for (element, mode) = absent from this viewpoint
          return (
            <div key={el.id} class="drawerModule__field">
              {el.label && <p class="drawerModule__label">{el.label}</p>}
              {render(el.bind(binding.data), ctx)}
            </div>
          );
        })}
    </div>
  );

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
