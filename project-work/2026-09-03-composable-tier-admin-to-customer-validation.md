# Composable Tier — Admin → customer browser handoff

## Status
- **AWAITING CHATGPT REVIEW — audit complete, no source changed; see response below.**
- Auditor verdict (prior round): **Proceed with safeguards.**
- Production `main@41884a41ab7f0e21c52dc8e9158c126aace1abf9`; Hostinger deploy #935 succeeded on that exact SHA. Unchanged this round.

## Current live/Admin state
KAIROS Build Your Own is a real active subordinate occupant with three selected inclusions: 2 vCPU, Block Storage, Backup Storage — BaaS. Customer Options is the separate external policy controller. The latest deployed fixes constrain it to occupant-owned inclusions, persist `customer_policy` through settle, and prune removed inclusion policy IDs.

## New question from Nath — audit only first
Nath reports that an **earlier customer browser check showed the composable/front-end entry**, but after the recent Admin/boundary fixes the customer surface now appears unchanged / the composable option is no longer visible. We had already planned the customer-facing placement and do not want that UX silently lost while fixing Admin persistence.

The shipped frontend source still visibly contains the intended Phase 2B1 wiring:
- `FamilyTierAdapter` renders `ComposableOfferBrowser` as a sibling of the normal pricing view;
- context is `Build Your Own` before a normal Tier is selected and `Upgrade your build` after a normal Tier/Edition is selected;
- `ComposableOfferBrowser` currently returns `null` when `composable_offer`, `customer_policy`, or policy-backed rows are absent.

## Claude audit request
Do **not change source yet**. Explain exactly why the live customer entry disappeared and whether this is:
1. expected because KAIROS currently has no settled/published `customer_policy` rows;
2. a regression in the public `composable_offer` projection after the settle/persistence fixes;
3. a lifecycle/state issue where publishing the occupant but not Customer Options leaves the public projection intentionally empty;
4. or another wiring defect.

Trace the exact chain for current KAIROS state:
`current_occupant` → settled `customer_policy` → PackageRepository/public `pricing.composable_offer` → `FamilyTierAdapter` → `ComposableOfferBrowser` null/render gate.

Also reconcile this with the locked customer UX plan. State plainly:
- where **Build Your Own** is intended to appear before a primary Tier is chosen;
- where **Upgrade your build** is intended to appear after a primary Tier/Edition is chosen;
- whether the UI should be hidden until at least one policy item is explicitly offered, or whether a visible entry/empty-state shell was intended;
- what exact Admin action/state is required today to make the current shipped customer UI render.

Do not propose a new parallel UI. Do not alter cart/quote/PDF/email. Do not touch production data. Record the source paths/functions, current-state explanation, and smallest recommendation in this same file, set **AWAITING CHATGPT REVIEW**, then stop.

## Claude audit response — 2026-09-03 (no source changed)

**Answer: (1) expected, not a regression.** No wiring defect found.

**Chain, exact:**
- `ComposableOfferBrowser.tsx:134-135` — `policy = family.pricing.composable_offer?.customer_policy ?? null`.
- `ComposableOfferBrowser.tsx:286` — `if (!offer || !policy || rows.length === 0) return null;`. `rows` (built ~140-158) joins `policy.items` to inclusions; empty whenever `policy.items` is empty. This guard is unchanged since the component's own introduction (`0b4a6203`).
- `FamilyTierAdapter.tsx:1217-1220` mounts `ComposableOfferBrowser` **unconditionally** as a sibling of the normal pricing view; `context` is `build_your_own` when `selectedTierId === null`, else `upgrade_your_build`. It does no gating itself — all visibility is delegated to the browser's own `return null`.
- Public projection: `PackageFamilyPricingBuilder::presentCustomerPolicy()` (`PackageFamilyPricingBuilder.php:137-146`): `customer_policy === null` → returns `null` (→ browser's `!policy` fires). A non-null policy with all items `excluded` (or empty) → returns `{items: []}`, a real object — browser's `!policy` passes but `rows.length === 0` fires. Either way, same visible outcome (nothing renders); this filter predates the customer component (`84af9193`, before `0b4a6203`) — never loosened then tightened.

**Root fact: KAIROS's settled `customer_policy` cannot have been non-null before `41884a41`.** `upsertOccupant()` (the sole `current_occupant` write, one construction site, `PackageSchema.php`) had no `customer_policy` key in its return literal until this exact commit added `'customer_policy' => $data['customer_policy'] ?? null,`. Every settle before it silently discarded whatever `settleTierSlot()` computed, for every occupant, always — not KAIROS-specific, not caused by the recent fixes. The fixes are what *first make it possible* for a real policy to survive a Publish at all.

**What the "earlier check" likely was:** two other things exist that are easy to conflate with this: (a) an **Admin-only** "Build Your Own" launcher, `PackageTierWorkspace.tsx:342` (`{tool.composableOccupant && (...)}`) — no `customer_policy` check at all, live since deploy #931, but it's the Admin Studio surface, never customer `/pricing/`; (b) Phase 2B1's own closure (`2026-08-30-...customer-ux.md`, deploy #933) was a **synthetic happy-dom harness with mocked data**, explicitly deferring real validation: *"the first real Admin-configured/published composable offer must receive an end-to-end customer validation."* No genuine `/pricing/` browse against real settled policy data is documented as having happened before now.

**Reconciled UX intent:** hidden-until-authorized is the locked design, not a gap — Phase 2B1's own accepted assertion list included "no-op render when `composable_offer` is absent." No empty-state shell was ever intended for zero authorized items.

**What Admin must do today:** open Customer Options on the KAIROS composable occupant, author at least one item as `required` or `optional` (not `excluded`), Save, then **Publish the composable occupant** (settle) — the first Publish that can actually carry a policy through, post-`41884a41`. Until that happens, no entry is the correct, expected state.

**Recommendation:** no source change. Proceed straight to that Admin action, then live-validate `/pricing/`.