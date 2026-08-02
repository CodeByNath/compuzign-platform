// Tier workspace accordion section — the one collapsible-section primitive
// Connections and Settings both render, so a Package-owned lane never grows a
// second card/tab selector system beside it.
//
// A real button carries `aria-expanded`/`aria-controls` addressing a panel
// with the matching stable id; the panel's children render only while open,
// so a collapsed section actually disappears rather than only rotating its
// chevron. Callers own the open/closed state and every header/panel value —
// this component owns only the header/panel wiring and chrome.

import type { ComponentChildren, VNode } from 'preact';
import { ChevronDownIcon } from '@/admin-station/shell/icons';

interface Props {
  id:       string;
  label:    string;
  meta?:    ComponentChildren;
  isOpen:   boolean;
  onToggle: () => void;
  children: ComponentChildren;
}

export function TierAccordionSection({ id, label, meta, isOpen, onToggle, children }: Props): VNode {
  const headerId = `${id}-header`;
  const panelId  = `${id}-panel`;

  return (
    <section class="cz-tier-deck__accordion-section">
      <h4 class="cz-tier-deck__accordion-heading">
        <button
          type="button"
          id={headerId}
          class="cz-tier-deck__accordion-trigger"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span class="cz-tier-deck__accordion-chevron" aria-hidden="true"><ChevronDownIcon /></span>
          <span class="cz-tier-deck__lane-title">{label}</span>
          {meta !== undefined && meta}
        </button>
      </h4>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        class="cz-tier-deck__accordion-panel"
        hidden={!isOpen}
      >
        {isOpen && children}
      </div>
    </section>
  );
}
