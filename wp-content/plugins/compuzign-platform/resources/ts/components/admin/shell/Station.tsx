import type { ComponentChildren } from 'preact';

/**
 * Station shell contract — Admin Shell System P2.
 *
 * The shared internal layout every admin station inherits. The four zones are
 * FLAT SIBLINGS; only Content stretches. Do not nest Toolbar/Actions inside Content,
 * and do not make Content responsible for the controls above it.
 *
 *   <Station>
 *     <Station.Header> … </Station.Header>   ← fixed-size zone
 *     <Station.Toolbar> … </Station.Toolbar> ← fixed-size zone
 *     <Station.Actions> … </Station.Actions> ← fixed-size zone
 *     <Station.Content> … </Station.Content> ← the only stretch zone
 *   </Station>
 *
 * CSS contract lives in admin.css (.cz-shell-workstation*). Those class names keep
 * the older spelling deliberately: renaming selectors is a separate, styling-risk
 * change and is out of scope for the symbol rename.
 * Generalised from the Service Catalog pilot; see docs/architecture/AdminShellSystem-v2.md.
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

export function Station({ children, className }: ZoneProps) {
  return <div class={cx('cz-shell-workstation', className)}>{children}</div>;
}

Station.Header = function StationHeader({ children, className }: ZoneProps) {
  return <div class={cx('cz-shell-workstation__header', className)}>{children}</div>;
};

Station.Toolbar = function StationToolbar({ children, className }: ZoneProps) {
  return <div class={cx('cz-shell-workstation__toolbar', className)}>{children}</div>;
};

Station.Actions = function StationActions({ children, className }: ZoneProps) {
  return <div class={cx('cz-shell-workstation__actions', className)}>{children}</div>;
};

Station.Content = function StationContent({ children, className }: ZoneProps) {
  return <div class={cx('cz-shell-workstation__content', className)}>{children}</div>;
};
