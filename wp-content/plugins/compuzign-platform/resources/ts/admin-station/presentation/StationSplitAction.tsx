// Station split action — a primary button fused to a menu trigger inside one
// unified outer shape.
//
// Entity-neutral and fully data-driven: it renders the actions it is handed, in
// order, and reports back by action id. It never inspects a label, and it never
// decides what an action means.
//
//   actions[0]        → the primary half (the card contract puts `View` first)
//   actions.slice(1)  → the menu
//
// A single action renders the primary alone: a trigger that opens an empty menu
// is invalid semantics, so the shape simply has no second half.
//
// Boundary note: the new Admin Station has no reusable menu primitive to compose.
// `shell/AdminStationDropdown` is an intentionally empty positioned surface with
// no items, roving focus, or dismissal — the Header owns its open state — so the
// menu behaviour here is built on the station's own tokens rather than migrating
// the old admin menu UI.
//
// Follows the WAI-ARIA menu-button pattern: aria-haspopup/expanded/controls on
// the trigger, role=menu + role=menuitem, roving focus into the menu on open,
// Arrow/Home/End movement, Escape and Tab to dismiss, click-outside to dismiss,
// and focus returned to the trigger on Escape.

import { useState, useRef, useEffect, useCallback, useId } from 'preact/hooks';
import type { ComponentType } from 'preact';
import { ChevronDownIcon } from '../shell/icons';

/** Structural shape — any card action contract satisfies this. */
export interface StationActionItem {
  id:           string;
  label:        string;
  icon?:        ComponentType<{ class?: string }>;
  disabled?:    boolean;
  destructive?: boolean;
}

interface Props {
  actions: StationActionItem[];
  onAction: (actionId: string) => void;
  // Names the control for assistive tech, e.g. the card's title. The trigger has
  // no visible text of its own, so without this it would announce as unlabelled.
  controlLabel: string;
}

export function StationSplitAction({ actions, onAction, controlLabel }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  const enabledItems = useCallback(
    () => itemRefs.current.filter((el): el is HTMLButtonElement => !!el && !el.disabled),
    [],
  );

  // Move focus into the menu on open — the menu-button pattern expects the first
  // item focused however the menu was opened.
  useEffect(() => {
    if (open) {
      enabledItems()[0]?.focus();
    }
  }, [open, enabledItems]);

  // Dismiss on a press outside the control. mousedown (not click) so a press that
  // starts outside closes immediately rather than waiting for release.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  const handleRootKeyDown = useCallback((event: KeyboardEvent) => {
    if (!open) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      // Let focus leave naturally, but don't leave an orphaned menu behind.
      close(false);
    }
  }, [open, close]);

  const handleTriggerKeyDown = useCallback((event: KeyboardEvent) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setOpen(true);
    }
  }, [open]);

  const handleMenuKeyDown = useCallback((event: KeyboardEvent) => {
    const items = enabledItems();
    if (items.length === 0) {
      return;
    }
    const current = items.findIndex((el) => el === document.activeElement);
    let next: number | null = null;

    if (event.key === 'ArrowDown') {
      next = (current + 1) % items.length;
    } else if (event.key === 'ArrowUp') {
      // A missing current (-1) enters the list from the end going up.
      next = current <= 0 ? items.length - 1 : current - 1;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = items.length - 1;
    }

    if (next !== null) {
      event.preventDefault();
      items[next].focus();
    }
  }, [enabledItems]);

  const select = useCallback((actionId: string) => {
    close(true);
    onAction(actionId);
  }, [close, onAction]);

  const primary = actions[0];
  if (!primary) {
    return null;
  }
  const menuActions = actions.slice(1);
  const PrimaryIcon = primary.icon;

  return (
    <div ref={rootRef} class="cz-station-split" onKeyDown={handleRootKeyDown}>
      <button
        type="button"
        class={`cz-station-split__primary${primary.destructive ? ' cz-station-split__primary--destructive' : ''}`}
        disabled={primary.disabled}
        // Dismiss an open menu on the way through: the primary sits inside the
        // control, so the click-outside listener never sees this press.
        onClick={() => {
          setOpen(false);
          onAction(primary.id);
        }}
      >
        {PrimaryIcon && <PrimaryIcon class="cz-station-split__icon" />}
        <span class="cz-station-split__label">{primary.label}</span>
      </button>

      {menuActions.length > 0 && (
        <>
          <button
            ref={triggerRef}
            type="button"
            class="cz-station-split__trigger"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            aria-label={`More actions for ${controlLabel}`}
            onClick={() => setOpen((v) => !v)}
            onKeyDown={handleTriggerKeyDown}
          >
            <ChevronDownIcon class="cz-station-split__chevron" />
          </button>

          {open && (
            <div
              id={menuId}
              class="cz-station-split__menu"
              role="menu"
              aria-label={`${controlLabel} actions`}
              onKeyDown={handleMenuKeyDown}
            >
              {menuActions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={action.id}
                    ref={(el) => { itemRefs.current[index] = el; }}
                    type="button"
                    role="menuitem"
                    class={`cz-station-split__item${action.destructive ? ' cz-station-split__item--destructive' : ''}`}
                    disabled={action.disabled}
                    // Roving tabindex: the menu is entered by focus, not by Tab.
                    tabIndex={-1}
                    onClick={() => select(action.id)}
                  >
                    {ActionIcon && <ActionIcon class="cz-station-split__icon" />}
                    <span class="cz-station-split__label">{action.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
