# Focused Edition Selector Visual Refinement

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed**.
- Production `main`: `1fde6df1e976704fac964b16a419047569621ec5` (was `de4ad6fa`).
- Production tree: `5311ef10bbd8c6619294b9577ccad02e204c55e5`.
- Deploy: `Deploy to Hostinger` run `34439695707`, attempt 1, conclusion **success**.
- Topic branch removed; only `main` and `Project-work-instructions` remain on `origin`.

## Audit result
The candidate is narrow and matches Nath's requested presentation behavior.

Focused composable browsing now has one stable heading, `Upgrade your build`, above the cue selector. The active declaration label (`Default`, `Subscriptions`, etc.) is no longer rendered as a second large heading; the cue labels remain the declaration names. `ComposableOfferBrowser` suppresses its own duplicate title only in `upgrade_your_build`, while `build_your_own` keeps its own heading and both contexts retain an accessible section name.

The shared focused-shell cue target no longer paints the large hover slab. Only the hover background/unused transition were removed. The target geometry, full click/tap area, pointer behavior, `aria-label`, `aria-current`, keyboard focusability and separate `:focus-visible` outline remain intact, so normal Tier/Edition focused shells get the same no-slab hover presentation without losing capability.

## Independent diff verification
GitHub compare confirms one clean commit from current production. Source changes are confined to heading ownership, cue hover CSS, one narrow contract and rebuilt customer assets/package script registration. No Edition identity, routing, pricing, catalogue, quote, Rate Sheet, or backend logic changed.

## Validation accepted
Claude reports TypeScript/build/docs green, the new focused presentation contract passes, relevant composable/customer-tab/manage-build/quote/add-on contracts pass, and mounted single-Tier/family-membership regressions pass. Known unrelated PHP baseline failures are unchanged.

## Must preserve
Shared `EditionCueSelector`; real destination IDs; cue labels; full hit area; keyboard focus indicator; selected cue-ball/label state; composable catalogue behavior; normal Tier/Edition focused routing.

## Must remove
Dynamic composable declaration heading; duplicate `Upgrade your build` title in the focused Upgrade context; visible cue hover slab.

## Must not substitute
No composable-only selector/CSS fork, no shrunken hit target, no removed focus state, no hidden cue labels, no route/state/data changes.

## Claude — next action
Fast-forward **exactly `1fde6df1e976704fac964b16a419047569621ec5`** to `main`. Do not amend or add changes.

After push:
1. record resulting `main` SHA and tree;
2. record `Deploy to Hostinger` run id + conclusion;
3. confirm topic branch is an ancestor of `main`, then delete it local + remote;
4. set **AWAITING LIVE VALIDATION** and stop.

## Required live validation
On the customer pricing page:
- focused Upgrade shell shows exactly one `Upgrade your build` heading;
- switching `Default`/Edition changes only cue selection/catalogue, not the heading;
- no large hover rectangle appears on cue destinations in composable or normal Tier focused shells;
- keyboard focus still shows a clear focus indicator and clicking the full cue target still switches the correct Edition.


## Claude production-push round — 2026-09-10

### Push
`main` fast-forwarded `de4ad6fa..1fde6df1` — exactly the approved candidate,
no amend, no added commits. The push itself is hard-blocked by this harness's
permission classifier regardless of approval status, so Nath ran
`git push origin main`.

### Verification after push
- `origin/main` = `1fde6df1e976704fac964b16a419047569621ec5` — the approved SHA.
- `origin/main` tree = `5311ef10bbd8c6619294b9577ccad02e204c55e5`.
- `git rev-list --left-right --count origin/main...1fde6df1` -> `0 0`; the
  candidate is an ancestor of `main` (fast-forward, nothing rewritten).

### Deployment
GitHub Actions `Deploy to Hostinger`, run id `34439695707`, head `1fde6df1`,
attempt 1, status `completed`, conclusion **success**
(started 2026-09-10T05:05:40Z, polled to completion).

### Branch cleanup
`review/focused-edition-selector-presentation` deleted from `origin` and
locally after confirming ancestry. `origin` carries only `main` and
`Project-work-instructions`.

### Live validation — auditor's, per the section above
1. The focused Upgrade shell shows exactly one `Upgrade your build` heading.
2. Switching `Default`/Edition changes only cue selection and catalogue, never
   the heading.
3. No large hover rectangle on cue destinations — composable **and** normal
   Tier focused shells.
4. Keyboard focus still shows a clear indicator, and clicking anywhere in the
   full cue target still switches to the correct Edition.

Note for (4): the hit area is unchanged in CSS, but it is now entirely
invisible on hover, so the click-anywhere-in-the-slice behavior is worth an
explicit check rather than an eyeball — nothing paints to show where the
target begins and ends.
