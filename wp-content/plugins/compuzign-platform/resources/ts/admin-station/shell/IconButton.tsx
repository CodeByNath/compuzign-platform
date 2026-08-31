// CRM-1C: the generic icon-only button + tooltip primitive for drawer
// header chrome (first consumer: the Request drawer's Print / Save PDF
// action, see admin-station/stations/requests/RequestDrawerHost.tsx). Names
// no entity — a plain button with an accessible name, a hover/keyboard-focus
// tooltip carrying that same name, and nothing else.
//
// CRM-1C audit correction: originally named `cz-icon-btn`, which collides
// with an UNRELATED, already-existing customer-facing class of the exact
// same name in `atomic-engine/css/04-buttons.css` (the `.cz-*` prefix is
// shared platform-wide, not Admin-exclusive) — its `:hover`/`:focus-visible`
// rules use `--cz-color-accent`, the customer brand accent, and that
// stylesheet loads globally on every frontend page, including the one
// hosting the Admin Station shortcode. Renamed under the `cz-station-*`
// prefix every other Admin-only class already uses precisely to avoid this
// (`cz-station-iconbtn`, `cz-station-drawer__close`, `cz-station-pill`, …),
// and its interaction-state tokens (`--station-focus-ring`,
// `--station-hover-bg`, `--station-active-bg`, `--station-text-muted`) are
// unchanged — they were always correct; only the colliding name was not.
//
// The tooltip is pure CSS (`:hover` on the wrapper, `:focus-visible` on the
// button itself — see admin-station.css's `.cz-station-drawer-iconbtn-tooltip`
// rules): a native `title` attribute alone shows on hover in most browsers
// but not reliably on keyboard focus, which the CRM-1C audit requires.

import type { ComponentChildren } from 'preact';

interface IconButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ComponentChildren;
}

export function IconButton({ label, onClick, disabled, children }: IconButtonProps) {
  return (
    <span class="cz-station-drawer-iconbtn-wrap">
      <button type="button" class="cz-station-drawer-iconbtn" aria-label={label} onClick={onClick} disabled={disabled}>
        {children}
      </button>
      <span class="cz-station-drawer-iconbtn-tooltip" role="tooltip">{label}</span>
    </span>
  );
}
