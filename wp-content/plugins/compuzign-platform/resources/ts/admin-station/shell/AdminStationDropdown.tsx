// A small, anchored right-side dropdown surface.
//
// It owns only positioning, open/close (handled by the Header), and
// token-driven surface styling (border, radius, shadow, light/dark) — never
// menu content or item behaviour, which the caller supplies as children. It
// is anchored by CSS beneath its trigger inside a relatively-positioned
// control wrapper.

import type { ComponentChildren } from 'preact';

interface Props {
  id: string;
  labelledBy: string;
  children?: ComponentChildren;
}

export function AdminStationDropdown({ id, labelledBy, children }: Props) {
  return (
    <div id={id} class="cz-station-dropdown" role="menu" aria-labelledby={labelledBy}>
      {children}
    </div>
  );
}
