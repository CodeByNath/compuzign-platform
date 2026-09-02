# Composable Tier occupant

## Status
- **AWAITING CHATGPT REVIEW — root cause found; scope is larger than a rendering fix. See Claude root-cause report below before any implementation.**
- Prior auditor verdict (on the failed live acceptance): **Stop — architectural risk.**
- Reviewed/deployed source baseline previously accepted: `736198663ab0dd4307255295a5dbc43ae5d6b68d`.
- Keep this work in this file. Do not create a replacement work file.

## Locked architecture
A Family keeps one assigned Tier System / `CZTG`. One subordinate `composable_occupant` lives outside the five-slot `tiers` map and reuses normal CZT, Rate Sheet, Edition, Leg, lifecycle, and mounted Tier-editor machinery. It is not a sixth peer Tier slot, Add-on, second Tier Instance, or Family assignment, and it must never control the parent Tier Group status.

## Accepted source boundary
Phase 1A backend/hook/identity/projection foundation through `3ab286a0` and Phase 1B shared-editor correction `73619866` were accepted. The rejected parallel editor was removed. Composable addressing is isolated behind `COMPOSABLE_TIER_ID`, which is not in `TIER_KEYS`; the mature Tier editor/controller/footer/Edition stack is reused above that seam.

Production/deploy evidence previously verified: GitHub `main` exactly `736198663ab0dd4307255295a5dbc43ae5d6b68d`; Deploy to Hostinger run `33517746004` / #929 completed successfully for that SHA.

## Live browser audit — 2026-09-02
Read-only production route:
1. Packages → KAIROS — IaaS.
2. Settings → Family Groups → KAIROS — IaaS → View.
3. Connections → Manage Tier system.
4. Checked both Focus and Grid views and searched the rendered page for “composable”.

Observed:
- Workspace reports **“5 of 5 Tiers configured.”**
- Exactly five normal occupants render; the Family summary remains **Tiers 5**.
- A normal Tier opens the existing Package Tier drawer with Details, Options, Connections, Support, Pricing Rules, Inclusions, Editions, lifecycle footer, and existing Add-on behavior.
- **No Composable Tier launcher, card, label, action, or accessible control is rendered anywhere on this route.**
- Consequently, the subordinate editor and its composable-only absence of Add-on/Popular controls cannot be validated.
- No Save, Publish, Enable/Disable, Edition mutation, archive, or restore action was performed.

## Exact Claude instruction
Determine why the deployed accepted composable foundation does not expose its subordinate launcher on the assigned Family/Tier-system route, then make the smallest source correction that renders it.

Expected behavior:
- The composable launcher is visibly subordinate to the assigned Tier System.
- It is not included in the five-slot list or any Tier count; “5 of 5” and Family “Tiers 5” remain unchanged.
- Opening it mounts the shared normal Tier editing experience for the composable target.
- Add-on and Popular controls are absent only in composable context.
- Normal five occupants and their editor remain unchanged.

Non-change boundary:
- Do not introduce a sixth Tier slot, parallel editor, Add-on model, second Tier Instance, Family reassignment, Phase 2/customer/cart/quote/PDF/email/promotion work, or parent-status coupling.
- Do not perform live runtime mutations.
- Report root cause, changed files, tests/contracts, exact commit SHA, push/deploy state, and any required live-mutation authorization here; then set **AWAITING CHATGPT REVIEW**.

## Claude root-cause report — 2026-09-02 (no source changed)
Read-only static/build investigation at `73619866` (worktree + `npm run build`; rebuilt `dist/js/admin-station.js` is byte-identical to the committed one, so the deployed bundle is not stale — ruled out first).

**Finding: the audited route never reaches the code Phase 1B changed.** The audit's path — Family → Connections → "Manage Tier system" — resolves to `onManageTierSystem={() => navigate('packages')}` in `PackageFamilyDrawerContent.tsx`, landing on `presentation/package-tier-workspace/PackageTierWorkspace.tsx` (confirmed exact match: this file emits the literal string `` `${occupantCount} of 5 Tiers configured` `` that the audit observed). That workspace is a separate, older presentation tree from `drawer/tier/TierDrawerContent.tsx`, the file Phase 1A/1B actually instrumented with the composable launcher and `COMPOSABLE_TIER_ID` sentinel routing.

The workspace's own five-slot model, `projectWorkspaceTierSlots()` in `surface/packageTierWorkspace/projection.ts`, is built strictly from `TIER_KEYS.map(...)` with no composable field, type, or slot at all. Its list/nav (`TierNavigation.tsx`) and detail panel (`TierDetailPanel.tsx`) have no composable awareness, and dispatch (`dispatchTierIntent` in `PackageTierWorkspace.tsx`, via `encodeTierSlotDrawerRecordId`/`encodeTierDrawerRecordId`) only ever addresses the five fixed slots. So there is no missing render/guard bug in the accepted commit — the accepted commit's launcher genuinely works, but only from the Service-scoped Connections route, which the audit did not (and Nath's normal Family-first workflow does not) use.

**Not yet verified:** whether the workspace's own backend read model (behind `usePackageTierWorkspace`/its endpoint, distinct from `getPackageStation()`'s `/admin/services/{id}/package-station/tier-instances/{instance}/read`) currently returns `composable_occupant` at all. If not, the fix needs a backend read-side addition too, not just frontend wiring.

**Why this changes scope:** a correct fix is not a one-line render correction. It requires: (1) confirming/extending the workspace's own read model to expose the composable occupant, (2) a new composable-aware projection sitting alongside (never inside) `projectWorkspaceTierSlots()`'s five slots, and (3) a subordinate launcher in `TierNavigation`/`PackageTierWorkspace` that dispatches through the existing `dispatchTierIntent` path at `COMPOSABLE_TIER_ID`, reusing the already-composable-aware `TierDrawerContent.tsx` — never a second editor. That's a second-surface integration, not the smallest render fix the original instruction assumed.

No files changed; no build/test run beyond the local rebuild-diff above; no live mutations performed. Requesting auditor verdict on this revised scope before implementation.
