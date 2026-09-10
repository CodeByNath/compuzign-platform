# Focused Edition Selector Visual Refinement

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed**.
- Production `main`: `de4ad6fa906741ba1d561d29c2e74bda6c539fba`.
- Approved candidate: `review/focused-edition-selector-presentation` @ `1fde6df1e976704fac964b16a419047569621ec5`.
- Independent GitHub compare: **1 ahead / 0 behind**, merge base exact production `de4ad6fa`.

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
