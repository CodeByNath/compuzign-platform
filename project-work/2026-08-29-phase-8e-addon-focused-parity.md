# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING CHATGPT REVIEW`
- Verdict: `Proceed with safeguards — LIVE CORRECTIONS REQUIRED` (corrections implemented, pushed for review)
- Production (unchanged, `main` not touched): `main@7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82`
- Deployment (unchanged): run `33242742531`, attempt 1, `SUCCESS`
- Source push: `NOT APPROVED`
- Review branch (advanced): `phase-8e-addon-cta-review` → `a3038bc5af0219d96adad1fb9a62755c79d1390d` (parent `7ce87f615992b8fd9b5cc5658b3c0bbb5b068c82`), pushed to `origin`

## Objective
Package Builder add-on recommendation cards must expose both actions without changing add-on identity/mutation semantics:
- **Add to Quote** — primary quick-sale CTA
- **Choose Plan/View Plan** — secondary route into the focused Tier/Edition shell

## Live Validation — 2026-08-29
Customer-facing production screenshots show two remaining UI defects.

1. **Recommendation CTA order is wrong.** The add-on card currently renders the secondary **Choose Plan** above the solid primary **Add to Quote**. Swap the render order so **Add to Quote is above** and **Choose Plan/View Plan is below**. Preserve current styling/hover/selected/remove behavior; this correction is ordering only.

2. **Quoted add-ons have no cart “View Plan” route.** `QuoteSummary.tsx` currently only renders its per-item `View details` affordance for `family_tier && !item.isAddon`, intentionally excluding add-ons. That is not the requested behavior. A quoted add-on must expose **View Plan** in its own cart row and route to that exact quoted add-on Tier/Edition in the existing focused shell.

## Safeguard / Non-change Boundary
- Do **not** repurpose the Phase 8D **View details** overlay as the add-on route unless source proves it is the canonical focused-shell path. The requested action is **View Plan**, meaning return/open the existing focused Tier/Edition experience for the exact quoted add-on identity.
- Preserve primary-family cart behavior, cart removal, quote capture, add-on independent mutation, exact Tier + Edition identity, totals/TCV, and plain Cost Builder isolation.
- Do not redesign quote architecture or move pricing authority.

## Claude Next Action
Implement only these two corrections locally. Reuse the existing `FamilyTierAdapter` focused-shell `selectVariant(tierId, editionId)` behavior or the narrowest equivalent parent callback needed to target the exact quoted add-on. Add focused regression coverage for CTA order and add-on cart View Plan exact identity. Report changed files, routing path, tests, and diff in this same work file. Do not push source to `main` until ChatGPT audits the candidate.

## Claude Corrective Response — 2026-08-29

**1. CTA order** — fixed with CSS only: `.tier-action-row` is a flex column, so `.cz-cost-builder__tier-choose--addon` (the secondary button) now carries `order: 2`, while the primary Add to Quote button keeps its default/unset order (0) — it sorts first without any JSX render-order change, so no other card's layout is touched. Styling/hover/selected/remove behavior is unchanged.

**2. Add-on cart "View Plan" route** — does NOT reuse `QuoteDetailsOverlay` (verified: its own JSX props contain no `isAddon` reference). Instead:
- `FamilyTierAdapter` gained an optional `externalFocusRequest: { tierId; tierEditionPlatformId } | null` + `onExternalFocusConsumed` prop pair. A `useEffect` resolves `tierEditionPlatformId` to that Family's own local `editionId` (same Platform-ID-to-selector-key lookup `quotedTierEditionPlatformId` already uses elsewhere) and calls `selectVariant(tierId, editionId)` — the exact same focused-shell entry point every other route already uses — then immediately consumes the request so it never re-fires.
- `QuoteSummary.tsx` gained a new `onOpenAddonFocus?: (item: FamilyTierQuoteItem) => void` prop, rendering a "View Plan" button only when `item.isAddon` (mutually exclusive with the existing primary-only "View details" button).
- `PackageBuilderApp.tsx`'s new `openAddonFocus(item)` switches `activeFamilyId` to the add-on's own `familyId` first (FamilyTierAdapter only ever renders one Family at a time), then sets the focus request — gated to only reach `FamilyTierAdapter` once that Family is actually active, so a cross-Family add-on resolves against its own real data, never Default/wrong-Family.

**Regression coverage:** new `scripts/package-builder-addon-focus-contract.ts` (`npm run contract:package-builder-addon-focus`) statically locks: the CSS `order: 2` fact and that `--addon-primary` carries no explicit order; that `onOpenAddonFocus`/`onOpenDetails` gate mutually exclusively on `item.isAddon`; that `FamilyTierAdapter` exposes the external-focus-request shape and consumes it via `selectVariant`; that `PackageBuilderApp` switches Family before requesting focus and gates on the Family actually matching; and that `QuoteDetailsOverlay`'s own JSX never references `isAddon`.

- Files changed: `resources/css/modules/cost-builder.css`, `resources/ts/components/cost-builder/QuoteSummary.tsx`, `resources/ts/components/package-builder/FamilyTierAdapter.tsx`, `resources/ts/components/package-builder/PackageBuilderApp.tsx`, `dist/css/cost-builder.css`, `dist/js/cost-builder.js`, `package.json` (new script entry). New file: `scripts/package-builder-addon-focus-contract.ts`.
- Tests/build: `tsc --noEmit` clean; `npm run build` succeeded; contracts passed — the new `package-builder-addon-focus`, `package-builder-regression-lock`, `cost-builder-isolation`, `package-family-cart`, `quote-cart-addon`, `tier-addon-flow`, `package-builder-customer-tabs`, `tier-edition-switch`. `admin-station-css` fails identically to the pre-existing unrelated baseline.
- No identity/mutation/totals/persistence/backend changes — both corrections are presentation/routing-only, matching the stated boundary.
- Source state: committed locally on `main` (`a3038bc5`, parent `7ce87f61`), **not pushed to `origin/main`**. Same exact commit pushed to `phase-8e-addon-cta-review` (advancing it from `7ce87f61`) for independent diff inspection, following the pattern this phase already established. `origin/main` confirmed unmoved before and after.
- Questions for approval: none.
