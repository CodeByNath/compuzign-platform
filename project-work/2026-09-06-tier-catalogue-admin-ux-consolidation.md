# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Build Your Own now shares the real focused shell**
- Auditor verdict on `e165730e`: **Stop — architectural risk** (superseded by this candidate).
- Production `main`: `af01ebb10a49ca66091b504eba54e8c21d597387`.
- Review candidate: `review/upgrade-shell-visual-parity` @ `a584ede0` — ONE commit, 21 files, based directly on current `main`, no rejected intermediate ancestry (`e165730e` squashed out via `git reset --soft origin/main` + one fresh commit, force-pushed with `--force-with-lease`). Not pushed to `main`.
- Visibility correction (Cart + Add-ons hiding rule) remains the separate next step, untouched this phase.

## Claude — report: which focused-shell code is now shared, which stays composable-specific
Compared the normal `focusedTier` branch against the old parallel `upgrade-browsing` branch and made the smallest change that unifies them, rather than polishing the parallel structure further.

**Shared (unbranched by occupant):**
- `focusedTierId`'s own type is now `FocusedOccupantId = TierId | typeof COMPOSABLE_QUOTE_TIER_ID` — ONE state slot, admitting the composable sentinel alongside the five fixed Tier ids.
- `selectVariant(tierId, editionId)` is the ONE entry point into focus for both — the composable occupant's own card, Manage build, and the Cart footer recovery route all call it directly (`selectVariant(COMPOSABLE_QUOTE_TIER_ID, ...)`); nothing calls a second setter.
- `focusedData` resolves from `family.pricing.composable_offer` (composable) or `family.pricing.tiers[tierId]` (normal) through one ternary — both conform to the identical `PricingTierData` shape, so the close button, title, `ideal_for` paragraph, and `EditionCueSelector` (Default/Edition switch) are fully shared JSX, never duplicated per branch.
- Cart/Add-on visibility (`onUpgradeGateActiveChange`) is now driven directly by `focusedIsComposable` — the exact same observable hide-while-open behavior as before, reported off the unified state.

**Composable-specific (the one deliberate substitution, per "can remain its own occupant-specific body where genuinely required"):**
- The right `.cz-package-builder__focused-card` slot renders `ComposableOfferBrowser` (its own live server-resolved Add/Remove/quantity catalogue) instead of `TierCard` — Build Your Own is an assembled composition, not a flat priced card.
- The left column's Commercial Terms/Periods-timeline/Plan Details sections are skipped for the composable occupant — its real commercial reality is resolved live from the customer's own selection via its own server preview; a static declared-Period timeline there would misrepresent it as a fixed charge.

**Removed entirely, not merely relabeled:** `upgradeGateTierId`/`Stage`, `composableEditionId`, `composableSyncPending`, `dismissUpgradeGate`, `exitUpgradeBrowsing`, the `cz-package-builder__upgrade-gate`/`-browsing`/`-summary` render branches and their CSS, and `UpgradeBuildSummary.tsx` (deleted). No second focused-view system remains — locked by a new `scripts/composable-focused-shell-unification-contract.ts` (source-scan, same precedent this codebase already uses for structure/effect-ordering properties) plus the existing `composable-edition-cue-sync-contract.ts` (interaction-detection logic, unchanged and still passing) and `tests/composable-edition-selection.php` (backend Default vs. Edition resolution, unchanged and still passing).

Entry: a plain Choose-Plan-style click on the composable occupant's own card in the staged/Recommendations view (gated on the same shared `resolveComposableEligibleRows(family)` eligibility check commitSelection already used) replaces the old interstitial gate screen. Manage build and the Cart footer recovery route rehydrate onto the already-committed Edition via the same `seedComposableEditionId()` helper, now called once at entry rather than stored as separate state.

Re-ran the full suite from the exact squashed-and-staged state before committing: every PHP test/contract in `CostBuilder/CLAUDE.md` and `SurfacePackages/CLAUDE.md`, all 78 registered TS contracts (three pre-existing, unrelated failures confirmed present on `main` before this change: `admin-station-css`'s own rate-sheet-tool classes, `package-builder-flow`'s reference to a component removed in an earlier, unrelated commit, and `platform-identity-schema`), `npx tsc --noEmit`, `npm run build`, `npm run docs:check` — all pass. Net diff: +1452/-1316 across 21 files — a real simplification, not additive complexity.

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