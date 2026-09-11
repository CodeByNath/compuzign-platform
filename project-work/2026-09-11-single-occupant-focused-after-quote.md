# Single Occupant Focused State After Quote

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `fd2878385b23becf1478018b94db47b5a50d7cf9`.
- Previous deployment `34537225257`: success.
- This work is reopened before live closure because Nath refined the navigation rule.

## Nath's authoritative navigation rule
A successful **Add to Quote** from either a normal Tier card or a normal Tier focused shell completes the Tier-selection step. The Cart becomes visible **only if there is no intermediate customer step between that Tier and the Cart**.

Do not implement this as a blanket `showCart=true` flag. Cart visibility must remain derived from actual quote contents plus the resolved next navigation state.

Expected outcomes:
- globally lone Tier, no add-ons, no eligible Upgrade -> focused shell remains, no X, Cart visible after quote;
- Tier with add-ons -> existing staged Recommendations flow wins;
- Tier with eligible Upgrade -> existing Recommendations/Upgrade CTA step wins;
- Tier with both -> Recommendations remains the intermediate step;
- active Upgrade catalogue browsing -> Cart hidden;
- explicitly opened Add-on/normal Tier focused inspection keeps its existing suppression behavior;
- remove last quote line -> Cart disappears because the quote is empty, not because of stale navigation state.

## Full-navigation safeguards from audit
Fix this as one bounded navigation-state stabilization, not another one-off condition.
1. Treat `pending` Upgrade CTA/Recommendations as an intermediate step, distinct from `browsing`; only browsing is the focused Upgrade workspace.
2. Preserve exact quoted Edition identity when a Tier remains focused after Add to Quote; do not reset the visible focused variant to Default while the Cart holds an Edition.
3. Initial mount/restored browser cart must resolve to the same presentation as the equivalent in-session state; no reload-only small-card/staged divergence for a globally lone quoted Tier.
4. Add-on small-card presentation must reflect the exact quoted Add-on Edition, not merely Tier-level `Added` state.

## Claude — implementation phase
From current production `main`, create one review branch. First extend mounted navigation coverage before changing runtime behavior. Cover at minimum:
- Tier-card Add to Quote and focused-shell Add to Quote;
- globally lone Default + Edition, including reload/restored cart;
- add-on-only Recommendations;
- Upgrade-only Recommendations;
- add-ons + Upgrade together;
- Upgrade pending vs browsing;
- Add-on Default + Edition return card;
- explicit View Plan / Add-on focus suppression;
- remove/re-add and Family/customer-group transitions.

Then make the minimum source changes so the resolved **next step** decides whether Cart is eligible. Do not add an independent persistent `showCart` navigation state.

## Must preserve
Plan Details and all focused detail internals; Commercial Legs; Rate Sheet/pricing authority; quote snapshot/identity; Upgrade snapshot survival; Add-on independent mutation; existing family/audience membership rules; working non-lone X/View Plan behavior.

## Must remove
Reload-only navigation divergence; focused quoted Edition falling back visually to Default; Add-on quoted-Edition card drift; any conflation of Upgrade `pending` Recommendations with active `browsing` focus.

## Must not substitute
No Tier/detail redesign, no route rewrite, no new pricing/cart model, no blanket "any Add to Quote always shows Cart", no CSS-only visibility workaround.

Run focused regressions/contracts, TypeScript, build, docs and relevant baseline comparison. Push review branch only; record exact SHA/tree/diff/tests here; set **AWAITING CHATGPT REVIEW**; stop. Do not push `main`.


---

# Claude — implementation record (refined navigation rule)

## Branch
- `review/tier-next-step-cart-navigation`, pushed to `origin`.
- Commit **`67a5a7afd38a105059d92ca41ad020feaf472767`**, tree
  **`4b379661a00df5f5d97610ebe86552c96a931c03`**.
- Branched from production `main` `fd2878385b23becf1478018b94db47b5a50d7cf9`;
  exactly 1 ahead / 0 behind, merge base is that exact `main`.
- `main` NOT pushed.

## What was built

One bounded navigation-state stabilization, not another condition.
`FamilyTierAdapter.tsx` now resolves a single `resolvedStep` whose branch
order mirrors its own render branches exactly, and reports Cart suppression
off that step:

| Step | View | Cart |
|---|---|---|
| `tier_comparison` | card grid, nothing quoted | eligible |
| `tier_landing` | implicit single-Tier landing, not yet quoted | suppressed |
| `focused_inspection` | explicit Choose Plan / View Plan / Add-on shell | suppressed |
| `upgrade_browsing` | composable catalogue workspace | suppressed |
| `recommendations` | staged add-ons and/or the pending Upgrade CTA | eligible |
| `cart` | Tier step complete, nothing in between | eligible |

`PackageBuilderApp` is unchanged: it still owns the one Cart decision,
`items.length > 0 && !quoteSuppressedByShell`. There is no `showCart` state —
visibility is quote contents multiplied by the resolved step, so removing the
last line hides the Cart because the quote is empty.

## Safeguards, each as its own mechanism

1. **`pending` vs `browsing`.** Only `browsing` is a focused workspace.
   `pending` is the CTA inside Recommendations and no longer suppresses the
   Cart. This removes a real artefact: the Cart disappeared and returned
   between two states of the SAME Recommendations view (CTA shown vs "Maybe
   next time" taken), because both stages were folded into one
   "a shell is open" boolean.
2. **Quoted Edition identity.** `implicitQuotedEditionId` derives the focused
   variant from the quoted line whenever a Tier stays focused after Add to
   Quote. Derived, never stored: `commitSelection()` clears
   `focusedEditionId`, and a restored cart never had one, so one derivation
   covers both. Before this, the shell reset visually to Default while the
   Cart held an Edition, and its own action would then have re-quoted Default
   rather than removed the line on screen.
3. **Mount/reload parity.** `hasRecommendationContent` (add-on Tiers, or
   `resolveComposableEligibleRows(family)`) now gates BOTH
   `commitSelection()`'s staging and `stagedTier`'s own validity.
   `stagedTierId` is seeded from `selectedTierId`, and that seed alone made a
   restored cart resolve a staged/small-card view a Family with nothing to
   recommend never produces in session.
4. **Add-on Edition.** `quotedAddonEditionPlatformIds` steers each quoted
   add-on card's own `selectedEditionId` in `PricingTiers.tsx` — the same
   mechanism `quotedTierEditionPlatformId` already applied to the primary. A
   Tier with no entry stays uncontrolled; a present `null` is a real identity
   (quoted on the Default declaration), which is why it is a Map, not a
   record of possibly-absent values.

## One interpretation the auditor should check

The rule was applied as written — Cart eligibility follows the resolved next
step — which changes one case the previous round had decided differently:

- **cross-audience quoted implicit shell** (one visible normal Tier, the
  other occupant or add-on in the other audience group, no catalogue). It is
  not globally lone, so it keeps its ordinary sticky X and its working
  dismiss/View Plan behaviour. But nothing stages, so the next step after Add
  to Quote IS the Cart, and the Cart is now visible beside that shell where
  the previous round suppressed it.

"A destination exists behind the X" and "no intermediate step stands before
the Cart" are treated as two different questions; this case is exactly where
they diverge. The two superseded assertions in
`single-occupant-quoted-focus-regression.mjs` were updated in place, with the
reason recorded beside them. If Nath wants the old suppression there, it is a
one-line change (`resolvedStep === 'cart' && familyOffersNothingElse`), but
it re-introduces a per-Family special case in a rule stated in terms of steps.

Two things deliberately NOT changed, both outside the stated safeguard:
- add-on-only Recommendations keeps showing the Cart exactly as it always
  has (the "existing staged Recommendations flow wins" bullet);
- a reload does not re-raise a `pending` Upgrade CTA that was only ever an
  in-session decision point; safeguard 3 scoped mount parity to the globally
  lone quoted Tier.

## Coverage added first, then the change

`scripts/tier-next-step-navigation-regression.mjs`
(`npm run regression:tier-next-step-navigation`) — **78 checks**, mounting the
real `FamilyTierAdapter` through esbuild + happy-dom + Preact `render()`,
with the parent harness mirroring `PackageBuilderApp`'s own Cart expression
verbatim. Written before any runtime change; it failed on the quoted-Edition
reset first, as expected. It covers Tier-card and focused-shell Add to Quote,
globally lone Default + Edition, restored/reloaded cart, add-on-only
Recommendations, Upgrade-only, add-ons + Upgrade, pending vs browsing,
add-on Default + Edition return card, explicit View Plan/Add-on suppression,
remove/re-add, and a customer-group transition.

`single-occupant-quoted-focus-regression.mjs` (66 checks) keeps its own
scope — which shell a single occupant gets, and whether its X exists and
works — with its stale header rule corrected and the two Cart assertions
above superseded.

## Validation

- `npx tsc --noEmit` — clean (exit 0).
- `npm run build` — clean; `dist/js/cost-builder.js` rebuilt and reproduced
  identically on a second build.
- `npm run docs:check` — passes: 118 Markdown files, 47 Code Maps, 22 history
  records.
- Full JS suite (every `contract:*` + `regression:*` script) run on this
  branch AND on a clean `main` worktree: **92 pass / 8 fail** here vs
  **91 pass / 8 fail** on `main`; the failing set is byte-identical
  (`contract:admin-station-css`, `contract:package-builder-flow`,
  `contract:platform-identity-schema`, `regression:tier-system-footer-loop`,
  `regression:composable-quote-cart-loop`, `regression:tier-occupant-lifecycle`,
  `regression:tier-edition-lifecycle`, `regression:tier-publish-timeout`).
  The extra pass is the new regression. No new failure.
- `contract:composable-recommendations-cta` asserts source text and named the
  old `setStagedTierId(addonTiers.length > 0 || hasCatalogue ...)` expression
  literally. It was updated to assert the shared fact instead, and extended
  to lock BOTH consumers of `hasRecommendationContent` — the mount-divergence
  this round fixes returns the moment those two expressions drift apart.
- No browser/live validation performed. No PHP tests run; the known-red PHP
  items are unchanged by this work.

## Documentation

New Code Map `docs/code-map/package-builder-tier-navigation.md` owns the step
table, the X-vs-Cart distinction, and the three identity mechanisms;
indexed in `000-README.md` and cross-linked from
`package-builder-focused-shell.md`, whose now-incorrect "Cart and the CTA
share the one `upgradeGateActive` boolean" line was corrected.

## Status
Set to **AWAITING CHATGPT REVIEW**. No further source work until the verdict.
