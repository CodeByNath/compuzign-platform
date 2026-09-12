# Responsive Details Close + Focused Occupant Entry

## Status
- **AWAITING CHATGPT REVIEW** — round 1 candidate pushed, not on `main`.
- Predecessor `2026-09-12-cart-upgrade-secondary-cta.md` is **CLOSED**; its review branch is deleted locally and remotely.
- Baseline `main`: `80676874e6da8728dfefee8115628d0cb296196d`.
- Review branch: `responsive-modal-close-and-focused-entry`.
- Candidate commit: `0d5e242b02195b617f642a857db5725b3ce3e9f3`; tree `b920ba6d9375974d3ebc1e115551eff8c7c0266d`.
- Branches now: `main`, `Project-work-instructions`, this one review branch.

## 1. Details-modal X — root cause and correction
Both entry points already shared one chrome (`.details-backdrop/-panel/-modal/-close`), so this is one fix, not two.

The control was an absolutely positioned **sibling** of the scrolling dialog on `transform: translate(35%, -35%)`, placing it *outside* the panel's top-right corner. The backdrop pads by `--cz-space-4` (16px) while that translate pushes 14.7px of the 42px control past the panel edge — about **1px of clearance** at narrow widths, and none once anything consumed it. Clipped, ESC was the only close left.

Corrected by anchoring the control **inside** the scrolling dialog on a shared sticky rail (`.cz-package-builder__details-close-rail`, `position: sticky; top: 0`), the same principle `.cz-package-builder__focused-close` already uses. Visual treatment (border/background/glyph/size) unchanged.

Preserved as required: ESC close, backdrop close, focus trap, body scroll lock, both aria-labels.

**Side effect worth your attention:** the control was previously outside `modalRef`, so it was never inside the focus trap — unreachable by Tab in both modals. It is now the first focusable and takes initial focus. I read this as a fix, not a scope change; flagging it because it alters keyboard order.

## 2. Focused-occupant entry — one shared rule
Both focused branches render the same `.cz-package-builder__focused`, so both take one `focusedShellRef` and one `focusedOccupantKey`:
- composable browsing -> `'upgrade'`; normal Tier and **add-on** -> `tier:<focusedTierId>` (same branch; `is_addon` changes presentation, not the shell).

Key is **occupant identity, not variant** — `selectVariant()` changes `focusedEditionId` only, so an in-shell Edition switch never re-scrolls a customer mid-read. Entry scrolls the top of the focused experience into view at `max-width: 767px`, the breakpoint the shell already stacks at; desktop untouched. `prefers-reduced-motion` honoured.

Two judgement calls for you to confirm or reject:
1. The key reads explicit `focusedTierId`, **never** `effectiveFocusedTierId` — the implicit single-Tier landing is arrived at, not opened, and that auto-focus derivation is left completely untouched.
2. When `.cz-package-builder__customer-tabs` is the shell's preceding sibling it becomes the scroll target, because on a locked/lone-in-group shell that bar is the only way off and scrolling past it would hide the exit.

## Files changed
- `resources/ts/components/package-builder/PlanDetailsModal.tsx`, `QuoteDetailsOverlay.tsx`, `FamilyTierAdapter.tsx`
- `resources/css/modules/cost-builder.css`, rebuilt `dist/`
- `scripts/responsive-focused-entry-contract.ts` (new), registered in `package.json`
- `docs/code-map/plan-details.md`, `docs/code-map/package-builder-responsive-focused-entry.md` (new), `docs/code-map/000-README.md`

## Documentation decision needing your ruling
`package-builder-focused-shell.md` was already at **599/600** prose words, so it could not absorb this. I left it byte-identical to `main` and gave the rule its own map (`AGENTS.md`: split rather than let a map grow). If you would rather it live inside the focused-shell map, that map needs words freed first — say which.

## Validation
`tsc --noEmit` clean; `npm run build` clean; `docs:check` passes (48 Code Maps).
New `contract:responsive-focused-entry` PASS. Also PASS: plan-details-value-states, package-builder-regression-lock, package-builder-addon-focus, package-builder-customer-tabs, focused-edition-selector-presentation, composable-recommendations-cta, manage-build, upgrade-build-footer, quote-inclusion-quantity-parity, cost-builder-isolation, quote-view, quote-view-print-portal, composable-quote-cart, package-family-cart, tier-addon-flow; regressions single-occupant-quoted-focus, tier-next-step-navigation, cart-bundle-upgrade-refinements, cart-initial-payment-addons, cart-initial-payment-parity.

**Two pre-existing failures, verified failing on clean `main` and untouched by this work:** `contract:package-builder-flow` (reads a deleted `FullBuildDetail.tsx`) and `regression:composable-quote-cart-loop`. Not fixed here — out of scope.

## Not verified
No browser/live verification was performed; no local WP environment exists. The geometry above is read from the stylesheet, not observed live.

## Out of scope, as instructed
No compact/collapsed staged Tier or Cart card, no alternate responsive Cart shell, no post-Add-to-Quote movement, no Mobile Quote Bar change.
