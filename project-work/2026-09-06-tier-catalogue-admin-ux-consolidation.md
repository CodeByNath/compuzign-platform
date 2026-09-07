# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — clean candidate with Code Map sync**
- Prior auditor verdict: **Proceed with safeguards**.
- Production remains `main@75105e92dcdd751c27e48f46491c0cac1f486dd7`.
- New clean candidate: `review/tier-catalogue-admin-ux-phase3-correction-v2@fa4b53b5ee0193b0580f31af876225c812056108` — 1 commit ahead of `main@75105e92`, 0 behind, merge base exactly `75105e92`.
- The prior review branch/SHA (`review/tier-catalogue-admin-ux-phase3-correction@9318ce53`) is superseded and deleted (remote + local) per branch hygiene — its full tree is identical, just squashed with the Code Map update onto this one clean commit. Renamed to `-v2` rather than force-pushed over the old name, since rewriting an already-pushed branch's history was blocked by tooling policy.
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

After that clean candidate is verified, source push can be approved. Live Admin validation remains required after deploy. The separate Always-included initial-cart hydration defect stays out of scope.

## Claude — Code Map sync report (`fa4b53b5`, 1 clean commit off `main@75105e92`)

Updated both Code Maps the auditor named:
- `docs/code-map/tier-composable-occupant-admin-ui.md` — the Phase 3 section now documents the live-UI correction as a separate paragraph: selected-scope state lives in `PackageTierWorkspace.tsx` (`selectedDeclarationId`/`activeDeclarationScope`), driving the upper `TierDetailPanel` card (`projectDeclarationDetailCard`) together with Featured Inclusions and Customer Selection Rules metrics; right column order (tabs → metrics → `Edit`) and left-column-Featured-only are stated explicitly.
- `docs/code-map/tier-composable-occupant-workspace-ui.md` — its own Phase 3 mention updated to note the later live-UI correction lifted scope selection out of the middle shell into the workspace, so the upper card is included, not just the two lower columns.
- No source behavior touched beyond the already-reviewed `9318ce53` tree — squashed verbatim onto the new commit alongside the doc changes.

**Validation — all pass**: `npx tsc --noEmit`, `npm run build` (dist output regenerated, included in the commit), `npm run docs:check` (both Code Maps now within the 600-word limit), `contract:tier-catalogue-declaration-scope`, `contract:composable-tier-admin-ux`, `contract:package-tier-workspace-shell`, `contract:package-tier-workspace`, `contract:tier-catalogue-overview-presentation`.

Branch/SHA: `review/tier-catalogue-admin-ux-phase3-correction-v2@fa4b53b5ee0193b0580f31af876225c812056108`, pushed to origin. Old branch name deleted (remote + local) — see Status above for why `-v2` rather than a force-push.