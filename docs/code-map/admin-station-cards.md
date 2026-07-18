# Admin Station Cards

The Admin Station's **presentation card system** — the shell's general-purpose card wall. Split from [Admin Station](admin-station.md) so the shell map stays focused on the shell.

`CategoryGroup*` is a **historical file name, not a scope**: the kit is entity-neutral and has been proven so. It renders the **Package Families** wall ([Package Manager](package-manager.md) — Package-owned, string `group_id`) on the Service home region, and has rendered that wall *simultaneously* with a **[Service Category Groups](category-groups.md)** wall (taxonomy, numeric `term_id`) through the same card, grid, and kit — two unrelated entities, one template, no component branch. That wall has since been retired from the shell; the kit did not change when it arrived or when it left.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/presentation/`

```
presentation/
├── StationStatusPill.tsx     neutral — renders the Presentation Status Contract
├── StationMetricBlock.tsx    neutral — one row in the metric repeater
├── StationSplitAction.tsx    neutral — primary + menu in one shape
└── category-groups/
    ├── types.ts                  the card contract
    ├── mockCategoryGroups.ts     standby preview fixture (unwired)
    ├── CategoryGroupCard.tsx     one card (pure presentation)
    └── CategoryGroupCardGrid.tsx the collection + its states
```

The neutral primitives sit one level up from `category-groups/` because they resolve nothing entity-specific and are structurally typed — any card contract carrying an id/label/value satisfies them.

## Contract

`CategoryGroupCardItem` — `id`, `key?`, `name`, `kind?`, `description?`, `icon?`, `code?`, `status?`, `notifications?`, `metrics[]`, `actions[]`. `kind` is the record's type in the reader's language ("Package family"), rendered as a subtitle under the name and supplied as **data** — the card never knows which entity it renders, so it could not name the kind itself. Identity is `id`/`key` and nothing else: **no consumer branches on a record's name.** `id` is the record's **own native id** (`CategoryGroupId = StationRecordId = string | number`) — a numeric `term_id` stays a number, a string `group_id` stays a string — carried unchanged through every dispatch and into the drawer. The card never parses, compares, or converts it. See [Record identity](#record-identity).

- `metrics` are loop-rendered through the single `StationMetricBlock` — one labelled **row**: optional glyph plate, label, and a value pushed to the trailing edge, so sibling rows share a value column without any row knowing its siblings. There is deliberately no Services/Inclusions/Packages component, so a new or renamed metric is a data change. Labels live in data.
- `actions[0]` is the split control's primary (`View`); any remainder fills its menu, and a lone action renders as the primary alone (no trigger — an empty menu is invalid semantics). On a card the control spans the full width; the split keeps its natural inline width elsewhere. `destructive` is honoured only when data supplies it.
- Actions emit `{ cardId, cardKey?, actionId }`.

## Record identity

The rule for the whole shell, declared once in `stations/recordIdentity.ts` (zero-dependency, type-only, erased at build):

```ts
export type StationRecordId = string | number;
```

**Every entity keeps its own real ID.** Across the platform, Service, Category and Service Category Group use their numeric IDs; Package Family — the one entity the shell surfaces today — uses its string `group_id`. The union stays `string | number` regardless of which entities are currently bound, and is not a loosening of the numeric contract — it is that contract generalised: an id travels exactly as its own data source and its own backend routes express it. What stays forbidden is the **round-trip** — stringifying a `term_id`, or `Number()`-ing a `group_id` — because that is where identity silently breaks.

One id flows the whole path unchanged:

```
API record → card.id → action event cardId → resolved intent recordId
  → open drawer state → drawer content recordId → that entity's own read + mutation
```

No surrogate id, no conversion, no duplicate record, and no registration step in between. Each station resolves its record by matching its **own** native field (`item.id === recordId`, `item.group_id === recordId`); a foreign id shape simply fails to match and the drawer content renders its neutral "no longer available" state rather than resolving the wrong record.

## Reuse boundaries

The Admin Station ships its **own bundle** and never loads the old admin stylesheet. That, not preference, decides what can be reused:

- **Status** — `StationStatusPill` imports `PILL_META`/`PILL_FALLBACK` from `components/admin/schema/presentation.ts`, the platform's single status→label/class chokepoint, and resolves nothing itself. It reuses the contract's exact modifier classes and gives them a token-driven appearance in `admin-station.css`, scoped under `.cz-admin-station`. One mapping platform-wide; two visual definitions that can never co-load. `ModuleStatusPill` (old-tree UI, depends on old `Skeleton`) is **not** imported. This is a value import, so Rollup emits a shared `presentation-*.js` chunk used by both bundles.
- **Identity** — `CategoryGroupId` is a type-only alias of `StationRecordId` (`stations/recordIdentity.ts`), which imports nothing, so every layer of the chain can share the contract without a cycle.
- **Notifications** — `ModuleNote` and the pure `evaluateModule` definitions are reusable contracts. `StationStatusPill` accepts optional notes: without notes it is static; with notes it becomes a disclosure button rendering a station-native notification panel. The old-tree `ModuleNotificationPanel` is not imported.
- **Drawer** — **built** (fresh): a card action opens the shared [Admin Station Drawer](admin-station-drawer.md). The action id → tab routing lives in the binding's `actionIntents`; the old `categoryGroupDrawer.ts` seam and the card's drawer-request types were **deleted** (one intent→mode system). `components/admin/EntityDrawer.tsx` remains old-tree UI and is **not** imported — the drawer is new, only the authoritative state hook is reused.
- **Menu primitive** — **Missing dependency:** `shell/AdminStationDropdown` is an empty positioned surface with no items, roving focus, or dismissal, so `StationSplitAction` builds its own menu behaviour on station tokens.

## Data boundary

The read is real and reached through the [Surface Binding](admin-station-surface-binding.md) engine, not hardcoded. The `category-group-cards` kit (`presentation/templateKits.tsx`) wraps this grid. The source is a pure read through the shared `apiClient` with no old UI crossing the bundle, with a pure `cardAdapter.ts` projecting into `CategoryGroupCardItem[]`:

| Wall | Data source key | Station folder | Route | Identity | Repeated card metrics | Status mirrors |
| --- | --- | --- | --- | --- | --- | --- |
| Package Families | `package-families` | `stations/packageFamily/` | `/admin/package-category-groups` | string `group_id` | **Services**, **Rate Sheet rows**, **Tier selections** (`dependents`) | `groupStatusPill` |

The adapter's truthfulness rules: identity is carried unchanged; status is a faithful re-expression of the authoritative pill in the card's 4-state vocabulary, never a second rule; and metrics repeat the complete backend `dependents` projection using its precise labels. `PackageCategoryGroups::dependents()` returns `{services, rate_sheet_rows, tier_selections}`; these are connected Services, dependent Rate Sheet rows, and selection occurrences (not distinct tiers). The adapter supplies those three records and the shared card loops them through `StationMetricBlock`, so the presentation card and drawer Connections view read the same live values without fixed metric slots.

The compact Service Categories carousel is a second kit. Its source keeps the native numeric Category id, assigned Service count, and evaluates the authoritative `categoryOverviewModule` to produce status + notifications together. Each cube card shows its label, live Service count, and the same station status pill; clicking a pill with notes reveals those actual derived messages.

Actions are **View only** — one gesture, rendered full width as the card's footer. Edit is not withdrawn from the product: the drawer that View opens registers both modes as tabs (see [Drawer](admin-station-drawer.md)), so editing is one click further in rather than a menu on every card.

The entity-neutrality is measured, not asserted: a second wall (Service Category Groups, numeric `term_id`, `/admin/category-groups`) once cost exactly **one read hook + one adapter + one registry line + one binding row**, and retiring it cost the same four in reverse. No card, grid, kit, host, controller, or shell code changed in either direction.

Each wall owns its own `refetch`, which it dispatches with any intent it raises, so a drawer save refreshes **that** wall alone. The collection is retained across the reload, so the edited card updates in place rather than the wall blanking — see [Surface Binding](admin-station-surface-binding.md).

`mockCategoryGroups.ts` is a **standby preview fixture only** — unwired (there is no local WordPress runtime to exercise the real read); its ids are obvious placeholders. The grid still **receives items and callbacks and never fetches**; cards are pure presentation.

## Layout and states

`CategoryGroupCardGrid` renders any number of cards with stable keyed rendering and owns the three collection states (loading / error / empty), reusing the shell's `.cz-station-empty`. No fixed card count and no per-card layout branch. Its loading and empty wording is **entity-neutral** ("Loading…", "Nothing to show here yet.") because it renders whatever entity a binding pairs it with; a surface wanting specific wording passes `emptyMessage`.

Cards claim twelve-column spans: 4 (three across), and 12 (one across) inside the shell's **existing** ≤767px block. The card system adds **no breakpoint of its own** — the intermediate two-across step is absent because no global tablet boundary exists to host it (reported gap). Nothing overflows at three across in the tablet range: metrics are a vertical list of full-width rows, so they narrow with the card rather than needing to reflow. (`--station-metric-min-size` is retained as the reflow floor for any future surface that lays metrics out horizontally.)

The presentation region has no height ceiling — a card row lands near 310px, and the region simply renders at that height, adding to the Admin Station's single page scroll (see [Admin Station § Home shell layout and scroll ownership](admin-station.md)).

Card visual direction: restrained and near-monochrome. The medallion uses the same light accent background + strong navigation-blue glyph as the compact Service Category cube, keeping icon language consistent across the two presentation walls. The optional code pill and primary action carry the remaining accent.

**Regions are delimited by hairline rules** (`--station-card-divider`), reversing the card's earlier "spacing alone" direction. The reason is structural: metrics are now a **list of labelled rows** (glyph plate, label, value pushed to the trailing edge) rather than a row of centred tiles, and a list needs its rows and its neighbouring regions delimited. Each rule is drawn by the region that *follows* it, and padding is owned per region, so a card missing a description or metrics renders no stray line and every rule spans the full card width. A vertical rule separates medallion from identity, drawn only when a medallion precedes it.

The actions region is anchored with `margin-top: auto`, so action controls line up across a row of cards whose descriptions and metric counts differ — the optional description block deliberately does **not** take the card's slack, since a description-less record would leave nothing to absorb it.

## Related Code Maps

[Admin Station](admin-station.md) (shell, tokens, scroll ownership), [Package Manager](package-manager.md) (the bound entity and its backend), [Lifecycle and Module State](lifecycle-system.md) (status resolution).
