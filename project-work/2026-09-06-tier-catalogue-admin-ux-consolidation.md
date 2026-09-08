# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — focused-shell visual parity + top tab refinement**
- Auditor verdict pending re-review.
- Production `main`: `6f8f8cad9d49c6c728979e7ed327a714cbf28163`; deploy #975 succeeded (unchanged; not pushed).
- Nath live validation: skipped-upgrade footer route works and is accepted (untouched by this candidate).

## New refinement from live screenshots (unchanged from prior round)
The normal focused Tier shell and Upgrade Your Build browsing shell now need to look like the same focused experience, not two separate visual systems — visual parity plus reuse of the existing top floating tab.

## Implementation evidence
- Branch: `review/upgrade-shell-visual-parity` @ `af01ebb1` (base: current `main`, `6f8f8cad`; one commit ahead).

### 1. Visual parity
- Outer container: `.cz-package-builder__upgrade-browsing`'s desktop (min-width: 1024px — its own already-accepted breakpoint, unchanged) rule is now `display: grid` with `grid-template-columns: minmax(0, 3fr) minmax(280px, 2fr)` and `gap: var(--cz-space-5)` — copied verbatim from `.cz-package-builder__focused`. Mobile-first column stacking below 1024px is untouched.
- Left column: new `.cz-package-builder__upgrade-browsing-detail` wrapper copies `.cz-package-builder__focused-detail`'s border (`--cz-color-line-strong`), padding (`--cz-space-12`, `--cz-space-6` on mobile), radius, and gap verbatim. Houses a new heading (quoted plan name) + the top tab, above the existing, prop-unchanged `ComposableOfferBrowser`.
- Right column: `.cz-package-builder__upgrade-summary` now reuses `.cz-cost-builder__tier`'s own background/border-color (`--cz-color-line`, was `--cz-color-border`)/radius — the real focused card's visual authority — and is `position: sticky` at the same 1024px breakpoint, matching `.cz-package-builder__focused-card`'s own behavior. Padding stays this component's own (`--cz-space-6`; its content is a price/totals list, not a TierCard).
- `UpgradeBuildSummary` and `ComposableOfferBrowser` both still receive the exact same props as before — no behavior/content change.

### 2. Top floating tab
- FamilyTierAdapter renders the SAME `EditionCueSelector` component inside the browsing stage, wired to the SAME `selectVariant()` function the normal focused shell's own tab/Edition chips already call — no second/parallel switching path. Clicking a different Default/Edition exits browsing into that variant's own normal focused view (identical to every other entry point into the focused shell); closing that view returns to browsing since `upgradeGateStage` is never touched by either path.
- No new state: the tab's active identity (`primaryActiveEditionId`) is derived fresh every render from the already-quoted primary's own `tierEditionPlatformId` (Platform-ID equality against `family.pricing.tiers[selectedTierId].edition_options` — never a label/index), not `focusedEditionId` or any new variable. This means the correct context shows automatically regardless of entry point (initial Browse, Cart footer, or line-level Manage build) with zero extra wiring per entry point.
- Occupant/default presentation follows the same tab grammar as Edition: `EditionCueSelector` renders unconditionally, using its own existing single-destination fallback — no bespoke "hide the tab" branch.

### Validation
- New contract: `scripts/upgrade-shell-visual-parity-contract.ts` (`npm run contract:upgrade-shell-visual-parity`), locking the geometry/border/radius token reuse, the right-card sticky treatment, and the tab's derive-fresh-no-new-state behavior.
- `scripts/upgrade-your-build-gate-contract.ts` updated for the new wrapper/IIFE structure (regex only) — its existing guarantees re-verified intact.
- `tsc --noEmit` clean; `contract:upgrade-shell-visual-parity`, `contract:upgrade-your-build-gate`, `contract:manage-build`, `contract:upgrade-build-footer`, `contract:composable-offer-choice`, `contract:composable-offer-contribution`, `contract:composable-offer-eligibility`, `contract:composable-quote-cart`, `contract:package-builder-addon-focus`, `contract:package-builder-regression-lock`, `contract:package-family-cart` all pass; clean Vite build.
- Live visual validation remains for after any main push — Claude cannot render/screenshot this to confirm pixel-level fidelity; source/CSS-level parity is what's verified here.

## Must preserve / must not substitute (unchanged, re-confirmed)
All accepted Upgrade gating, footer recovery, Manage build, add-ons, Cart visibility rules, quote mutation paths, pricing, persistence, and mobile behavior are untouched. No duplicate tab engine, no new occupant/Edition state model, no new pricing/cart logic, no second focused shell.

## ChatGPT — next action
Review `review/upgrade-shell-visual-parity` @ `af01ebb1` against the required visual-parity and top-tab-reuse behavior above. Approve for source push, or reject with correction.
