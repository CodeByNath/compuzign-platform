// Contract: the Edition child navigation stays one renderer-agnostic
// secondary nav — DrawerGroupTabs and DrawerGroupAccordion each publish
// their own sticky-chrome offset through the same inherited CSS variable
// rather than ChildChipStrip special-casing either renderer.
//
// Scroll-direction hide/reveal (useScrollHide) is Tabs-mode only: it is not
// a property of ChildChipStrip or useScrollHide themselves — both stay
// generic and take whatever scrollContainer they're handed — it is a
// decision TierDrawerContent makes by only resolving a real container while
// `tierGroupView === 'tabs'` and passing `null` otherwise. Accordion mode
// therefore gets sticky positioning with no hide/reveal, with no mode
// branch anywhere inside the generic primitives.
//
// This reads composition and CSS text. It does not execute Preact, so it
// asserts no rendered pixel and no browser behaviour — the same convention
// station-tabset-contract.ts documents for the one other "mounted-sounding"
// contract in this repo. There is no DOM-mounting test harness here; real
// visual verification of hide/reveal in Tabs vs. sticky-only in Accordion
// requires manual QA in a running build (the mounted Tier Edition lifecycle
// regression does cover the Accordion-mode structural wiring and the
// Tabs-mode scroll-hide sequence — see tier-edition-lifecycle-regression.mjs
// section 13).

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

const useScrollHide = source('resources/ts/drawer-kit/ui/useScrollHide.ts');
const childChipStrip = source('resources/ts/drawer-kit/ui/ChildChipStrip.tsx');
const drawerGroupTabs = source('resources/ts/drawer-kit/ui/DrawerGroupTabs.tsx');
const drawerGroupAccordion = source('resources/ts/drawer-kit/ui/DrawerGroupAccordion.tsx');
const drawerKitCss = source('resources/css/modules/drawer-kit.css');
const tierDrawerContent = source('resources/ts/package-station/drawer/tier/TierDrawerContent.tsx');
const switcher = source('resources/ts/package-station/drawer/tier/TierEditionDeclarationSwitcher.tsx');

// ── useScrollHide: direction-hysteresis, container-scoped, never window ─────

check(
  !useScrollHide.includes('window.addEventListener') && !useScrollHide.includes('window.scrollY'),
  'useScrollHide listens on the caller-supplied container element, never `window` — unlike the one existing Cost Builder scroll-hide pattern',
);
check(
  useScrollHide.includes('thresholdPx') && useScrollHide.includes('accumRef'),
  'useScrollHide accumulates delta against a threshold rather than flipping on every scroll tick',
);

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

// ── ChildChipStrip: renderer-agnostic, no closest(), takes scrollContainer ──

check(
  !childChipStrip.includes('closest('),
  'ChildChipStrip never performs its own DOM-ancestor lookup — the scroll container, and whether it is non-null at all, is presentation wiring supplied by the caller',
);
check(
  childChipStrip.includes('scrollContainer') && childChipStrip.includes("from './useScrollHide'"),
  'ChildChipStrip accepts an explicit scrollContainer prop and drives its hide state through the shared useScrollHide primitive — it carries no Tabs/Accordion mode check of its own',
);
check(
  childChipStrip.includes("inline: 'nearest'") && childChipStrip.includes("block: 'nearest'"),
  'selecting/creating an Edition scrolls it into view horizontally only — block: "nearest" guards against any unwanted vertical repositioning',
);
check(
  !childChipStrip.includes('cz-cost-builder'),
  'ChildChipStrip borrows no Cost Builder/public UI class',
);

// ── TierDrawerContent: hide/reveal is Tabs-only, decided at the composition layer ─

check(
  /tierGroupView\s*===\s*'tabs'\s*\?\s*\(rootEl\?\.closest/.test(tierDrawerContent),
  'TierDrawerContent only resolves a real scroll container while Tabs mode is active — Accordion mode gets null, disabling hide/reveal with no branch inside the generic primitives',
);
check(
  tierDrawerContent.includes('scrollContainer={scrollContainer}'),
  'TierDrawerContent forwards the (possibly null) scroll container down to TierEditionDeclarationSwitcher',
);
check(
  switcher.includes('scrollContainer={scrollContainer}'),
  'TierEditionDeclarationSwitcher forwards scrollContainer through to ChildChipStrip unchanged',
);

// ── CSS: sticky-under-chrome, pill chip, tab-matched font-size, no underline ─

check(
  /\.cz-drawer-groups__chip-strip\s*\{[^}]*position:\s*sticky;[^}]*top:\s*var\(--cz-drawer-group-chrome-h/.test(drawerKitCss),
  'the strip is sticky at a position derived from the inherited chrome-height variable, not a hard-coded pixel value',
);
check(
  drawerKitCss.includes('.cz-drawer-groups__chip-strip--hidden') && drawerKitCss.includes('translateY(-100%)'),
  'a hidden modifier class exists for the Tabs-only scroll-hide behaviour',
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
  /\.cz-drawer-groups__chip\s*\{[^}]*font-size:\s*var\(--admin-fs-label\)/.test(drawerKitCss),
  'the chip\'s font-size matches the main group tab\'s own font-size (--admin-fs-label), not a smaller secondary scale',
);
check(
  !drawerKitCss.includes('.cz-drawer-groups__chip--active::after') && !drawerKitCss.includes('.cz-admin-station .cz-drawer-groups__chip--active::after'),
  'the active chip carries no underline (base rule or admin-station override) — the pill background alone marks it active',
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
