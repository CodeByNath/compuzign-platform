// CRM-1C: the generic icon-only button + tooltip primitive for drawer
// header chrome (first consumer: the Request drawer's Print / Save PDF
// action, see admin-station/stations/requests/RequestDrawerHost.tsx). Names
// no entity — a plain button with an accessible name, a hover/keyboard-focus
// tooltip carrying that same name, and nothing else.
//
// The tooltip is pure CSS (`:hover` on the wrapper, `:focus-visible` on the
// button itself — see admin-station.css's `.cz-icon-btn-tooltip` rules): a
// native `title` attribute alone shows on hover in most browsers but not
// reliably on keyboard focus, which the CRM-1C audit explicitly requires.

import type { ComponentChildren } from 'preact';

interface IconButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ComponentChildren;
}

export function IconButton({ label, onClick, disabled, children }: IconButtonProps) {
  return (
    <span class="cz-icon-btn-wrap">
      <button type="button" class="cz-icon-btn" aria-label={label} onClick={onClick} disabled={disabled}>
        {children}
      </button>
      <span class="cz-icon-btn-tooltip" role="tooltip">{label}</span>
    </span>
  );
}
