# Composable Edition Catalogue Filtering

## Status
- **AWAITING CHATGPT REVIEW**
- Audit round complete; no source changed. Audited at `main@f9ca5b187c70ef8e4daf2d863e985e2fe540d545`.
- Prior auditor verdict: **Proceed with safeguards**.
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


## Claude audit round — 2026-09-10 (static trace, no source changed)

Paths below are under `wp-content/plugins/compuzign-platform/`. Nothing was
implemented, nothing pushed to `main`.

### 3. Frontend Edition selection and preview contract — correct
- `resources/ts/components/package-builder/FamilyTierAdapter.tsx:1557-1568` —
  cue destinations are `{ id: null, label: 'Default' }` plus one entry per real
  `composable_offer.edition_options[]` row, keyed by that Edition's own `id`.
  `setComposableEditionId` stores the real id; `null` means Default. No label,
  index, or ordinal matching anywhere in this path.
- `ComposableOfferBrowser.tsx:365-381` resolves the active Edition by
  `option.id === activeEditionId`, and `:582` sends the same `activeEditionId`
  into `resolveComposablePreview(family_id, choice, editionId)`.
- Backend `PackageRepository::resolveComposableOfferSelection()`
  (`src/Modules/SurfacePackages/Repositories/PackageRepository.php:2932`) matches
  the id against ACTIVE `tier_editions` only, fails closed with `not_found` on an
  unknown id, and at `:2982` swaps the WHOLE Edition declaration in as the pricing
  container, inheriting only `customer_policy` when the Edition has none.

So the Edition ID contract (browser -> request -> resolver) is intact end to end.
The defect is not in Edition selection.

### 6. Where distinct Edition data is lost — the read/display projection

The one place the catalogue rows come from is
`ComposableOfferBrowser.resolveComposableEligibleRows()`
(`ComposableOfferBrowser.tsx:154-159`):

```
policy          = edition.customer_policy ?? offer.customer_policy
inclusionSource = (edition && edition.inclusions_override.length > 0)
                    ? edition.inclusions_override
                    : offer.inclusions
rows            = policy.items JOIN inclusionSource ON item_id === inclusion.id
```

`offer.inclusions` and `edition_options[].inclusions_override` do **not** come
from the same producer:

- **Occupant (`Default`)** — `compileOccupantSlotForCostBuilder()` OVERWRITES the
  occupant's stored `inclusions_override` with rows freshly resolved through
  `PackageManagerSchema::projectTierRateSheetWith()` against the occupant's own
  `rate_sheet_id`/`rate_sheet_items`, then decorates them with `unit_price`,
  `categories`, `service`, Bundle children
  (`PackageRepository.php:2490-2542`). `PackageFamilyPricingBuilder::presentOccupant()`
  publishes exactly that list as `inclusions` (`:66-74`).
- **Every Edition** — `PackageSchema::publicTierEditionOptions()`
  (`src/Modules/SurfacePackages/Support/PackageSchema.php:1425-1462`) emits the
  Edition's **raw stored** `inclusions_override`, or, when that is empty, the
  occupant's **raw stored** `inclusions_override` (`:1447-1450`) — i.e. the
  pre-overwrite value, never the resolved list. The per-Edition re-projection
  block immediately after (`PackageRepository.php:2553-2591`) recomputes only
  `price`, `commercial_legs` and `headline_leg_id` per Edition. It never runs
  `projectTierRateSheetWith()` for an Edition's own `rate_sheet_id`/
  `rate_sheet_items`. `presentOccupant()` then carries `edition_options`
  through verbatim except for the `customer_policy` filter (`:88-91`).

Second half of the same boundary: **nothing persists resolved inclusion rows
into `inclusions_override` at all** on the Rate Sheet-era path.
- `usePackageStation.ts:370-372` derives `dp.inclusions_override` from resolved
  Rate Sheet selections into the **read model only** (`draftPreferredDetail`), and
  it is not part of any save payload.
- The Edition equivalent, `drawer/tier/tierEditionDetailModel.ts:127-131`, is
  likewise display-only; `tierEditionModel.ts:106` passes the stored
  `inclusions_override` through the draft unchanged, and
  `PackageSchema.php:2143` settles that same pass-through value.
- The only writer of the field is the legacy per-Tier REST save
  (`src/Modules/SurfacePackages/Http/PackageStationController.php:1648-1656`),
  which writes `{id,label}` pairs for `tiers[tierId]` — not the composable
  occupant, not Editions.

**Therefore, for any Rate Sheet-era composable occupant, every published
`edition_options[].inclusions_override` is `[]`**: the Edition's own is never
authored, and the inherited occupant value is the same unpersisted `[]`. The
frontend then always takes the `offer.inclusions` fallback — the **Default
occupant's** resolved rows — no matter which Edition is selected. This is the
first boundary at which Edition-specific data is lost, and it fully explains
"different tabs, identical catalogue" without any hardcoding on the client.

### 4. Default vs Edition — what can still differ today
`customer_policy` IS projected per Edition with the inherit-when-absent rule
(`PackageSchema.php:1453-1458`), and an Edition's Customer Selection Rules are
authored against **that Edition's own** Rate Sheet rows
(`resources/ts/package-station/drawer/tier/TierEditionOverviewFields.tsx:386-412`,
`buildRateSheetCatalogue(svc, draft.rate_sheet_id, [])`). Combined with the
inclusion source above, the effective behavior per configuration is:

| Edition configuration | Rendered catalogue today |
| --- | --- |
| No own policy, no own inclusions | Default catalogue (correct by the inherit rule) |
| Own `customer_policy`, items shared with the Default occupant's rate sheet | Default rows narrowed to the shared `item_id`s |
| Own `customer_policy` naming rows unique to that Edition's own Rate Sheet | Those rows **silently dropped** — no matching `id` in `offer.inclusions` |
| Own Rate Sheet selections but inherited policy | **Identical to Default** — the Edition's own rows never reach the customer |

The third and fourth rows are the customer-visible defect; the second is a
partially-correct accident of the two id spaces overlapping.

### Secondary observation
Even if a legacy non-empty `inclusions_override` did exist on an Edition, its
stored shape is `{id,label}` (`PackageStationController.php:1648-1656`) — no
`unit_price`, `categories`, or `service`. Browsing rows built from it would lose
price and the category/service filters. The raw field was never shaped to be the
customer browse source, which is consistent with the occupant's own value being
overwritten before publication.

### Direction (NOT implemented — needs the auditor's verdict first)
The symmetric fix is at the same boundary that already re-projects per-Edition
price/legs: resolve each `edition_options[]` entry's inclusion rows through
`projectTierRateSheetWith()` against that Edition's own `rate_sheet_id`/
`rate_sheet_items`, with the same decoration `PackageRepository.php:2510-2542`
applies to the occupant, and inherit the occupant's resolved rows only when the
Edition declares no Rate Sheet binding of its own. That keeps `id`-based Edition
identity, the `edition_id` request contract, Admin-authored policy as authority,
and adds no client-side filter and no duplicated catalogue.

Open question for the auditor before any implementation: when an Edition binds a
Rate Sheet but the platform rule intends its inclusions to inherit Default, which
signal is authoritative — presence of `rate_sheet_items`, or a non-empty
`inclusions_override`? The current inherit rule is written against the latter, a
field nothing on this path writes any more.

### Evidence NOT obtainable from this session
Items 1, 2 and 4 of the requested evidence need the real persisted station option
(`cz_package_station`) or the deployed public projection for the failing Family:
- raw `composable_occupant.current_occupant.tier_editions[]` for the failing
  Family/Tier Instance — per Edition: `id`, `platform_status`,
  `edition_platform_id`, `rate_sheet_id`, `rate_sheet_items[]`, `customer_policy`,
  `inclusions_override`;
- the same occupant's own `rate_sheet_id`/`rate_sheet_items`/`customer_policy`/
  `inclusions_override`;
- the published `pricing.composable_offer` payload (`inclusions[]` ids plus each
  `edition_options[]` entry's `inclusions_override`/`customer_policy`).

This session has no database or live-site access, and live/browser validation is
the auditor's role. The prediction to check against that data is exact: every
`edition_options[].inclusions_override` will be `[]`, while
`composable_offer.inclusions` will be non-empty — that single comparison confirms
or refutes the whole finding above.
