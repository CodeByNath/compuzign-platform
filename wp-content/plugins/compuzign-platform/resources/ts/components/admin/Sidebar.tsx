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

// ── Heroicons v2 solid — 24×24 viewBox ────────────────────────────────────────

function NavIcon({ id }: { id: WorkstationId }) {
  switch (id) {
    case 'overview':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="cz-admin-nav-item__svg" aria-hidden="true">
          <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
        </svg>
      );
    case 'service-catalog':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="cz-admin-nav-item__svg" aria-hidden="true">
          <path fillRule="evenodd" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" clipRule="evenodd" />
        </svg>
      );
    case 'surface-packages':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="cz-admin-nav-item__svg" aria-hidden="true">
          <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.661 3 20.625 3H3.375z" />
          <path fillRule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clipRule="evenodd" />
        </svg>
      );
    case 'promotions':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="cz-admin-nav-item__svg" aria-hidden="true">
          <path fillRule="evenodd" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.658.525a18.634 18.634 0 005.107-3.053 1.95 1.95 0 00.525-2.659 18.634 18.634 0 00-3.053-5.107 1.95 1.95 0 00-1.591-.66H9.568zM8.25 7.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" clipRule="evenodd" />
        </svg>
      );
    case 'featured':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="cz-admin-nav-item__svg" aria-hidden="true">
          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
        </svg>
      );
    case 'requests':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="cz-admin-nav-item__svg" aria-hidden="true">
          <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
          <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
        </svg>
      );
    default:
      return null;
  }
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
                        <NavIcon id={w.id} />
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
