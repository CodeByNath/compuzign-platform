import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Request flow rail scroll contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const css = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ');

// Matches only a rule where `selector` is standalone (not preceded by a
// comma, i.e. not one item of some other selector list like the
// scrollbar-hiding `.cz-rf-left, .cz-rf-right { ... }` rule below) — so this
// finds the real dedicated rule even when the class name also appears
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
check(/padding:\s*var\(--cz-space-5\)\s+var\(--cz-space-5\)\s+0/.test(rightRule), '.cz-rf-right\'s own bottom padding is cleared to 0 — the reserve moved into .cz-os__help so it does not eat into the 96% budget');

// The bottom breathing room now lives on the scrollable help footer instead.
const helpRule = ruleBody('.cz-os__help');
check(/padding-bottom:\s*16px/.test(helpRule), '.cz-os__help carries the 16px bottom breathing room that used to be .cz-rf-right\'s own padding');

// .cz-rf-left keeps its own overflow-y: auto. Its Back/Continue nav
// (.cz-rf-left__nav) is NOT sticky — it sits in normal flow inside the same
// scrollable column as the contact form — so removing this would reproduce
// the identical clip-based unreachability bug for the Contact step's
// Continue button once .cz-rf-body (overflow:hidden) clips the excess.
const leftRule = ruleBody('.cz-rf-left');
check(/overflow-y:\s*auto/.test(leftRule), '.cz-rf-left must keep overflow-y: auto — its own Continue button has no other scroll owner');
check(/overflow-y:\s*auto/.test(rightRule), '.cz-rf-right must keep overflow-y: auto — hiding scrollbar chrome must never remove the scroll mechanism itself');
const leftNavRule = ruleBody('.cz-rf-left__nav');
check(!/position:\s*sticky/.test(leftNavRule), 'this contract documents the current (non-sticky) .cz-rf-left__nav shape — if it becomes sticky, .cz-rf-left\'s own scroll may become removable and this contract should be revisited');

// Scrollbar chrome is hidden cross-browser on both panels, but only the
// chrome: overflow-y:auto above (asserted for both panels) still owns the
// actual scroll capability — wheel/trackpad/touch/keyboard/focus scrolling
// is untouched by any of the declarations checked here.
const hideRuleMatch = css.match(/\.cz-rf-left,\s*\n?\s*\.cz-rf-right\s*\{([^}]*)\}/);
check(hideRuleMatch, 'expected a combined .cz-rf-left, .cz-rf-right rule hiding scrollbar chrome');
const hideRule = hideRuleMatch![1];
check(/scrollbar-width:\s*none/.test(hideRule), 'the combined rule sets scrollbar-width: none (Firefox)');
check(/-ms-overflow-style:\s*none/.test(hideRule), 'the combined rule sets -ms-overflow-style: none (legacy Edge)');

const webkitHideMatch = css.match(/\.cz-rf-left::-webkit-scrollbar,\s*\n?\s*\.cz-rf-right::-webkit-scrollbar\s*\{([^}]*)\}/);
check(webkitHideMatch, 'expected a combined .cz-rf-left::-webkit-scrollbar, .cz-rf-right::-webkit-scrollbar rule');
check(/display:\s*none/.test(webkitHideMatch![1]), 'the ::-webkit-scrollbar rule sets display: none (Chromium/WebKit)');

console.log('Request flow rail scroll contract passed.');
