// Four-group drawer accordion (drawer refinement blueprint, Phase 0).
//
// Renders the same DrawerGroup[] model as DrawerGroupTabs. Single-open: the
// active group is the expanded section, so switching between Tabs and
// Accordion mode never changes which content exists, only how it is
// reached. Closed panels unmount their content rather than only hiding it,
// matching the pattern already used by the Package Tier Workspace's
// TierAccordionSection. Visual language mirrors .cz-sv-tab* tokens — not the
// public Cost Builder FaqAccordion.

import type { DrawerGroupNavProps } from './drawerGroups';

export function DrawerGroupAccordion<Id extends string>({ groups, activeId, onSelect, trailing }: DrawerGroupNavProps<Id>) {
  return (
    <>
      {trailing && <div class="cz-drawer-groups__accordion-trailing">{trailing}</div>}
      <div class="cz-drawer-groups__accordion">
        {groups.map((group) => {
          const isOpen = group.id === activeId;
          const headerId = `cz-drawer-group-${group.id}-header`;
          const panelId = `cz-drawer-group-${group.id}-panel`;

          return (
            <section key={group.id} class="cz-drawer-groups__accordion-section">
              <h3 class="cz-drawer-groups__accordion-heading">
                <button
                  type="button"
                  id={headerId}
                  class="cz-drawer-groups__accordion-trigger"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => onSelect(group.id)}
                >
                  <span class="cz-drawer-groups__accordion-chevron" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" focusable="false">
                      <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
                    </svg>
                  </span>
                  {group.label}
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                class="cz-drawer-groups__accordion-panel"
                hidden={!isOpen}
              >
                {isOpen && group.content}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
