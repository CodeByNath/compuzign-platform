# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- Phase 1 implemented on a clean review branch from production `main`. Report below.
- Customer-frontend trace is accepted as the compatibility contract for later Admin consolidation.
- Previous cart / PDF / email customer-output work is **CLOSED**.

## Accepted architecture / customer coupling
The separate Customer Selection Rules drawer is a second Admin projection over the same selected Build Your Own `rate_sheet_items`, keyed by stable `item_id`; it is not a second inclusion store. Keep backend separation: `rate_sheet_items[]` owns commercial inclusion data, `customer_policy.items[]` owns customer-selection attributes.

Customer behaviour that must not change in later UI phases:
- no policy entry = not offered/excluded;
- `required` = mandatory, `optional` = customer selectable, `excluded`/absent = not rendered;
- `default_selected` seeds optional state but an explicit customer deselection must stay deselected;
- quantity min/default/max/step constrain the customer stepper and invalid submissions fail rather than clamp;
- `featured` is merchandising only;
- current Admin authors policy Price Option as fixed only; do not expand this here;
- Edition policy `null` inherits the occupant policy wholesale; non-null Edition policy is a complete replacement;
- Bundle policy applies only to the Bundle row's own `item_id`, never Bundle children;
- unpublished occupant is not exposed; published occupant with no policy exposes no selectable rows;
- Upgrade / future standalone Build Your Own share the same customer policy component path. Do not alter either context or their route logic in this work.

The current source finding that standalone Build Your Own has no live mounted entry point is informational only. Do not change routing or create an entry point in this work.

## Locked Admin direction
- one Inclusions module; no customer-policy module/card per inclusion;
- mount customer-policy controls once per inclusion `item_id`, not per Commercial Leg assignment;
- preserve the existing Admin write convention: choosing "Not offered" removes the policy item rather than persisting an explicit excluded entry;
- preserve the published-occupant authoring eligibility rule unless a later phase explicitly audits and changes it;
- Tier Catalogue Editions use their existing consolidated Edition session/Inclusions surface; no new Edition drawer/route/module;
- Featured remains derived from `customer_policy.items[].featured`, never separate storage;
- do not retire the standalone Customer Selection Rules drawer until the merged occupant UI is implemented and live-validated.

## Required parity gate for later UI phases
Keep the existing customer-policy/resolver/preview/quote/cart/request/notification and TS choice/contribution/live-correction contracts green without changing their assertion intent. The Admin merge is presentation/authoring consolidation only; stored shape, projection, resolver and customer behaviour remain authoritative.

## Phased plan
1. **Phase 1 — Edition stale-policy prune parity** — authorized now.
2. Phase 2 — merge existing customer-policy controls into Build Your Own inclusion authoring as a controller/capability while preserving separate backend drafts/module semantics.
3. Phase 3 — only after Phase 2 live validation, retire the duplicate standalone Customer Selection Rules drawer/action/route.
4. Phase 4 — add the same inclusion-row capability to Tier Catalogue Edition Inclusions through the Edition's existing consolidated session.
5. Later Admin shell refinement: View / Editions / Featured / other existing data.

## Claude — implement Phase 1 only

Done. Not pushed to `main` — awaiting auditor approval per workflow.

- **Branch**: `review/tier-edition-customer-policy-prune-parity`, created from production `main@4bd3a35d3825760dc78de7c14e8ed14b1215b1a4`.
- **Commit**: `bfb203c7` — "Fix Tier Edition settle to prune stale customer_policy entries, mirroring occupant".
- **Files changed**:
  - `wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php` — one call added in `settleTierEditionOverview()`, immediately after the existing `pruneOrphanedLegAssignments()` line and before `sanitizeTierEdition()`: `$edition['customer_policy'] = self::pruneStaleCustomerPolicy($edition['customer_policy'], $edition['rate_sheet_items']);` — exact call-order mirror of `settleTierSlot()`'s occupant-side call. No change to `pruneStaleCustomerPolicy()` itself, any resolver, public projection, or customer-facing code.
  - `wp-content/plugins/compuzign-platform/tests/tier-edition-customer-policy-prune.php` (new) — exercises `PackageSchema::settleTierEditionOverview()` directly (unit-level, matching `composable-customer-policy-admin-surface.php`'s own convention): an authored Edition policy survives settle; removing an inclusion prunes its stale policy entry immediately; re-adding the same `item_id` does not resurrect the old rule; an unrelated still-selected item's policy is untouched; an Edition with no policy ever configured still settles to `null`.
  - `docs/code-map/tier-composable-occupant-admin-customer-policy.md` — records the parity fix under "Backend plumbing gaps closed", trimmed elsewhere to stay under the 600-word Code Map limit.
- **Validation run** (all green): `php tests/tier-edition-customer-policy-prune.php`, `php tests/composable-customer-policy-admin-surface.php`, `php tests/composable-customer-policy-resolver.php`, `php tests/composable-customer-ux-preview.php`, `php tests/tier-edition-schema.php`, `php tests/tier-edition-lifecycle.php`, `php tests/tier-edition-cascade.php`, `php tests/tier-edition-default-resolution.php`, `php tests/tier-edition-public-projection.php`, `php tests/tier-leg-assignment-orphan-pruning.php`, `php tests/tier-composable-occupant.php`, `php tests/composable-occupant-controller-contract.php`; `npm run contract:tier-customer-policy-draft`, `npm run contract:tier-customer-policy-drawer`, `npm run contract:tier-edition-admin`, `npm run contract:tier-edition-switch`, `npm run contract:tier-edition-move-to-bin`; `npx tsc --noEmit`; `npm run docs:check`. No browser validation performed (backend-only phase, matches instruction).
- **Unresolved risks**: none identified beyond what the audit already flagged — this is a pure data-hygiene fix with no live behavioral surface before the fix (resolver already treated a stale entry as unreachable regardless).