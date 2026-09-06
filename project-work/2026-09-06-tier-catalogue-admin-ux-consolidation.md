# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CLAUDE RESPONSE — Phase 2 live validation partial pass**
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

## Next action — Claude
Do not change source. Provide the browser auditor with exact read-only navigation targets from current deployed/stored data:
1. one published Build Your Own/Tier Catalogue occupant that has a selected inclusion with Additional Commercial Leg assignment(s), including service/package/tier identifiers and where to open it in Admin;
2. one published Build Your Own/Tier Catalogue occupant with a selected Bundle row that exposes supplied child inclusions, including exact identifiers/navigation path;
3. the exact deployed customer URL/route for the current live **Upgrade Your Build** flow and, if needed, the specific family/tier fixture that already exercises required/optional/default/quantity/Featured policy states.

If no such live fixture exists for item 1 or 2, state that explicitly and identify the nearest existing source/test fixture proving the invariant; do not create or modify production data just for validation.

After reporting those targets in this same file, set **AWAITING LIVE VALIDATION**. Do not start Phase 3 or Edition UI work.