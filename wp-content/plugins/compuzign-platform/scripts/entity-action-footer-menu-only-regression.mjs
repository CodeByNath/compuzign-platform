// EntityActionFooter's opt-in `menuOnly` safety mode — mounted regression
// (single-footer, scope-aware lifecycle command model, Phase 1).
//
// Mounts the REAL EntityActionFooter component (esbuild + happy-dom + Preact
// render, same technique every other mounted regression in this repo uses)
// and proves, against actual DOM click events rather than source-text
// assertions, the one safety invariant this whole correction exists for:
//
//   Clicking the visible split label — with menuOnly set — must never call
//   onSelect. Only an explicit overflow row does. The chevron opens the same
//   menu the label does; neither ever mutates anything on its own.
//
// A second scenario proves the default (menuOnly omitted) path is BYTE-
// IDENTICAL to today's behavior — the split label fires onSelect immediately
// — so every existing consumer (Package Family, Category, Service, and the
// Tier occupant/Edition footers before their own Phase 4 conversion) is
// provably unaffected by this additive change.
//
// Usage: npm run regression:entity-action-footer-menu-only
//    or: node scripts/entity-action-footer-menu-only-regression.mjs

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';
import { Window } from 'happy-dom';

const require = createRequire(import.meta.url);
const { build } = require('esbuild');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/cz-entity-action-footer-menu-only-bundle.mjs');
mkdirSync(dirname(outFile), { recursive: true });

const window = new Window({ url: 'https://cz-test.local/' });
globalThis.window = window;
globalThis.document = window.document;
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.MouseEvent = window.MouseEvent;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

await build({
  entryPoints: [resolve(root, 'resources/ts/drawer-kit/EntityActionFooter.tsx')],
  bundle: true,
  format: 'esm',
  outfile: outFile,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  alias: { '@': resolve(root, 'resources/ts') },
  external: ['preact', 'preact/hooks', 'preact/jsx-runtime'],
  logLevel: 'silent',
});

const { EntityActionFooter } = await import(pathToFileURL(outFile).href);
const { h, render } = await import('preact');
const { useState } = await import('preact/hooks');

const container = document.createElement('div');
document.body.appendChild(container);

const failures = [];
function check(label, cond, detail) {
  if (cond) { console.log(`  ok — ${label}`); }
  else { console.error(`  FAIL — ${label}${detail !== undefined ? `: ${detail}` : ''}`); failures.push(label); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function click(el) { el?.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); await sleep(20); }
function splitBtn() { return container.querySelector('.cz-footer-split__btn'); }
function chevron() { return container.querySelector('.cz-footer-split__chevron'); }
function menuOpen() { return container.querySelector('.cz-footer-split__menu') !== null; }
function menuItem(label) {
  return [...container.querySelectorAll('.cz-footer-split__item')].find((b) => b.textContent.trim() === label);
}

console.log("EntityActionFooter menuOnly regression (single-footer lifecycle command model, Phase 1)\n");

console.log('1) menuOnly: true — the visible split label never mutates, only opens the menu');
let selectCalls = 0;
let toggleCalls = 0;
let disableCalls = 0;
let open = false;

function MenuOnlyHarness() {
  const [, force] = useState(0);
  return h(EntityActionFooter, {
    close: { id: 'close', label: 'Close', onSelect: () => {} },
    split: {
      id: 'lifecycle', label: 'Disable', tone: 'danger', open,
      onSelect: () => { selectCalls += 1; },
      onToggle: () => { toggleCalls += 1; open = !open; force((n) => n + 1); },
      menuOnly: true,
      overflow: [
        { id: 'disable-edition', label: 'Disable Edition — Nath', onSelect: () => { disableCalls += 1; } },
        { id: 'enable-tier', label: 'Enable Tier', onSelect: () => {} },
      ],
    },
  });
}
render(h(MenuOnlyHarness), container);

check('the split label reads the top-level verb', splitBtn()?.textContent.trim() === 'Disable', splitBtn()?.textContent);
check('the menu starts closed', !menuOpen());

await click(splitBtn());
check('clicking the visible label never called onSelect', selectCalls === 0, selectCalls);
check('clicking the visible label opened the menu instead', toggleCalls === 1 && menuOpen(), `toggleCalls=${toggleCalls} open=${menuOpen()}`);

await click(splitBtn());
check('clicking the visible label again closes the menu — still never onSelect', selectCalls === 0 && !menuOpen(), `selectCalls=${selectCalls} open=${menuOpen()}`);

await click(chevron());
check('the chevron opens the same menu the label does', menuOpen());
await click(menuItem('Disable Edition — Nath'));
check('choosing an explicit scoped row is the ONLY thing that mutates', disableCalls === 1 && selectCalls === 0, `disableCalls=${disableCalls} selectCalls=${selectCalls}`);

console.log('\n2) menuOnly omitted — every existing consumer keeps today\'s direct-click behavior, unchanged');
let legacySelectCalls = 0;
let legacyToggleCalls = 0;
render(h(EntityActionFooter, {
  close: { id: 'close', label: 'Close', onSelect: () => {} },
  split: {
    id: 'status', label: 'Disable', tone: 'danger', open: false,
    onSelect: () => { legacySelectCalls += 1; },
    onToggle: () => { legacyToggleCalls += 1; },
    overflow: [{ id: 'archive', label: 'Archive', onSelect: () => {} }],
  },
}), container);
await click(splitBtn());
check('omitting menuOnly still fires onSelect immediately on the visible label — no behavior change for existing consumers', legacySelectCalls === 1 && legacyToggleCalls === 0, `onSelect=${legacySelectCalls} onToggle=${legacyToggleCalls}`);

console.log('\n3) split + splitForward together — two independent menu-only controls (UI refinement, Phase 1), each safe on its own');
function splitControls() { return [...container.querySelectorAll('.cz-footer-split')]; }
function btnAt(i) { return splitControls()[i]?.querySelector('.cz-footer-split__btn'); }
function chevronAt(i) { return splitControls()[i]?.querySelector('.cz-footer-split__chevron'); }
function menuOpenAt(i) { return splitControls()[i]?.querySelector('.cz-footer-split__menu') !== null; }
function itemAt(i, label) {
  return [...(splitControls()[i]?.querySelectorAll('.cz-footer-split__item') ?? [])].find((b) => b.textContent.trim() === label);
}

let lifecycleSelectCalls = 0, lifecycleOpen = false, disableTierCalls = 0;
let publishSelectCalls = 0, publishOpen = false, publishTierCalls = 0;

function TwoSplitHarness() {
  const [, force] = useState(0);
  return h(EntityActionFooter, {
    close: { id: 'close', label: 'Close', onSelect: () => {} },
    split: {
      id: 'lifecycle', label: 'Disable', tone: 'danger', open: lifecycleOpen,
      onSelect: () => { lifecycleSelectCalls += 1; },
      onToggle: () => { lifecycleOpen = !lifecycleOpen; force((n) => n + 1); },
      menuOnly: true,
      overflow: [{ id: 'disable-tier', label: 'Disable Tier', onSelect: () => { disableTierCalls += 1; } }],
    },
    splitForward: {
      id: 'publish', label: 'Publish', tone: 'secondary', open: publishOpen,
      onSelect: () => { publishSelectCalls += 1; },
      onToggle: () => { publishOpen = !publishOpen; force((n) => n + 1); },
      menuOnly: true,
      overflow: [{ id: 'publish-tier', label: 'Publish Tier', onSelect: () => { publishTierCalls += 1; } }],
    },
  });
}
render(h(TwoSplitHarness), container);

check('two split controls are mounted (left lifecycle, right publish)', splitControls().length === 2, splitControls().length);
check('left split reads Disable, right split reads Publish', btnAt(0)?.textContent.trim() === 'Disable' && btnAt(1)?.textContent.trim() === 'Publish', `${btnAt(0)?.textContent} / ${btnAt(1)?.textContent}`);

// Layout: [Split] [Close] ..................... [Publish Split] — Close
// sits beside the LEFT split, never beside the right one, whenever
// splitForward is present.
{
  const closeBtn = [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Close');
  const order = [...container.querySelectorAll('.cz-footer-split, .cz-admin-btn--secondary')];
  const closeIndex = order.indexOf(closeBtn);
  const lifecycleIndex = order.indexOf(splitControls()[0]);
  const publishIndex = order.indexOf(splitControls()[1]);
  check('Close renders immediately after the LEFT (lifecycle) split, before the RIGHT (publish) split', lifecycleIndex < closeIndex && closeIndex < publishIndex, `lifecycle=${lifecycleIndex} close=${closeIndex} publish=${publishIndex}`);
}

await click(btnAt(0));
check('clicking the LEFT (lifecycle) label never mutates, only opens its own menu', lifecycleSelectCalls === 0 && menuOpenAt(0), `selectCalls=${lifecycleSelectCalls} open=${menuOpenAt(0)}`);
check('the RIGHT (publish) menu is unaffected by the left one opening', !menuOpenAt(1));

await click(btnAt(1));
check('clicking the RIGHT (publish) label never mutates, only opens its own menu', publishSelectCalls === 0 && menuOpenAt(1), `selectCalls=${publishSelectCalls} open=${menuOpenAt(1)}`);
check('the LEFT (lifecycle) menu stays open independently — the two controls do not share state', menuOpenAt(0));

await click(itemAt(1, 'Publish Tier'));
check('choosing a row in the RIGHT menu fires only its own handler', publishTierCalls === 1 && publishSelectCalls === 0 && disableTierCalls === 0, `publishTierCalls=${publishTierCalls} publishSelectCalls=${publishSelectCalls} disableTierCalls=${disableTierCalls}`);

await click(chevronAt(0));
check('the LEFT chevron still opens/closes only the left menu', !menuOpenAt(0));

console.log('');
if (failures.length > 0) {
  console.error(`REGRESSION FAILED — ${failures.length} check(s) did not hold:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('All checks passed — menuOnly is opt-in, additive, and enforces the no-direct-mutation invariant when a caller sets it.');
process.exit(0);
