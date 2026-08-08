// Contract: the Edition child navigation stays one renderer-agnostic
// secondary nav — DrawerGroupTabs and DrawerGroupAccordion each publish
// their own sticky-chrome offset through the same inherited CSS variable
// rather than ChildChipStrip special-casing either renderer. Sticky
// positioning only — there is no scroll-direction hide/reveal here (that
// behaviour was tried and deliberately removed; ChildChipStrip keeps only
// the plain sticky bar plus its horizontal scroll-into-view courtesy on
// selection).
//
// This reads composition and CSS text. It does not execute Preact, so it
// asserts no rendered pixel and no browser behaviour — the same convention
// station-tabset-contract.ts documents for the one other "mounted-sounding"
// contract in this repo. There is no DOM-mounting test harness here; real
// visual verification in Tabs vs. Accordion mode requires manual QA in a
// running build (the mounted Tier Edition lifecycle regression does cover
// the Accordion-mode structural wiring — see tier-edition-lifecycle-
// regression.mjs section 13).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let checks = 0;

function check(condition: unknown, message: string): asserts condition {
  checks += 1;
  if (!condition) throw new Error(`Child nav sticky contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8');
}

const childChipStrip = source('resources/ts/drawer-kit/ui/ChildChipStrip.tsx');
const drawerGroupTabs = source('resources/ts/drawer-kit/ui/DrawerGroupTabs.tsx');
const drawerGroupAccordion = source('resources/ts/drawer-kit/ui/DrawerGroupAccordion.tsx');
const drawerKitCss = source('resources/css/modules/drawer-kit.css');

// ── DrawerGroupTabs / DrawerGroupAccordion each publish the same variable ───

check(
  drawerGroupTabs.includes('new ResizeObserver')
    && drawerGroupTabs.includes('getComputedStyle(el).top')
    && drawerGroupTabs.includes('--cz-drawer-group-chrome-h'),
  'DrawerGroupTabs measures its own tablist (height + live computed sticky top) and publishes --cz-drawer-group-chrome-h, rather than a hard-coded pixel guess',
);
check(
  drawerGroupAccordion.includes('--cz-drawer-group-chrome-h: 0px')
    && !drawerGroupAccordion.includes('ResizeObserver'),
  'DrawerGroupAccordion publishes a static 0 for the same variable — no new sticky accordion-header system, no observer needed',
);

// ── ChildChipStrip: renderer-agnostic, no closest(), no scroll-hide state ───

check(
  !childChipStrip.includes('closest('),
  'ChildChipStrip never performs its own DOM-ancestor lookup',
);
check(
  !childChipStrip.includes('useScrollHide') && !childChipStrip.includes('scrollContainer'),
  'ChildChipStrip carries no scroll-direction hide/reveal state — sticky positioning is CSS-only now',
);
check(
  childChipStrip.includes("inline: 'nearest'") && childChipStrip.includes("block: 'nearest'"),
  'selecting/creating an Edition scrolls it into view horizontally only — block: "nearest" guards against any unwanted vertical repositioning',
);
check(
  !childChipStrip.includes('cz-cost-builder'),
  'ChildChipStrip borrows no Cost Builder/public UI class',
);

// ── CSS: sticky-under-chrome, pill chip, tokenized gap, no visible scrollbar ─

check(
  /\.cz-drawer-groups__chip-strip\s*\{[^}]*position:\s*sticky;[^}]*top:\s*var\(--cz-drawer-group-chrome-h/.test(drawerKitCss),
  'the strip is sticky at a position derived from the inherited chrome-height variable, not a hard-coded pixel value',
);
check(
  !drawerKitCss.includes('cz-drawer-groups__chip-strip--hidden') && !/\.cz-drawer-groups__chip-strip\s*\{[^}]*transition:\s*transform/.test(drawerKitCss),
  'no hidden modifier or hide/reveal transition remains on the strip — sticky only',
);
check(
  /\.cz-drawer-groups__chip-strip\s*\{[^}]*gap:\s*var\(--cz-space-3\)/.test(drawerKitCss),
  'the strip\'s gap is a spacing token, not a hard-coded pixel value',
);
check(
  /button\.cz-drawer-groups__chip\.cz-drawer-groups__chip\s*\{[^}]*background:\s*var\(--admin-accent-a12\)[^}]*border-radius/.test(drawerKitCss),
  'the chip carries a filled pill background again (specificity-boosted over the flat base rule), not the flat text-only look',
);
check(
  !/\.cz-admin-station \.cz-drawer-groups__chip--active::after/.test(drawerKitCss),
  'the admin-station-scoped override of the active chip\'s underline is gone — that correction was chip-system-specific',
);
check(
  /\.cz-drawer-groups__chip-strip\s*\{[^}]*scrollbar-width:\s*none/.test(drawerKitCss)
    && drawerKitCss.includes('.cz-drawer-groups__chip-strip::-webkit-scrollbar'),
  'horizontal scrolling remains available with the scrollbar hidden cross-browser',
);
check(
  /\.cz-admin-station \.cz-drawer-groups__content \.cz-drawer-groups__chip-strip\s*\{[^}]*margin-top:\s*-24px/.test(drawerKitCss),
  'the Tabs-mode top correction is scoped to .cz-drawer-groups__content (Tabs\' own wrapper), so it never applies inside an Accordion panel',
);

console.log(`Child nav sticky contract passed: ${checks} checks.`);
