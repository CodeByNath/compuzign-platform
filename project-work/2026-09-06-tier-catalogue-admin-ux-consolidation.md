# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `8920607fb41967072c9dc561e2e0fae9826f52ca`.
- Review branch: `fix/family-tier-membership-boundary` @ `e82705140f0e0eddfa9519996275f7fd4701ca25`.
- **SOURCE PUSH NOT APPROVED YET.**

## Accepted candidate behavior
The source correction is accepted. `FamilyTierAdapter` now resolves Family occupancy before audience/group/focus derivation: a global Tier slot absent from `family.pricing.tiers` is non-membership, never a phantom normal Tier. This fixes both reported symptoms while preserving architecture:
- a customer-group tab exists only when that group has at least one real primary Tier;
- one genuine primary Tier can reach the existing synchronous focused shell;
- Add-ons do not qualify a group for tabs;
- a real occupant with unset `audience_groups` still defaults to both groups;
- no effect-driven auto-open, fake click, timeout, CSS-only hiding, hardcoded IDs, or one-card substitute.

The temporary `[CZ single-tier debug]` logging is removed. The mounted regression covers PB-only, Enterprise-only, add-on-only opposite group, both real groups, absent global slots, and the preserved unset-audience case. Claude reports 15 failures on pre-fix production and 22/22 passing on the candidate, plus clean TypeScript/build/relevant contracts.

## Documentation safeguard — accepted
Commit `e8270514` changes only `docs/code-map/package-builder-focused-shell.md` and correctly explains that the Family-switch reset remains required when the new Family genuinely occupies the same shared Tier id; an unoccupied Tier can no longer pass the membership boundary. No source/test behavior changed.

## Final branch-hygiene safeguard before push
The review branch is currently **2 commits ahead** of production (`9ea1d830` source + `e8270514` docs). `project-work/AGENTS.md` requires the final production candidate to be one clean candidate head from current production `main` before source-push approval.

### Claude — next action
On the SAME topic branch `fix/family-tier-membership-boundary`:
1. Recreate/squash the already-accepted final tree onto `main@8920607f` as **one commit**. Do not change any file contents.
2. Verify the resulting tree is byte-identical to current accepted head `e8270514` (record both tree SHAs).
3. Confirm branch is exactly 1 commit ahead, 0 behind, merge base `8920607f`.
4. Record the new commit SHA and evidence here; set **AWAITING CHATGPT REVIEW**.
5. Do not push to `main` yet.

**Must preserve:** focused shell, Tier/Edition identity, Add-ons, composable Upgrade journey, pricing/server-preview authority, Cart, global Tier vocabulary, genuine unset-audience default.

**Must not substitute:** any behavior change, extra customer step, artificial interaction, hardcoded Family/Tier logic, CSS-only hiding, or one-card fallback.

## Out of scope
Pre-existing `contract:package-builder-flow` ENOENT on removed `FullBuildDetail.tsx` remains non-blocking for this defect. Live validation is required after deployment before closure.
