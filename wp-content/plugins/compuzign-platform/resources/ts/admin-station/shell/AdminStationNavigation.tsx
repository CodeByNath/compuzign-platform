// Navigation list — rendered from the single destination registry so the
// sidebar can never list a destination the outlet cannot mount. It reads and
// writes only navigation state; it holds no layout concerns of its own.

import { adminStationDestinations } from '../AdminStationRegistry';
import { useAdminStation } from '../AdminStationContext';

interface Props {
  // When collapsed, labels are hidden and the icon carries a tooltip instead.
  collapsed: boolean;
}

export function AdminStationNavigation({ collapsed }: Props) {
  const { activeDestinationId, navigate } = useAdminStation();

  return (
    <nav class="cz-station-nav" aria-label="Admin Station">
      {adminStationDestinations.map((destination) => {
        const Icon = destination.icon;
        const isActive = destination.id === activeDestinationId;
        return (
          <button
            key={destination.id}
            type="button"
            class={`cz-station-nav__item${isActive ? ' cz-station-nav__item--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            title={collapsed ? destination.label : undefined}
            onClick={() => navigate(destination.id)}
          >
            <span class="cz-station-nav__icon"><Icon /></span>
            {!collapsed && <span class="cz-station-nav__label">{destination.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
