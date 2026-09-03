# Composable Tier Occupant — Admin Customer Selection Rules

**Phase 2B1.1 — review branch, correction round 2, not yet live-validated.**
Implements `project-work/2026-09-03-composable-tier-admin-to-customer-validation.md`.
`customer_policy` has had a full backend contract since
[Composable Tier Occupant — Customer Configuration Policy](tier-composable-occupant-customer-policy.md)
(Phase 2A), but no Admin UI authored it, so [Customer UX](tier-composable-occupant-customer-ux.md)
(Phase 2B1) had nothing real to browse against. See
[Admin UI](tier-composable-occupant-admin-ui.md) for the occupant's own
normal Configure/Edit flow this extends.

Round 1 wired `customer_policy` as a fifth module inside the shared Tier
drawer/entity; the auditor rejected it as an architectural mismatch. This
document describes round 2's corrected architecture, the only one live in
this branch's code.

## Locked architecture

The composable occupant stays commercially identical to a normal Tier
occupant, published through the SAME unchanged normal occupant editor.
**Customer Selection Rules are an external controller over that
already-published occupant, not a fifth module of `TIER_ENTITY`.** Removing
the controller leaves a fully valid, unchanged normal Tier occupant. It
authors ONLY required/optional/excluded per item, optional
default-selected, fixed-vs-configurable quantity bounds, and `featured` —
never a second inclusion list, independent pricing, or Price Option.

## Wiring — a standalone drawer, sibling of `tier`/`tier-inclusion`

Modeled on `tier-inclusion`'s own pattern (a genuine sibling drawer key, not
a variant of `tier`):

- **Entity manifest** — `drawer/schema/entities/tierCustomerPolicy.ts`
  (`TIER_CUSTOMER_POLICY_ENTITY`), one `overview` shell, no Connections
  placement. `TIER_ENTITY` carries no `customer_policy` shell at all.
- **Routing token** — `tier-customer-policy:{instance_id}` — one composable
  occupant per instance, no slot/occupant id needed.
- **Composition** — `TierCustomerPolicyDrawerContent.tsx` +
  `useTierCustomerPolicyDrawerController.ts` (own draft/save state, no
  persistence beyond `usePackageStation`, addressed at `COMPOSABLE_TIER_ID`).
- **Host** — `TierCustomerPolicyDrawerHost.tsx`, its own registered key
  (`key: 'tier-customer-policy'`).
- **Launch site** — the composable card gains a **Customer Options** action
  via `withComposableCustomerOptionsAction()`, a separate step from
  `toTierOccupantCard()` so it never leaks onto a normal card, dispatched
  through its own `'customer-options'` intent, never the base Tier intent.

## The eligibility gate — `enabled`, not `occupant_id`

Round 1 gated on `detail.occupant_id`, minted on first Overview Save, before
genuine publication — too weak. Round 2 gates on `detail.enabled`, the
pre-computed `platform_status === 'active'` fact every Tier card's status
pill already uses, re-checked defensively in case of a stale card.

## Save / reopen — unchanged from round 1

`TierDrafts.customer_policy` stays wrapped (`{value: CustomerPolicy | null}
| null`) since a sanitized policy can itself be `null`, and
`drafts.customer_policy === null` already means "no pending draft." Locked
by `scripts/tier-customer-policy-draft-contract.ts`. **Settling is NOT this
drawer's job** — it stays the occupant's own Publish action; Save surfaces
"Saved — settle Build Your Own to publish," the same boundary every
module's draft-then-settle flow draws.

## Backend plumbing gaps closed

Round 1: `normaliseTierSlot()` never surfaced settled `customer_policy` to
admin reads (added); the composable revert route's regex omitted
`customer_policy` (now widened), exercised by the drawer's `discard-draft`.

Round 2, found in live validation: the editor showed every bound Rate
Sheet row (45) instead of only selected inclusions (3) — the controller
sourced rows through `buildRateSheetCatalogue()` (built for the Features
"Add from Rate Sheet…" picker: full sheet, only appends missing selections,
never filters down). Now reads `detail.rate_sheet_selections` directly
(filtered to `resolved`), no second lookup.

Auditing that surfaced a worse, independent gap: `upsertOccupant()` — every
settle path's shared write — never carried `customer_policy` forward, so
`settleTierSlot()`'s computed value was silently discarded on every settle;
an authored policy could never survive a Publish. Every prior test
hand-built `current_occupant` rather than round-tripping through
`settleTierSlot()`, so this went uncaught. Fixed: `upsertOccupant()` now
carries it through like any other occupant field.

A resurrection hazard remained: a removed inclusion's policy entry went
inert (unreachable — the resolver only walks live `rate_sheet_items`), not
gone, so re-adding the same `item_id` later reactivated its old rule.
`pruneStaleCustomerPolicy()` now runs in `settleTierSlot()`, after
`pruneOrphanedLegAssignments()`, dropping any policy item no longer
selected — never adding one for a (re-)selected id. See
`composable-customer-policy-admin-surface.php` §5-7.

## Not yet built / out of scope this slice

Live browser validation (no local WordPress environment). No cart/quote/
Request/PDF/email/promotions work. **Price Option authoring is out of scope
entirely** — absent from the locked "owns only" list, so every item's
`price_option` stays permanently `{mode:'fixed'}`; the backend's
already-built `'choice'` mode has no Admin authoring path — a real gap for a
future round.

## Related Code Maps

[Composable Tier Occupant](tier-composable-occupant.md), [Composable Tier
Occupant Admin UI](tier-composable-occupant-admin-ui.md), [Composable Tier
Occupant — Customer Configuration Policy](tier-composable-occupant-customer-policy.md),
[Composable Tier Occupant — Customer UX](tier-composable-occupant-customer-ux.md),
[Drawer System](drawer-system.md), and [Tier Edition](tier-edition.md).
