# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — second live responsive correction required.**
- Auditor verdict: **Proceed with safeguards.**
- Production: `main@8751a233f609d9d828193efa23ababb321bcfc7e`.
- Hostinger Deploy #940 / run `33825491417` succeeded on that exact SHA.

## Live result
The deployed quote-sidebar scroll-owner correction did **not** fix the real customer issue. Nath retested live and the Request/Review rail actions are still unreachable at the affected intermediate widths.

Nath isolated the effective CSS correction live:
```css
.cz-rf-right {
  max-height: 96%;
  padding-bottom: 0;
}

.cz-os__help {
  padding-bottom: 16px;
}
```
replacing the current `.cz-rf-right { max-height: calc(100vh - 80px); ... padding-bottom: var(--cz-space-8); }` geometry.

Nath also reports removing `overflow-y:auto` from `.cz-rf-left` as part of the live correction.

## Auditor source check / safeguard
Current desktop structure is `.cz-rf-body { overflow:hidden }`, with `.cz-rf-left { overflow-y:auto }` and `.cz-rf-right { overflow-y:auto }`. Therefore **do not remove the left-panel scroll blindly**: because the parent clips overflow, removing `.cz-rf-left` scrolling could make long Contact/Review content unreachable on short desktop viewports.

Implement Nath's live-proven right-rail geometry exactly, but treat the `.cz-rf-left` overflow removal as conditional: first inspect/verify all desktop Request steps at short heights. Remove it only if the left content remains fully reachable through another deliberate scroll owner; otherwise preserve it. No speculative restructuring.

## Claude correction scope
1. Replace `.cz-rf-right` max-height with `96%` and bottom padding with `0` (normal token syntax is fine; do not add `!important` unless cascade evidence requires it).
2. Add `padding-bottom:16px` (or exact equivalent token) to `.cz-os__help`.
3. Re-evaluate `.cz-rf-left { overflow-y:auto }` against the actual modal scroll chain. If safe, remove it as Nath observed; if not, report why and preserve left-step reachability.
4. Do not touch pricing, quote data/totals, composable identity, Request persistence/email, resolver, Rate Sheet, or customer copy.
5. Keep the prior desktop quote-list single-scroll-owner simplification unless it conflicts with the proven fix.

Verify at the affected intermediate widths/short heights and also Contact + Review steps with enough content to overflow. Push only to a non-production review branch, record exact SHA/files/tests/evidence here, set **AWAITING CHATGPT REVIEW**, do not push `main`.

## Remaining live gate
After deployment revalidate rail/button reachability, Upgrades label, composable Quote Details, Admin Request stored detail, proposal/PDF/public quote exact-once rendering, totals once, and no raw IDs. Fresh production Request/customer email remains separately gated.

## Final planned phase
After this chain passes, start the dedicated customer UI/UX refinement pass across pricing, focused-plan/composable, quote/cart, Review & Finalise, and proposal/PDF responsive presentation. Visual/interaction refinement only; accepted architecture stays locked.