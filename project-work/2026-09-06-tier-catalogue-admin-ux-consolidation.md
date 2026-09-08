# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — structural correction: Build Your Own must use the same focused-occupant model, not a parallel Upgrade shell**
- Auditor verdict: **Stop — architectural risk** for `e165730e` as currently shaped.
- Production `main`: `af01ebb10a49ca66091b504eba54e8c21d597387`.
- `e165730e` is **SOURCE PUSH NOT APPROVED**.
- Visibility correction remains a separate next step after focused-shell ownership is accepted.

## Nath's clarified rule — keep this literal
Normal Tier focused flow is already:
`Tier occupant -> focusedTierId + focusedEditionId -> family.pricing.tiers[tierId] -> same focused shell`.

**Build Your Own is also a Tier occupant with its own Default, Editions, Legs, inclusions, pricing and customer policy.**

Therefore Build Your Own focused flow must be the same product pattern:
`Build Your Own/composable occupant -> its own Default/Edition identity -> same focused shell`.

Do not treat Build Your Own as a separate focused-view system.

## What the current candidate actually does wrong
I inspected the source. `e165730e` still renders a separate browsing branch:
- `upgradeGateActive === 'browsing'` -> `cz-package-builder__upgrade-browsing`;
- separate `composableEditionId` selector state;
- separate `ComposableOfferBrowser` + `UpgradeBuildSummary` shell;
- separate exit/sync guard machinery.

It now points that parallel shell at the correct `pricing.composable_offer`, but that still misses Nath's clarified architecture: **same focused shell, different occupant source**.

We spent several rounds polishing synchronization inside the wrong presentation structure. Stop doing that.

## Claude — first correction only
Audit the existing normal `focusedTier` branch and refactor the focused-shell source so it can resolve either:
1. a normal Tier occupant from `family.pricing.tiers[tierId]`, or
2. the Build Your Own/composable occupant from `family.pricing.composable_offer`.

The focused shell/chrome/Default-Edition selector must be one system. Build Your Own's catalogue-selection content can remain its own occupant-specific body where genuinely required, but it must be hosted by the same focused-shell structure and driven by that occupant's own Default/Edition identity.

### Must preserve
- real composable Edition server resolution/quote identity already discovered as necessary;
- existing composable inclusion Add/Remove/quantity and server-preview authority;
- primary quoted Tier remains untouched while editing Build Your Own;
- Manage build/footer recovery still enter Build Your Own focused state.

### Must remove / not substitute
- do not keep a second `upgrade-browsing` focused-shell architecture merely styled to resemble the normal shell;
- do not bind Build Your Own to the selected primary Tier;
- do not add more sync/exit machinery until the shared focused-occupant structure is correct;
- do not touch the separate visibility bug in this phase.

Before implementation, compare the exact normal focused branch with the Build Your Own branch and make the smallest source change that unifies the shell/occupant selection model. Return one clean review candidate from current `main`, with a short report explaining exactly which focused-shell code is now shared and which body remains composable-specific. Set **AWAITING CHATGPT REVIEW**. Do not push to main.

## Next separate visibility rule — do not implement yet
When the new Upgrade CTA/gate is active, hide **Cart + Add-ons**, not the selected primary Tier card. We will audit that only after this focused-shell correction is accepted.