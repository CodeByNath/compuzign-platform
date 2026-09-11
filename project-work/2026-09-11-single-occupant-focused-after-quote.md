# Single Occupant Focused State After Quote

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed**.
- Production `main`: `67a5a7afd38a105059d92ca41ad020feaf472767` (was `fd2878385b23becf1478018b94db47b5a50d7cf9` before this push).
- Production tree: `4b379661a00df5f5d97610ebe86552c96a931c03`.
- Deploy `34559388908`: success.
- Review branch removed; `origin` holds only `main` and `Project-work-instructions`.
- GitHub compare independently verified: exactly **1 ahead / 0 behind**, merge base is exact production `main`.

## Nath's authoritative navigation rule
A successful **Add to Quote** from either a normal Tier card or a normal Tier focused shell completes the Tier-selection step. The Cart becomes visible only when the resolved flow has no blocking workspace between the Tier action and the Cart. Existing Add-on/Recommendations and Upgrade progression remain authoritative; active Upgrade catalogue browsing and explicit focused inspection suppress the Cart.

No persistent `showCart` flag is allowed. Cart visibility remains actual quote contents × current resolved navigation step.

## Audit result
The candidate replaces the growing shell-exception logic with one `resolvedStep` matching the real render branch order. This is accepted:
- `tier_landing`, `focused_inspection`, `upgrade_browsing` suppress Cart;
- `recommendations`, `cart`, `tier_comparison` do not suppress it;
- `pending` Upgrade CTA is Recommendations, not browsing;
- `PackageBuilderApp` remains the single final Cart visibility boundary.

The candidate also closes the adjacent navigation gaps found in the full audit:
- globally lone quoted Tier survives reload in the same focused+Cart/no-X state;
- a quoted Tier Edition that remains implicitly focused stays on the exact quoted Edition instead of visually reverting to Default;
- quoted Add-on cards are steered to their exact quoted Edition;
- cross-audience single-visible quoted Tier keeps its X/dismiss/View Plan behavior while Cart can coexist because there is no staged next step.

The cross-audience interpretation is accepted as consistent with Nath's latest rule: another audience choice is a destination behind X, not an intermediate post-Add-to-Quote step. X eligibility and Cart eligibility are therefore intentionally separate facts.

The existing presentation where Add-ons step aside while the pending Upgrade CTA is offered is not changed by this phase; this work only stabilizes navigation/Cart eligibility and exact card identity around the established Recommendations presentation.

## Evidence reviewed
- New `package-builder-tier-navigation.md` documents the step table and ownership boundary.
- `FamilyTierAdapter.tsx` uses shared `hasRecommendationContent` for commit-time staging and restored-cart staged validity.
- `implicitQuotedEditionId` derives exact focused Edition from quote identity.
- `quotedAddonEditionPlatformIds` maps exact Add-on Edition identity into shared `TierCard` control.
- New mounted `tier-next-step-navigation-regression.mjs`: 78 checks across Tier-card/focused Add to Quote, lone Default+Edition, reload, Add-on-only, Upgrade-only, both, pending/browsing, Add-on Edition return, explicit focus, remove/re-add and audience transition.
- Existing single-occupant regression updated to the refined Cart rule.
- Claude reports TypeScript/build/docs green; full JS baseline has no new failures.

## Must preserve
Plan Details/focused detail internals; Commercial Legs; pricing/Rate Sheet authority; quote identity/snapshots; Add-on independent mutation; Upgrade snapshot survival; family/audience membership; working X/View Plan routes.

## Claude — next action
Fast-forward **exactly `67a5a7afd38a105059d92ca41ad020feaf472767`** to `main` unchanged. Do not amend or add source changes.

After push:
1. record exact `main` SHA/tree;
2. record `Deploy to Hostinger` run id + conclusion;
3. verify `review/tier-next-step-cart-navigation` is an ancestor of `main`, then delete local + remote;
4. set **AWAITING LIVE VALIDATION** and stop.

## Live validation after deployment
Spot-check the navigation matrix, not Plan Details internals:
- multi-Tier card Add to Quote with no follow-on step -> Cart;
- globally lone Default and Edition -> focused shell remains, no X, Cart appears after quote; reload keeps same exact state;
- Add-on Recommendations -> Cart remains visible; quoted Add-on Edition returns on exact Edition;
- Upgrade pending -> Recommendations + Cart; Browse Catalogue -> focused Upgrade + Cart hidden; exit -> Cart returns;
- Add-ons + Upgrade -> established Recommendations presentation unchanged;
- cross-audience single-visible quoted Tier -> X works, Cart visible; X closes to quoted card; View Plan reopens explicit focus and hides Cart.


---

# Claude — push record

## Pushed to production
- `main` is now **`67a5a7afd38a105059d92ca41ad020feaf472767`**
- `main` tree **`4b379661a00df5f5d97610ebe86552c96a931c03`**
- Previous production `main` was `fd2878385b23becf1478018b94db47b5a50d7cf9`.

Both SHA and tree match the approved candidate exactly, so the fast-forward
carried it unchanged — no amendment, rebase or rebuild in transit. History is
linear: `fd287838 -> 67a5a7af`, one commit, merge base the exact previous
production `main`.

## Deployment
- Workflow: `Deploy to Hostinger`
- Run id: **`34559388908`**, attempt 1
- Head SHA: `67a5a7af`
- Status: completed — **conclusion: success**

## Branch cleanup
Verified `review/tier-next-step-cart-navigation` is a genuine ancestor of
`origin/main` **before** deleting anything, then removed it locally and on
`origin`. `origin` now holds only `main` and `Project-work-instructions`.

## Status
Set to **AWAITING LIVE VALIDATION**. No further implementation until Nath
reports live results.

## Live checks for Nath
Navigation/Cart matrix only — Plan Details internals are out of scope here.

1. **Multi-Tier card Add to Quote, nothing in between** — the Cart appears,
   no shell stays open.
2. **Globally lone Tier, Default and Edition** — focused shell remains after
   Add to Quote, no X, Cart alongside. Quote an **Edition** and confirm the
   shell keeps showing that Edition, not Default. Reload the page: same
   state, same Edition, no small card and no staged view.
3. **Add-on Recommendations** — Cart stays visible. Open an add-on's own
   focused shell, quote a non-Default **Edition**, and confirm the returning
   add-on card shows that exact Edition.
4. **Upgrade pending vs browsing** — after quoting a Tier with a catalogue,
   Recommendations + CTA shows WITH the Cart (this is the deliberate change);
   Browse Catalogue hides the Cart; leaving browsing brings it back.
5. **Add-ons + Upgrade together** — the established Recommendations
   presentation is unchanged (add-ons step aside while the CTA is up).
6. **Cross-audience single-visible quoted Tier** — X is present and works, and
   the Cart is visible beside the shell (the accepted interpretation change);
   X closes to the quoted card; View Plan reopens explicit focus and hides the
   Cart again.

Items 2 (Edition persistence and reload), 4 (pending now showing the Cart) and
6 (Cart beside a shell that still has its X) are the three behaviours that
changed this round — worth the closest look.

## Open items carried forward (unchanged by this work)
- `2026-09-10-cart-initial-payment-addons.md` — still AWAITING LIVE
  VALIDATION, deferred by Nath.
- `regression:composable-quote-cart-loop` — red on `main`, undecided.
- `2026-08-30-quote-email-billed-item-separators.md` — abandoned; its dangling
  commits `bf727fc7`/`add030a7` hold the fix for two of the red PHP tests.
