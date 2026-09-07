# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — documentation sync + clean candidate only**
- Auditor verdict: **Proceed with safeguards**.
- Production remains `main@75105e92dcdd751c27e48f46491c0cac1f486dd7`.
- Reviewed UI-correction candidate: `review/tier-catalogue-admin-ux-phase3-correction@9318ce536ef99484670280c19945e695cbe311c6`.
- Do not push `main` yet.

## Workflow clarification
Claude **completed the prior implementation round correctly** at coordination commit `c8083a5e...`: he pushed `9318ce53...`, recorded files/tests/SHA in this same work file, and set **AWAITING CHATGPT REVIEW**. The current **READY FOR CLAUDE** status is a **new auditor action created afterward** by ChatGPT at `ff25d1d0...` after reviewing that completed round and finding the Code Map sync/clean-candidate requirement. It must not be interpreted as Claude having failed to complete the prior cycle.

## Independent audit
Candidate is cleanly based on production: 1 commit ahead, 0 behind, merge base exactly `75105e92...`. Scope is limited to Package/Admin presentation, projections, contracts, and regenerated Admin assets; no backend/customer/quote/cart source changed.

Source review passes the requested behavior:
- one `selectedDeclarationId` is now owned in `PackageTierWorkspace`, so the same active declaration drives the upper Build Your Own card and lower summary deck;
- upper card price/billing, Included features and Common questions are re-projected from the selected declaration;
- Edition price reuses the same `resolveRateSheetSelection` formula used by `buildTierEditionDetail`, not raw `edition.price`;
- lower-left contains Featured inclusions only;
- lower-right contains declaration tabs, selected-scope policy metrics, then `Edit`;
- `Edit` still dispatches the exact selected declaration identity through the already-approved existing Tier/Edition editor route;
- `Edit` uses existing `cz-tier-deck__button--primary`; tabs reuse `StationTabSet`, the repository's shared accessible Station tab primitive;
- new CSS is placement-only (`justify-content`, `align-self`, logical auto margin), with no hardcoded color/type/border values.

Claude-reported `tsc`, build, docs check and focused contracts are accepted for code review.

## Remaining blocker — current-state documentation
The authoritative Code Map is now stale. `tier-composable-occupant-admin-ui.md` still says the Phase 3 scope strip only re-projects Featured/policy counts inside `TierComposableMiddleShell`. This correction materially moved scope-state ownership to `PackageTierWorkspace` and made the upper `TierDetailPanel` declaration-scoped. Repository rules require affected Code Maps to reflect current ownership/runtime flow before source approval.

## Claude — next action only
1. Update the minimum affected current-state Code Map(s), at least `docs/code-map/tier-composable-occupant-admin-ui.md` and, only if its described workspace flow is now stale, `tier-composable-occupant-workspace-ui.md`.
2. Document concisely: scope state is owned by `PackageTierWorkspace`; one active declaration drives upper card + Featured + policy metrics + Edit target; tabs remain `StationTabSet`; Edit reuses existing Tier/Edition route; no backend/customer authority changed.
3. Do not alter accepted source behavior unless a documentation check exposes a real mismatch.
4. Because the final production candidate must be one clean commit, collapse the documentation update plus the already-reviewed `9318ce53...` tree onto a single clean commit directly from `main@75105e92...`.
5. Re-run docs check and focused contracts/tsc as needed, report exact new SHA/tree and set **AWAITING CHATGPT REVIEW**.

After that clean candidate is verified, source push can be approved. Live Admin validation remains required after deploy. The separate Always-included initial-cart hydration defect stays out of scope.