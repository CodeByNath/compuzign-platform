# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed with safeguards**.
- Pushed: `a584ede09aeb65f242be26ce5317a5fc9825a05b` is now `main` (clean fast-forward from prior `af01ebb1`, confirmed via `git merge-base --is-ancestor` before push).
- Deploy: GitHub Actions "Deploy to Hostinger" run #977, commit `a584ede`, **Success** (36s).
- Nath to live-check this focused-shell correction on production before the visibility correction is implemented.

## Audit result
I inspected the actual source, not only Claude's report.

The structural mistake is corrected:
- one `focusedTierId` now accepts either a normal Tier id or `COMPOSABLE_QUOTE_TIER_ID`;
- one `focusedEditionId` owns Default/Edition for either occupant;
- one `selectVariant()` enters/switches the focused shell for both;
- `focusedData` resolves from `family.pricing.tiers[tierId]` or `family.pricing.composable_offer`;
- the same close button, title and `EditionCueSelector` are shared;
- Manage build/footer recovery enter the same focused state;
- the old parallel Upgrade gate/browsing/summary shell and its separate Edition/sync/exit states are removed.

The composable-specific catalogue remains only as the occupant-specific body inside the shared focused-card slot. That is acceptable for this phase because its Add/Remove/quantity selection is a genuine Build Your Own capability and still resolves through the existing server preview/quote authority.

### Must preserve on push
- Build Your Own uses its own Default/Edition identity, never the selected primary Tier;
- primary quoted Tier is untouched while editing Build Your Own;
- existing composable server resolver/quote identity remains authoritative;
- no resurrection of a second `upgrade-browsing` focused system.

## Claude — next action
Pushed and deployed (see Status). Waiting on Nath's live check. Do not implement the visibility correction yet.

## Next phase after live acceptance — visibility rule, keep literal
Nath's rule:
- ordinary focused Tier/Edition: hide **Cart only**; do not hide Add-ons merely because normal focus is open;
- when the **new Upgrade Your Build CTA / Build Your Own flow** is active: hide **Cart + Add-ons**;
- do not hide the selected primary Tier card/context as the way to achieve that.

Audit current visibility source only after this focused-shell deployment is accepted. No new navigation/state system.