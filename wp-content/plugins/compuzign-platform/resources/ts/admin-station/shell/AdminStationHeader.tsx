// Header — the Admin Station's global bar.
//
// Order: [menu] CompuZign [Services][Packages][Promotions] … [theme][user]
//
// Station pills are rendered from the shared navigation source (never
// hardcoded). The right-side user control opens a small dropdown carrying the
// one Log out action; it dismisses on outside click or Escape. The theme
// control toggles the token-driven Admin Station theme.

import { useState, useRef, useEffect } from 'preact/hooks';
import type { RefObject } from 'preact';
import { useAdminStation } from '../AdminStationContext';
import { headerNavItems } from '@/station-manager/registry/navigation';
import { AdminStationDropdown } from './AdminStationDropdown';
import { MenuIcon, SunIcon, MoonIcon, UserIcon } from './icons';

interface Props {
  menuOpen: boolean;
  onToggleMenu: () => void;
  menuButtonRef: RefObject<HTMLButtonElement>;
  onSelect: (id: string) => void;
}

export function AdminStationHeader({ menuOpen, onToggleMenu, menuButtonRef, onSelect }: Props) {
  const { theme, toggleTheme, activeDestinationId } = useAdminStation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // Server-generated, nonce-protected WordPress logout URL (AssetLoader.php).
  // Never substitute a '#' placeholder: if it's genuinely absent, the Log out
  // action is omitted rather than shown as a non-functional link.
  const logoutUrl = window.CompuZignConfig?.logoutUrl;

  const userControlRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);

  // A second click on the open control closes it.
  const toggleUserMenu = () => setUserMenuOpen((open) => !open);

  // Dismiss the open dropdown on outside click or Escape. Escape restores
  // focus to the triggering button; an outside click leaves focus where the
  // user clicked.
  useEffect(() => {
    if (!userMenuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const wrap = userControlRef.current;
      if (wrap && !wrap.contains(event.target as Node)) setUserMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
        userButtonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [userMenuOpen]);

  return (
    <header class="cz-station-header">
      <div class="cz-station-header__left">
        <button
          type="button"
          ref={menuButtonRef}
          class="cz-station-iconbtn"
          aria-label="Open navigation menu"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          aria-controls="cz-station-slide-menu"
          onClick={onToggleMenu}
        >
          <MenuIcon />
        </button>

        <span class="cz-station-brand">CompuZign</span>

        <nav class="cz-station-header__nav" aria-label="Stations">
          {headerNavItems().map((item) => {
            const Glyph = item.icon;
            const isActive = item.id === activeDestinationId;
            return (
              <button
                key={item.id}
                type="button"
                class={`cz-station-pill${isActive ? ' cz-station-pill--active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelect(item.id)}
              >
                <span class="cz-station-pill__icon"><Glyph /></span>
                <span class="cz-station-pill__label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div class="cz-station-header__right">
        <button
          type="button"
          class="cz-station-iconbtn"
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-pressed={theme === 'dark'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        <div class="cz-station-control" ref={userControlRef}>
          <button
            type="button"
            id="cz-station-user-menu-trigger"
            ref={userButtonRef}
            class="cz-station-iconbtn"
            aria-label="User profile"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            aria-controls="cz-station-user-menu"
            onClick={toggleUserMenu}
          >
            <UserIcon />
          </button>
          {userMenuOpen && logoutUrl && (
            <AdminStationDropdown id="cz-station-user-menu" labelledBy="cz-station-user-menu-trigger">
              <a class="cz-station-dropdown__item" role="menuitem" href={logoutUrl}>
                Log out
              </a>
            </AdminStationDropdown>
          )}
        </div>
      </div>
    </header>
  );
}
