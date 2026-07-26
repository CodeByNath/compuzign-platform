// Tier Workspace Engine — the Connections lane's disclosure container.
//
// One bordered accordion section: an icon, a title, one honest line about what
// it holds, an optional summary the connected records actually report, and a
// chevron. Its expanded content stays inside the same bordered container, so a
// section reads as one region rather than as a header floating above loose rows.
//
// Follows the WAI-ARIA disclosure/accordion pattern: the trigger is a real
// `<button>` inside the section heading, carrying `aria-expanded` and
// `aria-controls`; the panel carries the matching id plus `role="region"` and
// `aria-labelledby` back to the trigger. Both ids come from one `useId()`, so
// they are stable across re-renders and unique per mounted section. Keyboard
// operation is the button's own — Enter and Space toggle, Tab moves on. No
// custom key handling is layered over native behaviour, and nothing is
// focus-trapped: the collapsed panel stays in the DOM under `hidden`, which
// removes it from both the accessibility tree and the tab order.
//
// Boundary note: this is presentation only, and deliberately local to the
// Package Tier workspace. The station tree has no reusable disclosure primitive
// (`StationSplitAction` is a menu button, and `TierSystemSettings` uses a native
// `<details>` for one advanced block), and one screen is not evidence for a
// platform-wide accordion framework. It holds open state and nothing else — no
// persistence, no data, no identity.

import { useId, useState } from 'preact/hooks';
import type { ComponentChildren, VNode } from 'preact';
import { ChevronDownIcon } from '@/admin-station/shell/icons';

interface Props {
  icon:  VNode;
  title: string;
  // One line naming what the section holds. Shown beside the title, never in
  // place of it.
  description: string;
  // A count or status the connected records actually report. Null whenever
  // there is nothing real to summarise — the header states no total it cannot
  // resolve from loaded data.
  summary?: string | null;
  defaultOpen?: boolean;
  children: ComponentChildren;
}

export function ConnectionDisclosure({
  icon,
  title,
  description,
  summary = null,
  defaultOpen = false,
  children,
}: Props): VNode {
  const [open, setOpen] = useState(defaultOpen);
  const uid       = useId();
  const triggerId = `${uid}-trigger`;
  const panelId   = `${uid}-panel`;

  return (
    <div class="cz-tier-deck__disclosure">
      <h4 class="cz-tier-deck__disclosure-heading">
        <button
          id={triggerId}
          type="button"
          class="cz-tier-deck__disclosure-trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
        >
          <span class="cz-tier-deck__disclosure-icon" aria-hidden="true">{icon}</span>
          <span class="cz-tier-deck__disclosure-copy">
            <span class="cz-tier-deck__disclosure-title">{title}</span>
            <span class="cz-tier-deck__disclosure-note">{description}</span>
          </span>
          {summary !== null && (
            <span class="cz-tier-deck__disclosure-summary">{summary}</span>
          )}
          <span class="cz-tier-deck__disclosure-chevron" aria-hidden="true">
            <ChevronDownIcon />
          </span>
        </button>
      </h4>
      <div
        id={panelId}
        class="cz-tier-deck__disclosure-body"
        role="region"
        aria-labelledby={triggerId}
        hidden={!open}
      >
        {children}
      </div>
    </div>
  );
}
