# Composable Tier — customer UX / Phase 2B1

## Status
- **AWAITING CHATGPT REVIEW — review branch pushed, not merged to main.**
- Auditor verdict (prior round): **Proceed with safeguards**.
- Production base: `main@84af91931380c41217139ac546951e39879f0782`.
- Review branch: `review/composable-tier-customer-ux` @ `0b4a6203` (pushed to origin; `main` untouched, per **SOURCE PUSH NOT APPROVED**).

## Locked model
No architecture change. This is the existing subordinate composable Tier occupant with a restricted customer composition surface.

Flow remains: Family → existing Tier System → composable occupant → its Rate Sheet/Commercial Legs/`customer_policy` → server resolver → candidate commercial result.

Customer control is now deliberately minimal:
- optional inclusion: Add/Remove;
- configurable inclusion: **quantity selector only** within Admin-authored min/max/step;
- fixed quantity: no selector;
- **no customer Price Option selector**. Fixed policy keeps published option; choice policy uses its Admin-configured default. Customer request must not invent/override an option.
- no Leg/commitment/Edition editing.

Fixed Tier/Edition remains an Admin-composed package. The same underlying inclusions may be sold individually through this composable occupant.

## Phase 2B1 customer experience
Reuse the current Package Builder/focused-shell visual language; do not create a parallel catalogue/configurator engine.

Two presentation contexts over the same composable offer:
- direct entry: **Build Your Own**;
- after a normal Tier/Edition is selected: **Upgrade your build**.

Default area: **Recommended Upgrades**. Show maximum 6 eligible inclusions per page.

Browse controls:
- searchable Category — default All Categories;
- searchable Service — default All Services, narrowed by Category;
- Sort — Featured default;
- small previous/next chevrons page the filtered eligible set.

Category/Service/Featured are filtering/merchandising metadata only. They must flow through the composable occupant projection and can never authorize an inclusion or create a Service-Catalog→cart path. Admin featured references may point only to occupant-authorized `item_id`s.

Each card/list row shows inclusion, resolved individual contribution, quantity when configurable, and Add/Remove. Add/drop/quantity changes re-resolve the **whole composable occupant candidate**; never sum independent catalogue products in the browser.

## Scope safeguards for this slice
Audit current projection first. Add only the minimum customer-safe metadata/API plumbing needed to:
1. expose `pricing.composable_offer` in TS types;
2. expose customer-safe policy + inclusion browse metadata through that occupant;
3. call the existing server resolver from a customer-safe preview endpoint/path;
4. hold candidate selection/quantity state in the customer workspace;
5. render the quantity-only browse/filter/recommendation UI and live resolved Extras preview.

**Do not yet persist a composable item into `FamilyTierQuoteItem`, change `quoteItemKey()`, alter Request/PDF/email, final cart persistence, or promotions.** Existing normal/add-on quote behavior must remain unchanged.

## Claude deliverable
Audit source before editing, then implement only this slice on a review branch. Tests/contracts must prove filter metadata cannot bypass policy, quantity bounds are server-authoritative, no Price Option is customer-controlled, candidate changes do not mutate stored occupant, and normal Tier/Add-on flows remain unchanged. Push review branch, record SHA/files/tests and unresolved gaps here, set **AWAITING CHATGPT REVIEW**, stop; do not push `main`.

## Claude Report — round 1

### Source audit findings (before writing anything)
- `pricing.composable_offer`/`customer_policy` were already on the wire from Phase 2A but **completely absent from the TS types** — `FamilyTierAdapter.tsx`/`PricingTiers.tsx` never read either field.
- `resolveCustomerComposableSelection()` had **zero production callers** — test-only since Phase 2A landed.
- `/package-builder` (public, `__return_true`) was the only route touching `PackageFamilyPricingBuilder::buildResponse()` — no customer-safe preview/resolve endpoint existed.
- **No Category/Service/Featured metadata existed anywhere** on a Rate Sheet item. `category_group_id`/`PackageCategoryGroups` is a different, explicitly-documented-as-unrelated concept (Package Family taxonomy, not Service Category). `group_id`/sheet `groups[]` is decorative in-sheet only.
- However, `PackageManagerSchema::buildReadModel()` **already live-resolves** exactly this metadata per Manager item — `source_categories`/`source_service_title` — currently scoped "admin read model only — never enters commercial projections." No Admin authoring UI for `customer_policy` exists yet either (confirmed zero references anywhere in `resources/`).

### Design decisions made without a prior contract round (flag if any should have gone through one first)
1. **Category/Service are a projection-only reuse, not a new field.** Rather than persist a new taxonomy on Rate Sheet items, `PackageRepository::compileOccupantSlotForCostBuilder()` now threads the existing live-resolved `source_categories`/`source_service_title` (keyed by the row's own `source_id`) onto each `inclusions_override` entry as `categories`/`service` — descriptive labels only, never a Platform ID, never touching the admin-only boundary comment's underlying data. Chose this over inventing new persisted identity because the metadata this slice needed for filtering already existed and was already customer-safe (plain strings), just never projected past the admin read model.
2. **Featured is a new field, added to the existing `customer_policy.items[]` shape** (`sanitizeCustomerPolicy()`), not a separate Admin-authored id list. This makes "an Admin featured reference may only point at an authorized item_id" structural rather than a rule to separately enforce — there is nowhere else to attach the flag that isn't itself already policy-authorized. This does touch the Phase 2A shape that went through 3 audit rounds to lock; flagging explicitly in case the auditor would rather this live elsewhere.
3. **`unit_price`/`line_total` on inclusion rows** — already fully resolved inside `projectTierRateSheetWith()`'s own selection rows; just carried through to give each browse card its "resolved individual contribution" without a second computation.
4. **Price Option is dropped server-side, not merely absent from the UI.** `PackageRepository::resolveComposableOfferSelection()` only ever reads `item_id`/`selected`/`quantity` off a submitted choice row — any `price_option_id` a client sends (even a same-origin one, even one within `allowed_price_option_ids`) is silently discarded before the resolver ever sees it. Verified this actually changes behavior, not just omits a UI control: `tests/composable-customer-ux-preview.php` sections 3–4 show that forwarding an explicit null would be REJECTED by the resolver's own already-audited logic, and forwarding an authorized-but-non-default id WOULD be accepted — both are proven to resolve at the policy default instead once routed through this method.
5. **`locateActiveFamilyInstance()` factored out of `findAllActiveFamiliesForCostBuilder()`** rather than duplicated inline — same per-Family authorization gate (active station/Family/Tier Instance), reused by the new single-family resolver entry point. Did not touch `findAllActiveFamiliesForCostBuilder()`'s own body/loop shape (different access pattern — whole-collection vs. single-family — so no shared abstraction beyond the gate itself).

### Files changed (branch `review/composable-tier-customer-ux` @ `0b4a6203`, base `main@84af9193`)
Backend: `PackageSchema.php` (`featured` field), `PackageManagerSchema` unchanged (reused as-is), `PackageRepository.php` (`locateActiveFamilyInstance()`, `resolveComposableOfferSelection()`, category/service/unit_price/line_total on inclusion rows), `PackageBuilderController.php` + `CostBuilderModule.php` (new `POST /package-builder/composable-preview`).
Frontend: `cost-builder.ts` (types), `package-builder.ts` endpoint (`resolveComposablePreview()`), new `ComposableOfferBrowser.tsx`, one-line wiring + import in `FamilyTierAdapter.tsx`, new CSS block in `cost-builder.css` (`cz-package-builder__composable-*`, no atomic-engine collision).
Docs: new Code Map `tier-composable-occupant-customer-ux.md`, cross-linked from the Phase 2A doc and `000-README.md`; both `CLAUDE.md` validation lists updated.
Tests: new `tests/composable-customer-ux-preview.php` (10 sections — not_found gating, dropped price_option_id proven both directions, fixed-quantity override immunity, in/out-of-bounds quantity through the full repository entry point, choice-row field smuggling, no station mutation, shared-projection additive fields, featured sanitize/projection).

### Validation run (all green except one pre-existing, unrelated failure)
`php tests/composable-customer-ux-preview.php` plus the full existing SurfacePackages/CostBuilder PHP suite (all tests listed in both modules' `CLAUDE.md`) — all pass. `tests/tier-capability-invariants.php` fails on a route-registration assertion unrelated to this change; confirmed via `git stash` that it **already fails identically on clean `main@84af9193`** before any of this work, so left untouched. All `npm run contract:*` scripts touching these modules pass. `npx tsc --noEmit` clean. `npm run build` succeeds (`dist/` rebuilt and committed, matching this repo's existing convention of tracking build output). `npm run docs:check` passes (115 Markdown files, 44 Code Maps).

### Unresolved gaps / explicitly not done this slice
- **No live browser validation** — no local WordPress environment exists in this session; verified via type-checking, production build, and the PHP test suite only. The auditor's live-validation pass (same posture as Phase 2A's) is the first real exercise of the rendered UI.
- **No Admin authoring surface for `featured`** beyond the raw REST field already writable via the existing Phase 2A save routes — no form/checkbox added to any Admin Station Rate Sheet/policy editor. Category/Service have no authoring surface at all (by design — sourced live from the existing Service Catalog import provenance, not admin-set).
- Per the work file's own scope safeguards: no `FamilyTierQuoteItem` persistence, no `quoteItemKey()` change, no Request/PDF/email/promotions wiring — none attempted.
- The "Sort" control offers Featured (default) and Name only — the work file didn't specify a fuller sort vocabulary; flagging as a scope-minimal choice rather than an oversight.