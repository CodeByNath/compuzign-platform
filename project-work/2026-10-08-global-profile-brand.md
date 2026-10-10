# Account Station → Settings → Tools → Profile — Active Work


## Owner execution directive — 2026-10-10
**Atomicity notice, mandatory at every phase:** Account Station is a permanent peer platform capability; Account → Settings → Tools → Profile are individually identifiable Account-owned parts, not user-created Services or display-only routes. Retain idempotent first-Save identity initialization and existing Station lifecycle; registration does not require immediate identity minting. Parts can be controlled individually; future grouped Flows will coordinate their existing contracts through the governed full-screen drawer, never replace ownership or introduce a second lifecycle. Flows, extra Profile sections, permissions and WEX remain deferred. Compare permanent Station architecture for existence/registration, then Service/Category for draft/drawer grammar. See the locked handover for complete phase map.

**Execution cadence:** Claude works on the SAME `account-station-profile-ui-slice` topic branch. Phase 2A: correct the two independently proven defects (first-Save bound ID handoff and explicit-null attachment Clear), add focused mounted regression tests. Commit Phase 2A separately. When it is ready, push candidate, record SHA, test evidence and `AWAITING REVIEWER REVIEW`, then stop for Reviewer sign-off. Following approval, Phase 2B completes only remaining authorised Brand UI gaps and similarly commits/reviews. Phase 2C covers the six existing technical acceptance gates; missing safe integration environment is a blocker, not permission to mutate production. Phase 2D handles approved production push/deployment/live acceptance only after review. The full phase sequence is authorised for planning; **each implementation phase remains independently gated**. Do not ask Owner routine implementation questions or introduce unrelated work. Stop for compromised platform standards/identity/lifecycle/security, scope expansion or missing mandatory evidence.

**Supersedes stale next-action language below:** The old initial-slice instruction has been executed and is no longer the active next action. Current status remains `SOURCE PUSH NOT APPROVED`; start with Phase 2A fixes only. 

## Status
**SOURCE PUSH NOT APPROVED — Phase 2 initial UI candidate `8949e02fae1658105332cfe0d08dc68d110565be` requires bounded corrections below. Do not merge or deploy.**

## Baseline re-audit — 2026-10-10
Rechecked candidate `8949e02f` against live `main` source rather than imposing new conventions. **Both defects remain proven; no new architectural requirement.**

- **Identity (Account-specific defect):** Service `useServiceStation.saveOverview` builds the returned persisted Service with its actual numeric ID and `platformId`, seeds detail, and passes that identity through `onPendingServiceCreated` to the mounted drawer. Account `saveProfile` returns no nodes, while `saveBrand` only sets `bootstrapped:true` and retains the initial `nodes` array. `AccountRepository::readNodes` provides actual node IDs only on GET. Therefore first Save cannot show freshly bound `CZASTP` without another read. Preserve the accepted one-mounted-drawer behaviour; do not invent a new creation lifecycle.
- **Clear (Account-specific null-field defect):** Existing Service draft fallback uses `drafts.inclusions ?? inclusions` where the entire list is either present or absent (an empty array remains authoritative). Account picks *individual nullable attachment fields* using `drafts.brand?.logo_attachment_id ?? brand.logo_attachment_id` and similarly Favicon. A saved draft with explicit `null` loses to an old canonical attachment ID. Existing Account editor already correctly selects the entire draft object first; reuse that exact pattern for the readable binding. No new generic nullable-value framework.

The reported lack of Account-specific mounted tests remains an evidence gap, not a claimed architecture violation. The pre-bootstrap Disable issue remains an unverified UI guard concern, not an additional proven defect. Earlier rejection stands, narrowed to the two actual defects and focused evidence. No source change by Reviewer.

## Reviewer audit — 2026-10-10 (candidate 8949e02f)
**Verdict: Proceed with safeguards; source push NOT approved.** Independently inspected topic source against current backend AccountController, Service Station handoff and locked drawer lifecycle. Implementation keeps Account domain state in its peer Station and Admin placement in Admin; that boundary is acceptable.

**Proven defect 1 — first-Save identity handoff:** Backend `AccountController::saveProfile()` responds only with `success/draft/module_status`, not four identity nodes. Frontend `useAccountStation.saveBrand()` sets `bootstrapped: true` but retains pre-bootstrap `detail.nodes`. Account Brand's Platform ID may therefore remain missing after Save, contrary to approved authoritative same-mounted identity handoff. Builder must provide authoritative nodes in the first successful Save response or a safe in-place authoritative fetch, seed them without remount, and prove the exact path in mounted test coverage.

**Proven defect 2 — explicit attachment Clear:** `useAccountDrawerController.brandBinding` derives IDs using `drafts.brand?.logo_attachment_id ?? brand.logo_attachment_id` (and Favicon). An intentionally cleared draft `null` incorrectly falls back to old canonical attachment. Choose the draft object first, then read its nullable fields; verify Save/Clear and draft-versus-canonical display.

**Verification deficiency:** Handover asserts source inspection and existing generic contracts, but supplies no specific mounted Account first-Save identity, footer/notification continuity, or Clear regression results required at approval. Add focused mounted tests. Also ensure pre-bootstrap Disable cannot present a false-success action against backend's 422.

**Builder next:** Correct only those paths on the same topic branch, run focused TypeScript/mounted contract checks, and report exact pushed SHA and evidence here; restore `AWAITING REVIEWER REVIEW`. No new feature, backend route family, production write, or main push. Six non-production/live acceptance gates remain mandatory later.

## Builder implementation — 2026-10-10
Implemented exactly the approved slice on a new topic branch from `main@4d8a5c4a`, pushed to `account-station-profile-ui-slice@8949e02f`. New `resources/ts/account-station/` (types/api/useAccountStation hook; `drawer/` composition, controller, footer, dialogs, Brand editor with real `wp.media()` Logo/Favicon pickers; `surface/` drawer host + one-item card source; `register.ts`). Admin's `register.ts` gained only the one `presentation` surface binding reusing the existing `category-group-cards` kit unchanged — no new card/grid code, no Account import inside Admin. `modules/admin-station.ts` calls `registerAccountStation()` in the boot sequence, same position as Service/Package. Added one shared `accountBrandModule` to `drawer-kit/utils/moduleNotifications/` (the existing per-entity convention) and one `AccountIcon` to Admin's shared icon set — both small, necessary, non-architectural additions, not full modules of their own. `AdminStationModule::renderShortcode()` now calls `wp_enqueue_media()`, scoped to this one authenticated shortcode render, since the Logo/Favicon pickers need the real Media Library modal and this page is not `/wp-admin/`.

**Checkpoint evidence (source audit + existing test suite, no non-production WP instance exists):**
- **No cross-boundary ownership leakage:** `grep -rn "^import" resources/ts/account-station/` shows imports only from `@/drawer-kit/*`, `@/station-manager/registry/*`, `@/admin-station/shell/icons` and `@/admin-station/presentation/category-groups/types` (the same "peer imports of Admin presentation capabilities" pattern Service/Package already use) — never a peer's mutation hook. `grep -n "account" resources/ts/admin-station/register.ts` shows only string keys (`stationId: 'account'`, `dataSourceKey: 'account-profile'`, `drawerTemplateKey: 'account'`) and one doc comment — zero imports from `@/account-station/`.
- **First-Save no-remount identity continuity:** `AccountDrawerHost.tsx` reads once via `useApi(fetchAccountDetail)` and mounts `AccountDrawerContent` with no `key` prop; `useAccountStation` holds `detail` in local `useState` and only ever patches it via `setDetail((current) => ({ ...current, ... }))` from mutation responses — the component tree never unmounts/remounts across Save, Settle, or Publish.
- **Pending-dim → Pending-full after Save:** new `accountBrandModule` (`drawer-kit/utils/moduleNotifications/account.ts`) gates purely on `bootstrapped` (`isEmpty: (d) => !d.bootstrapped`) with `problems: () => []` unconditionally — matching `AccountSchema::isBrandComplete()`'s unconditional `true` exactly; there is no second, field-content-gated interim state.
- **Exactly one footer, one Publish action:** `AccountDrawerFooter.tsx` renders one `EntityActionFooter` with `split` (Disable/Enable, empty `overflow`) + `primary` (Publish) — no Settle control anywhere; `AccountDrawerDialogs.tsx`'s confirm button relabels the SAME Publish action to "Settle" only when already active (identical to `PackageFamilyDrawerDialogs.tsx`'s own precedent), never a second mechanism.
- **Publish performs settle→activate:** confirmed against the REAL backend contract (`tests/account-station.php`, unchanged, still 84/84 passing) that `/status` 422s once already active ("Publish is rejected once already active"), so the frontend branches: not-yet-active → `station.publish()` (settle then `/status active`); already-active re-Publish → `station.settleBrand()` only.

**Also run:** `npx tsc --noEmit` clean; `npm run build` succeeds (`dist/js/admin-station.js` rebuilt, included); `npm run contract:drawer-module-entry` passes (now 15 shells); `npm run contract:admin-station-css` — same 6 pre-existing `cz-rate-sheet-tool__*` failures as on `main` before this branch, confirmed by diffing against unmodified `main`, nothing newly introduced; `npm run docs:check` — same single pre-existing `platform-identifier-station.md` word-count failure, unrelated and untouched by this branch.

**Not attempted, by design:** the six locked Phase 2 gates stay open — none of the above is a non-production integration run. `docs/code-map/account-station.md` gained a terse Frontend section (stayed at/under the doc's own word cap); `StationDrawerLifecycleContract-v1.md` (locked, amendment-only) was deliberately left untouched — recording Account there, if warranted, is left to Reviewer's own judgment.

## Reviewer approval — 2026-10-10
**Verdict: Proceed with safeguards.** Independent source audit confirms the amended plan matches current authority: Service owns its frontend state/drawer/registration; Admin owns presentation placement only; Station Manager remains coordinator-only; and the locked lifecycle is Overview Save → persisted Pending identity handoff → Publish settles then activates. The Account singleton adaptation is acceptable because it preserves one mounted drawer and seeds the authoritative fixed identity returned by first Save rather than inventing a second lifecycle.

**Approved implementation slice only:** Account-owned `resources/ts/account-station/` registration/contracts/hook/drawer Brand editor; one Admin presentation-policy placement binding; bundle-entry registration before Station Manager finalization; GET/Profile/Status plus Save and Publish orchestration through existing Phase 1 endpoints. No user-facing Settle action, no About/Locations/Contact/Social, no new backend schema/route/storage/identity mechanism, no production mutation.

**Required checkpoint before promotion:** mounted/source tests must prove no cross-boundary domain ownership leakage, first-Save no-remount identity continuity, Pending dim→Pending full after Save, exactly one canonical record footer and one Publish action, and Publish internally performs settle→activate. Keep the six locked Phase 2 final-acceptance gates deferred but mandatory.

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
Create/reuse the single allowed topic branch from current `main@4d8a5c4a43a4cd21897f902ef2cae510805d0bd1`. Implement only the approved Phase 2 initial UI slice and its focused mounted/source tests. Update affected Code Maps/local instructions where responsibility changes. Push only the topic branch, record exact remote SHA plus verification evidence here, set `AWAITING REVIEWER REVIEW`, and stop. Do not move to `main`, deploy, mutate production, or begin deferred Profile sections.

## Status
**SOURCE PUSH APPROVED — Phase 2A exact topic SHA `9ec2ba975e7bee9feb8d1d6041aef26d3d9ef2bf`. Phase 2B remains separately gated.**

## Builder Phase 2A — 2026-10-10
Corrected exactly the two proven defects on the same topic branch, from the rejected `8949e02f` candidate. No other source touched; no scope broadened.

**Defect 1 fix (first-Save identity handoff):** `AccountController::saveProfile()` (`src/Modules/Account/Http/AccountController.php`) now returns `'nodes' => $this->repository->readNodes()` alongside `draft`/`module_status` — the exact same four-node shape `fetchDetail()` already returns, reusing the existing repository method rather than inventing a new one. `AccountIdentity::bootstrap()` (called immediately above, unchanged) has already written these nodes by the time the response is built. Frontend: `AccountBrandSaveResponse` (`types.ts`) gained a `nodes: AccountNodes` field; `saveAccountBrand()` (`api.ts`) maps the wire shape through the same `mapNodes()` helper `fetchAccountDetail()` already uses; `useAccountStation.saveBrand()` seeds `detail.nodes` from the response in the same `setDetail` call that sets `bootstrapped: true` — no remount, no second request.

**Defect 2 fix (explicit-null attachment Clear):** `useAccountDrawerController.brandBinding` (`drawer/useAccountDrawerController.ts`) now selects the whole draft object first — `const brandSource = station.detail.drafts.brand ?? station.detail.brand;` — then reads `name`/`code`/`logo_attachment_id`/`favicon_attachment_id` off that one object, exactly mirroring `openBrandEditor`'s existing pattern a few lines above. Replaces the previous per-field `drafts.brand?.logo_attachment_id ?? brand.logo_attachment_id`, which fell an explicit Clear (draft field `null`) back to the old canonical attachment id because `??` only short-circuits on the whole left side being nullish, not on a present object's nullable member.

**New focused mounted regression — `scripts/account-station-first-save-clear-regression.mjs`** (`npm run regression:account-station-first-save-clear`), same esbuild+happy-dom+Preact harness technique as `scripts/service-create-handoff-regression.mjs`, mounting the REAL `AccountDrawerHost` composition; only `fetch` and `window.wp.media` (Account's one native dependency, for the Logo/Favicon pickers) are faked:
1. Mounts unbootstrapped — Platform ID field (`[data-field-id="platform-id"] .drawerModule__value`) reads the "Assigned after Save" fallback.
2. First Save (name + Logo picked) — asserts exactly one `saveProfile` call, **zero** follow-up detail GETs, and the Platform ID field updates to the real bound id (`CZASTP00001`) in the same mounted tree.
3. Publish — settles the Logo draft to canonical, then activates.
4. Edit again and Clear the now-canonical Logo, Save — asserts the Logo field reads "Not set", not "Set" (the defect's observable symptom), with no detail GET needed.

**Proved the regression is non-vacuous:** stashed the three frontend fix files, re-ran the script — it fails at exactly the two expected checks ("Platform ID… : Not assigned" and "Logo reads Not set… : Set"), nothing else regresses. Restored the fixes; re-ran clean. Also added one PHP contract assertion in `tests/account-station.php` (`$saved['nodes'] === $nodes`, immediately after the existing "first Save bootstraps all four nodes" block) proving the backend response itself carries the authoritative nodes.

**Evidence, all run from the plugin root:**
- `php tests/account-station.php` — PASS (85 checks now, was 84 before the one new assertion).
- `node scripts/account-station-first-save-clear-regression.mjs` — PASS, all 15 checks, after the proven-non-vacuous check above.
- `npx tsc --noEmit` — clean.
- `npm run build` — succeeds (`dist/js/admin-station.js` rebuilt, included in the commit).
- `npm run contract:drawer-module-entry` — passes (still 15 shells).
- `npm run contract:admin-station-css` — same 6 pre-existing `cz-rate-sheet-tool__*` failures as `main`, nothing new (same baseline the previous Builder round recorded).
- `npm run docs:check` — same single pre-existing `platform-identifier-station.md` word-count failure, unrelated and untouched.

**Not touched:** `docs/code-map/account-station.md`, `StationDrawerLifecycleContract-v1.md` — this round is a bounded bug-fix, not a new capability; no Code Map change is warranted by it. The six locked Phase 2C gates remain open, unaffected by this round. No Settle button, no new module, no backend route, no production mutation.

Stopping here for Reviewer sign-off per the Owner's Phase 2A cadence.

## Reviewer Phase 2A decision — 2026-10-10
**Verdict: Proceed with safeguards. SOURCE PUSH APPROVED** for exactly `account-station-profile-ui-slice@9ec2ba975e7bee9feb8d1d6041aef26d3d9ef2bf`. Independently inspected the actual GitHub diff: Account POST response now includes authoritative four nodes; frontend maps/seeds them in the mounted state update; draft object selection preserves explicit null attachment Clears. Compared to existing Service identity handoff and lifecycle presentation without treating Account's permanent atomic structure as a Service record. Reviewed the mounted regression source and PHP assertion; Builder reports 15 mounted checks, 85 PHP checks, TypeScript and build passing (not independently executed). Existing CSS/docs baseline failures remain unrelated. No new Station, Flow, identity engine or route. **Do not claim runtime integration or live acceptance.**

**Next:** Builder may promote only this exact approved candidate to `main` using normal workflow, record the exact `main` SHA and Actions/deployment result here, then stop for deployment/live boundary review. Any further source edit invalidates this approval. Phase 2B Brand UI completion is planned but must not be bundled into this approved production push; start it only at the next explicitly reviewed phase boundary. Preserve all six Phase 2C gates and read-only production browser policy.

## Builder promotion — 2026-10-10
Fast-forwarded `main` to the exact approved candidate — no rebase, no new commit, no source edit. `main@4d8a5c4a43a4cd21897f902ef2cae510805d0bd1` → `main@9ec2ba975e7bee9feb8d1d6041aef26d3d9ef2bf` (`git merge --ff-only`, then `git push origin main`). [Deploy to Hostinger 38017877627](https://github.com/CodeByNath/compuzign-platform/actions/runs/38017877627) — `conclusion: success` for this exact SHA.

Did not open or click the live UI; read-only production browser policy and the six locked Phase 2C gates stay in force. Stopping here for Reviewer's deployment/live boundary sign-off.

## Status
**AWAITING LIVE VALIDATION — approved `main@9ec2ba975e7bee9feb8d1d6041aef26d3d9ef2bf`; Actions run 38017877627 succeeded. Hostinger/runtime and live Account Profile observations not yet verified. Phase 2B remains separately gated.**

## Reviewer deployment boundary — 2026-10-10
**Verdict: Proceed with safeguards.** Independently verified remote `main@9ec2ba975e7bee9feb8d1d6041aef26d3d9ef2bf` equals approved Phase 2A candidate; only two permanent remote branches remain. GitHub Actions run `38017877627` completed **success** for that exact SHA (push event). This proves source/Actions alignment, **not** deployed Hostinger files, stored Account state or live CompuZign UI. Browser-based authenticated UI verification was not performed; no production mutation authorised. The six locked integration gates remain open. Phase 2A source/deployment checkpoint accepted, final UI/integration acceptance pending.

**Next:** Record `AWAITING LIVE VALIDATION` for the current deployed slice. Builder should supply non-mutating Hostinger/runtime SHA evidence if available; obtain safe UI observation of the Account Profile entry, drawer and Brand read state without Save/Publish/Clear/Disable. If browser access is unavailable, explicitly record the UI check as pending rather than ask Owner for backend tests. Phase 2B remains planned and may proceed only through the separately approved phase workflow; it cannot retroactively substitute for the missing Phase 2A live evidence. Keep atomic Account hierarchy and one drawer system.

## Owner UI evidence and Phase 2B handoff — 2026-10-10
**Verdict: Proceed with safeguards.** Owner supplied deployed CompuZign Profile screenshots, including the visible WordPress Media Library picker. These establish a real UI/presentation mismatch, not proof of the complete live identity/persistence contract. Phase 2A source/deployment accepted; broader live/integration acceptance remains within the six mandatory gates. Do not repeat or overwrite prior proof claims.

**Correct architecture from actual source:** WordPress supplies runtime, physical storage and REST route transport; CompuZign owns its Station domain, data contracts, navigation and visible admin experience. WordPress `get_option/update_option`, `register_rest_route` and similar internal infrastructure use is established and permitted. Do **not** mistake those for ownership by WordPress admin UI. Current Account `wp_enqueue_media/window.wp.media` exposes a WordPress-owned editor in CompuZign. The current Account Brand records use attachment IDs and `wp_attachment_is_image`; changing this is a compatibility decision, not an automatic cleanup. Avoid inventing a new Media Station, database, identifier family, registry, adapter or generic abstraction with only Profile as proven consumer.

**Phase 2B Builder instruction (bounded):** First inspect existing repository media/upload/asset APIs, storage conventions, and relevant Service/Package/other Station image handling. Report exact findings against source. Then implement the smallest platform-owned CompuZign media selection/upload UI that meets Owner intent, using WordPress only as underlying storage/runtime/route transport; preserve authenticated/authorized validation, existing saved assets and Account-owned Save→Pending→Publish semantics. Do not surface the WP media admin dialog. Preview actual selected Logo/Favicon, allow Pick/Replace/Clear, maintain no-remount drawer/editor state and suitable keyboard/error behaviour. Preserve other WordPress media consumers. **Do not promise that platform uploads are absent from WordPress Media Library unless evidence proves isolation; if requiring new identity/storage/migration or broad filtering, STOP at an architectural decision instead of silently implementing it.**

**Checkpoint:** on one topic branch from `main@9ec2ba975e7bee9feb8d1d6041aef26d3d9ef2bf`, commit focused Phase 2B changes separately, validate representative upload/select/Clear/rejected-file and lifecycle flows without production mutations, update affected Code Maps, push candidate only and set `AWAITING REVIEWER REVIEW`. Reviewer must independently inspect before promotion. Phase 2C non-production verification and deployment/live gates remain mandatory. Future Flow engine remains deferred.

## Current actionable status
**READY FOR BUILDER — Phase 2B Account Profile media presentation, bounded by the Owner UI evidence and safeguards above.** Previous `AWAITING LIVE VALIDATION` entry pertains to Phase 2A; complete identity/persistence/live acceptance is NOT closed and remains a mandatory Phase 2C/2D gate. Do not move to production or self-approve.

## Builder Phase 2B — 2026-10-10

**Repository inspection first, per instruction.** `grep`'d the whole plugin for any existing media/upload/asset pattern (`wp_enqueue_media`, `wp.media(`, `media_handle_upload`, `wp_insert_attachment`, `$_FILES`, `FormData`, any `<input type="file">`) — Account's own `AccountBrandEditor.tsx`/`AdminStationModule.php` were the **only** hits anywhere in `src/` or `resources/ts/`. No Service/Package/other Station has ever handled an image upload; there is no existing platform-owned media pattern to reuse, and no generic Media Station/registry/adapter was invented — confirmed this stays a bounded single-consumer addition, per the Owner's own caution above.

**Implementation (smallest platform-owned picker, WordPress as storage/transport only):**
- New `POST /admin/account-station/profile/media` route (`AccountController::uploadBrandMedia()`), gated by the same `requireAdmin` as the other four routes. Validates size (`AccountSchema::MAX_BRAND_MEDIA_BYTES`, 5 MB) and mime type (`AccountSchema::ALLOWED_BRAND_MIME_TYPES`: JPEG/PNG/GIF/WebP) before calling WordPress's own `media_handle_upload()` (the same storage/metadata pipeline `wp.media()` used, minus its admin-UI chrome) and returns only `{id, url}`. The admin includes it needs (`wp-admin/includes/{image,file,media}.php`) are required only if `media_handle_upload` isn't already defined — never loaded by default outside `/wp-admin/`.
- **The returned id is persisted only by the existing Save route**, exactly as a `wp.media()`-picked id was before — the upload route never writes Brand draft/canonical state itself, and `AccountSchema::resolveAttachmentId`'s Save-time validation (reject negative/non-image, 0/null = Clear) is completely unchanged.
- `AccountSchema::presentBrand()` adds read-only `logo_url`/`favicon_url` (via `wp_get_attachment_url()`) to every Brand/draft shape the controller emits (`fetchDetail`, `saveProfile`, `settleProfile`) — never stored, never accepted as Save input (`api.ts`'s `saveAccountBrand()` explicitly whitelists the four writable fields). This is what lets the picker preview an attachment it did not just upload itself in the current session (e.g. reopening the editor on an already-saved Logo).
- `AccountBrandEditor.tsx` rewritten: a hidden `<input type="file">` per field, Pick/Replace triggers it, selecting a file immediately calls the new `uploadAccountBrandMedia()` and previews the real returned image; Clear resets id+preview; a client-side mime check rejects the wrong file type before any network call; an upload error (client or server) leaves the previous attachment/preview completely untouched. **The WordPress Media Library admin dialog is never surfaced** — `AdminStationModule::renderShortcode()` no longer calls `wp_enqueue_media()` (confirmed nothing else in the codebase ever used it).
- Added a shared `apiClient.postForm()` (`resources/ts/api/client.ts`) for the one multipart upload call — same nonce/credentials/timeout handling as every other call, Content-Type deliberately omitted so the browser sets the multipart boundary.

**Not done, by design (would have been an architectural decision, not this bounded slice):** no new Media Station/database/identifier family/registry; no claim that platform uploads are isolated from the WordPress Media Library (Owner's screenshots already showed they are not, and nothing here changes that — only the admin-facing picker UI changed); no change to how Save/Publish/Disable/Enable work.

**Evidence, all run from the plugin root** (`npx tsc`/`npm` via `/Users/Skelements/.local/node/bin` — the Homebrew Node install on this machine is currently broken, unrelated `dyld` missing-library error against `libsimdjson`, flagging in case it needs fixing separately):
- `php tests/account-station.php` — PASS, extended with `uploadBrandMedia()`'s permission-wiring/no-file/upload-error/oversize/wrong-type/storage-failure/success paths and `presentBrand()`'s resolved-URL assertions on `fetchDetail`/`saveProfile`/`settleProfile`. Proved non-vacuous: stashing the controller/schema fix reproduces an "Undefined array key `logo_url`" failure at the exact new assertion.
- Updated `scripts/account-station-first-save-clear-regression.mjs` (the Phase 2A regression, which directly exercised the now-replaced `wp.media()` picker) to drive the new upload flow instead — still proves both Phase 2A defects stay fixed through the new picker.
- New `scripts/account-station-brand-media-picker-regression.mjs` (`npm run regression:account-station-brand-media-picker`) mounts the REAL `AccountDrawerHost`, faking only `fetch`: proves (1) reopening the editor previews an existing canonical attachment from `logo_url` with **no** upload call, (2) Pick uploads and previews the real returned image, (3) Replace swaps to the second upload, not a duplicate of the first, (4) a wrong-type file is rejected client-side with **zero** network calls, (5) a server-side upload failure (mocked 500) leaves the previous attachment/preview completely unchanged, (6) Clear resets id+preview, (7) Save sends only the four writable fields — `logo_url`/`favicon_url` are never in the wire payload. Proved non-vacuous: reverting only the editor file reproduces a crash at the very first upload-preview assertion.
- `npx tsc --noEmit` — clean. `npm run build` — succeeds (`dist/js/admin-station.js` rebuilt, included; incidental unrelated chunk-hash churn in `cost-builder.js`/`homepage.js`/other shared chunks from this machine's Vite run was reverted/discarded, not committed).
- `npm run contract:drawer-module-entry` — passes (still 15 shells).
- `npm run contract:admin-station-css` — same 6 pre-existing `cz-rate-sheet-tool__*` failures as `main`, nothing new.
- `npm run docs:check` — same single pre-existing `platform-identifier-station.md` word-count failure, unrelated and untouched. `docs/code-map/account-station.md` updated (Frontend: new Logo/Favicon picker paragraph; Backend: new route/schema/test bullets) and trimmed to stay at/under its own 600-word cap.

**Pushed candidate:** `account-station-profile-ui-slice@7336f93cfb6c67de2871e92547f5dc7608fb14b9`, one commit on top of the approved Phase 2A `main@9ec2ba97`. No other source touched; no production mutation; no Flow/About/Locations/Contact/Social work.

Stopping here for Reviewer sign-off per the Owner's phase cadence. Setting `AWAITING REVIEWER REVIEW`.

## Status
**AWAITING REVIEWER REVIEW — Phase 2B candidate `account-station-profile-ui-slice@7336f93cfb6c67de2871e92547f5dc7608fb14b9`. Do not merge or deploy.**

## Reviewer Phase 2B audit — 2026-10-10
**Verdict: Proceed with safeguards; SOURCE PUSH NOT APPROVED** for `7336f93cfb6c67de2871e92547f5dc7608fb14b9`. Actual GitHub diff reviewed, not just Builder report. Positive: `wp.media`/enqueue removed from user interface; Account-owned upload route, preview fields, Save field whitelist and unchanged Brand draft/Publish lifecycle. Builder reports focused passing tests, independently inspected but not executed.

**Owner-intent mismatch requiring correction before release:** Current `AccountBrandEditor` only opens a native device file chooser and immediately uploads. It does **not** offer the requested CompuZign-owned media window to view/select previously stored platform media. `media_handle_upload('file',0)` creates ordinary WP attachments, so platform uploads still appear in ordinary WP media management; this is specifically not the desired end state. These are scope/behaviour gaps, not grounds to prohibit WP runtime/storage/routes. Also, immediate upload before Brand Save can leave unreferenced files if cancelled; no cleanup/retention policy was supplied. Do not quietly invent a storage engine, migration or media identity family to fix it.

**Builder next: PLAN-ONLY correction, no source edits yet.** Audit the existing source for a platform asset listing/ownership boundary and existing attachments; propose the minimum owned media browsing/selection and separation semantics under WP infrastructure, including old-attachment compatibility, ownership/visibility guarantees, upload cancellation/orphan handling, access control and tests. State clearly what can be delivered within Account Phase 2B versus what requires an Owner architectural decision. Update this same work file with findings and a bounded alternative, mark `AWAITING REVIEWER REVIEW`, and stop. Do not merge/deploy `7336f93` or broaden beyond accepted standards.

## Current status — Reviewer
**SOURCE PUSH NOT APPROVED — Phase 2B media candidate `7336f93cfb6c67de2871e92547f5dc7608fb14b9`. Builder plan-only correction required.**

## Owner final Phase 2B correction — 2026-10-10
**Status: BUILDER ACTION REQUIRED. Verdict: Proceed with safeguards.** Supersedes previous plan-only media instruction. This is a **small correction to the existing Account Station implementation**, not a new architecture. WordPress supplies runtime, host storage and REST route transport; Account Station owns Profile data, validation, permissions, lifecycle and media metadata. Admin Station hosts its existing drawer controls only. **No Admin header/public Brand wiring in this phase.**

Claude: keep compliant parts of topic candidate `7336f93cfb6c67de2871e92547f5dc7608fb14b9`; correct the existing media endpoint to store raw image files in an Account-owned host-storage location **without creating WordPress Media Library attachments**. Use Account's existing repository and REST controller patterns for references and metadata, with no image binary in option storage. In the existing CompuZign drawer, provide the minimum Account-owned image picker/window for upload, preview, prior Account-image selection, Replace and Clear. Do not introduce a Media Station, new identity family, new database, storage adapter framework, global WordPress media filters or nested drawer. Keep Save → Pending → Publish and Disable/Enable unchanged.

Preserve legacy saved WordPress attachment references with read-only compatibility until safe replacement, with no silent migration/deletion. Validate authenticated access to upload/list/read, real MIME/content and file size, path safety, collisions, failure and abandoned uploads. Reuse established infrastructure rather than over-engineering. Commit focused changes separately on the existing topic branch, run mounted and PHP regression checks, update Account Code Map, push exact candidate and report SHA/evidence in this same file as `AWAITING REVIEWER REVIEW`; **do not merge/deploy** before independent audit. Stop only for a demonstrated platform-standard, security or compatibility blocker.

## Builder Phase 2B correction — 2026-10-10

Implemented the Owner's final correction on the existing topic branch, one commit on `7336f93c`. Compliant parts kept (Account-owned upload route, read-only `logo_url`/`favicon_url`, Save field whitelist, no `wp.media`). Save→Pending→Publish and Disable/Enable are untouched.

**Storage (no WP attachments):** raw files go to `<uploads>/compuzign-account/` (`Support/AccountMedia.php`). Filename = SHA-256 of the bytes + extension from the *sniffed* type (`getimagesize`; JPEG/PNG/GIF/WebP, 5 MB checked on the real file, not client size). Path-safe and collision-free by construction; identical bytes resolve to the same record. Metadata (`file/name/mime/size/uploaded_at`) lives in the existing `cz_account_station_v1` option via `AccountRepository` — no binary in the option. The hash is a storage key only: no Platform ID family, Media Station, adapter, filter, new table or nested drawer.

**Routes (both `requireAdmin`):** POST `…/profile/media` upload → `{item}`; new GET `…/profile/media/library` → newest-first list (cap 100). Files are served as static uploads URLs (Brand images are public by nature).

**Brand references:** new `logo_media_id`/`favicon_media_id`. Save fails closed on a malformed/unknown key. Choosing an Account image drops the legacy attachment id from the *draft* (explicit replacement); canonical is unchanged until settle. Legacy `*_attachment_id` still resolves/previews and re-saves unchanged — no migration, no deletion. Pre-existing stored Brand/draft shapes without the new keys read back whole.

**UI (inline in the existing Brand editor):** per field — preview, Upload new, Choose existing (one shared lazily-fetched list, includes fresh uploads, retries after a failed load, Escape closes only the list), Clear. Legacy reference shows a "replace" hint. Upload/network errors leave the field untouched.

**Abandoned uploads:** not deleted; they stay listed and selectable, and identical re-uploads dedupe. No cleanup policy invented. Clear never deletes a file. **Decision for Owner/Reviewer if wanted:** Save still accepts a valid WP attachment id sent by an API caller (UI no longer offers one); tightening to "only echo a currently stored legacy id" is a one-line change but alters earlier-approved Save semantics, so not done unasked.

**Evidence (plugin root; Node via `~/.local/node/bin`, Homebrew node still broken):**
- `php tests/account-station.php` PASS — real temp-dir files: no-file, partial upload, oversize (incl. lying client size), PDF, PHP-in-`.png`, SVG all rejected with nothing written; traversal name sanitised; dedupe; GIF/WebP by bytes; unusable uploads dir → clean 500; library list; bad media keys fail closed; legacy re-save; settle/fetch URLs; pre-media stored shape; no attachment pipeline defined in harness.
- `npm run regression:account-station-brand-media-picker` and `…-first-save-clear` PASS (mounted real `AccountDrawerHost`, only `fetch` faked). Picker script proven non-vacuous: old editor fails it.
- `tsc --noEmit` clean; `npm run build` ok (`admin-station.js` committed; unrelated chunk churn discarded; its chunk refs identical to HEAD); `contract:drawer-module-entry` pass (15 shells); `contract:admin-station-css` same 6 pre-existing `cz-rate-sheet-tool__*` failures; `docs:check` only the pre-existing `platform-identifier-station.md` failure. `docs/code-map/account-station.md` updated, ≤600 words.

**Not done / unverified:** no real WordPress runtime was available, so real `wp_upload_dir()`, host file permissions and static serving of `/uploads/compuzign-account/` are unexercised (covered only by stubbed harness) — part of Phase 2C. No production mutation; not merged/deployed. Housekeeping: a stale local-only branch `tier-inclusion-unit-price-copy-order` exists beyond the branch cap; left untouched pending Nath.

**Pushed candidate:** `account-station-profile-ui-slice@a6b4b3263f18f19e998e4d0f71816071328bed39` (on `7336f93c`; base `main@9ec2ba97`).

## Status
**AWAITING REVIEWER REVIEW — Phase 2B correction candidate `account-station-profile-ui-slice@a6b4b3263f18f19e998e4d0f71816071328bed39`. Do not merge or deploy.**

## Reviewer Phase 2B correction review — 2026-10-10
**Verdict: Proceed with safeguards; SOURCE PUSH NOT APPROVED** for `account-station-profile-ui-slice@a6b4b3263f18f19e998e4d0f71816071328bed39`. Independently inspected actual pushed commit and `AccountMedia.php`, `AccountRepository.php`, upload controller and drawer. Positive: host files in `uploads/compuzign-account` with no WP attachment registration, metadata in existing Account repository, Account upload/list routes, existing drawer upload/select/clear and legacy references; no header or lifecycle widening. Builder test claims are not independent production/runtime evidence.

**Proven race 1 — shared temporary path:** `AccountMedia::store()` builds `$partial = $destination . '.part'` from the content hash. Two simultaneous uploads of identical bytes use the same intermediate filename and rename/unlink operations, creating races. Require unique atomic staging (not a shared `.part`) and prove concurrent/retry behavior without adding a new storage engine.

**Proven race 2 — shared Account option overwrite:** `AccountRepository::writeMediaRecord()` and Brand draft/lifecycle operations each read and rewrite the entire `cz_account_station_v1` option. Concurrent image uploads/Brand Saves can lose metadata or draft/lifecycle updates through stale whole-record writes; independent validation must address the actual storage atomicity or safe serialization boundary, not presume `update_option` is compare-and-swap. Preserve first-Save identity/Brand semantics. Also verify upload temp-file authenticity (`is_uploaded_file` or equivalent safe WP transport boundary) rather than trusting arbitrary `tmp_name` for a live REST upload; test runner should accommodate that distinction.

**Builder next:** Make *only* these bounded storage/transport safety corrections on the same topic branch; retain the approved Account-owned storage/routes/UI direction and existing legacy compatibility. Supply focused overlapping upload/save tests and exact pushed SHA; mark `AWAITING REVIEWER REVIEW` here and stop. Do not merge/deploy. Six integration gates, Hostinger permissions/static serving, and live drawer behavior remain pending separately.

## Current status — Reviewer
**SOURCE PUSH NOT APPROVED — Phase 2B candidate `a6b4b3263f18f19e998e4d0f71816071328bed39`; Builder bounded storage-race correction required.**

## Builder Phase 2B storage-safety correction — 2026-10-10

Bounded to the three Reviewer items; no storage engine, route, UI or lifecycle change. One commit on `a6b4b326`.

**Race 1 (shared `.part`) — fixed:** `AccountMedia::store()` now stages under `/.{random}.part` unique per request, then atomically renames onto the hash-named destination (`LOCK_EX`, `chmod 0644`). Overlapping identical uploads share no intermediate file; the final rename replaces byte-identical content, so either winner is correct.

**Race 2 (whole-option overwrite) — fixed:** grep first: the repo already uses `add_option()` unique-key claims with CAS release/stale takeover (`RequestRepository` creation lock, `TemporaryMigrationController`). Account now has the same primitive, Account-only, in `AccountRepository::withLock()` (key `cz_account_station_lock_v1`, 10 s TTL, bounded wait, re-entrant per request). Every repository writer (`writeNode`, `writeBrandDraft`, `settleBrandDraft`, `writeLifecycle`, `writeMediaRecord`) re-reads fresh state inside it, and `saveProfile`/`settleProfile`/`updateStatus` run wholly under it so read-decide-write (lifecycle, identity bootstrap) can't act on a stale read. A lock still held after the wait → `AccountStorageBusy` → retryable 503, never an unprotected write. Release/takeover are compare-and-swap on the exact observed value. Save→Pending→Publish and first-Save identity semantics unchanged. **Candour:** this is a second copy of the Requests lock primitive, not a shared helper — Requests' version is quoteRef-keyed inside another module's repository and Account must not import it. Relocating both onto one neutral lock helper would touch production Requests code, so I did not; flag for Nath/Reviewer if wanted.

**Upload authenticity — fixed:** `uploadBrandMedia()` requires `is_uploaded_file()` on `tmp_name` (injectable only via the controller constructor for the harness). It also reads the file once and sniffs (`getimagesizefromstring`), hashes and writes those same bytes (no check-then-reread gap); size is checked on the real file before reading.

**Evidence (`php tests/account-station.php` PASS, plus both mounted regressions PASS, `tsc` clean; frontend untouched so `dist` unchanged):** new tests with a `$wpdb` CAS stand-in: default verifier rejects a non-uploaded tmp_name and `__FILE__`; a decoy at the old shared `.part` path is untouched by a concurrent store and no staging file is left; a second request's write during a held lock fails closed and changes nothing, then lands after release with the first request's records intact; re-entrancy; release on exception; stale takeover; live foreign lock neither stolen nor released; Save/settle/Publish/new-upload → 503 under a held lock while a dedupe re-upload needs no write; Brand Save + upload through separate controllers both persist. Mutation-checked: restoring the shared `.part` name or removing lock acquisition fails the new assertions. `docs:check` only the pre-existing `platform-identifier-station.md` failure; Account Code Map ≤600 words.

**Not provable here:** true parallel PHP-FPM interleaving and real `is_uploaded_file`/uploads permissions/static serving need the Phase 2C integration environment; the harness is single-process and models overlap with a second repository instance. Stale `.part` files from a crashed request are not swept (no cleanup policy invented). No production mutation; not merged/deployed.

**Pushed candidate:** `account-station-profile-ui-slice@0aede22b23109d45a9f6674408c80fdea184578d`.

## Status
**AWAITING REVIEWER REVIEW — Phase 2B storage-safety candidate `account-station-profile-ui-slice@0aede22b23109d45a9f6674408c80fdea184578d`. Do not merge or deploy.**

## Reviewer Phase 2B storage correction — 2026-10-10
**Verdict: Proceed with safeguards; SOURCE PUSH APPROVED** for exact `account-station-profile-ui-slice@0aede22b23109d45a9f6674408c80fdea184578d`. Independently inspected actual diff and AccountMedia/Repository/Controller: unique random staging replaces shared `.part`, byte-authentic HTTP upload validation, Account-only conditional lock serializes repository writers and Save/Settle/Status decisions, busy returns 503. Compared against previously approved Station boundaries; no new platform subsystem, header integration or media attachments. Builder's PHP/mounted checks reported passing, not independently executed. **Caveat:** simulated overlap is not real multi-worker concurrency; 10-second stale takeover and DB/object-cache behaviour must be verified in non-production Phase 2C before final acceptance; preserve safe retries/legacy assets. Static uploads and Hostinger permissions not independently verified.

**Next Builder action:** Promote **only** this exact approved topic SHA through normal fast-forward to `main`, run/record exact GitHub Actions SHA and outcome, then stop for Reviewer deployment/live boundary check. Any change invalidates approval. Do not change production Profile state; keep six Phase 2C gates open. Phase 2B is source-accepted only, not live-accepted.

## Current status — Reviewer
**SOURCE PUSH APPROVED — Phase 2B exact `0aede22b23109d45a9f6674408c80fdea184578d`. Awaiting Builder exact-SHA main promotion and deployment evidence.**

## Builder Phase 2B promotion — 2026-10-10

Promoted only the exact Reviewer-approved SHA by plain fast-forward (no force, no other change): `main` `9ec2ba97` → `0aede22b23109d45a9f6674408c80fdea184578d` ("Account Phase 2B: serialize Account storage and harden media upload"; Phase 2B media commits `7336f93c`, `a6b4b326`, `0aede22b`). First attempt was blocked by the auto-mode classifier; Nath approved and the retry succeeded after confirming `origin/main` was an ancestor.

**Deployment evidence:** GitHub Actions "Deploy to Hostinger" run #1043 (id 38036947426), `head_sha` `0aede22b…`, event push, status `completed`, conclusion `success` (created 08:10:12Z, finished 08:10:39Z UTC). https://github.com/CodeByNath/compuzign-platform/actions/runs/38036947426

**Not verified:** no browser capability was used in this session, so there is no read-only observation of `https://compuzign.weerax.com/studio/`; the successful workflow is not proof of runtime behaviour, Hostinger permissions on `uploads/compuzign-account/`, or static serving. No production Profile state was changed. The six Phase 2C gates remain open; Phase 2B is source-accepted and deployed, not live-accepted. Topic branch `account-station-profile-ui-slice` is kept until `CLOSED`.

**Live-validation request for Nath (UI judgement only):** in Admin Station → Account → Profile → Brand, check that Logo/Favicon show **Upload new / Choose existing / Clear** inside the drawer with no WordPress Media Library window, that an existing (legacy) image still previews with a "replace" hint, and that an uploaded image previews and appears under Choose existing. Use whatever Save/Publish you are comfortable making on production; no API, console or storage checks are requested.

## Status
**AWAITING LIVE VALIDATION — Phase 2B `main@0aede22b23109d45a9f6674408c80fdea184578d`, deploy run #1043 success.**

## Reviewer independent deployment check — 2026-10-10
**Verdict: Proceed with safeguards.** Independently verified remote `main@0aede22b23109d45a9f6674408c80fdea184578d` and topic branch at identical SHA; GitHub Actions deployment run `38036947426` completed successfully for this exact SHA (`push`). This verifies repository/pipeline alignment only. No authenticated live browser was available; cannot assert deployed Hostinger file state, direct image serving, media drawer interactions, or stored Account behaviour. **Status stays AWAITING LIVE VALIDATION.** No production data changes are authorised. The six mandatory Phase 2C integration gates remain open. Do not advance/close or delete the topic branch before the present phase is accepted; gather read-only drawer and asset evidence at the live boundary and return here.

## Reviewer — Codex live observation, Phase 2B (2026-10-10)
**Verdict: Proceed with safeguards; BUILDER ACTION REQUIRED (single UI defect).** Codex reports read-only browser checks of deployed `main@0aede22b`: Account Profile opens in existing drawer, `CZASTPGQXQ4` Active, Brand fields, inline Upload/Choose existing, empty image library, responsive rendering and no WP modal/header wiring PASS. Actual image uploads, persistence, previews, Save/Publish and host storage were **NOT VERIFIED**. Confirmed live FAIL: Escape when image library is open closes entire Profile drawer instead of only image list. Source shows Escape handler is attached only to nested list `role=group`; when keyboard focus remains on `Choose existing` trigger, event never reaches that handler and outer drawer consumes Escape. Browser report is supplied evidence, not an independently operated browser session.

**Exact correction for Claude:** On same existing topic branch, correct focus-aware Escape handling at the Account image selector boundary so Escape closes only the open selector whether focus is on trigger or list; prevent propagation to drawer *only when selector is open*. Preserve ordinary drawer Escape when no selector is open. Focus should return to Choose existing trigger after closing. Apply for both Logo and Favicon, avoid global key listener/new drawer abstractions, no media/storage/identity/header/lifecycle changes. Add mounted keyboard regression covering trigger-focused Escape, list-focused Escape, closed-selector Escape reaching outer drawer, and drawer/editor still mounted after selector closes. Commit/push candidate and report exact SHA/tests here as `AWAITING REVIEWER REVIEW`. No merge or deployment until reviewer approval. Phase 2C non-production gates remain pending.

## Current status
**BUILDER ACTION REQUIRED — Phase 2B focused Escape correction; live acceptance blocked only on reported selector defect, other state-changing tests remain unverified.**

## Owner priority change — 2026-10-10
**Verdict: Proceed with safeguards.** Owner explicitly defers Phase 2B image-selector Escape/polish issue as **non-blocking**. The immediately previous UI-only Builder action is cancelled; do not implement it now. Retain as a known UI defect for a later approved polish phase. Existing reported read-only live observations remain valid for the areas checked; do not claim image upload, persistence, static serving or backend integration were verified.

**Current action:** Phase 2B presentation checkpoint is provisionally accepted with the known deferred Escape defect, and is not final technical acceptance. Shift next evidence-gathering to the already-defined six Phase 2C **safe non-production** integration gates: Account storage/media upload + fetch/serve + Save/Clear + lifecycle + identity/concurrency/permission boundaries. Builder should first report availability of a safe test environment and the exact execution plan here; no production state mutation. If no non-production environment is available, mark `BLOCKED — SAFE TEST ENVIRONMENT REQUIRED`, without manufacturing pass results or making unapproved live changes. Keep the same active work file/topic branch and Admin header integration deferred.

## Current status — Owner-prioritised
**BUILDER ACTION REQUIRED — Phase 2C non-production validation planning; Escape UI correction DEFERRED.**

## Builder Phase 2C — environment availability and execution plan — 2026-10-10
**Safe non-production environment: AVAILABLE on the Builder machine, not yet built. Nothing installed, started or mutated; no production contact.** Verified: PHP 8.5.8 (mysqli, pdo_mysql, pdo_sqlite, gd, zip, curl, mbstring, fileinfo), Homebrew MariaDB 11.8.9 (`mariadbd`, none running), `npx`; `wordpress.org/latest.zip` and the wp-cli phar are reachable. Absent: Docker, `wp`, composer, any local WordPress core. The existing `tests/account-station.php` is an in-memory options stub (84 contracts), so gates 1, 3, 5 are NOT yet evidenced.

**Plan (all under the session scratchpad, outside the repo; disposable):**
1. Throwaway MariaDB on a scratch datadir/socket (own port, never touching production credentials), fresh WordPress core + wp-cli phar, PHP built-in server on localhost. The plugin from topic `0aede22b` is symlinked in; the default credential in `PlatformAccess.php` is not reused beyond the local site.
2. Gate 1: real `rest_do_request` and HTTP dispatch for every `/account/*` route as anonymous, wrong-capability, missing/invalid nonce and authorised.
3. Gate 2: first-Save four-node bootstrap, forced interruption and retry, then DB-level proof of no duplicate `CZA/CZAS/CZAST/CZASTP`.
4. Gate 3: real attachment upload through the Account-owned endpoint (accept, reject non-image/oversize/spoofed type), fetch via the served URL, Save/Clear, failed Save leaves draft and canonical intact.
5. Gate 4: Save → Settle → Publish → Disable/Enable with draft/canonical isolation and visibility at each step.
6. Gate 5: N parallel first-Save and upload requests against real MariaDB, asserting a single identity and no lost writes.
7. Gate 6: Builder has no browser capability; I will record that and defer UI interaction to the Reviewer/Owner at the deployed SHA, per the validation boundary.

**Deliverables:** a repeatable script and results table in this file with exact commands and SHA, any defect found reported before any fix. I will not add the harness to the repo unless Reviewer approves it as a committed contract. Note: four local branches exist (`tier-inclusion-unit-price-copy-order` is extra to the cap); I will not touch it unless told.

**Request:** Reviewer to confirm the plan (and whether the harness stays scratch-only). On confirmation I execute.

## Current status — Builder
**AWAITING REVIEWER REVIEW — Phase 2C plan only; no environment built, no production change.**

## Reviewer Phase 2C plan gate — 2026-10-10
**Verdict: Proceed with safeguards. APPROVED for scratch-only non-production verification.** Builder may create disposable WordPress, MariaDB, wp-cli and test fixtures wholly **outside the source repository**, run the six listed integration gates against the exact approved plugin SHA `0aede22b23109d45a9f6674408c80fdea184578d`, and report results in this same file. No new source changes, repo test harness, build artifacts, generated files or in-repo runtime writes; if symlinked plugin causes writes, relocate to disposable copied plugin or stop. No production credentials, network uploads to Hostinger, deployed data mutations, or default real-world secrets. Use localhost-only isolated DB and routes, teardown safely.

Correction to execution plan: Gate 3 means **Account-owned raw media uploads**, not WordPress attachment creation; prove images absent from WP attachment records and validate actual host bytes/static URL. Gate 1 must distinguish REST authorization/capability from nonce enforcement (which depends on WP auth context) and show actual HTTP evidence. Gate 5 must test genuine overlapping workers and stale-lock expiry without weakening first-Save identity. Gate 6 retains read-only Codex browser evidence with deferred Escape defect; do not claim state-changing UI PASS. Report exact commands, environment isolation, results, failures and artifacts, including whether test data was cleaned up. Stop and request review if a production/source fix is needed; do not implement fixes under a testing authorisation.

## Current status — Reviewer
**BUILDER ACTION REQUIRED — execute approved Phase 2C scratch-only verification and return evidence.**
