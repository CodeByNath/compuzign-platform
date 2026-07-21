// Tier Workspace Engine — the Package Family navigation (Row 2, right).
//
// The narrower lower panel: a compact vertical selector over the REAL Package
// Family collection (KAIROS, APTOS, OMNIA, and any future family from the data
// source). Choosing a family is transient, local view state owned by the
// orchestrator — it re-scopes the projected Tier cards and the summary and
// writes nothing.
//
// Real semantics, not a faked radio look: the list is a `radiogroup` and each
// option is a `<button role="radio">` with `aria-checked`. Selection is
// keyboard-driven per the WAI-ARIA radio-group pattern — a single tab stop
// (roving tabindex) with Arrow/Home/End moving AND selecting. The small mark is
// decorative (`aria-hidden`); the button's `aria-checked` is the source of truth.

import { useCallback, useRef } from 'preact/hooks';
import type { VNode } from 'preact';

/** The minimal shape the selector needs — the workspace family scope satisfies it. */
export interface FamilyNavItem {
  id: string;
  name: string;
  description: string;
}

interface Props {
  families: FamilyNavItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PackageFamilyNavigation({ families, selectedId, onSelect }: Props): VNode {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow/Home/End move focus AND selection together — the radio-group pattern,
  // where the focused radio is the checked one. Horizontal keys are honoured too
  // so the control is forgiving of either mental model in a vertical list.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent, index: number) => {
      if (families.length === 0) return;
      let next: number | null = null;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        next = (index + 1) % families.length;
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        next = (index - 1 + families.length) % families.length;
      } else if (event.key === 'Home') {
        next = 0;
      } else if (event.key === 'End') {
        next = families.length - 1;
      }
      if (next !== null) {
        event.preventDefault();
        onSelect(families[next].id);
        optionRefs.current[next]?.focus();
      }
    },
    [families, onSelect],
  );

  return (
    <section class="cz-tier-workspace__nav" aria-label="Package Family navigation">
      <p class="cz-tier-workspace__panel-title">Package Family</p>

      <div class="cz-tier-workspace__nav-list" role="radiogroup" aria-label="Select a Package Family">
        {families.map((family, index) => {
          const selected = family.id === selectedId;
          // One tab stop: the checked option, or the first when nothing is chosen
          // yet, so the group is entered once and then navigated by arrow keys.
          const isTabStop = selected || (selectedId === null && index === 0);
          return (
            <button
              key={family.id}
              ref={(el) => { optionRefs.current[index] = el; }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={isTabStop ? 0 : -1}
              class={`cz-tier-workspace__nav-option${selected ? ' cz-tier-workspace__nav-option--selected' : ''}`}
              onClick={() => onSelect(family.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span class="cz-tier-workspace__nav-option-body">
                <span class="cz-tier-workspace__nav-option-name">{family.name}</span>
                {family.description && (
                  <span class="cz-tier-workspace__nav-option-kind">{family.description}</span>
                )}
              </span>
              <span class="cz-tier-workspace__nav-option-mark" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
