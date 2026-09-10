// Contract: focused composable shell heading + shared Edition cue hover
// presentation (project-work/2026-09-10-focused-edition-selector-visual-
// refinement.md).
//
// Live finding: the focused composable surface rendered the ACTIVE
// declaration's own label (`Default`/`Subscriptions`/…) as a large heading
// directly above a cue selector whose own labels already say exactly that,
// and `ComposableOfferBrowser` rendered a second `Upgrade your build` title
// below it. Separately, hovering any cue destination painted a large
// rectangular slab behind the track.
//
// Properties locked:
//   1. the focused composable shell's heading is the fixed customer title
//      `Upgrade your build` — never derived from the selected Edition/
//      composable label;
//   2. no composable Edition label is rendered as a heading on that surface;
//      the cue labels (showLabels) remain the only place they appear;
//   3. `ComposableOfferBrowser` renders its own title only on the surface
//      that has none of its own (`build_your_own`), and the browse section
//      keeps an accessible name either way;
//   4. `Recommended Upgrades` and the filter/catalogue structure are intact;
//   5. `.cz-package-builder__cue-target` paints NO hover background, in
//      source CSS and in the built stylesheet that actually ships;
//   6. its geometry/hit area is unchanged (absolute, top/bottom inset, zero
//      padding/margin/border) — the target stays as large as it was;
//   7. keyboard focus keeps its own untouched `:focus-visible` indicator,
//      never merged into or removed with the hover rule;
//   8. the cue control itself is unchanged: same destinations built from
//      real Edition ids, same aria-current/aria-label semantics;
//   9. (live re-check round) the selected cue ball has NO positional
//      transition in source or built CSS — selection is immediate, in the
//      same render that switches the Edition/catalogue, never an animated
//      slide from the previous destination that reads as the old one
//      staying selected.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Focused Edition selector presentation contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const adapterSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx'), 'utf8');
const browserSource = readFileSync(resolve(root, 'resources/ts/components/package-builder/ComposableOfferBrowser.tsx'), 'utf8');
const cssSource = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');
const builtCss = readFileSync(resolve(root, 'dist/css/cost-builder.css'), 'utf8');

// The focused composable browsing branch only — a normal Tier's own focused
// shell keeps its dynamic name and is deliberately not touched here.
const browsingBranch = adapterSource.match(/\} else if \(upgradeGateActive === 'browsing' && selectedTierId !== null\) \{[\s\S]*?<ComposableOfferBrowser/);
check(browsingBranch !== null, 'the focused composable browsing branch is found in FamilyTierAdapter.tsx');
const branchBody = browsingBranch![0];

// ── 1-2. Fixed heading, no declaration label as a heading ─────────────────

check(
  /<h3 class="cz-package-builder__focused-name">Upgrade your build<\/h3>/.test(branchBody),
  'the focused composable shell renders the fixed heading `Upgrade your build`',
);
check(
  !/<h3[^>]*cz-package-builder__focused-name[^>]*>\s*\{/.test(branchBody),
  'that heading is static text — never an expression deriving the active Edition/composable label, which is what duplicated the cue labels below it',
);
check(
  !/selectedEdition\?\.label/.test(branchBody),
  'the branch no longer reads selectedEdition?.label for presentation at all',
);

// ── 8. The cue control itself is untouched ────────────────────────────────

check(
  /<EditionCueSelector\s*\n\s*destinations=\{\[\{ id: null, label: 'Default' \}, \.\.\.composableEditionOptions\.map\(\(edition\) => \(\{ id: edition\.id, label: edition\.label \}\)\)\]\}/.test(branchBody),
  'cue destinations are still built from the composable occupant\'s own real Edition ids and labels — no label/index substitution',
);
check(
  /showLabels/.test(branchBody),
  'showLabels is retained: the cue labels are now the ONLY place the declaration names appear on this surface',
);
check(
  /aria-current=\{active \? 'true' : undefined\}/.test(adapterSource) && /aria-label=\{destination\.label\}/.test(adapterSource),
  'each cue target keeps its aria-current/aria-label semantics',
);

// ── 3-4. No second copy of the title; accessible name and structure kept ──

check(
  /const ownsHeading = context === 'build_your_own';/.test(browserSource),
  'ComposableOfferBrowser renders its own title only for `build_your_own`, the surface with no heading of its own',
);
check(
  /\{ownsHeading && <h3 id="cz-composable-heading" class="cz-heading-sm">\{heading\}<\/h3>\}/.test(browserSource),
  'the inner title is conditional — in the focused composable shell the surface heading above is the only copy',
);
check(
  /aria-labelledby=\{ownsHeading \? 'cz-composable-heading' : undefined\}/.test(browserSource)
  && /aria-label=\{ownsHeading \? undefined : heading\}/.test(browserSource),
  'the browse section keeps an accessible name either way — labelled by its own heading when it renders one, carrying the title as aria-label when the shell above owns it',
);
check(
  /<p class="cz-package-builder__composable-subheading">Recommended Upgrades<\/p>/.test(browserSource),
  'the subordinate `Recommended Upgrades` text is preserved',
);
check(
  /cz-package-builder__composable-filters/.test(browserSource),
  'the catalogue/filter structure is untouched',
);

// ── 5-7. Cue target: no hover slab, same hit area, focus intact ───────────

const targetRule = cssSource.match(/\.cz-package-builder__cue-target \{[\s\S]*?\}/);
check(targetRule !== null, 'the .cz-package-builder__cue-target rule is found');
check(
  !/\.cz-package-builder__cue-target:hover/.test(cssSource),
  'no :hover rule exists for the cue target — the visible rectangular hover slab is gone for EVERY focused-shell caller, composable and normal Tier alike',
);
check(
  !/\.cz-package-builder__cue-target:hover/.test(builtCss),
  'the built stylesheet that actually ships carries no cue-target :hover rule either (dist must be rebuilt with the source change)',
);
for (const declaration of ['position: absolute', 'top: 0', 'bottom: 0', 'padding: 0', 'margin: 0', 'border: 0', 'cursor: pointer']) {
  check(
    targetRule![0].includes(declaration),
    `the target's own geometry is unchanged (${declaration}) — the full invisible click/tap and mobile hit area is preserved, only the paint is removed`,
  );
}
check(
  /\.cz-package-builder__cue-target:focus-visible \{\s*\n\s*outline: 2px solid var\(--cz-color-accent\);\s*\n\s*outline-offset: 2px;\s*\n\s*\}/.test(cssSource),
  'keyboard focus keeps its own separate, unchanged :focus-visible indicator — hover and focus were never one rule, so removing hover never touched accessibility',
);
check(
  /cue-target:focus-visible\{outline:2px solid var\(--cz-color-accent\);outline-offset:2px\}/.test(builtCss),
  'that focus indicator is present in the built stylesheet too',
);

// ── 9. Selected cue ball snaps — no positional transition ─────────────────

const ballRule = cssSource.match(/\.cz-package-builder__cue-ball \{[\s\S]*?\n\}/);
check(ballRule !== null, 'the .cz-package-builder__cue-ball rule is found');
// Comments stripped first: the rule documents WHY the animation is gone, so
// the word itself legitimately appears in prose inside the block.
const ballDeclarations = ballRule![0].replace(/\/\*[\s\S]*?\*\//g, ' ');
check(
  !/transition/.test(ballDeclarations),
  'the cue ball declares no transition at all — it used to animate `left`, sliding from the old destination after the Edition/catalogue had already switched, which read as the old destination staying selected; a shorter duration is not a substitute',
);
const builtBallRule = builtCss.match(/cz-package-builder__cue-ball\{[^}]*\}/);
check(builtBallRule !== null, 'the built cue ball rule is found');
check(
  !/transition/.test(builtBallRule![0]),
  'the shipped stylesheet carries no cue ball transition either (dist must be rebuilt with the source change)',
);
for (const declaration of ['position: absolute', 'top: 50%', 'width: 18px', 'height: 18px', 'border-radius: 50%', 'box-shadow: 0 0 0 5px var(--cz-color-surface-2)', 'transform: translate(-50%, -50%)', 'pointer-events: none']) {
  check(
    ballDeclarations.includes(declaration),
    `the ball's own size/shadow/geometry is unchanged (${declaration}) — only the animation was removed`,
  );
}
check(
  /onClick=\{\(\) => onSelect\(destination\.id\)\}/.test(adapterSource),
  'selection still happens directly in the click handler — no timeout, deferred state or delayed content swap was introduced in place of the removed animation',
);

console.log('Focused Edition selector presentation contract: PASS');
