// The Layout composes the Admin Station frame: Header, Body, Footer, and the
// slide-menu overlay. There is no fixed sidebar column — navigation is the
// Header pills plus the slide menu. The Layout orchestrates the menu open state
// and routes navigation selections (which close the menu).

import { useState, useRef, useCallback } from 'preact/hooks';
import { useAdminStation } from '../AdminStationContext';
import { AdminStationHeader } from './AdminStationHeader';
import { AdminStationBody } from './AdminStationBody';
import { AdminStationFooter } from './AdminStationFooter';
import { AdminStationSlideMenu } from './AdminStationSlideMenu';
import { AdminStationDrawer } from './drawer/AdminStationDrawer';

export function AdminStationLayout() {
  const { navigate } = useAdminStation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleSelect = useCallback((id: string) => {
    navigate(id);
    setMenuOpen(false);
  }, [navigate]);

  return (
    <>
      <AdminStationHeader
        menuOpen={menuOpen}
        onToggleMenu={toggleMenu}
        menuButtonRef={menuButtonRef}
        onSelect={handleSelect}
      />
      <AdminStationBody />
      <AdminStationFooter />
      <AdminStationSlideMenu
        open={menuOpen}
        onClose={closeMenu}
        onSelect={handleSelect}
        menuButtonRef={menuButtonRef}
      />
      <AdminStationDrawer />
    </>
  );
}
