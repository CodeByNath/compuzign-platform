# Package Builder Responsive Focused Entry

## Purpose and ownership

Where a customer LANDS when a focused occupant opens on a phone or tablet.
This is navigation/presentation only: it moves the page, never quote state,
Tier/Edition/composable identity, Cart eligibility, Recommendations, pricing
or Commercial Legs. It lives in its own map because the
[Package Builder Focused Shell](package-builder-focused-shell.md) map — which
owns what that shell renders — is at its word limit.

## One shell-level rule, not one per occupant

Both focused branches of `FamilyTierAdapter.tsx` render the same
`.cz-package-builder__focused` element, so both carry the same
`focusedShellRef`. A single `focusedOccupantKey` names whoever is in it:

| Occupant | Key |
|---|---|
| Composable "Upgrade your build" browsing workspace | `'upgrade'` (`upgradeGateActive === 'browsing'`) |
| Normal Tier occupant | `tier:<focusedTierId>` |
| Add-on occupant | `tier:<focusedTierId>` — the same branch; `focusedData.is_addon` changes what the shell presents, never which shell it is |

The key is OCCUPANT identity, never variant. `selectVariant()` changes
`focusedEditionId` but not this key, so switching Default/Edition inside an
open shell is not an entry and never scrolls a customer mid-read. A key that
becomes non-null, or changes to a different non-null value, is the entry.

## Boundary with the implicit landing

The key reads the customer's own explicit `focusedTierId`, never
`effectiveFocusedTierId`. The implicit single-Tier landing
(`isImplicitSingleTierView`) is arrived at, not opened — moving the page
under an arrival would be wrong — so that auto-focus derivation is
deliberately outside this rule and untouched by it.

## What entry does

Below `max-width: 767px` only — the same breakpoint
`.cz-package-builder__focused` already stacks its two columns at, which is
what makes entry position matter: stacked, the detail column runs full width
above the card, so entering partway down the page drops the customer into the
middle of the occupant. Desktop presentation is unchanged.

Entry brings the top of the focused experience into view with
`scrollIntoView({ block: 'start' })`, honouring `prefers-reduced-motion`
through the same `matchMedia` idiom the rest of the repository scrolls with.
That top is:

- the `.cz-package-builder__customer-tabs` bar when it is the shell's
  immediately preceding sibling — on a locked or lone-in-group shell that bar
  is the only way off, so the entry must not scroll past it;
- the shell itself otherwise.

Both targets declare their landing offset as `scroll-margin-top` inside that
same 767px block in `cost-builder.css`, so the offset stays with the layout
rule rather than as a number inside the effect.

## Authoritative files

| Area | Files |
|---|---|
| Rule | `focusedOccupantKey`, `focusedShellRef`, the entry `useEffect` (`resources/ts/components/package-builder/FamilyTierAdapter.tsx`) |
| Breakpoint and landing offset | `@media (max-width: 767px)` (`resources/css/modules/cost-builder.css`) |
| Tests | `scripts/responsive-focused-entry-contract.ts` |

## Related Code Maps

[Package Builder Focused Shell](package-builder-focused-shell.md),
[Package Builder Tier Navigation and Cart Eligibility](package-builder-tier-navigation.md),
and [Plan Details](plan-details.md).
