# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING LIVE VALIDATION — navigation targets reported below**
- Auditor verdict: **Proceed with safeguards**.
- Phase 2 remains `main@3cc88e83f93e57fec7b61419129cd93a8432809b`, deployed successfully by GitHub Actions run `34033325117` (#964).
- Phase 3 remains blocked.

## Live validation accepted so far
Browser-agent evidence is accepted for these deployed Admin checks:
- published Build Your Own/Tier Catalogue Inclusions shows exactly one Customer Selection controller for each of the three tested top-level inclusions;
- access-mode behavior works; Not offered hides dependent controls;
- Selected by default, Featured, and quantity bounds persisted through save/reopen (`3 / 1 / 9 / 2` tested);
- standalone Customer Selection Rules drawer showed the same state; changing max to `11` there appeared in reopened Inclusions;
- ordinary Tier (Starter Cloud) showed no Customer Selection controls, including around an extra Leg assignment;
- save disabled navigation while "Saving..." and returned to Pending without an observed error;
- test values were restored and saved; drafts remain pending; nothing was published.

This is strong evidence that the merged controller is using the same persisted `customer_policy` authority as the standalone drawer.

## Deployment correspondence
The browser agent could not verify deployment correspondence, but the auditor already independently did: `main` points exactly to approved `3cc88e83...`; Actions run `34033325117` succeeded for that exact head SHA. This item is closed and needs no further browser proof.

## Still required before Phase 3
- Build Your Own/Tier Catalogue inclusion that itself has one or more Additional Commercial Leg assignments: confirm one policy controller for the inclusion only, never repeated per assignment.
- Bundle-backed selected row with supplied children: confirm one policy controller for the Bundle row and none for supplied children.
- customer-facing Upgrade Your Build parity: offered/required/optional state, defaults, quantity behavior, Featured ordering unchanged.
- save sequencing cannot be proven from visible UI alone; source review already confirms features save first then customer-policy save, with policy failure surfaced as Save failure. Live validation only needs to ensure UI does not falsely report full success when a real save error is observed; do not manufacture an error by mutating runtime/infrastructure.

## Claude response — navigation targets

No source change made. I have no access to the live WordPress database/stored occupant records myself (source-only review) — I cannot identify which specific published occupant/Family already has a Leg-assigned or Bundle-backed selected inclusion in production today. Reporting what source alone establishes, per the "no live fixture → nearest existing fixture" fallback:

**1. Leg assignment + customer_policy — no live identifier available; nearest fixture exists and is genuinely combined.**
`tests/composable-customer-policy-resolver.php`, §3 (lines 236–267): item `hosting` is claimed by both the Default row and an Additional Leg (`leg_assignments`) at once, with exactly ONE `customer_policy` entry for `item_id: 'hosting'` governing both — excluding it removes it from both components simultaneously, proving the policy is authored once per `item_id`, never duplicated per Leg assignment. This is a real data fixture, not a static source-text check. The browser auditor should find/create (read-only browse only, never mutate production) any published Build Your Own occupant whose Inclusions already has ≥1 row with an Additional Leg assignment — if none exists live, this PHP fixture is the accepted proof for that invariant instead.

**2. Bundle-backed row + supplied children + customer_policy — no live identifier available; genuine coverage gap.**
Closest fixture: same file, §7 (lines 409–416) — item `addon_bundle` carries `bundle_id` and a `customer_policy` entry keyed to it, proving policy authoring targets the Bundle row's own `item_id` correctly. **But this fixture's `includes` is `null`** — no populated supplied children — so it does NOT exercise a Bundle with real supplied content alongside a policy. No test anywhere (`tests/rate-sheet-bundle.php`, `scripts/tier-occupant-inclusions-bundle-contract.ts`, `scripts/tier-rate-sheet-catalogue-bundle-contract.ts`) combines a populated Bundle with `customer_policy`. The "never per supplied child" claim is currently proven only statically (`tier-inclusions-customer-policy-merge-contract.ts:98-102` — the supplied-content sub-list block never contains `CustomerPolicyItemFields`), never against a live/data-driven Bundle-with-children case. **Flagging this as a real gap**, not overstating coverage: if no published occupant with a Bundle row that has actual supplied children exists live, this invariant currently rests on static source-scan proof only, not an end-to-end fixture.

**3. "Upgrade Your Build" is a UI state, not a separate route.**
`ComposableOfferBrowser.tsx` renders both "Build Your Own" and "Upgrade your build" as two states of the SAME component (confirmed in `docs/code-map/tier-composable-occupant-customer-ux.md`) — there is no distinct URL. It mounts wherever WordPress renders the `[compuzign_package_builder]` shortcode (registered in `CostBuilderModule.php`, template `app/modules/cost-builder/templates/package-builder.php`). The actual page slug/URL is WordPress page content, not in this repo's source — the auditor needs to locate the live page by searching WP admin/Pages for that shortcode string, not by a guessed slug.

Do not start Phase 3 or Edition UI work.