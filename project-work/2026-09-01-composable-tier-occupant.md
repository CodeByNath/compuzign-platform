# Composable Tier occupant

## Status
- **READY FOR CLAUDE — live acceptance failed; restore the missing subordinate launcher.**
- Auditor verdict: **Stop — architectural risk.**
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
