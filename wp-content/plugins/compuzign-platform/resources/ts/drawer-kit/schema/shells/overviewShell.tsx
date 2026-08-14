// Overview Shell — archetype renderer (Schema architecture S2/S3a, §5).
//
// Receives entity identity (the station's primary module) and lays its
// Content Group out as labelled fields. Modes: Details · Edit (inline) ·
// Connections · Summary — the active viewpoint arrives via ModeContext (§7);
// placements decide it, the shell never branches on hand-rolled mode props.
// Hosting related Child Shells inside the Connections viewpoint arrives with
// the manifest phase (S4).
//
// Used by: Service Overview · Tier Overview · Promotion Overview · Package
// Summary · future Category / Bundle / Case Study Overview.

import { useShellMode } from '../modeContext';
import { resolveModeRenderer } from '../elements/modeRenderers';
import { ShellEditFrame, ShellReadFrame } from './shellFrame';
import type { ShellProps } from './shellFrame';

export function OverviewShell<T>({ schema, binding, panelOpen, onTogglePanel, editSession, footer }: ShellProps<T>) {
  const mode = useShellMode();

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
            <div key={el.id} class="drawerModule__field" data-field-id={el.id}>
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
      mode={mode}
      panelOpen={panelOpen}
      onTogglePanel={onTogglePanel}
      body={body}
      footer={footer}
    />
  );
}
