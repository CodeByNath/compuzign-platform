# Account Station → Settings → Tools → Profile — Active Work

## Status
**BLOCKED — DECISION REQUIRED: Phase 1 technical integration validation gate.** Reviewer verdict **Proceed with safeguards** for accepted source and contracts. Phase 2 UI is **not authorised**.

## Verified release — 2026-10-09
- `main@4d8a5c4a43a4cd21897f902ef2cae510805d0bd1` equals the exact Reviewer-approved topic SHA. [Deploy to Hostinger run 37937420851](https://github.com/CodeByNath/compuzign-platform/actions/runs/37937420851) verified `success` for that SHA.
- Last commit changed **only** `wp-content/plugins/compuzign-platform/tests/account-station.php` (+88 lines), not production behavior or UI. No new live UI test is warranted.
- Builder reports **84/84** Account in-process checks passing (not independently executed). Independently inspected registration and capability tests: four route/method/callback/permission contracts, allowed/denied `requireAdmin()` using `PlatformAccess::CAP`. These are stubs, **not** deployed REST dispatch.
- Earlier Owner live read/denial check passed for `3250f9a4`, not the current SHA. No Phase 1 Profile UI exists. Claude has no Chrome capability in this environment.

## Accepted scope and safeguards
Account Station is the peer owner of Settings → Tools → Profile/Brand. IDs `CZA/CZAS/CZAST/CZASTP`, minted/bound by Identifier Station; Account owns draft, canonical and lifecycle state. Safeguard `cda11026` prevents pre-/half-bootstrap settlement writes and rejects negative attachment IDs without breaking Clear. Service/Category and locked Station lifecycle are baseline.

Remaining **technical integration evidence**: actual REST dispatch/authorization, persistent storage, real image attachment validation, meaningful concurrency, and end-to-end Save → Settle → Publish → Disable/Enable. Current in-process checks do not establish those properties. No disposable integration environment is available to Claude. **Do not automatically defer all of these to Phase 2 or test with production mutations.**

## Owner decision required before phase acceptance
Choose whether to **(A)** provide/authorize an isolated non-production CompuZign integration environment for technical verification before Phase 1 closeout, or **(B)** expressly defer the named integration checks into a gated Phase 2 verification plan. Builder/Reviewer must keep any deferred checks explicit and verify them before claiming end-to-end completion; UI use alone does not prove concurrency or storage correctness. No manual backend testing may be assigned to Owner.

## Separate safety items
- `src/Core/PlatformAccess.php` has a **pre-existing hardcoded default account credential**. Existing live credential should be rotated; separately review secure provisioning. Do not disclose the secret.
- Codex Chrome exploration accidentally changed a Service. Owner reports re-enabled; restoration is **Owner-reported**, not independently reverified. Record browser-automation safety failure. Browser control remains strictly read-only without explicit action-specific authorization.
- Singleton Archive/Trash/permanent-deletion semantics remain deferred for Owner decision.

## Builder next action
No source implementation authorized while decision is pending. Confirm the completed `global-profile-platform-settings` topic SHA is contained in `main`; perform safe merged-topic branch cleanup using Builder tooling per root `AGENTS.md` when authorized, and record evidence. Do not change `main`, start Phase 2, request Owner backend/browser-console tests or perform production mutations. Stop for Owner/Reviewer decision.
