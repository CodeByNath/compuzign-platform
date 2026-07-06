import type { WorkstationId } from '@/api/types/admin';
import { WORKSTATIONS, WORKSTATION_GROUPS } from './schema/workstations';
import { NAV_ICONS } from './schema/icons';

interface Props {
  active: WorkstationId;
  collapsed: boolean;
  onNavigate: (id: WorkstationId) => void;
  onToggleCollapse: () => void;
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    // ChevronRight — expand
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
      </svg>
    );
  }
  // ChevronLeft — collapse
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
    </svg>
  );
}

export function Sidebar({ active, collapsed, onNavigate, onToggleCollapse }: Props) {
  const groups = [...WORKSTATION_GROUPS].sort((a, b) => a.order - b.order);

  return (
    <aside class="cz-admin-sidebar">
      <div class="cz-admin-sidebar__logo">
        <div class="cz-admin-sidebar__logo-mark">CZ</div>
        {!collapsed && <span class="cz-admin-sidebar__logo-text">Command Centre</span>}
      </div>

      <nav class="cz-admin-sidebar__nav">
        {groups.map((group) => {
          const items = WORKSTATIONS.filter((w) => w.group === group.id);
          const topLevel = items.filter((w) => !w.hiddenFromNav && !w.parent);
          return (
            <div key={group.id} class="cz-admin-sidebar__group">
              {!collapsed && (
                <div class="cz-admin-sidebar__group-label">{group.label}</div>
              )}
              {topLevel.map((w) => {
                const children = items.filter((c) => !c.hiddenFromNav && c.parent === w.id);
                // Submenu expands only when the active workstation belongs to this parent's group.
                const isExpanded = active === w.id || children.some((c) => c.id === active);
                return (
                  <div key={w.id}>
                    <button
                      type="button"
                      class={`cz-admin-nav-item${active === w.id ? ' cz-admin-nav-item--active' : ''}`}
                      onClick={() => onNavigate(w.id)}
                      title={collapsed ? w.label : undefined}
                    >
                      <span class="cz-admin-nav-item__icon">
                        {w.iconId ? NAV_ICONS[w.iconId] : null}
                      </span>
                      {!collapsed && <span class="cz-admin-nav-item__label">{w.label}</span>}
                    </button>
                    {isExpanded && children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        class={`cz-admin-nav-subitem${active === child.id ? ' cz-admin-nav-subitem--active' : ''}`}
                        onClick={() => onNavigate(child.id)}
                      >
                        {!collapsed && <span class="cz-admin-nav-subitem__label">{child.label}</span>}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div class="cz-admin-sidebar__footer">
        <button
          type="button"
          class="cz-admin-sidebar__collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <CollapseIcon collapsed={collapsed} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
