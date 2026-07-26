// The Admin drawer field contract.
//
// One definition shape describes every ordinary Admin metadata field. The eight
// types below are the complete set actually rendered inside Admin Station,
// verified against every <input>, <select> and <textarea> in the drawer and
// editor trees: text, number, search, select, textarea and checkbox are in live
// use; email and tel are native, cost nothing, and complete the set. No date,
// radio, file, range, colour or password control exists in Admin Station, and
// none should be added here speculatively.
//
// Anything that is NOT an ordinary metadata field — the Rate Sheet grid, the
// inclusion pool, relationship pickers, repeatable collections — stays a
// dedicated component. Those keep their own layout and consume these controls;
// they are not expressed as field definitions.

export type AdminFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'tel'
  | 'search'
  | 'select'
  | 'textarea'
  | 'checkbox';

export type AdminFieldSize = 'small' | 'default' | 'large';

export interface AdminFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface AdminFieldDef {
  /** DOM id. Also the label's `for`, so the pair is always associated. */
  id: string;
  type: AdminFieldType;
  label: string;
  /** Omitted means 'default', which is the unmodified control base. */
  size?: AdminFieldSize;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  /**
   * Validation state. Presence drives both the invalid presentation and
   * `aria-invalid`, so the two can never disagree. Validation itself stays with
   * the owning station's controller — this field only reports its outcome.
   */
  error?: string | null;
  /** Marks a control that names an active scope rather than holding data. */
  accent?: boolean;
  /** select only. */
  options?: AdminFieldOption[];
  /** select only — the label shown when the bound value is empty. */
  unsetLabel?: string;
  /** textarea only. */
  rows?: number;
  /** number only. */
  min?: number;
  max?: number;
  step?: number;
  /** Escape hatch for genuine one-off layout, e.g. a cell-width constraint. */
  className?: string;
  /** Accessible name when the visible label is carried by a column header. */
  ariaLabel?: string;
}

/**
 * Binding is deliberately separate from the definition, so a definition can be
 * a static constant while the value lives in the owning controller's draft.
 * Checkbox fields bind a boolean; every other type binds a string.
 */
export interface AdminFieldBinding<V = string> {
  value: V;
  onChange: (next: V) => void;
}

const SIZE_CLASS: Record<AdminFieldSize, string> = {
  small: ' cz-tf-control--sm',
  default: '',
  large: ' cz-tf-control--lg',
};

const TYPE_CLASS: Record<AdminFieldType, string> = {
  text: 'cz-tf-input',
  number: 'cz-tf-input',
  email: 'cz-tf-input',
  tel: 'cz-tf-input',
  search: 'cz-tf-input',
  select: 'cz-tf-select',
  textarea: 'cz-tf-textarea',
  checkbox: 'cz-tf-checkbox',
};

/** The native `type` attribute for the types that render an <input>. */
const INPUT_TYPE: Partial<Record<AdminFieldType, string>> = {
  text: 'text',
  number: 'number',
  email: 'email',
  tel: 'tel',
  search: 'search',
  checkbox: 'checkbox',
};

export function fieldInputType(type: AdminFieldType): string | undefined {
  return INPUT_TYPE[type];
}

/**
 * The single place that turns a definition into control classes. The seven
 * value types carry the shared control base plus their own specialisation, and
 * size is one modifier on that base — never a separate family.
 *
 * The checkbox is the one type that does NOT take the base. The base sets
 * `appearance: none` so a select can carry its own chevron and an input can
 * carry a station-shaped border; applied to a checkbox that erases the native
 * tick and leaves an empty square. A checkbox is a box, not a field surface:
 * it takes `.cz-tf-checkbox`, which sizes it and hands the tick to
 * `accent-color`, and it inherits the shared disabled and focus states from
 * the rules that name it explicitly.
 */
export function fieldControlClass(def: AdminFieldDef, isUnset = false): string {
  const extra = def.className ? ` ${def.className}` : '';
  if (def.type === 'checkbox') {
    return `${TYPE_CLASS.checkbox}${extra}`;
  }
  const size = SIZE_CLASS[def.size ?? 'default'];
  const accent = def.accent ? ' cz-tf-control--accent' : '';
  const unset = def.type === 'select' && isUnset ? ' cz-tf-select--unset' : '';
  return `cz-tf-control ${TYPE_CLASS[def.type]}${size}${accent}${unset}${extra}`;
}
