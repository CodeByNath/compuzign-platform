// Four-group drawer tab bar (drawer refinement blueprint, Phase 0).
//
// Sibling of DrawerTabs.tsx for drawers whose content model needs more than
// the fixed Details/Connections pair. DrawerTabs itself is untouched and
// remains the platform-locked two-tab bar every other drawer renders
// through (see drawer-kit/CLAUDE.md). Same visual language as DrawerTabs
// (.cz-sv-tab* tokens, mirrored under cz-drawer-groups__tab*) — not the
// public Cost Builder tab/accordion system.
//
// Publishes the tablist's own live rendered height (offset by its sticky
// `top`, so the number represents the coordinate its bottom edge actually
// rests at once stuck) as `--cz-drawer-group-chrome-h` on the wrapper around
// this group's content. A group's own content — e.g. Options' ChildChipStrip
// — reads that inherited variable to sit its own sticky nav flush beneath
// this tablist, without either side naming the other's class. Sibling
// DrawerGroupAccordion publishes a static 0 for the same variable, since
// Accordion mode has no persistent sticky chrome above an open panel.

import { useEffect, useRef, useState } from 'preact/hooks';
import type { DrawerGroupNavProps } from './drawerGroups';

export function DrawerGroupTabs<Id extends string>({ groups, activeId, onSelect, trailing }: DrawerGroupNavProps<Id>) {
  const active = groups.find((group) => group.id === activeId);
  const tablistRef = useRef<HTMLDivElement>(null);
  const [chromeHeight, setChromeHeight] = useState(0);

  useEffect(() => {
    const el = tablistRef.current;
    if (!el) return;

    const measure = () => {
      // Feature-detected, not just browser-safe: the mounted lifecycle
      // regressions render this component under a minimal DOM shim
      // (happy-dom via tier-edition-lifecycle-regression.mjs) that provides
      // neither global — falling back to 0 there still yields a stable,
      // sensible height (offsetHeight alone) rather than throwing.
      const topOffset = typeof getComputedStyle === 'function'
        ? parseFloat(getComputedStyle(el).top) || 0
        : 0;
      setChromeHeight(el.offsetHeight + topOffset);
    };
    measure();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div class="cz-drawer-groups__tablist" ref={tablistRef}>
        <div class="cz-drawer-groups__tablist-tabs" role="tablist">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={group.id === activeId}
              class={`cz-drawer-groups__tab${group.id === activeId ? ' cz-drawer-groups__tab--active' : ''}`}
              onClick={() => onSelect(group.id)}
            >
              {group.label}
            </button>
          ))}
        </div>
        {trailing && <div class="cz-drawer-groups__tablist-trailing">{trailing}</div>}
      </div>
      <div class="cz-drawer-groups__content" style={`--cz-drawer-group-chrome-h: ${chromeHeight}px`}>
        {active?.content}
      </div>
    </>
  );
}
