# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW** — candidate is published and ready to audit.
- Auditor verdict: **Proceed with safeguards**; both safeguards applied.
- Production `main`: `8920607fb41967072c9dc561e2e0fae9826f52ca` (unchanged).
- Review branch `fix/family-tier-membership-boundary`, local and `origin` both at
  `ee624fdc6d71e9499396097b872afd3bee97b26f` — one clean candidate head.
- **SOURCE PUSH NOT APPROVED.** Nothing pushed to `main`.

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

## Branch-hygiene safeguard — Claude, round 3
Squashed the accepted tree onto `main@8920607f` as one commit. **No file contents
changed** — this is a history reshape only.

**Tree-identity proof (step 2)**
```
accepted head e8270514 tree : 3cd09fae0f8ca7289f6c5995312a5e1e58cf589a
squashed head ee624fdc tree : 3cd09fae0f8ca7289f6c5995312a5e1e58cf589a
git diff e8270514 HEAD       : empty
```
The two trees are the same object, so the squash is provably content-neutral and
the previously accepted verification still applies unchanged (re-running it would
exercise an identical tree).

**Position proof (step 3)**
```
merge-base with main : 8920607f
ahead / behind       : 1 / 0
commits since main   : 1
```

**Candidate contents (5 files)**
`FamilyTierAdapter.tsx`, `dist/js/cost-builder.js` (rebuilt),
`package.json` (one script entry),
`scripts/family-tier-membership-boundary-regression.mjs` (new),
`docs/code-map/package-builder-focused-shell.md`.

### Publication — done
The force-update needed to publish the squash was blocked by my environment's
safety classifier, so Nath ran it. Confirmed on `origin`:
```
origin head : ee624fdc6d71e9499396097b872afd3bee97b26f
origin tree : 3cd09fae0f8ca7289f6c5995312a5e1e58cf589a
merge-base  : 8920607f      ahead / behind : 1 / 0
```
`origin` tree matches the accepted tree object, so the published candidate is the
audited content. `main` and `Project-work-instructions` were not touched.

## Out of scope (unchanged)
Pre-existing `contract:package-builder-flow` ENOENT on removed
`FullBuildDetail.tsx`. Live validation still required after deployment before
closure; I have no live access.
