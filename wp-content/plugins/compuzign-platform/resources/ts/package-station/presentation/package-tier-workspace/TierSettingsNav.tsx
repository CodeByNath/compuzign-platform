// Tier Workspace Settings — the section navigation.
//
// The left column of Settings. It is a second control for the SAME disclosures
// the right column renders, never a second state: it reads the one open section
// id the shell owns and toggles it exactly as the section's own header button
// does, so the two can never disagree.
//
// Each item is a real `<button>` that names the panel it controls through
// `aria-controls`, reports that panel's state through `aria-expanded`, and marks
// itself `aria-current` while its section is the open one. The group labels are
// paragraphs rather than headings: the sections column already contributes the
// group headings to the document outline, and repeating them here would only
// duplicate that outline for a navigation aid.

import type { VNode } from 'preact';
import { useId } from 'preact/hooks';

export interface SettingsNavSection {
  id:    string;
  title: string;
  leaf:  string;
}

export interface SettingsNavGroup {
  id:       string;
  title:    string;
  sections: SettingsNavSection[];
}

interface Props {
  groups:   SettingsNavGroup[];
  openId:   string | null;
  /** The shell's stable id stem for a section, shared with its disclosure. */
  idFor:    (sectionId: string) => string;
  onToggle: (sectionId: string) => void;
}

export function TierSettingsNav({ groups, openId, idFor, onToggle }: Props): VNode {
  const uid = useId();

  return (
    <nav class="cz-tier-settings__nav" aria-label="Settings sections">
      {groups.map((group) => {
        const labelId = `${uid}-${group.id}`;
        return (
          <div key={group.id} class="cz-tier-settings__nav-group">
            <p id={labelId} class="cz-tier-settings__nav-label">{group.title}</p>
            <ul class="cz-tier-settings__nav-list" aria-labelledby={labelId}>
              {group.sections.map((section) => {
                const current = openId === section.id;
                return (
                  <li key={section.id}>
                    <button
                      type="button"
                      class={`cz-tier-settings__nav-item${current ? ' cz-tier-settings__nav-item--current' : ''}`}
                      aria-expanded={current}
                      aria-controls={`${idFor(section.id)}-panel`}
                      aria-current={current ? 'true' : undefined}
                      onClick={() => onToggle(section.id)}
                    >
                      <span class="cz-tier-settings__nav-title">{section.title}</span>
                      <span class="cz-tier-settings__nav-leaf">{section.leaf}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
