// Contract: shared details-modal close control + responsive focused-occupant
// entry (project-work/2026-09-12-responsive-details-close-and-staged-tier-
// compact.md).
//
// Nath's live finding, two parts:
//   1. the View Details X could disappear on some browsers/viewports. It was
//      an absolutely-positioned SIBLING of the scrolling dialog, translated
//      `translate(35%, -35%)` outside the panel's top-right corner — 14.7px
//      of a 42px control pushed past an edge the backdrop only padded by
//      --cz-space-4 (16px). Anything that consumed that ~1px of remaining
//      clearance clipped the control away, leaving ESC as the only close.
//      Both shared entry points are affected: focused Tier/Edition -> View
//      plan details (PlanDetailsModal) and Cart -> View details
//      (QuoteDetailsOverlay).
//   2. opening a focused occupant on a responsive viewport could leave the
//      customer partway down the newly opened shell instead of at its top.
//
// Properties locked:
//   1. neither modal positions its close control outside the dialog any
//      more — no absolute/translate placement, in either component or in
//      the shared CSS;
//   2. in BOTH components the control is a child of the element carrying
//      role="dialog" (so it is also inside that dialog's focus trap, which
//      it never was before), on the shared sticky rail;
//   3. the rail is genuinely sticky at the dialog's own top, in source CSS
//      and in the built stylesheet that actually ships;
//   4. the preserved modal behavior is untouched: ESC close, backdrop
//      close, focus trap, body scroll lock, and both aria-labels;
//   5. the responsive focused-occupant entry is ONE shell-level rule — a
//      single ref on the single `.cz-package-builder__focused` element both
//      focused branches render, keyed on occupant identity, never a
//      per-occupant scroll bolted onto Tier/add-on/composable separately;
//   6. that key is occupant identity, not variant: it does not read
//      focusedEditionId/composableEditionId, so an in-shell Edition switch
//      never re-scrolls a customer mid-read;
//   7. it reads the customer's explicit `focusedTierId`, never
//      `effectiveFocusedTierId` — the implicit single-Tier landing's
//      auto-focus is deliberately out of scope and untouched;
//   8. it is responsive-only, at the same 767px breakpoint
//      `.cz-package-builder__focused` already stacks at — never a new
//      breakpoint, and desktop is unaffected;
//   9. it honours prefers-reduced-motion, using the same matchMedia idiom
//      the rest of the repository already scrolls with.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Responsive focused entry contract: ${message}`);
}

const root = resolve(import.meta.dirname, '..');
const planModal = readFileSync(resolve(root, 'resources/ts/components/package-builder/PlanDetailsModal.tsx'), 'utf8');
const quoteOverlay = readFileSync(resolve(root, 'resources/ts/components/package-builder/QuoteDetailsOverlay.tsx'), 'utf8');
const adapter = readFileSync(resolve(root, 'resources/ts/components/package-builder/FamilyTierAdapter.tsx'), 'utf8');
const cssSource = readFileSync(resolve(root, 'resources/css/modules/cost-builder.css'), 'utf8');
const builtCss = readFileSync(resolve(root, 'dist/css/cost-builder.css'), 'utf8');
// Declarations only — the rail's own comment records the offset it replaced,
// which is documentation of the defect, not a live rule.
const cssDeclarations = cssSource.replace(/\/\*[\s\S]*?\*\//g, '');

// ── 1-2. The close control lives inside each dialog, on the shared rail ───

for (const [name, source, label] of [
  ['PlanDetailsModal.tsx', planModal, 'Close plan details'],
  ['QuoteDetailsOverlay.tsx', quoteOverlay, 'Close quote details'],
] as const) {
  // The dialog element through to the end of the component's markup.
  const dialogStart = source.indexOf('role="dialog"');
  check(dialogStart !== -1, `${name} still renders a role="dialog" element`);
  const dialogBody = source.slice(dialogStart);

  check(
    dialogBody.includes('cz-package-builder__details-close-rail'),
    `${name} renders the shared sticky close rail INSIDE its dialog element`,
  );
  const railIndex = dialogBody.indexOf('cz-package-builder__details-close-rail');
  const closeIndex = dialogBody.indexOf('cz-package-builder__details-close"');
  check(
    closeIndex > railIndex && closeIndex !== -1,
    `${name}'s close button sits on that rail, inside the dialog — not as a sibling outside it`,
  );

  // The panel must no longer carry the control: everything between the panel
  // wrapper and the dialog element is chrome-free.
  const panelIndex = source.indexOf('cz-package-builder__details-panel');
  check(panelIndex !== -1 && panelIndex < dialogStart, `${name} still renders the sizing panel wrapper`);
  const betweenPanelAndDialog = source.slice(panelIndex, dialogStart);
  check(
    !betweenPanelAndDialog.includes('cz-package-builder__details-close'),
    `${name} no longer renders the close control as a sibling outside the scrolling dialog — that placement is the defect`,
  );

  check(
    source.includes(`aria-label="${label}"`),
    `${name} keeps its own close aria-label ("${label}") — the labels were not genericised by the move`,
  );

  // ── 4. Preserved modal behavior ────────────────────────────────────────
  check(
    /if \(e\.key === 'Escape'\) \{\s*onClose\(\);/.test(source),
    `${name} still closes on ESC`,
  );
  check(
    /class="cz-package-builder__details-backdrop"[\s\S]{0,120}onClick=\{onClose\}/.test(source),
    `${name} still closes on backdrop click`,
  );
  check(
    source.includes("document.body.style.overflow = 'hidden'") && source.includes('document.body.style.overflow = prevOverflow'),
    `${name} still locks and restores body scroll`,
  );
  check(
    source.includes("e.key === 'Tab'") && source.includes('FOCUSABLE_SELECTOR'),
    `${name} still traps focus`,
  );
  check(
    /onClick=\{\(e\) => e\.stopPropagation\(\)\}/.test(source),
    `${name}'s dialog still stops backdrop clicks from closing it when the customer clicks inside`,
  );
}

// ── 1 (CSS) + 3. Shared chrome geometry ──────────────────────────────────

const closeRule = cssSource.match(/\.cz-package-builder__details-close \{[^}]*\}/);
check(closeRule !== null, 'the shared .cz-package-builder__details-close rule is found');
check(
  !/position:\s*absolute/.test(closeRule![0]),
  'the close control is no longer absolutely positioned — it is in flow on the sticky rail',
);
check(
  !/transform:/.test(closeRule![0]),
  'no transform offsets the control outside its box any more — translate(35%, -35%) outside the panel corner is exactly what could be clipped away',
);
check(
  !/translate\(35%, -35%\)/.test(cssDeclarations),
  'that outward translate is gone from the stylesheet\'s declarations entirely, hover state included',
);

const railRule = cssSource.match(/\.cz-package-builder__details-close-rail \{[^}]*\}/);
check(railRule !== null, 'the shared .cz-package-builder__details-close-rail rule exists');
check(
  /position:\s*sticky/.test(railRule![0]) && /top:\s*0/.test(railRule![0]),
  'the rail is sticky to the dialog\'s own top — the same sticky-in-view principle .cz-package-builder__focused-close already uses',
);
check(
  /background:/.test(railRule![0]),
  'the rail is opaque, so body content scrolls behind the control rather than through it',
);
check(
  /\.cz-package-builder__details-close-rail\s*\{[^}]*position:\s*sticky/.test(builtCss)
  && !/translate\(35%, -35%\)/.test(builtCss),
  'the shipped stylesheet carries the rail and has dropped the outward translate (dist must be rebuilt with the source change)',
);

// ── 5-9. One shell-level responsive focused-occupant entry rule ──────────

check(
  (adapter.match(/<div class="cz-package-builder__focused" ref=\{focusedShellRef\}>/g) ?? []).length === 2,
  'both focused branches (normal Tier/add-on, and the composable browsing workspace) carry the SAME shared shell ref — one rule, not a per-occupant copy',
);

const keyRule = adapter.match(/const focusedOccupantKey = [\s\S]*?: null;/);
check(keyRule !== null, 'the shared focused-occupant key is declared');
check(
  /upgradeGateActive === 'browsing'/.test(keyRule![0]),
  'the composable Upgrade/browsing occupant reports through that same key',
);
check(
  /focusedTierId !== null/.test(keyRule![0]) && !/effectiveFocusedTierId/.test(keyRule![0]),
  'the key reads the customer\'s explicit focusedTierId, never effectiveFocusedTierId — the implicit single-Tier landing\'s auto-focus stays untouched',
);
check(
  !/focusedEditionId|composableEditionId/.test(keyRule![0]),
  'the key is occupant identity only — no Edition state, so switching Edition inside an open shell never re-scrolls the customer',
);

const entryEffect = adapter.match(/const enteredOccupantKey = useRef<string \| null>\(null\);[\s\S]*?\}, \[focusedOccupantKey\]\);/);
check(entryEffect !== null, 'the entry effect is keyed on the shared occupant key alone');
const effectBody = entryEffect![0];
check(
  /focusedOccupantKey === null \|\| focusedOccupantKey === previous/.test(effectBody),
  'closing the shell and re-rendering the same occupant are both excluded — only a genuine open/reopen is an entry',
);
check(
  /matchMedia\('\(max-width: 767px\)'\)/.test(effectBody),
  'the entry scroll is responsive-only at 767px — the same breakpoint .cz-package-builder__focused already stacks at',
);
check(
  /@media \(max-width: 767px\) \{\s*\.cz-package-builder__focused \{\s*grid-template-columns: 1fr;/.test(cssSource),
  'that 767px breakpoint is still the stacking breakpoint the effect claims it is — the two must not drift apart',
);
check(
  /prefers-reduced-motion: reduce/.test(effectBody) && /behavior: window\.matchMedia/.test(effectBody),
  'the scroll honours prefers-reduced-motion, using the repository\'s existing matchMedia idiom',
);
check(
  /block: 'start'/.test(effectBody),
  'the occupant is brought in from its TOP',
);
check(
  /cz-package-builder__customer-tabs/.test(effectBody),
  'when the customer-group tab bar is the shell\'s preceding sibling it is the top of the focused experience — the entry never scrolls past the only way off a locked shell',
);
check(
  /\.cz-package-builder__focused,\s*\.cz-package-builder__customer-tabs \{\s*scroll-margin-top:/.test(cssSource),
  'both possible entry targets declare their landing offset in CSS at that same breakpoint',
);

// No per-occupant duplicate: the only scrollIntoView in this component is
// the shared one above.
check(
  (adapter.match(/scrollIntoView/g) ?? []).length === 1,
  'exactly one scroll call exists in FamilyTierAdapter.tsx — the shared shell-level rule, never separate hooks per occupant type',
);

console.log('Responsive focused entry contract: PASS');
