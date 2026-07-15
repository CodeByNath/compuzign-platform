// Slide menu — a left-side overlay opened from the Header menu button.
//
// It overlays the Body (it never reserves permanent page width), renders the
// same shared navigation source as the Header, and includes an empty footer
// region at its bottom. While open it locks background scroll; on close it
// restores focus to the Header menu button. It closes on backdrop click,
// Escape, or selecting an item (the parent drives close via onClose/onSelect).

import { useRef, useEffect } from 'preact/hooks';
import type { RefObject } from 'preact';
import { useAdminStation } from '../AdminStationContext';
import { menuNavItems } from '../navigation/stationNavigation';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  menuButtonRef: RefObject<HTMLButtonElement>;
}

export function AdminStationSlideMenu({ open, onClose, onSelect, menuButtonRef }: Props) {
  const { activeDestinationId } = useAdminStation();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    // Lock background scroll.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    // Move focus into the menu.
    panelRef.current?.focus();

    const trigger = menuButtonRef.current;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      // Restore focus to the menu button after closing.
      trigger?.focus();
    };
  }, [open, onClose, menuButtonRef]);

  if (!open) return null;

  return (
    <div class="cz-station-menu-layer">
      <div class="cz-station-menu-backdrop" onClick={onClose} />
      <aside
        id="cz-station-slide-menu"
        ref={panelRef}
        class="cz-station-menu"
        tabIndex={-1}
        aria-label="Stations"
      >
        <nav class="cz-station-menu__nav">
          {menuNavItems.map((item) => {
            const Glyph = item.icon;
            const isActive = item.id === activeDestinationId;
            return (
              <button
                key={item.id}
                type="button"
                class={`cz-station-menu__item${isActive ? ' cz-station-menu__item--active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelect(item.id)}
              >
                <span class="cz-station-menu__icon"><Glyph /></span>
                <span class="cz-station-menu__label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Empty footer region — kept intentionally without content. */}
        <div class="cz-station-menu__footer" />
      </aside>
    </div>
  );
}
