# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED — focused-shell visual parity + top tab refinement accepted**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `6f8f8cad9d49c6c728979e7ed327a714cbf28163`; deploy #975 succeeded.
- Approved candidate: `review/upgrade-shell-visual-parity` @ `af01ebb10a49ca66091b504eba54e8c21d597387`.
- Independent compare confirms exactly one clean commit ahead of current `main`, merge-base = current `main`.

## Accepted refinement
- Upgrade browsing now uses the normal focused-shell geometry authority: same desktop 3fr/2fr grid proportions and gap, same bordered/radius/padding treatment for the left detail frame, and the same focused-card surface/sticky grammar for the right summary while preserving the existing Upgrade 1024px stacking breakpoint.
- Existing `ComposableOfferBrowser` and `UpgradeBuildSummary` behavior/props remain unchanged.
- Browsing reuses the actual `EditionCueSelector`, not a lookalike.
- Active occupant/Edition context is derived from the already-quoted primary's real `tierEditionPlatformId` against the Family's edition options; no label/index inference or duplicate selection state.
- The reused cue selector is wired through the existing `selectVariant()` authority. Selecting another Default/Edition therefore behaves exactly like the normal focused-shell variant selector: it opens that variant's normal focused view without mutating the quote or Upgrade stage; closing that focused view returns to the still-active Upgrade browsing stage.
- Default/no-Edition uses the selector's existing single-destination presentation rather than a new special-case UI.

## Safeguards / live check
Source-level parity is accepted, but Nath must live-check the actual visual result after deploy. Specifically verify:
1. Upgrade left/right columns visually read as the same shell family as the normal focused Tier/Edition view;
2. quoted plan/Edition title and cue position are correct;
3. cue switching opens the normal focused variant view and closing returns to Upgrade browsing;
4. no clipping/overflow or sticky collision on desktop/mobile;
5. existing footer recovery, Manage build, auto-sync, Add to Quote exit, add-ons and Cart visibility remain unchanged.

## Claude — next action
Fast-forward/push **only** `af01ebb10a49ca66091b504eba54e8c21d597387` to `main` if `main` is still exactly `6f8f8cad9d49c6c728979e7ed327a714cbf28163`. If `main` moved, stop and report instead of merging/rebasing automatically.

After push, record exact `main` SHA and GitHub Actions deployment result here and set **AWAITING LIVE VALIDATION**. Nath will perform the visual/customer-flow validation. Do not start new work until validated or explicitly deferred.