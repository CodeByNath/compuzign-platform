# Composable Tier Occupant — Admin Customer Selection Rules

**Phase 2B1.1 — review branch, correction round 1, not yet live-validated.**
Implements `project-work/2026-09-03-composable-tier-admin-to-customer-validation.md`.
Closes the gap every prior round flagged: `customer_policy` has had a full
backend contract since
[Composable Tier Occupant — Customer Configuration Policy](tier-composable-occupant-customer-policy.md)
(Phase 2A), but no Admin UI ever authored it, so
[Composable Tier Occupant — Customer UX](tier-composable-occupant-customer-ux.md)
(Phase 2B1) had nothing real to browse against. See
[Composable Tier Occupant Admin UI](tier-composable-occupant-admin-ui.md) for
the composable occupant's own normal Configure/Edit flow this extends.

**Round 1 wired `customer_policy` as a fifth module inside the shared Tier
drawer/entity and the auditor rejected it as an architectural mismatch.**
This document describes round 2's corrected architecture, the only one live
in this branch's code.

## Locked architecture

The composable occupant stays commercially identical to a normal Tier
occupant, published through the SAME unchanged normal occupant editor.
**Customer Selection Rules are an external controller over that
already-published occupant, not a fifth module of `TIER_ENTITY`.** Removing
the controller leaves the composable occupant a fully valid, unchanged
normal Tier occupant, and the shared Tier drawer never gains composable-only
product machinery. It authors ONLY required/optional/excluded per item,
optional default-selected, fixed-vs-configurable quantity bounds, and
`featured` — never a second inclusion list, never independent pricing, never
Price Option (see "Not yet built").

## Wiring — a standalone drawer, sibling of `tier`/`tier-inclusion`

Modeled on `tier-inclusion`'s own pattern (a genuine sibling drawer key, not
a variant of `tier`):

- **Entity manifest** — `drawer/schema/entities/tierCustomerPolicy.ts`
  (`TIER_CUSTOMER_POLICY_ENTITY`), one `overview` shell
  (`bindings/tierCustomerPolicy.tsx`), no Connections placement — the policy
  references the occupant's own existing inclusion `item_id`s. `TIER_ENTITY`
  carries no `customer_policy` shell/placement at all.
- **Routing token** — `drawer/customerPolicy/tierCustomerPolicyDrawerTypes.ts`,
  `tier-customer-policy:{instance_id}` — one composable occupant per
  instance, so no slot/occupant id is needed.
- **Composition** — `TierCustomerPolicyDrawerContent.tsx` (`EntityDrawer`
  over the entity) + `useTierCustomerPolicyDrawerController.ts` (own draft/
  save state, no persistence beyond `usePackageStation`, addressed at
  `COMPOSABLE_TIER_ID` like every other composable consumer).
- **Host** — `TierCustomerPolicyDrawerHost.tsx`, registered under its own
  key (`register.ts`, `key: 'tier-customer-policy'`).
- **Launch site** — the composable occupant's own shell card gains a
  **Customer Options** action via `withComposableCustomerOptionsAction()`
  (`tierOccupantCard.ts`) — a separate step from the shared
  `toTierOccupantCard()` so it can never leak onto a normal card. Dispatched
  through its own `'customer-options'` action intent
  (`admin-station/register.ts`, `drawerTemplateKey: 'tier-customer-policy'`),
  never through the base Tier intent.

## The eligibility gate — `enabled`, not `occupant_id`

Round 1 gated on `detail.occupant_id`, the same fact Options' own Edition
switcher uses. The auditor identified this as too weak: `occupant_id` is
minted on first Overview Save, before the occupant is genuinely published.
Round 2 gates on `detail.enabled` instead — the pre-computed
`platform_status === 'active'` fact every Tier card's status pill already
uses. Re-checked defensively inside the drawer itself in case it is reached
with a stale card.

## Save / reopen — unchanged from round 1

`TierDrafts.customer_policy` stays wrapped (`{value: CustomerPolicy | null}
| null`) — a sanitized policy can itself legitimately be `null` (an explicit
clear), and `drafts.customer_policy === null` already means "no pending
draft at all." Both `draftPreferredDetail()` and the new controller's save
path read/write this without a truthy-draft guard. Locked by
`scripts/tier-customer-policy-draft-contract.ts`, untouched this round.
**Settling the draft is NOT this drawer's job** — it stays the composable
occupant's own Publish action; Save here surfaces "Saved — settle Build
Your Own to publish," the same boundary every module's draft-then-settle
flow draws. `CustomerPolicyEditor.tsx` is unchanged from round 1.

## Two pre-existing backend plumbing gaps closed (retained from round 1)

`PackageSchema::normaliseTierSlot()` never surfaced settled `customer_policy`
to any admin read (now added); the composable revert REST route's regex
omitted `customer_policy` (now widened) — now actually exercised, since the
standalone drawer's own `discard-draft` action calls
`pkg.revertTierModule(COMPOSABLE_TIER_ID, 'customer_policy')`.

## Not yet built / out of scope this slice

Live browser validation (no local WordPress environment). No cart/quote/
Request/PDF/email/promotions work. **Price Option authoring is out of scope
entirely** — absent from the locked "owns only" list, so every item's
`price_option` stays permanently `{mode:'fixed'}`. The backend's
already-built `'choice'` mode has no Admin authoring path anywhere —
flagged as a real gap for a future round. See
`tests/composable-customer-policy-admin-surface.php` for the backend fixes'
evidence and `scripts/tier-customer-policy-drawer-contract.ts` for this
round's standalone-drawer wiring evidence.

## Related Code Maps

[Composable Tier Occupant](tier-composable-occupant.md), [Composable Tier
Occupant Admin UI](tier-composable-occupant-admin-ui.md), [Composable Tier
Occupant — Customer Configuration Policy](tier-composable-occupant-customer-policy.md),
[Composable Tier Occupant — Customer UX](tier-composable-occupant-customer-ux.md),
[Drawer System](drawer-system.md), and [Tier Edition](tier-edition.md).
