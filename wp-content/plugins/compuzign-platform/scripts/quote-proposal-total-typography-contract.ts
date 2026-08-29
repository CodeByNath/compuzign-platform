import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Quote proposal total typography: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const css = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');

// Phase 8H live typography correction: `.cz-proposal__total-amount` and its
// `--primary` modifier had drifted onto made-up literal sizes (1.5rem/2rem)
// instead of the token scale every other proposal text element already
// uses — the only proposal text above the token ceiling, causing overflow
// on screen and carrying unscaled into the printable/PDF proposal (which
// only sets a base font-size for the whole document; a `rem`-sized child
// rule ignores that entirely). Lock both rules onto the token scale and
// reject a regression back to a literal size.
const totalAmountBlock = css.match(/\.cz-proposal__total-amount\s*\{[^}]*\}/);
check(!!totalAmountBlock, '.cz-proposal__total-amount rule is present');
check(totalAmountBlock![0].includes('font-size: var(--cz-font-size-lg)'), '.cz-proposal__total-amount uses the --cz-font-size-lg token, not a literal size');
check(!/font-size:\s*[\d.]+(rem|px|pt|em)/.test(totalAmountBlock![0]), '.cz-proposal__total-amount must never use a literal rem/px/pt/em font-size');

const primaryTotalAmountBlock = css.match(/\.cz-proposal__total-row--primary \.cz-proposal__total-amount\s*\{[^}]*\}/);
check(!!primaryTotalAmountBlock, '.cz-proposal__total-row--primary .cz-proposal__total-amount rule is present');
check(primaryTotalAmountBlock![0].includes('font-size: var(--cz-font-size-xl)'), '.cz-proposal__total-row--primary .cz-proposal__total-amount uses the --cz-font-size-xl token, not a literal size');
check(!/font-size:\s*[\d.]+(rem|px|pt|em)/.test(primaryTotalAmountBlock![0]), '.cz-proposal__total-row--primary .cz-proposal__total-amount must never use a literal rem/px/pt/em font-size');

// No print-scoped override may reintroduce a literal size for either rule —
// the printable proposal and the on-screen Review & Finalise Quote panel
// share this exact CSS (same .cz-proposal markup, cloned for print), so a
// literal print override would silently defeat the token fix for PDF only.
const printBlockMatch = css.match(/@media print\s*\{[\s\S]*?\n\}/);
check(!!printBlockMatch, '@media print block is present');
check(!printBlockMatch![0].includes('.cz-proposal__total-amount'), 'no @media print override targets .cz-proposal__total-amount — the token fix applies identically on screen and in the PDF');

// Everything else about these two declarations stays untouched.
check(totalAmountBlock![0].includes('font-weight: 800'), '.cz-proposal__total-amount keeps its existing font-weight');
check(totalAmountBlock![0].includes('color: #111111'), '.cz-proposal__total-amount keeps its existing color');
check(totalAmountBlock![0].includes('white-space: nowrap'), '.cz-proposal__total-amount keeps its existing white-space');

console.log('Quote proposal total typography contract passed.');
