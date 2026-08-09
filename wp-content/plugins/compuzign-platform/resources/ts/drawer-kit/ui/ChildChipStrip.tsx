// Child/subsection navigation strip (UI refinement, Phase 3).
//
// The smallest shared primitive for a group whose own content is further
// split into child records/subsections — e.g. Tier Options' own Editions
// (Nath, Edition 2, Edition 3…). A subordinate sibling of DrawerGroupTabs
// (the top-level Details/Options/Connections/Support bar), never a second
// top-level tab system: same token family (`--station-*` accent/text
// tokens, same font-size as `.cz-drawer-groups__tab`) so it reads as one
// level below the group nav it sits under without looking like a smaller,
// separate typographic system. Left-aligned, horizontally scrollable with
// no visible scrollbar (mouse/trackpad/touch scrolling still works — see
// `.cz-drawer-groups__chip-strip` in drawer-kit.css), sticky directly
// beneath whatever chrome the host renderer publishes via the inherited
// `--cz-drawer-group-chrome-h` custom property. It deliberately has no
// Accordion-specific markup variant: it renders identically — same
// markup — regardless of which mode the parent DrawerGroup* is in;
// DrawerGroupTabs and DrawerGroupAccordion each publish the chrome-height
// variable differently so this component never has to know which one is
// hosting it.
//
// `scrollContainer` drives the scroll-direction hide/reveal via
// useScrollHide, but WHETHER it is active at all is entirely the caller's
// decision: passing `null` (Accordion mode — see TierDrawerContent.tsx,
// which only resolves a real container while Tabs mode is active) disables
// hide/reveal outright and leaves the strip sticky-only, with no special
// case inside this component or useScrollHide itself.
//
// Generic and reusable — the Id type parameter and plain
// `{ id, label }[]` shape carry no Tier/Edition vocabulary — but only Tier
// Edition adopts it today; migrating other groups' own child sections onto
// this primitive is a separate, future decision.
//
// Edition lifecycle/Bin UX cleanup added the optional `trailing` seam below,
// mirroring the fixed-trailing-control structure DrawerGroupTabs' own
// tablist already established one level up
// (.cz-drawer-groups__tablist/-tabs/-trailing): the outer element stays the
// one sticky/hide-reveal surface, an inner child carries the
// horizontally-scrolling chips, and `trailing` — when supplied — renders as
// a fixed sibling that never scrolls away with the chip labels and shares
// the outer element's own hide/reveal transform (there is no separate hide
// state for it). Omitting `trailing` (every caller before Tier Options'
// Edition Bin icon) renders byte-identical markup to before this addition.
// This is a navigation-chrome seam only — `trailing` is never a ChildChip
// itself, never included in `chips`, and never participates in
// activeId/onSelect selection.

import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { useScrollHide } from './useScrollHide';

export interface ChildChip<Id extends string = string> {
  id:    Id;
  label: string;
}

export interface ChildChipStripProps<Id extends string = string> {
  chips:     readonly ChildChip<Id>[];
  activeId:  Id | null;
  onSelect:  (id: Id) => void;
  ariaLabel: string;
  // Optional and additive — omitting it (or passing null) simply disables
  // hide-on-scroll, leaving a plain always-visible sticky bar.
  scrollContainer?: HTMLElement | null;
  // Optional and additive — a fixed control (e.g. the Edition Bin icon)
  // rendered outside the scrollable chip region but inside the same sticky/
  // hide-reveal row. See this file's own header comment.
  trailing?: ComponentChildren;
}

export function ChildChipStrip<Id extends string>({
  chips, activeId, onSelect, ariaLabel, scrollContainer = null, trailing,
}: ChildChipStripProps<Id>) {
  const hidden = useScrollHide(scrollContainer);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Brings a newly-selected or newly-created Edition into view horizontally
  // without ever touching vertical scroll position — this is a UI courtesy
  // only, never a change to which Edition is selected.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [activeId]);

  return (
    <div class={`cz-drawer-groups__chip-strip${hidden ? ' cz-drawer-groups__chip-strip--hidden' : ''}`}>
      <div class="cz-drawer-groups__chip-strip-scroll" role="tablist" aria-label={ariaLabel}>
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            role="tab"
            ref={activeId === chip.id ? activeRef : undefined}
            aria-selected={activeId === chip.id}
            class={`cz-drawer-groups__chip${activeId === chip.id ? ' cz-drawer-groups__chip--active' : ''}`}
            onClick={() => onSelect(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      {trailing && <div class="cz-drawer-groups__chip-strip-trailing">{trailing}</div>}
    </div>
  );
}
