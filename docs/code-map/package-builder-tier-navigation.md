# Package Builder Tier Navigation and Cart Eligibility

## Purpose and ownership

One resolved navigation step decides what the customer is being asked to do
after a normal Tier's Add to Quote, and the Cart's visibility is read off
that step. `FamilyTierAdapter.tsx` owns the resolution (it already resolves
the Family's own shape); `PackageBuilderApp.tsx` keeps the single Cart
decision, `items.length > 0 && !quoteSuppressedByShell`, and never re-derives
add-on, occupant-count or catalogue facts.

Nath's rule: a successful Add to Quote from a Tier card **or** a Tier focused
shell completes the Tier-selection step, and the Cart becomes visible only
when no intermediate customer step stands between that Tier and the Cart.
There is no persistent `showCart` state — visibility is always quote contents
multiplied by the resolved step.

## The steps

`resolvedStep` in `FamilyTierAdapter.tsx` mirrors the render branches in
order, so the step named is always the view that renders:

| Step | View | Cart |
|---|---|---|
| `tier_comparison` | card grid, nothing quoted | eligible |
| `tier_landing` | implicit single-Tier landing, not yet quoted | suppressed |
| `focused_inspection` | explicit Choose Plan / View Plan / Add-on shell | suppressed |
| `upgrade_browsing` | composable catalogue workspace | suppressed |
| `recommendations` | staged add-ons and/or the pending Upgrade CTA | eligible |
| `cart` | Tier step complete, nothing in between | eligible |

`pending` and `browsing` are deliberately separated: only `browsing` is a
focused Upgrade workspace. `pending` is the CTA inside Recommendations, so it
no longer suppresses the Cart — previously the Cart vanished and returned
between two states of the same Recommendations view.

Whether the shell offers a Close **X** is a different question, owned by
`isLockedSingleTierLanding`: an X needs a destination *reachable from the X
itself* (an add-on or catalogue staged into Recommendations), while the Cart
needs only an unobstructed next step. A cross-audience Family (2026-09-11
correction, `project-work/2026-09-11-single-visible-tier-permanent-focus.md`,
corrected second pass same day) no longer diverges when this Tier is the
active group's lone normal occupant: the other group's occupant sits behind
the customer-group tab bar, not behind the X, so that Tier's X stays hidden
too, **regardless of whether the shell was reached implicitly or through an
explicit View Plan click** — `focusedTierIsLoneInActiveGroup` reads the
currently focused Tier itself, never how it got focused (the first pass
wrongly keyed this off `isImplicitSingleTierView` alone, which an explicit
route from a Recommendations summary row could bypass). The customer-group
tabs follow the same rule and stay visible on either route.

Cart eligibility is untouched either way: for the implicit route the Cart is
visible beside the locked shell (`resolvedStep` resolves to `cart` once
quoted); for an explicit route it stays `focused_inspection` and the Cart
stays suppressed, exactly like any other explicitly opened shell.
`focusedTierIsLoneInActiveGroup` is the derived flag for the X/tabs question,
separate from the Family-wide `familyOffersNothingElse` and from
`resolvedStep`'s own Cart logic.

## Identity that must survive the step

- **Staging parity.** `hasRecommendationContent` (add-on Tiers, or
  `resolveComposableEligibleRows(family)`) gates both `commitSelection()`'s
  staging and `stagedTier`'s own validity, so a restored browser cart mounts
  into the same presentation the in-session transition produces instead of a
  seed-only staged/small-card view.
- **Focused Edition.** `implicitQuotedEditionId` keeps a Tier that stays
  focused after Add to Quote showing the exact quoted Default/Edition.
  Derived, never stored: `commitSelection()` clears `focusedEditionId`, and a
  restored cart never had one.
- **Add-on Edition.** `quotedAddonEditionPlatformIds` steers each quoted
  add-on card's own `selectedEditionId` in `PricingTiers.tsx`, the same
  mechanism `quotedTierEditionPlatformId` already applies to the primary. An
  absent map entry leaves a card uncontrolled; a present `null` is a real
  identity (quoted on the Default declaration).

## Authoritative files

| Area | Files |
|---|---|
| Step resolution, staging, focused Edition | `resources/ts/components/package-builder/FamilyTierAdapter.tsx` |
| Cart/sidebar decision | `resources/ts/components/package-builder/PackageBuilderApp.tsx` |
| Card Edition steering | `resources/ts/components/cost-builder/PricingTiers.tsx` |
| Tests | `scripts/tier-next-step-navigation-regression.mjs` (mounted step matrix), `scripts/single-occupant-quoted-focus-regression.mjs` (which shell a single occupant gets, and its X) |

## Related Code Maps

[Package Builder Focused Shell](package-builder-focused-shell.md),
[Cost Builder](cost-builder.md), [Tier Edition](tier-edition.md), and
[Composable Tier Occupant — Customer UX](tier-composable-occupant-customer-ux.md).
