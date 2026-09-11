# Single Visible Tier Permanent Focus

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main` (branch point, unchanged): `2c2c83e2096872b2847300afef307ffe27441af8`.
- Rejected candidate (superseded, no longer at this ref): `bb4adfd4185f1dbe032427a8b468aabc20f98086` (tree `56c3994bfc2ec537663b8c5bc1f3f9961bd9cb94`).
- Corrected candidate: `7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f` (tree `771639952fce7e092d2e5e64af5b73ccab141acb`), force-pushed over the rejected one on the same review branch per branch-hygiene rules — still exactly one clean commit ahead of `main`.
- Review branch: `lone-tier-active-customer-group`.
- `main` not touched. No push to `main`.

## Nath's exact rule
The existing globally-lone Family no-X behavior gains one additional qualifying case:

**If the active customer group has exactly one normal Tier occupant, that Tier's focused shell has no X and the customer-group tabs remain visible.**

This must be true because the Tier is lone in that customer group, not only while the shell happens to be implicit.

Add-ons are not part of customer-group Tier counting. Do not change Cart, Upgrade, Add-ons, All Plans, quote logic, pricing, Commercial Legs, Plan Details, audience filtering, or Family membership in this round.

## Auditor review of candidate
The candidate correctly adds `loneWithinActiveCustomerGroup` and locks the **implicit** single-Tier landing. It also correctly updates the stale cross-audience Code Map and preserves the production base as one clean commit.

But it does **not** fully implement Nath's rule. Source still says and implements:

```ts
const isLockedSingleTierLanding = isImplicitSingleTierView
  && (!singleTierIsQuoted || familyOffersNothingElse || loneWithinActiveCustomerGroup);
```

and explicitly documents that `View Plan` / explicit focus remains unlocked and keeps the sticky X. The focused render also shows customer tabs only under `isImplicitSingleTierView`.

Therefore a Tier that is lone in the active customer group can still acquire an X and lose the customer-group tabs when reached through an explicit focused route (for example a `View Plan` route from downstream Recommendations). That violates the requested invariant and leaves the same implicit-vs-explicit loophole that caused the defect class.

## Must preserve
Existing globally-lone behavior; current staging/Cart/Upgrade/Add-on behavior; exact Tier/Edition identity and reload parity; customer-group switching; no Family/Tier hardcoding.

## Must remove
For a normal Tier that is the **only normal Tier visible in the active customer group**, remove the X regardless of whether its focused shell was entered implicitly or explicitly. Keep the customer-group tabs visible for that lone-in-group focused shell whenever both groups exist. No one-card fallback from that shell.

## Must not substitute
Do not remove X from focused Tiers when the active group contains multiple normal Tiers. Do not make Add-ons part of the count. Do not alter downstream Cart/Upgrade/Add-on rules. Do not redesign navigation.

## Claude — correction
Reuse the same review branch but rebuild the next review as one clean candidate from current production `main` per branch-hygiene rules.

Make the **lone-in-active-group fact**, not `isImplicitSingleTierView`, the authority for X suppression and customer-tab visibility on that Tier's focused shell. Preserve the existing globally-lone rule as well.

Add regression coverage that explicitly enters the same lone-in-group Tier through an explicit `View Plan`/focused route and proves:
1. no X;
2. customer-group tabs remain visible;
3. switching customer group still works;
4. a multi-Tier active group still gets the ordinary X on explicit focus.

Retain the existing cross-group implicit coverage. Run the same focused validation/baseline checks, record the new exact SHA/tree/files here, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.

## Correction — implementation

`FamilyTierAdapter.tsx` replaces the rejected `loneWithinActiveCustomerGroup` (an existence fact, indifferent to how focus was reached) with a focus-based one:

```ts
const focusedTierIsLoneInActiveGroup = focusedTier !== null
  && singleVisibleTier !== null
  && focusedTier.id === singleVisibleTier.id
  && normalOccupants.length > 1;

const isLockedSingleTierLanding = (isImplicitSingleTierView && (!singleTierIsQuoted || familyOffersNothingElse))
  || focusedTierIsLoneInActiveGroup;
```

`focusedTier` already resolves the same way for both routes (explicit `focusedTierId` or the implicit fallback), so comparing it against `singleVisibleTier` is the one check that works for both — independent of `isImplicitSingleTierView`, closing exactly the gap the auditor found. The customer-group tab bar's render condition changes the same way: `(isImplicitSingleTierView || focusedTierIsLoneInActiveGroup) && customerTabsBar`.

**A second, necessary fix found while proving this empirically, not by static reading:** making the tabs render on an explicitly-reached locked shell exposed that clicking a tab from there did nothing useful — `focusedTierId` stayed pinned to the old group's Tier, `visibleTiers`/`normalTiers` re-filtered to the new group, and the stale id resolved to nothing, landing the customer on a bare one-card grid for the new group instead of its own auto-focused landing (proven by mounting the real component and clicking through it, not inferred). Confirmed this exact path was NOT previously reachable — the tabs never rendered on the explicit route before this round, so this is a real, run-in-the-harness discovery, not a hypothetical. Fixed by clearing `focusedTierId`/`focusedEditionId` in the tab bar's own click handler, alongside the `singleTierDismissedTierId` reset it already did — a no-op for every previously-reachable case (those tabs only ever rendered during the implicit view, where `focusedTierId` was already null), so it only changes behavior for the newly-reachable explicit route.

**Flagged trade-off, not decided unilaterally:** for a Tier that is lone in the active customer group AND whose Family also has a same-group add-on (so quoting stages it into Recommendations), reaching it through Recommendations' own "View Plan" link now opens a shell with no Close X at all. Before this round, the explicit route's ordinary sticky X was the way back to Recommendations for that specific combination; it is genuinely gone now. Verified empirically (not assumed) that this is not a dead end — there are two independent recovery routes: (1) the customer-group tabs, switching away and back, which lands on the staged Recommendations view for the still-quoted primary (a `stagedTier` re-resolution side effect, not something added on purpose) and from there View Plan reopens the same locked shell again; (2) removing the primary via the shell's own quoted-state toggle (`✓ Selected`) and re-quoting. Both are proven in the regression below. Whether this trade-off is acceptable as-is, or whether the combined case deserves its own explicit "back to Recommendations" affordance, is for the auditor/Nath to decide — out of this round's stated scope to add unasked.

## Regression coverage

`scripts/single-occupant-quoted-focus-regression.mjs` gained two new sections (11 checks the auditor's exact reproduction and its consequences; 12 is the control case) on top of the corrected section 10 from the prior pass:
- the auditor's exact reproduction — cross-group-lone Tier quoted, staged into Recommendations by a same-group add-on, reached via Recommendations' own View Plan link — now shows no X, keeps the customer-group tabs, and leaves Cart eligibility untouched (still `focused_inspection`, Cart suppressed);
- switching customer-group tabs from that explicitly-reached locked shell now correctly auto-focuses the new group's own lone occupant (proven, after the tab-click fix above — first observed the pre-fix bare-grid failure directly in the harness output, not assumed);
- switching back lands on the staged Recommendations view for the still-quoted primary (verified actual behavior, not the originally-assumed "reopens the same shell" — `stagedTier` re-resolves once `normalTiers`/`selectedTierId` match again), and View Plan from there reopens the identical locked shell;
- the remove-and-requote recovery path still closes the loop;
- a control case (two normal Tiers in the active group, one cross-group) proves the correction never over-applies: explicit focus there keeps the ordinary sticky X and does not gain the customer-group tabs, unchanged from today.

`scripts/tier-next-step-navigation-regression.mjs` is carried over unchanged from the prior (accepted-by-auditor-in-part) pass — its cross-group implicit-route coverage was already correct and is retained.

## Evidence

- `npx tsc --noEmit`: clean, no errors.
- `npm run build`: succeeds, `dist/js/cost-builder.js` regenerated and included in the candidate commit.
- `npm run docs:check`: passes (118 Markdown files, 47 Code Maps, 22 numbered history records) — Code Map further corrected to state the X/tabs rule applies "regardless of whether the shell was reached implicitly or through an explicit View Plan click."
- `npm run regression:single-occupant-quoted-focus`: 87 checks passed (was 66 on `main`; the new sections 11–12 account for the growth).
- `npm run regression:tier-next-step-navigation`: 78 checks passed (unchanged from the prior pass; no further edits needed here).
- `npm run contract:package-builder-customer-tabs`, `contract:package-builder-regression-lock`, `contract:package-builder-addon-focus`: all pass.
- Baseline comparison against unmodified `main`: `regression:cart-bundle-upgrade-refinements` (48 passed), `regression:cart-initial-payment-addons` (24 passed), `regression:family-tier-membership-boundary` (all passed) — clean, matching `main`. The four already-recorded pre-existing failures (`regression:tier-system-footer-loop`, `regression:composable-quote-cart-loop`, `regression:tier-occupant-lifecycle`, `regression:tier-edition-lifecycle`) were not re-run this pass since nothing in this correction touches their surfaces; they were confirmed identical on `main` and the (superseded) first candidate in the prior review round.

Corrected candidate branch `lone-tier-active-customer-group` is exactly one commit (`7ffd3e4b41e11eb8c5ae95694bd4bf7085152e7f`, tree `771639952fce7e092d2e5e64af5b73ccab141acb`) ahead of `main` (`2c2c83e2096872b2847300afef307ffe27441af8`), force-pushed over the rejected commit on the same branch, touching the same five files as before: `resources/ts/components/package-builder/FamilyTierAdapter.tsx`, generated `dist/js/cost-builder.js`, `scripts/single-occupant-quoted-focus-regression.mjs`, `scripts/tier-next-step-navigation-regression.mjs`, and `docs/code-map/package-builder-tier-navigation.md`. `main` was not pushed to.
