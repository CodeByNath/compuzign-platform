# Composable Tier Occupant — Customer UX

**Phase 2B1 — review branch, not yet Admin-authored/live-validated.**
Implements `project-work/2026-09-02-composable-tier-customer-ux.md`. See
[Composable Tier Occupant — Customer Configuration Policy](tier-composable-occupant-customer-policy.md)
(Phase 2A, live on `main`) for the policy/resolver this reads.

## Purpose and ownership

A deliberately minimal customer composition surface over the existing
composable Tier occupant: quantity-only Add/Remove browsing within
Admin-authorized bounds, no customer Price Option control, no Leg/
commitment/Edition editing. Two presentation contexts over the SAME
composable offer — "Build Your Own" (no normal Tier/Edition selected yet)
and "Upgrade your build" (after one is) — both rendered by one component,
`ComposableOfferBrowser.tsx`, as a sibling of `FamilyTierAdapter`'s existing
staged/focused views, never nested inside either.

## Browse/merchandising metadata — projection only, no new identity

Category/Service filters and Featured sort needed metadata that did not
exist anywhere on a Rate Sheet item. Rather than invent a new persisted
field, `PackageRepository::compileOccupantSlotForCostBuilder()` threads the
SAME live-resolved supplying-Service provenance the Manager read model
already computes per item (`source_categories`/`source_service_title`) onto
each `inclusions_override` entry as `categories`/`service`, keyed by the
row's own `source_id` — additive on the one shared `presentOccupant()`
function, so every normal Tier's inclusions carry it too (harmless, unread
there). `unit_price`/`line_total` (already resolved inside
`projectTierRateSheetWith()`'s own selection rows) ride along the same way,
giving each browse card its "resolved individual contribution" with no new
computation.

`featured` is genuinely new authored state — a merchandising-only bool added
to each `PackageSchema::sanitizeCustomerPolicy()` item entry, never read by
`resolveCustomerComposableSelection()`/save-time validation. Living on the
policy-authorized entry itself makes "an Admin featured reference may only
point at an authorized item_id" structural, not a rule to enforce
separately — there is no other place to store the flag.

## Customer-safe preview endpoint

`PackageRepository::locateActiveFamilyInstance(family_id)` — extracted from
`findAllActiveFamiliesForCostBuilder()`'s own per-Family gate (active
station/Family/Tier Instance), factored out so a single-family entry point
can reuse the identical boundary without forcing the whole-collection method
through a single-family access shape it wasn't written for.
`resolveComposableOfferSelection(family_id, choice)` uses it, then requires
the composable occupant itself carry a minted CZT/CZTA (same gate
`enrichCompiledOccupantIdentity()` applies to the compiled public response),
builds its container via `PackageSchema::extractTierForCostBuilder()`
(already shaped almost exactly like `resolveCustomerComposableSelection()`'s
own container contract), and calls that resolver unchanged.

`POST /compuzign/v1/package-builder/composable-preview` (public, no auth —
same posture as `/package-builder` itself) wraps it. **Only `item_id`,
`selected`, and `quantity` are ever read off a submitted choice row** — a
`price_option_id` a caller sends is silently dropped before it reaches the
resolver. This is what makes "no customer Price Option selector" a wire-
contract fact rather than a UI-only convention: omitting the key lets the
resolver's own already-audited "no explicit choice → policy default, only
if still authorized" branch run every time, regardless of what a malicious
client sends. A fixed-quantity item (policy `quantity: null`) similarly
ignores any submitted quantity — the resolver's own untouched-row branch
already guarantees this; nothing extra was added to enforce it.

## Frontend

`ComposableOfferBrowser.tsx` joins `composable_offer.inclusions` (browse
metadata) with `composable_offer.customer_policy.items` (authorization) by
`item_id` — an inclusion absent from the policy is not offered, full stop.
Candidate selection/quantity lives in component-local state only, reseeded
from policy defaults on Family/offer change; every change re-calls
`resolveComposablePreview()` for the whole candidate and renders the live
resolved total. Category (searchable via `<datalist>`)/Service (narrowed by
Category)/Sort (Featured default)/max 6 per page with prev/next paging are
client-side over the already-fetched offer — no new network shape per
filter interaction, only the live-resolve call on an actual selection
change.

## Not yet built / explicitly out of scope this slice

Persisting a composable item into `FamilyTierQuoteItem`, `quoteItemKey()`
changes, Request/PDF/email, final cart persistence, promotions, and an
Admin authoring surface for `featured`/Category/Service beyond what already
exists via Service Catalog import. Live browser validation was not possible
in this session (no local WordPress environment) — reviewed via `npx tsc
--noEmit`, `npm run build`, and the PHP test suite only; see
`tests/composable-customer-ux-preview.php`.

## Related Code Maps

[Composable Tier Occupant](tier-composable-occupant.md), [Composable Tier
Occupant — Customer Configuration Policy](tier-composable-occupant-customer-policy.md),
[Composable Tier Occupant Admin UI](tier-composable-occupant-admin-ui.md),
[Composable Tier Occupant — Tier Workspace UI](tier-composable-occupant-workspace-ui.md),
[Commercial Legs](commercial-legs.md), and [Cost Builder](cost-builder.md).
