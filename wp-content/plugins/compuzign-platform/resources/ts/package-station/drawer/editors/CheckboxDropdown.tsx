import { useEffect, useRef, useState } from 'preact/hooks';
import { AdminField } from '@/drawer-kit/fields';

export interface CheckboxDropdownOption {
  value: string;
  label: string;
}

interface Props {
  id: string;
  label: string;
  options: readonly CheckboxDropdownOption[];
  selected: readonly string[];
  emptyLabel: string;
  onChange: (selected: string[]) => void;
}

/** A compact multi-select used by Tier Overview and Tier System Overview. */
export function CheckboxDropdown({ id, label, options, selected, emptyLabel, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedSet = new Set(selected);
  const summary = options.filter((option) => selectedSet.has(option.value)).map((option) => option.label).join(', ') || emptyLabel;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const toggle = (value: string, checked: boolean) => {
    onChange(checked
      ? (selectedSet.has(value) ? [...selected] : [...selected, value])
      : selected.filter((current) => current !== value));
  };

  return (
    <div class="cz-tf-field">
      <label class="cz-tf-label" id={`${id}-label`}>{label}</label>
      <div class="cz-checkbox-dropdown" ref={ref}>
        <button
          type="button"
          id={`${id}-trigger`}
          class="cz-tf-control cz-tf-select"
          aria-haspopup="true"
          aria-expanded={open}
          aria-labelledby={`${id}-label ${id}-trigger`}
          onClick={() => setOpen((current) => !current)}
        >
          {summary}
        </button>
        {open && (
          <div class="cz-checkbox-dropdown__panel" role="group" aria-label={label}>
            {options.length === 0 ? (
              <p class="cz-tf-hint">No options are available.</p>
            ) : options.map((option) => (
              <AdminField
                key={option.value}
                def={{ id: `${id}-${option.value}`, type: 'checkbox', label: option.label }}
                value={selectedSet.has(option.value)}
                onChange={(checked: boolean) => toggle(option.value, checked)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
