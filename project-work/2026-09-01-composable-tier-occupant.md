# Composable Tier occupant

## Status
- **AWAITING LIVE VALIDATION — Phase 1A + 1B pushed to `main` and deployed.**
- Auditor verdict: **Proceed with safeguards**.
- Base `main` before this push: `7683a2f1b8d3b87819241f59d096e13a0786df28`.
- Review branch: `phase/composable-tier-occupant` at accepted `736198663ab0dd4307255295a5dbc43ae5d6b68d`.

## Locked architecture
Family keeps one assigned Tier System / `CZTG`; one subordinate `composable_occupant` lives outside the five-slot `tiers` map and reuses normal CZT/Rate Sheet/Edition/Leg/lifecycle machinery. It is not a sixth peer Tier slot, Add-on, second Tier Instance, or Family assignment and never controls parent Tier Group status.

## Accepted source chain
Phase 1A backend/hook/identity/projection foundation through `3ab286a0` is accepted. Phase 1B correction `73619866` is also accepted after independent diff review.

The rejected parallel `ComposableOccupantCard` editor was deleted. The accepted design now uses reserved frontend address `COMPOSABLE_TIER_ID = 'composable'`, which is explicitly never a member of `TIER_KEYS`. `usePackageStation` and `useTierEditions` contain the addressing seam and adapt composable endpoint responses into the same shapes the mature Tier editor/controller stack already consumes. Above that seam, the existing module editing, lifecycle footer, focused-task behavior, Tier detail model and `TierEditionDeclarationSwitcher` are reused.

The overview screen contains only a subordinate launcher calling the same `openTierEdit()` path used by normal Tier cards. Add-on/Popular are suppressed in the shared Overview editor for composable context. Bin restore uses the entry's own origin; composable conflicts do not expose swap/retarget.

Focused contract verifies the sentinel is outside `TIER_KEYS` and response adapters satisfy the shared editor contract. Reported `tsc`, build, docs, relevant Tier/Edition contracts and composable PHP controller tests pass.

## Claude — production step
Push **only the reviewed Phase 1A + Phase 1B chain through exact commit `736198663ab0dd4307255295a5dbc43ae5d6b68d`** to `main` using the normal repository workflow. Do not add customer configurator/cart/quote/PDF/email/promotion work.

After push, record in this same file:
- exact resulting `main` SHA;
- whether it is exactly/contains reviewed `73619866` with no extra source changes;
- GitHub Actions deployment run id/status/head SHA when available.

Then set **AWAITING LIVE VALIDATION**. Do not begin the next feature phase.

### Claude — production push report

`git push origin phase/composable-tier-occupant:main` is blocked at the tool layer by this session's own auto-mode safety classifier (triggers the live Hostinger deploy workflow) — this is a standing environment constraint, not specific to this change. I handed the exact fast-forward command to the user, who ran it themselves; I then verified the result.

- **Resulting `main` SHA:** `736198663ab0dd4307255295a5dbc43ae5d6b68d` — confirmed via `git fetch origin main && git log -1 origin/main`.
- **Exact match, no extra source changes:** yes. `main` now points at exactly the reviewed/accepted commit `73619866`; nothing was added, amended, or rebased on top.
- **GitHub Actions deployment:** run id `33517746004` ("Deploy to Hostinger", workflow `.github/workflows/deploy.yml`), `head_sha: 736198663ab0dd4307255295a5dbc43ae5d6b68d`, `status: completed`, `conclusion: success`, run number 929, triggered `2026-09-01T14:09:20Z`, completed `14:09:57Z`. Confirmed via `GET /repos/CodeByNath/compuzign-platform/actions/runs?branch=main`.

Setting status to **AWAITING LIVE VALIDATION** per instruction. Not starting Phase 2 / customer-facing work.

## Live acceptance checklist
After deployment, auditor will validate read-only in Admin Station:
- composable launcher appears subordinate to normal five Tier occupants and is not counted as a sixth Tier;
- absent -> first Overview Save creates Pending occupant without auto-Publish;
- same mounted Tier editing experience opens for composable target;
- Add-on/Popular controls are absent only for composable context;
- Pricing Rules / Features / FAQs use normal editor behavior;
- Publish creates active CZT path; Enable/Disable works;
- Editions use the normal Edition management experience;
- archive/restore cannot swap/retarget with normal Tier slots;
- normal five Tier occupants remain behaviorally unchanged.

No Phase 2/customer work until this production/live phase is accepted.