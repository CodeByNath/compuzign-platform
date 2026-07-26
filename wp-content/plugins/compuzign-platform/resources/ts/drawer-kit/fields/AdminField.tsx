import { AdminFieldGroup } from './AdminFieldGroup';
import { fieldControlClass, fieldInputType } from './types';
import type { AdminFieldDef, AdminFieldType } from './types';

// The one component that renders an Admin drawer field.
//
// It is the only place that decides which element a field type gets, which
// classes it carries, and how a state reaches the DOM. An editor that renders
// its own `<div class="cz-tf-field"><label…><input…>` bypasses that single
// decision, which is how the parallel control families appeared in the first
// place — and how a textarea once shipped wearing the input class.
//
// The eight types collapse to three elements: <input> for text, number, email,
// tel, search and checkbox; <select> for select; <textarea> for textarea. What
// separates them visually comes from the shared control base and its modifiers,
// never from styling authored at the call site.
//
// Validation state is reported, not decided: `error` drives both the invalid
// presentation and `aria-invalid`, so the two cannot disagree, while whether a
// field is invalid remains the owning controller's judgement.

type CheckboxDef = AdminFieldDef & { type: 'checkbox' };
type ValueDef = AdminFieldDef & { type: Exclude<AdminFieldType, 'checkbox'> };

export type AdminFieldProps =
  | { def: CheckboxDef; value: boolean; onChange: (next: boolean) => void }
  | { def: ValueDef; value: string; onChange: (next: string) => void };

function isCheckbox(props: AdminFieldProps): props is Extract<AdminFieldProps, { value: boolean }> {
  return props.def.type === 'checkbox';
}

/** The attributes every control carries, whatever element it renders as. */
function commonProps(def: AdminFieldDef) {
  return {
    id: def.id,
    disabled: def.disabled,
    required: def.required,
    'aria-invalid': def.error ? ('true' as const) : undefined,
    'aria-label': def.ariaLabel,
  };
}

export function AdminField(props: AdminFieldProps) {
  const { def } = props;
  const common = commonProps(def);

  if (isCheckbox(props)) {
    return (
      <AdminFieldGroup def={def}>
        <input
          {...common}
          type="checkbox"
          class={fieldControlClass(def)}
          checked={props.value}
          onChange={(e) => props.onChange((e.target as HTMLInputElement).checked)}
        />
      </AdminFieldGroup>
    );
  }

  const { value, onChange } = props;

  if (def.type === 'select') {
    return (
      <AdminFieldGroup def={def}>
        <select
          {...common}
          class={fieldControlClass(def, value === '')}
          value={value}
          onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
        >
          {def.unsetLabel !== undefined && <option value="">{def.unsetLabel}</option>}
          {(def.options ?? []).map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      </AdminFieldGroup>
    );
  }

  if (def.type === 'textarea') {
    return (
      <AdminFieldGroup def={def}>
        <textarea
          {...common}
          class={fieldControlClass(def)}
          rows={def.rows}
          placeholder={def.placeholder}
          readOnly={def.readonly}
          value={value}
          onInput={(e) => onChange((e.target as HTMLTextAreaElement).value)}
        />
      </AdminFieldGroup>
    );
  }

  return (
    <AdminFieldGroup def={def}>
      <input
        {...common}
        type={fieldInputType(def.type)}
        class={fieldControlClass(def)}
        placeholder={def.placeholder}
        readOnly={def.readonly}
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
      />
    </AdminFieldGroup>
  );
}
