// Four-group drawer tab bar (drawer refinement blueprint, Phase 0).
//
// Sibling of DrawerTabs.tsx for drawers whose content model needs more than
// the fixed Details/Connections pair. DrawerTabs itself is untouched and
// remains the platform-locked two-tab bar every other drawer renders
// through (see drawer-kit/CLAUDE.md). Same visual language as DrawerTabs
// (.cz-sv-tab* tokens, mirrored under cz-drawer-groups__tab*) — not the
// public Cost Builder tab/accordion system.

import type { DrawerGroupNavProps } from './drawerGroups';

export function DrawerGroupTabs<Id extends string>({ groups, activeId, onSelect, trailing }: DrawerGroupNavProps<Id>) {
  const active = groups.find((group) => group.id === activeId);

  return (
    <>
      <div class="cz-drawer-groups__tablist">
        <div class="cz-drawer-groups__tablist-tabs" role="tablist">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={group.id === activeId}
              class={`cz-drawer-groups__tab${group.id === activeId ? ' cz-drawer-groups__tab--active' : ''}`}
              onClick={() => onSelect(group.id)}
            >
              {group.label}
            </button>
          ))}
        </div>
        {trailing && <div class="cz-drawer-groups__tablist-trailing">{trailing}</div>}
      </div>
      {active?.content}
    </>
  );
}
