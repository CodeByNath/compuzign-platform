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
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} class="cz-admin-sidebar__group">
            {!collapsed && (
              <div class="cz-admin-sidebar__group-label">{GROUPS[group] ?? group}</div>
            )}
            {items.map((w) => (
              <button
                key={w.id}
                type="button"
                class={`cz-admin-nav-item${active === w.id ? ' cz-admin-nav-item--active' : ''}`}
                onClick={() => onNavigate(w.id)}
                title={collapsed ? w.label : undefined}
              >
                <span class="cz-admin-nav-item__icon">{w.icon}</span>
                {!collapsed && <span class="cz-admin-nav-item__label">{w.label}</span>}
              </button>
            ))}
          </div>
        ))}
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
