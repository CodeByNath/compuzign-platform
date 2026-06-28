import type { ComponentChildren } from 'preact';

/**
 * Workstation shell contract — Admin Shell System P2.
 *
 * The shared internal layout every admin workstation inherits. The four zones are
 * FLAT SIBLINGS; only Content stretches. Do not nest Toolbar/Actions inside Content,
 * and do not make Content responsible for the controls above it.
 *
 *   <Workstation>
 *     <Workstation.Header> … </Workstation.Header>   ← fixed-size zone
 *     <Workstation.Toolbar> … </Workstation.Toolbar> ← fixed-size zone
 *     <Workstation.Actions> … </Workstation.Actions> ← fixed-size zone
 *     <Workstation.Content> … </Workstation.Content> ← the only stretch zone
 *   </Workstation>
 *
 * CSS contract lives in admin.css (.cz-shell-workstation*). Generalised from the
 * Service Catalog pilot; see docs/architecture/AdminShellSystem-v2.md.
 *
 * `className` on each zone lets a view layer module-scoped behaviour (e.g. a table
 * layout) on top of the contract without forking it.
 */

interface ZoneProps {
  children: ComponentChildren;
  className?: string;
}

function cx(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base;
}

export function Workstation({ children, className }: ZoneProps) {
  return <div class={cx('cz-shell-workstation', className)}>{children}</div>;
}

Workstation.Header = function WorkstationHeader({ children, className }: ZoneProps) {
  return <div class={cx('cz-shell-workstation__header', className)}>{children}</div>;
};

Workstation.Toolbar = function WorkstationToolbar({ children, className }: ZoneProps) {
  return <div class={cx('cz-shell-workstation__toolbar', className)}>{children}</div>;
};

Workstation.Actions = function WorkstationActions({ children, className }: ZoneProps) {
  return <div class={cx('cz-shell-workstation__actions', className)}>{children}</div>;
};

Workstation.Content = function WorkstationContent({ children, className }: ZoneProps) {
  return <div class={cx('cz-shell-workstation__content', className)}>{children}</div>;
};
