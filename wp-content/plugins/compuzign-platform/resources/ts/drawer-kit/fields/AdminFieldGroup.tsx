import type { ComponentChildren } from 'preact';
import type { AdminFieldDef } from './types';

// The field shell: wrapper, label, control, hint, error.
//
// Every Admin drawer field renders through this, so the order of the parts and
// the association between label and control are decided once, here. A checkbox
// reads control-then-label on one row, because the box is the subject and the
// label describes it; every other type reads label-above-control. That is the
// only structural variation, and it is one row element inside the same wrapper
// — not a second field layout.
//
// Hint and error always follow the control, at wrapper level, so they read the
// same way for every type including the checkbox.

interface Props {
  def: AdminFieldDef;
  children: ComponentChildren;
}

export function AdminFieldGroup({ def, children }: Props) {
  const labelClass = `cz-tf-label${def.required ? ' cz-tf-label--required' : ''}`;
  const label = (
    <label class={labelClass} for={def.id}>
      {def.label}
    </label>
  );

  return (
    <div class="cz-tf-field">
      {def.type === 'checkbox' ? (
        <div class="cz-tf-field__inline">
          {children}
          {label}
        </div>
      ) : (
        <>
          {label}
          {children}
        </>
      )}
      {def.hint && <p class="cz-tf-hint">{def.hint}</p>}
      {def.error && <p class="cz-tf-error">{def.error}</p>}
    </div>
  );
}
