import { WORKSTATIONS } from '@/api/types/admin';
import type { WorkstationId, WorkstationDef } from '@/api/types/admin';

interface Props {
  active: WorkstationId;
  collapsed: boolean;
  onNavigate: (id: WorkstationId) => void;
  onToggleCollapse: () => void;
}

const GROUPS: Record<string, string> = {
  command:    'Command',
  catalog:    'Catalog',
  operations: 'Operations',
};

// Hidden from nav UI — routes and workstation code remain fully intact.
const HIDDEN_FROM_NAV = new Set<WorkstationId>(['bundles', 'health']);

export function Sidebar({ active, collapsed, onNavigate, onToggleCollapse }: Props) {
  const grouped = WORKSTATIONS.reduce<Record<string, WorkstationDef[]>>((acc, w) => {
    if (!acc[w.group]) acc[w.group] = [];
    acc[w.group].push(w);
    return acc;
  }, {});

  return (
    <aside class="cz-admin-sidebar">
      <div class="cz-admin-sidebar__logo">
        <div class="cz-admin-sidebar__logo-mark">CZ</div>
        {!collapsed && <span class="cz-admin-sidebar__logo-text">Command Centre</span>}
      </div>

      <nav class="cz-admin-sidebar__nav">
        {Object.entries(grouped).map(([group, items]) => {
          const topLevel = items.filter((w) => !HIDDEN_FROM_NAV.has(w.id) && !w.parent);
          return (
            <div key={group} class="cz-admin-sidebar__group">
              {!collapsed && (
                <div class="cz-admin-sidebar__group-label">{GROUPS[group] ?? group}</div>
              )}
              {topLevel.map((w) => {
                const children = items.filter((c) => !HIDDEN_FROM_NAV.has(c.id) && c.parent === w.id);
                return (
                  <div key={w.id}>
                    <button
                      type="button"
                      class={`cz-admin-nav-item${active === w.id ? ' cz-admin-nav-item--active' : ''}`}
                      onClick={() => onNavigate(w.id)}
                      title={collapsed ? w.label : undefined}
                    >
                      <span class="cz-admin-nav-item__icon">{w.icon}</span>
                      {!collapsed && <span class="cz-admin-nav-item__label">{w.label}</span>}
                    </button>
                    {children.map((child) => (
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
          {collapsed ? '›' : '‹'}
        </button>
      </div>
    </aside>
  );
}
