# Account Station → Settings → Tools → Profile — Active Work

## Status
**SOURCE PUSH NOT APPROVED — BOUNDED CORRECTION, BASELINE RE-AUDITED.**
Reviewer verdict: **Proceed with safeguards** for Phase 1 candidate `098999b6d19e787676434a39e841a850a7926f31`; **not yet approved for `main`**. Claude Builder, ChatGPT Reviewer. No UI Phase 2 or deployment.

## Authority and scope
Read [locked handover](2026-10-08-global-profile-brand-handover.md), root `AGENTS.md`, `docs/ai-index.md`, `docs/architecture/StationDrawerLifecycleContract-v1.md`, Service/Category and shared `StationLifecycle` source, Station Manager/Admin/Identifier Code Maps. Account is a peer Station; Settings, Tools, Profile are owned child records/modules, not separate Stations. Permanent identity prefixes `CZA/CZAS/CZAST/CZASTP` + five suffix characters. Existing Platform Identifier Station governs IDs. Multi-user, WEX, UI and new packages deferred.

`main` `8d1f0185811e69214c0fd85c29819eef0c5d9226`; topic `098999b6` (13 files). Previously abandoned candidate fully reverted before this phase.

## CORRECTED audit — comparison against actual Service Station on `main`
**This supersedes the overreaching rejection recorded at coordination commit `beb7712`.** The prior Reviewer failed to sufficiently compare Service's current frontend/backend paths:

1. **Independent settle endpoint is NOT itself a violation.** Service exposes `settleModuleRoute`/`settleAll`, and frontend `publishService()` coordinates settling then status activation. Account's analogous `settleProfile()` may remain. **Actual missing proof/guard:** Account has no Phase 2 frontend yet; verify its eventual Publish invokes settle then activation and that unbootstrapped identity cannot activate. Preserve Service-compatible draft behaviour.
2. **Active Station + Pending module is correct.** Service lets an active record save a new pending module draft while retaining active Station status. Account does the same. **Withdraw the instruction to force Account back to global Pending on edit.** Active live projections must use canonical settled Brand; drafts remain pending separately.
3. **Multiple WordPress writes are established behaviour.** Service separately updates post/meta and lifecycle, without a general transaction/CAS engine. **Withdraw requirements for an atomic whole-record Publish or generic locking/transaction framework.** Account's **four-ID first bootstrap** is a genuinely distinct concern: test interruption/retry, binding/aggregate reconciliation and duplicate first Save proportionately with existing WordPress primitives. Do not require a new storage engine.

## Remaining narrow review conditions
- Reject Publish against a never-bootstrapped Account/no four-node identities; test direct endpoint behaviour, without demanding more stringent module-settlement guards than the accepted Service API. First authenticated Save must create durable pending identities.
- Verify Profile Publish frontend orchestration in Phase 2 against Service's exact `useServiceStation.publishService()` pattern; Phase 1 must expose compatible safe contracts. Do not invent second lifecycle or nested drawer.
- Confirm no draft Brand leaks to live header/public projection and Disable mask is respected (projection/UI deferred; test backend canonical/draft read contract now).
- Confirm Platform ID chain survives controlled failed bootstrap/retry and concurrent initial attempts; no unnecessary general CAS machinery. Current 28 checks are stub-based; identify what remains unverified.
- Inspect Brand field/media validation against approved contract and existing WordPress/Service conventions, adjusting only demonstrated deviations. Archive/Trash singleton conflict remains a narrow Owner gate, not grounds to rewrite otherwise matching baseline.
- Record unrelated inherited failures/oversized existing Code Map separately; do not silently widen cleanup or introduce packages.

## Claude — next action
**Pause any broad corrections from `beb7712`.** Inspect Service Station backend+frontend yourself; address only the remaining evidenced issues above in **Phase 1 backend**. Report exact patch, baseline comparison, focused test evidence, and unresolved lifecycle travel question in this same work file, mark `AWAITING REVIEWER REVIEW`, push topic+coordination, stop. Keep source ≤600 lines/file and Code Maps/work file ≤600 words.
