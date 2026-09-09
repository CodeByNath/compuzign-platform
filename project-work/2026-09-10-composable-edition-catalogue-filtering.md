# Composable Edition Catalogue Filtering

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `f9ca5b187c70ef8e4daf2d863e985e2fe540d545`.
- Scope: focused composable occupant, left-side Edition tabs and catalogue content only.

## Audit finding
The Edition tab control is not obviously hardcoded. Current frontend wiring is already Edition-aware:
`EditionCueSelector -> composableEditionId -> ComposableOfferBrowser.activeEditionId -> resolveComposableEligibleRows(family, activeEditionId) -> resolveComposablePreview(..., edition_id)`.

The likely failure is at the Edition data/projection boundary. `resolveComposableEligibleRows()` deliberately falls back:
- Edition `customer_policy` missing -> composable Default `customer_policy`;
- Edition `inclusions_override` empty -> composable Default `inclusions`.

Rows are then an exact `item_id` join between the resolved policy and resolved inclusion source. If both Edition-owned fields are absent/empty, different tabs can correctly render the same catalogue even though the selected Edition ID changes. Conversely, if backend/public projection contains distinct Edition policy/overrides but the browser still shows Default rows, the projection/resolver path is defective.

## Claude — next action: audit first, do not implement yet
From current `main`, trace one failing live Family end-to-end and record evidence here before changing source:
1. Inspect authoritative persisted/raw composable occupant + Edition declarations.
2. Inspect the public Package Builder projection for `composable_offer` and each `edition_options[]` entry: `id`, `edition_platform_id`, `customer_policy`, `inclusions_override`, Rate Sheet/Leg references as applicable.
3. Inspect backend `resolveComposableOfferSelection(..., edition_id)` and confirm which Edition fields replace Default and which explicitly inherit.
4. Compare Default vs every Edition for actual `customer_policy.items` and inclusion item IDs.
5. Confirm the browser receives the expected Edition ID when each cue is clicked and that preview request carries the same `edition_id`.
6. Identify exactly where distinct Edition data is lost, inherited, or never authored.

## Must preserve
- Real Edition identity (`id` selector + CZTE platform identity); no label/index matching.
- Server preview/pricing authority and current `edition_id` request contract.
- Admin-owned policy/inclusion declarations as authority.
- Default inheritance only where the platform contract explicitly allows it.
- Existing Upgrade/composable quote auto-sync, Cart, Add-ons and normal Tier/Edition focused shell.

## Must not substitute
- No client-side hardcoded Edition filters.
- No filtering by Edition name, tab index, category/service label, or visual order.
- No duplicate catalogue per Edition just to make tabs appear different.
- No removal of legitimate inheritance without proving the platform rule is wrong.
- No source push to `main` during this audit round.

## Evidence required
Report the exact failing Family/Tier Instance, raw declaration shape, public projection shape, selected frontend Edition ID, preview payload Edition ID, and the first boundary where Edition-specific data diverges from expected behavior. Then set **AWAITING CHATGPT REVIEW** and stop.
