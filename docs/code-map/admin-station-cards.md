# Admin Station Cards

The Admin Station's **presentation card system**, and its first consumer, the Category Group card grid. Split from [Admin Station](admin-station.md) so the shell map stays focused on the shell.

`CategoryGroup*` here is a **mock proving-ground name** — neither [Service Category Group](category-groups.md) nor Package Family; it goes neutral on adoption.

Root: `wp-content/plugins/compuzign-platform/resources/ts/admin-station/presentation/`

```
presentation/
├── StationStatusPill.tsx     neutral — renders the Presentation Status Contract
├── StationMetricBlock.tsx    neutral — the one metric tile
├── StationSplitAction.tsx    neutral — primary + menu in one shape
└── category-groups/
    ├── types.ts                  the card contract
    ├── mockCategoryGroups.ts     the whole data boundary (temporary)
    ├── categoryGroupDrawer.ts    drawer request + inert seam
    ├── CategoryGroupCard.tsx     one card (pure presentation)
    └── CategoryGroupCardGrid.tsx the collection + its states
```

The neutral primitives sit one level up from `category-groups/` because they resolve nothing entity-specific and are structurally typed — any card contract carrying an id/label/value satisfies them.

## Contract

`CategoryGroupCardItem` — `id`, `key?`, `name`, `description?`, `icon?`, `code?`, `status?`, `notifications?`, `metrics[]`, `actions[]`. Identity is `id`/`key` and nothing else: **no consumer branches on a Category Group's name.** `id` is the **numeric `term_id`** (`CategoryGroupId = number`), carried numeric through every dispatch and into the drawer request — never stringified.

- `metrics` are loop-rendered through the single `StationMetricBlock`. There is deliberately no Services/Inclusions/Packages component, so a new or renamed metric is a data change. Labels live in data. **Tiers is not a Category Group metric.**
- `actions[0]` is the split control's primary (`View`); the rest fill its menu. `destructive` is honoured only when data supplies it.
- Actions emit `{ cardId, cardKey?, actionId }`.

## Reuse boundaries

The Admin Station ships its **own bundle** and never loads the old admin stylesheet. That, not preference, decides what can be reused:

- **Status** — `StationStatusPill` imports `PILL_META`/`PILL_FALLBACK` from `components/admin/schema/presentation.ts`, the platform's single status→label/class chokepoint, and resolves nothing itself. It reuses the contract's exact modifier classes and gives them a token-driven appearance in `admin-station.css`, scoped under `.cz-admin-station`. One mapping platform-wide; two visual definitions that can never co-load. `ModuleStatusPill` (old-tree UI, depends on old `Skeleton`) is **not** imported. This is a value import, so Rollup emits a shared `presentation-*.js` chunk used by both bundles.
- **Notifications** — `CategoryGroupNotification` is a type-only alias of `ModuleNote`. The note *data* layer is pure logic and reusable; its only renderer (`ModuleNotificationPanel`) is old-tree UI. **Missing dependency:** no station notification surface exists, so cards carry notes and render none.
- **Drawer** — **built** (fresh): a card action opens the shared [Admin Station Drawer](admin-station-drawer.md). The action id → tab routing lives in the binding's `actionIntents`; the old `categoryGroupDrawer.ts` seam and the card's drawer-request types were **deleted** (one intent→mode system). `components/admin/EntityDrawer.tsx` remains old-tree UI and is **not** imported — the drawer is new, only the authoritative state hook is reused.
- **Menu primitive** — **Missing dependency:** `shell/AdminStationDropdown` is an empty positioned surface with no items, roving focus, or dismissal, so `StationSplitAction` builds its own menu behaviour on station tokens.

## Data boundary

The read is real and reached through the [Surface Binding](admin-station-surface-binding.md) engine, not hardcoded. The `category-group-cards` kit (`presentation/templateKits.tsx`) wraps this grid; its bound `service-category-groups` data source is `stations/serviceCategoryGroup/useServiceCategoryGroupCards` (fetches `/admin/category-groups` via the shared `apiClient`, no old UI crosses the bundle), mapped by the pure `cardAdapter.ts` into `CategoryGroupCardItem[]`. The adapter is truthful: identity is the numeric `term_id`; the **only** metric is **Assigned Categories** (`assigned_count` — the list route carries no Services/Inclusions/Packages counts); status mirrors the authoritative `serviceCategoryGroupStatusPill` in the card's 4-state vocabulary; actions are **View + Edit** only.

`mockCategoryGroups.ts` is a **standby preview fixture only** — unwired (there is no local WordPress runtime to exercise the real read); its ids are obvious placeholders. The grid still **receives items and callbacks and never fetches**; cards are pure presentation.

## Layout and states

`CategoryGroupCardGrid` renders any number of cards with stable keyed rendering and owns the three collection states (loading / error / empty), reusing the shell's `.cz-station-empty`. No fixed card count and no per-card layout branch.

Cards claim twelve-column spans: 4 (three across), and 12 (one across) inside the shell's **existing** ≤767px block. The card system adds **no breakpoint of its own** — the intermediate two-across step is absent because no global tablet boundary exists to host it (reported gap). Nothing overflows at three across in the tablet range: metric blocks reflow intrinsically via `auto-fit` against `--station-metric-min-size`.

The presentation region has no height ceiling — a card row lands near 310px, and the region simply renders at that height, adding to the Admin Station's single page scroll (see [Admin Station § Home shell layout and scroll ownership](admin-station.md)).

Card visual direction: restrained and near-monochrome. The accent is spent in exactly three places — the medallion glyph, the code pill, and the filled primary action — never as outlines on every element. **No separators inside the card**: header, body, metrics, and actions are spaced apart by `--station-card-gap` alone.

## Related Code Maps

[Admin Station](admin-station.md) (shell, tokens, scroll ownership), [Service Category Groups](category-groups.md) (the entity and its backend), [Lifecycle and Module State](lifecycle-system.md) (status resolution).
