# Account Station → Settings → Tools → Profile — Active Work

## Status
**AWAITING REVIEWER REVIEW — Phase 1 branch closeout done; Phase 2 plan submitted for review.** Reviewer verdict: **Proceed with safeguards**. Phase 2 planning only; implementation not yet authorized.

## Builder closeout — 2026-10-10
Reconfirmed `global-profile-platform-settings` and `main` identical at `4d8a5c4a` (ancestor check, both local and remote) before deleting. Deleted the topic branch both remotely (`git push origin --delete`) and locally (`-D`, since `git branch -d` checks merge against the current branch rather than `main` and false-negatived on an already-SHA-identical branch). Remote now holds exactly two branches: `main`, `Project-work-instructions` — within the three-branch cap with zero open topic branches. (An unrelated pre-existing local-only branch, `tier-inclusion-unit-price-copy-order`, is untouched — out of this item's scope.)

## Phase 2 plan — proposal only, for Reviewer review
**Scope:** add the Account Station → Settings → Tools → Profile UI panel in Admin Station — Brand name/code fields, Logo/Favicon media pickers, Save/Settle actions, Publish/Disable/Enable controls — mirroring Service's existing Overview tab and lifecycle-actions-footer pattern. No new Station, module, or identifier type; no backend route/schema change (Phase 1's REST surface is reused as-is).

**Mapping to the six locked gates:**
1. **Route dispatch/permission/nonce** — closed naturally once the real Admin UI calls these endpoints through the same authenticated REST client Service uses; still needs a non-production integration run (gate below), not UI clicking alone.
2. **Durable bootstrap/persistence** — verify first real Save against actual `wp_options`, inspect the stored four-node structure directly, and exercise an interrupted-bootstrap retry against real storage.
3. **Media Library attachment accept/reject/Clear** — the Logo/Favicon pickers are real Media Library components; exercise against real attachment posts, not the stub's fake id.
4. **Draft/canonical isolation + full lifecycle** — end-to-end click-through (Save → Settle → Publish → Disable/Enable) on a non-production instance first; Nath's live read-only check only after deploy, against the exact deployed SHA, per the Owner validation boundary.
5. **Concurrent first-Save against real storage** — cannot be proven by UI clicking; needs an integration test driving two real concurrent requests at the same DB row, replacing Phase 1's single-process stub race.
6. **Real Profile UI/Admin integration** — direct output of shipping this UI; closed by Nath's live check once deployed.

**Open dependency, flagged not solved:** Gates 1/2/3/5 need a disposable non-production WordPress instance (e.g. `wp-env`/WP-CLI + throwaway DB) actually dispatching REST requests — this does not exist for this project today. Setting one up is an infrastructure decision for Owner, separate from the UI implementation itself; the plan does not assume it will exist by default. If declined, gates 1/2/3/5 stay open findings carried into Phase 2's own closeout, not silently waived.

No implementation starts until Reviewer reviews this plan and the gate-closure approach; stopping here.

## Owner decision and acceptance — 2026-10-09
Owner explicitly **approved Option B**: defer Account Station Phase 1's remaining integration checks to **mandatory Phase 2 acceptance gates**. This is authorization to defer **verification**, not to waive tests, alter architecture, mutate production, or claim end-to-end completion.

Verified `main@4d8a5c4a43a4cd21897f902ef2cae510805d0bd1`; [Deploy to Hostinger 37937420851](https://github.com/CodeByNath/compuzign-platform/actions/runs/37937420851) succeeded for exact SHA. Compared `global-profile-platform-settings` to `main`: **identical**, ahead/behind 0/0. Last correction changed only `tests/account-station.php` (+88 lines). Builder reports 84/84 Account in-process contracts passing; Reviewer inspected source/test coverage but did not execute tests. Earlier live GET/access check was on older `3250f9a4`, not current SHA. No Phase 1 Profile UI exists; no new Owner testing requested.

## Locked Phase 2 final-acceptance gates
Technical agents must provide independently reviewable **non-production integration** evidence for:
1. Real route dispatch, authenticated/unauthenticated permissions and nonce/capability behavior (beyond stubbed direct handlers).
2. Durable Account four-node identity bootstrap, proper parent links, interrupted retry and persistence/serialization without duplicate identity.
3. Real image Media Library attachment acceptance, rejection and deliberate Clear behavior; failed Save leaves drafts/canonical state intact.
4. Draft/canonical isolation, and end-to-end Save → Settle → Publish → Disable/Enable lifecycle and correct visibility.
5. Concurrent first-Save/reservation behavior against real concurrent requests/storage, not only a shared in-process stub.
6. Actual CompuZign Profile UI interactions and Admin integration once Phase 2 adds that interface; confirm behavior against exact deployed SHA.

These gates are **mandatory before Phase 2 final acceptance**, not necessarily blockers to opening its separately reviewed implementation phase. Never treat successful build, stub test, deployment or ordinary UI clicking alone as proof of all gates. No production mutation without separate explicit Owner authorization.

## Accepted architecture and safety
Account is a peer Station, owning Settings → Tools → Profile/Brand; Identifier Station owns mint/bind. IDs: `CZA/CZAS/CZAST/CZASTP`. Locked Station lifecycle and Service/Category baseline apply. `cda11026` repaired pre-/half-bootstrap settle and negative attachment validation. Separate unresolved items: pre-existing hardcoded default credential in `src/Core/PlatformAccess.php` needs secure-provisioning work and live credential rotation; singleton Archive/Trash/permanent-delete Owner decision remains deferred. Do not silently resolve these in Phase 2.

Codex interactive-browser audit inadvertently changed Service state; Owner reports it restored. Preserve the **browser automation safety incident**; default to read-only and never treat Chrome permission as permission to Save/Publish/Disable. Claude's VS Code browser capability is unavailable. Do not ask Owner for manual API, console, or backend tests.

## Next Builder action — closeout only
Confirm exact topic SHA is merged/identical to main; **delete the completed topic branch safely** using authorized Builder Git tooling, verify remote two-branch state, and record cleanup evidence in this same file. No source edits, new topic branch, deployment or Phase 2 implementation yet. Then submit a concise Phase 2 plan scoped to the existing Account Station interface/lifecycle and the six mandatory gates for independent Reviewer review. Remain in this work area until Phase 1 closeout is recorded; stop for Reviewer.
