// A multi-select trigger + floating checklist panel — not an AdminFieldType
// (the field system's own boundary reserves that union for ordinary
// metadata fields; a picker over a candidate pool "stays a dedicated
// component" per fields/types.ts). Extracted from Tier Overview's Customer
// Groups picker, its first consumer, once the Tier system Rate Sheet Access
// editor needed the exact same trigger/panel/checklist shape — the
// Abstraction Evidence bar (two genuine consumers, same semantics) that
// justifies a shared component rather than a second hand-rolled copy.
//
// The panel opens downward by default and flips upward only once it has
// actually rendered and been measured against the trigger's own position —
// whichever side the viewport has room for, rather than always downward.

import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { AdminField } from './AdminField';

export interface MultiSelectFieldOption {
  value: string;
  label: string;
  children?: MultiSelectFieldOption[];
}

interface Props {
  id: string;
  label: string;
  options: MultiSelectFieldOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Shown on the trigger when nothing is selected. */
  emptyLabel?: string;
  /** Shown inside the panel when there are no candidate options at all. */
  noOptionsMessage?: string;
}

export function MultiSelectField({
  id, label, options, selected, onChange,
  emptyLabel = 'None selected', noOptionsMessage = 'Nothing available yet.',
}: Props) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // Measured after the panel's first (downward) render, before paint — flips
  // to upward only when there is not enough room below AND more room above,
  // so a panel near the middle of the viewport keeps its default direction.
  useLayoutEffect(() => {
    if (!open) { setOpenUp(false); return; }
    const trigger = rootRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;
    const triggerRect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    setOpenUp(panel.offsetHeight > spaceBelow && spaceAbove > spaceBelow);
  }, [open]);

  const toggle = (option: MultiSelectFieldOption, checked: boolean, parent?: MultiSelectFieldOption) => {
    if (checked) {
      onChange([...new Set([...selected, ...(parent ? [parent.value] : []), option.value])]);
      return;
    }
    const removed = new Set([option.value, ...(option.children ?? []).map((child) => child.value)]);
    onChange(selected.filter((value) => !removed.has(value)));
  };
  const summary = selected.length === 0
    ? emptyLabel
    : options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(', ');
  const triggerId = `${id}-trigger`;
  const labelId = `${id}-label`;

  return (
    <div class="cz-tf-field">
      <label class="cz-tf-label" id={labelId}>{label}</label>
      <div class="cz-multiselect" ref={rootRef}>
        <button
          type="button"
          id={triggerId}
          class="cz-tf-control cz-tf-select cz-multiselect__trigger"
          aria-haspopup="true"
          aria-expanded={open}
          aria-labelledby={`${labelId} ${triggerId}`}
          onClick={() => setOpen((current) => !current)}
        >
          {summary}
        </button>
        {open && (
          <div
            ref={panelRef}
            class={`cz-multiselect__panel${openUp ? ' cz-multiselect__panel--up' : ''}`}
            role="group"
            aria-label={label}
          >
            {options.length === 0
              ? <p class="cz-tf-hint">{noOptionsMessage}</p>
              : options.map((option) => (
                <div class="cz-multiselect__option" key={option.value}>
                  <AdminField
                    def={{ id: `${id}-${option.value}`, type: 'checkbox', label: option.label }}
                    value={selected.includes(option.value)}
                    onChange={(checked: boolean) => toggle(option, checked)}
                  />
                  {(option.children?.length ?? 0) > 0 && (
                    <div class="cz-multiselect__children">
                      {option.children?.map((child) => (
                        <AdminField
                          key={child.value}
                          def={{ id: `${id}-${child.value}`, type: 'checkbox', label: child.label }}
                          value={selected.includes(child.value)}
                          onChange={(checked: boolean) => toggle(child, checked, option)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
