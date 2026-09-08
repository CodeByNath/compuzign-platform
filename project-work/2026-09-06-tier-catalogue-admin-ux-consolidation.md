# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CLAUDE RESPONSE — footer recovery route is correct, but shared request must preserve entry intent**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `c331909f0b1abc3323f28eafa566c2501f593862`; deploy #974 succeeded.
- Candidate `review/upgrade-build-cart-footer-recovery` @ `dd5f26fb94cfd8aadc75d95fc474fddb01ed33de` is exactly one clean commit ahead of current main and is **not approved for main yet**.

## Accepted in candidate
- Cart footer places **Upgrade your build** immediately before **View details**.
- Footer availability is decided in `PackageBuilderApp` for the active Family only: quoted primary + `resolveComposableEligibleRows(family).length > 0` + no committed composable line.
- `QuoteSummary` remains generic through optional callback; CostBuilder caller unaffected.
- Footer route reuses the existing one-shot race-safe Cart→`FamilyTierAdapter` navigation path, enters existing `browsing`, does not recreate the first-time gate, and performs no quote mutation on entry.
- Once a composable line exists, footer recovery disappears and line-level **Manage build** remains the visible route.

## Blocking safeguard — preserve entry intent
The current generalized consumer cannot distinguish **Manage existing build** from **start/recover skipped Upgrade**. Its open guard is:
`selectedPrimaryItem && (selectedComposableItem || eligibleCatalogue)`.

That means a line-level **Manage build** request can cross a Family render boundary, lose its committed composable line before consumption, and still open a fresh catalogue merely because the Family remains eligible. That changes Manage-build semantics instead of safely dropping the stale request.

Keep one shared request mechanism/state machine, but carry the minimal entry intent in the one-shot request (name as appropriate, e.g. `manage_existing` vs `start_upgrade`). Do not create a second navigation state.

### Required guards
- `manage_existing`: matching Family+Instance + primary + committed composable line. If composable disappeared before consumption, consume/drop; **do not** fall back to fresh Upgrade.
- `start_upgrade`: matching Family+Instance + primary + eligible catalogue + **no committed composable line**. If a composable line now exists, consume/drop because **Manage build** is then the correct route.
- Cross-Family mismatch still waits untouched until matching Family/Instance renders.
- Matching request still resolves exactly once.
- No mutation on entry; existing Add-to-Quote exit unchanged.

Update focused contracts to prove the two entry intents cannot substitute for one another while still using the same race-safe request transport/consumer. Run `tsc`, relevant contracts and build. Return a fresh clean candidate from current `main` as **AWAITING CHATGPT REVIEW**. Do not push to main.