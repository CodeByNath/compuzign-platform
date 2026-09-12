# Responsive Details Close + Focused Occupant Entry

## Status
- **SOURCE PUSH APPROVED** — approved candidate pushed to the review branch; the `main` fast-forward itself is blocked from this session and is waiting on Nath (command below).
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `80676874e6da8728dfefee8115628d0cb296196d`.
- Approved candidate: `0d5e242b02195b617f642a857db5725b3ce3e9f3`.
- Candidate tree: `b920ba6d9375974d3ebc1e115551eff8c7c0266d`.
- Review branch: `responsive-modal-close-and-focused-entry`.
- Independent compare: exactly **1 ahead / 0 behind**, merge base is exact production `main`.

## Scope accepted
Two responsive fixes only:
1. both Plan Details entry points keep their X visible while modal content scrolls;
2. opening/reopening any explicit focused occupant on the stacked responsive shell starts from the top of that focused experience: normal Tier, Add-on, and Upgrade/composable browsing.

No card collapse, Cart-shell redesign, post-Add-to-Quote auto-scroll, Mobile Quote Bar change, pricing/identity/navigation-state change.

## Independent audit
The candidate is correctly scoped. `PlanDetailsModal.tsx` and `QuoteDetailsOverlay.tsx` now place the same close control inside each dialog on one shared sticky `.details-close-rail`, removing the prior absolute + outside-corner translate mechanism. ESC, backdrop close, body scroll lock, aria labels and the existing focus trap remain. The X becoming the first focusable element is a positive accessibility correction, not capability loss.

`FamilyTierAdapter.tsx` implements one shell-level rule: both focused branches attach the same `focusedShellRef`; `focusedOccupantKey` distinguishes explicit Tier/Add-on identity and Upgrade browsing. Edition changes do not alter the key, so they do not re-scroll mid-read. Closing sets the key null, so reopening the same occupant triggers a fresh entry. Upgrade Browse/Manage re-entry is covered by the same rule.

The rule intentionally excludes the implicit single-Tier landing because it is the arrival view rather than an explicit focus transition. When customer-group tabs immediately precede a locked focused shell, they are included as the top of the focused experience instead of being scrolled past. Both decisions are consistent with current navigation architecture.

Responsive entry is limited to the existing shell-stack breakpoint (`max-width: 767px`), so desktop is untouched. Live validation must confirm this matches the real mobile browsers where the defect was observed.

Changed source/docs/contracts are limited to the focused shell, the two details overlays, their CSS, focused contract, package registration, Code Maps and rebuilt dist. The new responsive Code Map is justified because the existing focused-shell map is at its 600-word limit.

## Must preserve
Exact Tier/Edition/composable identity; Add-on and Upgrade flows; resolved-step/Cart suppression; quote mutation; pricing/Commercial Legs; desktop behavior; ESC/backdrop/focus-trap accessibility.

## Must remove
Only the off-screen modal-close positioning and explicit mobile focused-entry that can start mid-shell.

## Must not substitute
No per-occupant duplicate scroll systems, no forced post-quote Cart/Recommendations scrolling, no collapse/compact replacement UI, no navigation-state rewrite.

## Claude — BLOCKED on the push itself
Pushing to `main` is classifier-blocked from this session and cannot be retried through. Nath must run it locally:

```
git checkout main && git merge --ff-only 0d5e242b02195b617f642a857db5725b3ce3e9f3 && git push origin main
```

`--ff-only` pinned to that exact SHA is deliberate: the review branch has since moved ahead (see below), and this command fast-forwards the **approved candidate only**.

## Review branch has one later, UNAPPROVED commit
Nath asked for an unrelated cue-ball correction in the same session. Rather than amend or rebuild the approved candidate, it was committed **on top** so the approved SHA stays byte-identical and independently fast-forwardable:

- `0d5e242b` — approved candidate, tree `b920ba6d` (unchanged, still the branch's second commit).
- `924c560e` — cue-ball start-anchor, tree `26e03908`. **Not audited, not approved, not part of this work item.** Recorded separately in `2026-09-12-cue-ball-single-destination-anchor.md`.

So the review branch (`924c560e`) is now **2 ahead** of production `main`, not 1. Steps 3-4 below cannot run yet: the branch is not safe to delete while it carries that unmerged commit.

## Claude — next action (after Nath's push)
Original action, amended for the above.

After push:
1. record exact `main` SHA/tree;
2. record `Deploy to Hostinger` run id + conclusion;
3. ~~verify the review branch is an ancestor of `main`, then delete it local + remote~~ — **deferred**: the branch carries unmerged commit `924c560e`. Delete only once that separate work item is resolved, or after it is moved to its own branch when the cap allows;
4. set **AWAITING LIVE VALIDATION** and stop.

## Live validation required
On a real narrow/mobile viewport verify: both View Details X controls remain visible while scrolling; normal Tier, Add-on, Browse Catalogue, and Manage Build focused entries start at the top; Edition switching inside an already-open shell does not jump back to top; desktop remains unchanged.
