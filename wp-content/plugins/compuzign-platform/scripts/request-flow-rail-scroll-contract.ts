import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Request flow rail scroll contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const css = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ');
const orderSummarySource = readFileSync(
  resolve(root, 'resources/ts/components/request-flow/OrderSummary.tsx'),
  'utf8',
);

// Matches only a rule where `selector` is standalone (not preceded by a
// comma, i.e. not one item of some other selector list like the
// scrollbar-hiding `.cz-rf-left, .cz-os__scroll { ... }` rule below) — so
// this finds the real dedicated rule even when the class name also appears
// earlier in the file as part of an unrelated multi-selector list.
function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('(?<!,\\s{0,40})' + escaped + '\\s*\\{([^}]*)\\}');
  const m = css.match(re);
  check(m, `expected a standalone rule for '${selector}' in cost-builder.css`);
  return m![1];
}

// .cz-rf-right's own max-height must be relative to its actual flex parent
// (.cz-rf-body), not a 100vh-relative calc(). The calc() undersized the
// header + backdrop-padding overhead it was trying to subtract, so the rail
// grew taller than .cz-rf-body's own (overflow:hidden, non-scrolling) box —
// hard-clipping the sticky actions bar and help footer regardless of any
// scroll gesture. Live-proven fix: a percentage of the flex parent's height.
const rightRule = ruleBody('.cz-rf-right');
check(!/max-height:\s*calc\(100vh/.test(rightRule), '.cz-rf-right must not size itself off a 100vh-relative calc() — that overshoots .cz-rf-body\'s actual available height');
check(/max-height:\s*96%/.test(rightRule), '.cz-rf-right keeps the live-proven 96% max-height (relative to .cz-rf-body\'s definite flex height)');
check(/padding:\s*var\(--cz-space-5\)\s+var\(--cz-space-5\)\s+0/.test(rightRule), '.cz-rf-right\'s own bottom padding is cleared to 0 — the bottom breathing room lives on .cz-os__footer instead so it does not eat into the 96% budget');

// Live-gate correction (2026-09-05, "Review panel exposes scrolling content
// through the footer gap"): a single .cz-rf-right scroll box with a
// position:sticky actions bar inside it left the flex `gap` immediately
// around that sticky element unpainted (gap is the flex CONTAINER's own
// background, never either flanking child's), so scrolling content behind
// it showed through that narrow strip. Fixed structurally: .cz-rf-right no
// longer scrolls at all — it hosts .cz-os, which splits into its own
// .cz-os__scroll viewport (the ONLY scrolling region) and a separate,
// non-scrolling, opaque .cz-os__footer (Print/Save as PDF, Submit, help)
// that can never be scrolled behind.
check(!/overflow-y:\s*auto/.test(rightRule), '.cz-rf-right must NOT scroll itself — scrolling now belongs solely to the nested .cz-os__scroll, so no shared scroll box + sticky-footer gap-leak can recur');
check(/overflow:\s*hidden/.test(rightRule), '.cz-rf-right clips at its own boundary (overflow: hidden) — it is a flex host for .cz-os, not a scroll container');

const scrollRule = ruleBody('.cz-os__scroll');
check(/overflow-y:\s*auto/.test(scrollRule), '.cz-os__scroll is the one actual scrolling viewport for the right panel\'s content');
check(/flex:\s*1/.test(scrollRule), '.cz-os__scroll must flex to fill the available height above the footer');
check(/min-height:\s*0/.test(scrollRule), '.cz-os__scroll needs min-height: 0 to actually shrink/scroll inside a flex column rather than overflowing it');

const footerRule = ruleBody('.cz-os__footer');
check(/flex-shrink:\s*0/.test(footerRule), '.cz-os__footer must not shrink — it is the fixed, always-visible action/help band, structurally separate from the scrolling content above it');
check(/background:\s*var\(--cz-color-surface\)/.test(footerRule), '.cz-os__footer needs its own opaque background — it is no longer relying on .cz-os__actions\'s sticky background to stay opaque');
check(/padding:[^;]*var\(--cz-space-5\)/.test(footerRule), '.cz-os__footer carries the bottom breathing room that used to live on .cz-rf-right\'s own padding / .cz-os__help\'s padding-bottom');

// .cz-os__actions itself no longer needs position:sticky — .cz-os__footer's
// own structural separation from the scroll viewport is what keeps it
// reachable and un-leaked-through now, not sticky positioning inside a
// shared scroll box.
const actionsRule = ruleBody('.cz-os__actions');
check(!/position:\s*sticky/.test(actionsRule), '.cz-os__actions must not rely on position:sticky any more — .cz-os__footer\'s structural separation from .cz-os__scroll is the fix, and a reintroduced sticky-in-shared-scroll-box shape would reopen the exact gap-leak this contract guards against');

// OrderSummary.tsx must actually nest the DOM this way: .cz-os__footer is a
// sibling of .cz-os__scroll (both children of .cz-os), not nested inside it
// — nesting it back inside .cz-os__scroll would put the actions/help back
// in the same scroll box the whole fix was designed to get them out of.
check(orderSummarySource.includes('class="cz-os__scroll"'), 'OrderSummary.tsx must render a .cz-os__scroll wrapper around the scrollable header/prepared/services/total content');
check(orderSummarySource.includes('class="cz-os__footer"'), 'OrderSummary.tsx must render a .cz-os__footer wrapper around the actions + help content');
const scrollOpenIndex = orderSummarySource.indexOf('class="cz-os__scroll"');
const footerOpenIndex = orderSummarySource.indexOf('class="cz-os__footer"');
check(scrollOpenIndex >= 0 && footerOpenIndex > scrollOpenIndex, '.cz-os__footer must appear after .cz-os__scroll in source order (sibling, not ancestor — nesting it back inside .cz-os__scroll would put the actions/help back in the same scroll box the fix removed them from)');
// .cz-os__actions/.cz-os__help must sit textually AFTER .cz-os__scroll's own
// closing tag, never between its opening tag and that close — i.e. inside it.
const footerActionsIndex = orderSummarySource.indexOf('class="cz-os__actions"');
const scrollCloseIndex = orderSummarySource.lastIndexOf('</div>', footerOpenIndex);
check(scrollCloseIndex > scrollOpenIndex && footerActionsIndex > scrollCloseIndex, '.cz-os__actions must be rendered outside (after the closing tag of) .cz-os__scroll');

// .cz-rf-left keeps its own overflow-y: auto. Its Back/Continue nav
// (.cz-rf-left__nav) is NOT sticky — it sits in normal flow inside the same
// scrollable column as the contact form — so removing this would reproduce
// the identical clip-based unreachability bug for the Contact step's
// Continue button once .cz-rf-body (overflow:hidden) clips the excess.
const leftRule = ruleBody('.cz-rf-left');
check(/overflow-y:\s*auto/.test(leftRule), '.cz-rf-left must keep overflow-y: auto — its own Continue button has no other scroll owner');
const leftNavRule = ruleBody('.cz-rf-left__nav');
check(!/position:\s*sticky/.test(leftNavRule), 'this contract documents the current (non-sticky) .cz-rf-left__nav shape — if it becomes sticky, .cz-rf-left\'s own scroll may become removable and this contract should be revisited');

// Scrollbar chrome is hidden cross-browser on both panels' actual scroll
// viewports (.cz-rf-left and, since the right panel's scroll ownership
// moved, .cz-os__scroll) — but only the chrome: overflow-y:auto above
// (asserted on each) still owns the actual scroll capability —
// wheel/trackpad/touch/keyboard/focus scrolling is untouched by any of the
// declarations checked here.
const hideRuleMatch = css.match(/\.cz-rf-left,\s*\n?\s*\.cz-os__scroll\s*\{([^}]*)\}/);
check(hideRuleMatch, 'expected a combined .cz-rf-left, .cz-os__scroll rule hiding scrollbar chrome');
const hideRule = hideRuleMatch![1];
check(/scrollbar-width:\s*none/.test(hideRule), 'the combined rule sets scrollbar-width: none (Firefox)');
check(/-ms-overflow-style:\s*none/.test(hideRule), 'the combined rule sets -ms-overflow-style: none (legacy Edge)');

const webkitHideMatch = css.match(/\.cz-rf-left::-webkit-scrollbar,\s*\n?\s*\.cz-os__scroll::-webkit-scrollbar\s*\{([^}]*)\}/);
check(webkitHideMatch, 'expected a combined .cz-rf-left::-webkit-scrollbar, .cz-os__scroll::-webkit-scrollbar rule');
check(/display:\s*none/.test(webkitHideMatch![1]), 'the ::-webkit-scrollbar rule sets display: none (Chromium/WebKit)');

console.log('Request flow rail scroll contract passed.');
