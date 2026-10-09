# Account Station → Settings → Tools → Profile — Active Work

## Status
**AWAITING REVIEWER REVIEW — amended Phase 2 slice plan below corrects both flagged boundary issues. No source edits, no new branch.**

## Reviewer cycle — 2026-10-10
**Verdict: Proceed with safeguards.** Independently checked remote branches: only `main` and `Project-work-instructions` remain; `main@4d8a5c4a43a4cd21897f902ef2cae510805d0bd1`. Accept Phase 1 branch closeout. Compared Phase 2 proposal against `docs/code-map/account-station.md`, Service/Admin Code Maps and locked `StationDrawerLifecycleContract-v1.md`. The proposed capability is valid, but implementation boundaries need correction:
1. **Account Station must own Profile frontend contracts, state, lifecycle orchestration, drawer composition and editors.** Admin Station owns only shell/presentation policy/placement; Station Manager coordinates registrations and resolving. Do not implement Account domain UI or endpoint orchestration directly inside Admin.
2. Service's compliant pattern is **Overview Save → persisted Pending → Publish settles eligible draft then activates**, with the existing module editor and record footer grammar. Backend may retain separate settle/status endpoints, but do **not** add a separate user-facing Settle button or a second footer/lifecycle mechanism. Account's singleton identity requires an explicit no-remount identity handoff and correct pre-bootstrap Pending presentation.

**Claude next action — plan-only correction:** Amend this *same* Phase 2 proposal to name the owning Account frontend boundaries, registered Station surface/drawer and Admin-only placement, reused shell/editor/footer components, Save→Publish flow and no-remount identity handoff. State an initial **small UI implementation slice** and verification/checkpoint for reviewer approval; distinguish non-production integration-environment dependency from later UI deployment. Retain all six deferred mandatory acceptance gates and the live read-only browser restriction. No source edits or new implementation branch until Reviewer approves the corrected slice. Set status `AWAITING REVIEWER REVIEW` with the amended plan and stop.

## Builder closeout — 2026-10-10
Reconfirmed `global-profile-platform-settings` and `main` identical at `4d8a5c4a` (ancestor check, both local and remote) before deleting. Deleted the topic branch both remotely (`git push origin --delete`) and locally (`-D`, since `git branch -d` checks merge against the current branch rather than `main` and false-negatived on an already-SHA-identical branch). Remote now holds exactly two branches: `main`, `Project-work-instructions` — within the three-branch cap with zero open topic branches. (An unrelated pre-existing local-only branch, `tier-inclusion-unit-price-copy-order`, is untouched — out of this item's scope.)

## Phase 2 plan — amended 2026-10-10, for Reviewer review
**Scope (unchanged):** add the Account Station → Settings → Tools → Profile UI — Brand name/code fields, Logo/Favicon media pickers, Publish/Disable/Enable controls. No new Station, module, or identifier type; no backend route/schema change (Phase 1's REST surface is reused as-is).

**Ownership boundaries (correction 1):** mirrors `resources/ts/service-station/` exactly. New `resources/ts/account-station/`: `types.ts`/`api.ts` (Account REST contracts), `useAccountStation.ts` (state, draft-preferred reads, mutations, lifecycle, bootstrap-identity seeding), `derive.ts` (pure projections), `drawer/` (composition, controller hook, schema, Brand editor), `register.ts` (registers navigation/destination/data source/drawer with Station Manager; imported only by `modules/admin-station.ts`'s boot sequence, same as Service/Package). **Admin Station's role stays shell/placement only:** `registerPresentationPolicy()` gains one new surface-binding/placement key for Account Settings→Tools→Profile — no Account domain UI, state, or endpoint call inside Admin. **Station Manager's role stays coordination only:** Account registers through the existing `navigation.ts`/`destinations.ts`/`surfaceBindings.ts`/`dataSources.ts`/`drawerTemplates.ts` registry, no new coordinator mechanism.

**Lifecycle grammar (correction 2):** one module, `brand`, in the Overview-equivalent slot. **Save is the only pre-Publish user action** — it writes the Brand draft and bootstraps identity in one request; `profile/settle` stays a backend-internal call invoked by Publish exactly as Service's Publish settles-then-activates, never a second footer button. Footer is the existing default shape — `split` (Disable/Enable; Account has no Archive/Trash per its singleton carve-out) + primary Publish — reusing `CanonicalEntityFooter`/`EntityActionFooter`; Brand's field body reuses `InlineEditorShell` save/cancel/dirty-confirm chrome, same as Service's Inclusions/FAQ editors.

**No-remount identity handoff:** Account's identity is a fixed singleton (`CZA/CZAS/CZAST/CZASTP`), not a created numeric id. Initial GET resolves `isBootstrapped()`; if false, the drawer mounts on a local not-yet-bootstrapped sentinel (never a fabricated id) with Brand `pending-dim` ("Save to create the record"). The first Save response returns the bound identity plus Brand draft in one payload; the hook seeds it into the same mounted tree — no remount, no full loading mask, no second render — adapting `useServiceStation.ts`'s returned-ID seeding to Account's fixed-string ids. Because `AccountSchema::isBrandComplete()` is unconditionally true, Brand goes straight to `pending-full` ("saved, waiting for Publish") on that same Save, never a second interim state.

**Initial implementation slice (for approval before any code):** (1) `register.ts` + one new Admin presentation-policy binding; (2) `api.ts`/`types.ts`/`useAccountStation.ts` wired to GET/profile/status only — no Settle call exposed as a user action; (3) `drawer/` Brand editor + pill/notification using existing drawer-kit shells; nothing else (no About/Locations/Contact/Social).

**Verification checkpoint:** before any further module work, Builder demonstrates via code read + mounted contract tests (no non-production WP instance exists) that (a) zero cross-boundary imports violate the ownership split above, (b) the drawer never remounts across first-Save handoff, (c) Brand's pending-dim→pending-full transition matches `isBrandComplete()` always-true, (d) exactly one footer and one Publish action exist, no Settle button. Reported in this file; Builder stops for Reviewer sign-off.

**Gates unaffected:** this slice only verifies ownership/lifecycle correctness by code and mounted tests; it does not attempt or claim closure of gates 1/2/3/5, which stay blocked on the already-flagged non-production WordPress instance (Owner infrastructure decision, separate from this UI work). All six locked gates below and the live read-only browser restriction remain in force unchanged.

No implementation starts until Reviewer approves this corrected slice.

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

## Next Builder action
Topic-branch closeout is recorded above and done. The amended Phase 2 slice plan above is submitted for Reviewer review. No source edits, new branch, or implementation until Reviewer approves. Stop here for Reviewer.
