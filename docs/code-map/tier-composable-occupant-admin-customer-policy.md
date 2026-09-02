# Composable Tier Occupant — Admin Customer Selection Rules

**Phase 2B1.1 — review branch, not yet live-validated.** Implements
`project-work/2026-09-03-composable-tier-admin-to-customer-validation.md`.
Closes the gap every prior round flagged: `customer_policy` has had a full
backend schema/resolver/persistence contract since
[Composable Tier Occupant — Customer Configuration Policy](tier-composable-occupant-customer-policy.md)
(Phase 2A), but no Admin UI ever authored it, so
[Composable Tier Occupant — Customer UX](tier-composable-occupant-customer-ux.md)
(Phase 2B1) had nothing real to browse against. See
[Composable Tier Occupant Admin UI](tier-composable-occupant-admin-ui.md)
for the composable occupant's own normal Configure/Edit flow this extends.

## Locked architecture

The composable occupant stays commercially identical to a normal Tier
occupant — Rate Sheet, inclusions, quantities/Price Options, Commercial
Legs, commitment, Editions, lifecycle — all unchanged first-time setup.
`customer_policy` is a fifth, occupant-owned module (`Customer Selection
Rules`), never baked into first-time setup: the key invariant is that
removing this module leaves the composable occupant a fully valid normal
Tier occupant. It authors ONLY required/optional/excluded per item,
optional default-selected, fixed-vs-configurable quantity bounds, and
`featured` — never a second inclusion list, never independent pricing.

## Wiring — the fifth module, composable-only

`TierDrawerContent.tsx`/`useTierDrawerController.ts` compose the SAME
Details/Options/Connections/Support screen for every Tier slot and the
composable occupant alike. A new `tierCustomerPolicyShell`
(`bindings/tier.tsx`, registered in `TIER_ENTITY.shells.customer_policy`)
slots into Details as a fifth `PlacedShell`, gated
`isComposableOccupant(editingTierId) && detail.occupant_id` — the same "a
real, settled occupant" gate Options' own Edition switcher already uses —
so a normal Tier/Add-on's Details group never grows a fifth card. Every
other layer (`TierEditingSection`, `useTierModuleEditing`'s
`customerPolicyDraft` state, `PackageStationTierView.modules.customer_policy`,
`saveTierCustomerPolicy`) is threaded through unconditionally, like every
sibling module — a normal Tier's own value is simply never read, matching
`savePackageStationTierModule()`'s own explicit backend rejection of this
module for a fixed slot.

`TierDrafts.customer_policy` is wrapped (`{value: CustomerPolicy | null} |
null`), unlike every sibling draft — a sanitized policy can itself
legitimately be null (an explicit clear), and `drafts.customer_policy ===
null` already means "no pending draft at all"
(`PackageStationController::saveComposableOccupantModule()`'s own
convention). `draftPreferredDetail()`/`saveSection()`/the editing-session
construction all read/write this without a truthy-draft guard — omitting
the guard (present on every sibling module) is deliberate: `null` is this
draft's legitimate VALUE, not "nothing to save."

`CustomerPolicyEditor.tsx` (new, `drawer/editors/`) is a repeatable-
collection editor — the sanctioned pattern for this shape per
`fields/types.ts`'s own boundary (not expressed as `AdminField`
definitions) — modeled on `PoolInclusionsEditor.tsx`. It reads the
occupant's own already-resolved Rate Sheet catalogue (the SAME
`rateSheetCatalogue` Tier Inclusions' editor reads, threaded through the
editing session's `extras`, never a second lookup) and, for a row absent
from the draft, displays "Not offered" — the exact safe default
`sanitizeCustomerPolicy()`/the resolver already apply to a missing entry.
Switching a row back to "Not offered" removes its entry entirely rather
than persisting an explicit `excluded` one, keeping the saved payload as
small as what is actually authorized.

## Two pre-existing backend plumbing gaps closed

- `PackageSchema::normaliseTierSlot()` — the admin GET projection — never
  included `customer_policy` at all, even though `settleTierSlot()`
  already persisted it correctly; the settled value was stored but
  invisible to any admin read. Added, re-sanitized like every other field.
- The composable module revert REST route was registered with a literal
  `overview|pricing_rules|features|faqs` regex; `customer_policy` (already
  a full `TIER_MODULES` member, already handled correctly and generically
  by `revertTierModuleDraft()` at the PHP-function level) could never
  reach that handler — a 404 invisible without booting a real WP REST
  server. Widened the regex; locked by a literal source-string test since
  route regexes are WordPress plumbing no function-level test reaches.

## Not yet built / out of scope this slice

Live browser validation (no local WordPress environment). No cart/quote/
Request/PDF/email/promotions work. No customer Price Option
selectability (unchanged — still never customer-controlled). See
`tests/composable-customer-policy-admin-surface.php` for the two backend
fixes' evidence.

## Related Code Maps

[Composable Tier Occupant](tier-composable-occupant.md), [Composable Tier
Occupant Admin UI](tier-composable-occupant-admin-ui.md), [Composable Tier
Occupant — Customer Configuration Policy](tier-composable-occupant-customer-policy.md),
[Composable Tier Occupant — Customer UX](tier-composable-occupant-customer-ux.md),
[Drawer System](drawer-system.md), and [Tier Edition](tier-edition.md).
