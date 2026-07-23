// Header — the Admin Station's global bar.
//
// Order: [menu] CompuZign [Services][Packages][Promotions] … [theme][apps][user]
//
// Station pills are rendered from the shared navigation source (never
// hardcoded). The right-side apps and user controls each open a small empty
// dropdown; only one may be open at a time, and both dismiss on outside click
// or Escape. The theme control toggles the token-driven Admin Station theme.

import { useState, useRef, useEffect } from 'preact/hooks';
import type { RefObject } from 'preact';
import { useAdminStation } from '../AdminStationContext';
import { headerNavItems } from '@/station-manager/registry/navigation';
import { AdminStationDropdown } from './AdminStationDropdown';
import { MenuIcon, SunIcon, MoonIcon, AppsIcon, UserIcon } from './icons';

type DropdownId = 'apps' | 'user';

interface Props {
  menuOpen: boolean;
  onToggleMenu: () => void;
  menuButtonRef: RefObject<HTMLButtonElement>;
  onSelect: (id: string) => void;
}

export function AdminStationHeader({ menuOpen, onToggleMenu, menuButtonRef, onSelect }: Props) {
  const { theme, toggleTheme, activeDestinationId } = useAdminStation();
  const [openDropdown, setOpenDropdown] = useState<DropdownId | null>(null);

  const appsControlRef = useRef<HTMLDivElement>(null);
  const userControlRef = useRef<HTMLDivElement>(null);
  const appsButtonRef = useRef<HTMLButtonElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);

  const controlRef = (id: DropdownId) => (id === 'apps' ? appsControlRef : userControlRef);
  const buttonRef = (id: DropdownId) => (id === 'apps' ? appsButtonRef : userButtonRef);

  // Opening one dropdown closes the other (single active state). A second click
  // on the open control closes it.
  const toggleDropdown = (id: DropdownId) => setOpenDropdown((current) => (current === id ? null : id));

  // Dismiss the active dropdown on outside click or Escape. Escape restores
  // focus to the triggering button; an outside click leaves focus where the
  // user clicked.
  useEffect(() => {
    if (!openDropdown) return;

    const onPointerDown = (event: MouseEvent) => {
      const wrap = controlRef(openDropdown).current;
      if (wrap && !wrap.contains(event.target as Node)) setOpenDropdown(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const button = buttonRef(openDropdown).current;
        setOpenDropdown(null);
        button?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openDropdown]);

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

        <div class="cz-station-control" ref={appsControlRef}>
          <button
            type="button"
            ref={appsButtonRef}
            class="cz-station-iconbtn"
            aria-label="Apps"
            aria-haspopup="menu"
            aria-expanded={openDropdown === 'apps'}
            aria-controls="cz-station-apps-menu"
            onClick={() => toggleDropdown('apps')}
          >
            <AppsIcon />
          </button>
          {openDropdown === 'apps' && (
            <AdminStationDropdown id="cz-station-apps-menu" labelledBy="cz-station-apps-menu" />
          )}
        </div>

        <div class="cz-station-control" ref={userControlRef}>
          <button
            type="button"
            ref={userButtonRef}
            class="cz-station-iconbtn"
            aria-label="User profile"
            aria-haspopup="menu"
            aria-expanded={openDropdown === 'user'}
            aria-controls="cz-station-user-menu"
            onClick={() => toggleDropdown('user')}
          >
            <UserIcon />
          </button>
          {openDropdown === 'user' && (
            <AdminStationDropdown id="cz-station-user-menu" labelledBy="cz-station-user-menu" />
          )}
        </div>
      </div>
    </header>
  );
}
