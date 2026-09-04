import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Quote sidebar scroll contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const css = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ');

/**
 * Isolate the body of the `@media (min-width: 1024px) { ... }` block that
 * owns the desktop sidebar rules, by brace-counting from its opening `{`.
 * The stylesheet has more than one `min-width: 1024px` block elsewhere, so
 * anchor on the sidebar rule that must live inside this specific one.
 */
function extractMediaBlockContaining(source: string, marker: string): string {
  const markerIndex = source.indexOf(marker);
  check(markerIndex >= 0, `expected to find '${marker}' in cost-builder.css`);
  const mediaStart = source.lastIndexOf('@media (min-width: 1024px)', markerIndex);
  check(mediaStart >= 0, `expected a preceding '@media (min-width: 1024px)' before '${marker}'`);
  const braceOpen = source.indexOf('{', mediaStart);
  let depth = 0;
  for (let i = braceOpen; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(braceOpen + 1, i);
    }
  }
  throw new Error(`unterminated '@media (min-width: 1024px)' block containing '${marker}'`);
}

const desktopBlock = extractMediaBlockContaining(css, '.cz-cost-builder--has-quote .cz-cost-builder__sidebar');

// The sticky sidebar itself must stay the single desktop scroll owner: sticky
// positioning, a viewport-bounded max-height, and its own vertical scrollbar.
const sidebarRuleMatch = desktopBlock.match(/\.cz-cost-builder--has-quote \.cz-cost-builder__sidebar\s*\{([^}]*)\}/);
check(sidebarRuleMatch, 'desktop block still defines .cz-cost-builder--has-quote .cz-cost-builder__sidebar');
const sidebarRule = sidebarRuleMatch![1];
check(/position:\s*sticky/.test(sidebarRule), 'sidebar keeps position: sticky at desktop widths');
check(/max-height:\s*calc\(/.test(sidebarRule), 'sidebar keeps a viewport-bounded max-height at desktop widths');
check(/overflow-y:\s*auto/.test(sidebarRule), 'sidebar keeps overflow-y: auto — it is the scroll owner');

// The inner quote list must NOT keep its own competing scroll region at
// desktop widths — that nested trap is what left the footer's Review/PDF
// actions unreachable on short viewports near the 1024px boundary.
const listOverrideMatch = desktopBlock.match(/\.cz-cost-builder--has-quote \.cz-quote-summary__list\s*\{([^}]*)\}/);
check(listOverrideMatch, 'desktop block overrides .cz-cost-builder--has-quote .cz-quote-summary__list so it stops owning its own scroll region');
const listOverride = listOverrideMatch![1];
check(/max-height:\s*none/.test(listOverride), 'desktop override clears the list max-height, so the sidebar is the only scroll boundary');
check(!/overflow-y:\s*(auto|scroll)/.test(listOverride), 'desktop override does not re-declare a scrolling overflow-y on the list');

// Mobile/base behavior (<=1023px) is untouched: the list still caps itself at
// 340px there, since the sidebar itself never scrolls at that width.
const baseListMatch = css.match(/(?<!\{)\n\.cz-quote-summary__list\s*\{([^}]*)\}/);
check(baseListMatch, 'base (non-media) .cz-quote-summary__list rule still exists for mobile');
const baseList = baseListMatch![1];
check(/max-height:\s*340px/.test(baseList), 'mobile keeps the original 340px list cap');
check(/overflow-y:\s*auto/.test(baseList), 'mobile keeps the list scrollable on its own, since the sidebar does not scroll there');

console.log('Quote sidebar scroll contract passed.');
