// Tier Workspace Engine — the lower deck's disclosure container.
//
// One bordered accordion section: an icon, a title, one honest line about what
// it holds, an optional summary the records inside actually report, and a
// chevron. Its expanded content stays inside the same bordered container, so a
// section reads as one region rather than as a header floating above loose rows.
//
// Follows the WAI-ARIA disclosure/accordion pattern: the trigger is a real
// `<button>` inside the section heading, carrying `aria-expanded` and
// `aria-controls`; the panel carries the matching id plus `role="region"` and
// `aria-labelledby` back to the trigger. Keyboard operation is the button's own —
// Enter and Space toggle, Tab moves on. No custom key handling is layered over
// native behaviour, and nothing is focus-trapped: the collapsed panel stays in
// the DOM under `hidden`, which removes it from both the accessibility tree and
// the tab order.
//
// Two consumers, one behaviour, two state models:
//   - The Connections lane lets each section hold its own open state.
//   - Settings drives them from one `open` value it shares with its section
//     navigation, so exactly one section is expanded and the two controls can
//     never disagree. A controlled section also takes `idPrefix`, because that
//     navigation must name the same panel in its own `aria-controls`.
//
// Both are presentation state and nothing else — no persistence, no data, no
// identity. It stays local to the Tier workspace: two lanes of one screen are
// not evidence for a platform-wide accordion framework.

import { useId, useState } from 'preact/hooks';
import type { ComponentChildren, VNode } from 'preact';
import { ChevronDownIcon } from '@/admin-station/shell/icons';

interface Props {
  icon:  VNode;
  title: string;
  // One line naming what the section holds. Shown beside the title, never in
  // place of it.
  description: string;
  // A count or status the records inside actually report. Null whenever there is
  // nothing real to summarise — the header states no total it cannot resolve
  // from loaded data.
  summary?: string | null;
  // Uncontrolled: the section owns its open state, starting from this value.
  defaultOpen?: boolean;
  // Controlled: the caller owns the open state, and `onToggle` is then the only
  // way the section changes.
  open?: boolean;
  onToggle?: () => void;
  // Stable id stem, so a controlled caller can address the same panel. Omitted,
  // the section mints its own from `useId()`.
  idPrefix?: string;
  // The heading rank this section occupies. The Connections lane's sections are
  // its top level; Settings nests its sections under a group heading.
  headingLevel?: 4 | 5;
  children: ComponentChildren;
}

export function DeckDisclosure({
  icon,
  title,
  description,
  summary = null,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  idPrefix,
  headingLevel = 4,
  children,
}: Props): VNode {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const uid       = useId();
  const stem      = idPrefix ?? uid;
  const triggerId = `${stem}-trigger`;
  const panelId   = `${stem}-panel`;
  const open      = controlledOpen ?? uncontrolledOpen;
  const toggle    = onToggle ?? (() => setUncontrolledOpen((wasOpen) => !wasOpen));
  const Heading: 'h4' | 'h5' = headingLevel === 5 ? 'h5' : 'h4';

  return (
    <div class="cz-tier-deck__disclosure">
      <Heading class="cz-tier-deck__disclosure-heading">
        <button
          id={triggerId}
          type="button"
          class="cz-tier-deck__disclosure-trigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={toggle}
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
      </Heading>
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
