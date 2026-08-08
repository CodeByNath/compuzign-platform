// Contract: the Edition child navigation stays one flat, renderer-agnostic
// secondary nav — DrawerGroupTabs and DrawerGroupAccordion each publish their
// own sticky-chrome offset through the same inherited CSS variable rather
// than ChildChipStrip special-casing either renderer, and ChildChipStrip's
// hide-on-scroll behavior listens on an explicit `scrollContainer` prop
// rather than reaching for a drawer DOM ancestor itself.
//
// This reads composition and CSS text. It does not execute Preact, so it
// asserts no rendered pixel and no browser behaviour — the same convention
// station-tabset-contract.ts documents for the one other "mounted-sounding"
// contract in this repo. There is no DOM-mounting test harness here; real
// visual/interaction verification of sticky/hide behaviour in Tabs vs.
// Accordion mode requires manual QA in a running build.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let checks = 0;

function check(condition: unknown, message: string): asserts condition {
  checks += 1;
  if (!condition) throw new Error(`Child nav sticky-reveal contract: ${message}`);
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
  drawerGroupAccordion.includes("--cz-drawer-group-chrome-h: 0px")
    && !drawerGroupAccordion.includes('ResizeObserver'),
  'DrawerGroupAccordion publishes a static 0 for the same variable — no new sticky accordion-header system, no observer needed',
);

// ── ChildChipStrip: renderer-agnostic, no closest(), explicit scrollContainer ─

check(
  !childChipStrip.includes('closest('),
  'ChildChipStrip never performs its own DOM-ancestor lookup — the scroll container is presentation wiring supplied by the caller',
);
check(
  childChipStrip.includes('scrollContainer') && childChipStrip.includes("from './useScrollHide'"),
  'ChildChipStrip accepts an explicit scrollContainer prop and drives its hide state through the shared useScrollHide primitive',
);
check(
  childChipStrip.includes("inline: 'nearest'") && childChipStrip.includes("block: 'nearest'"),
  'selecting/creating an Edition scrolls it into view horizontally only — block: "nearest" guards against any unwanted vertical repositioning',
);
check(
  !childChipStrip.includes('cz-cost-builder'),
  'ChildChipStrip borrows no Cost Builder/public UI class',
);

// ── TierDrawerContent resolves the scroll container once and forwards it ────

check(
  tierDrawerContent.includes("closest<HTMLElement>('.cz-station-drawer__body')"),
  'TierDrawerContent — not the generic primitive — resolves the drawer\'s own scrolling body once, since it is the layer that already assumes drawer-kit\'s DOM shape',
);
check(
  tierDrawerContent.includes('scrollContainer={scrollContainer}'),
  'TierDrawerContent forwards the resolved scroll container down to TierEditionDeclarationSwitcher',
);
check(
  switcher.includes('scrollContainer={scrollContainer}'),
  'TierEditionDeclarationSwitcher forwards scrollContainer through to ChildChipStrip unchanged',
);

// ── CSS: flat text nav, sticky-under-chrome, hidden state, no visible scrollbar ─

check(
  /\.cz-drawer-groups__chip\s*\{[^}]*\}/.test(drawerKitCss)
    && !/\.cz-drawer-groups__chip\s*\{[^}]*border-radius/.test(drawerKitCss)
    && !/\.cz-drawer-groups__chip\s*\{[^}]*border:\s*1px/.test(drawerKitCss),
  'the chip is a flat text label — no border-radius and no drawn border — not a pill/button',
);
check(
  /\.cz-drawer-groups__chip--active::after\s*\{/.test(drawerKitCss),
  'the active item carries a thin underline (::after), the same recipe .cz-drawer-groups__tab--active::after already uses',
);
check(
  /\.cz-drawer-groups__chip-strip\s*\{[^}]*position:\s*sticky;[^}]*top:\s*var\(--cz-drawer-group-chrome-h/.test(drawerKitCss),
  'the strip is sticky at a position derived from the inherited chrome-height variable, not a hard-coded pixel value',
);
check(
  drawerKitCss.includes('.cz-drawer-groups__chip-strip--hidden') && drawerKitCss.includes('translateY(-100%)'),
  'a hidden modifier class exists for the scroll-hide behaviour',
);
check(
  /\.cz-drawer-groups__chip-strip\s*\{[^}]*scrollbar-width:\s*none/.test(drawerKitCss)
    && drawerKitCss.includes('.cz-drawer-groups__chip-strip::-webkit-scrollbar'),
  'horizontal scrolling remains available with the scrollbar hidden cross-browser',
);

console.log(`Child nav sticky-reveal contract passed: ${checks} checks.`);
