// The Header provides CompuZign identity, the current area title, the sidebar
// toggle for smaller screens, and the account area. It reads navigation state
// to show where the user is; it holds no business logic.

import { useAdminStation } from '../AdminStationContext';
import { MenuIcon } from './icons';

export function AdminStationHeader() {
  const { activeDestination, collapsed, toggleCollapsed, setMobileOpen } = useAdminStation();

  const onToggle = () => {
    // Wide displays collapse the persistent rail; narrow displays open the
    // overlay drawer. CSS decides which affordance is visible, so both run.
    toggleCollapsed();
    setMobileOpen(true);
  };

  return (
    <header class="cz-station-header">
      <div class="cz-station-header__lead">
        <button
          type="button"
          class="cz-station-header__toggle"
          aria-label="Toggle navigation"
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          <MenuIcon />
        </button>
        <span class="cz-station-header__brand">CompuZign</span>
        <span class="cz-station-header__divider" aria-hidden="true" />
        <span class="cz-station-header__title">{activeDestination?.label ?? 'Admin Station'}</span>
      </div>

      <div class="cz-station-header__actions">
        <span class="cz-station-header__account" aria-label="Account">
          <span class="cz-station-header__avatar" aria-hidden="true">A</span>
        </span>
      </div>
    </header>
  );
}
