# Package Station — Frontend Peer

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

`resources/ts/package-station/` is the top-level Package peer's data, surface, presentation, and drawer boundary: it owns Package TypeScript contracts, endpoint implementations, station state, pure derivations, surface adapters, the Tier workspace presentation kit, and Package Family/Tier drawer composition. It is not part of the Admin Station host, and other peers consume Package only through `index.ts`.

- `types.ts` — Package contracts. Shared pool and Cost Builder contracts remain in `api/types/`; `PromotionTier` remains Promotion-owned in `api/types/admin.ts` and is imported type-only solely to preserve the existing `SurfacePackageSummary` contract.
- `api.ts` — the single implementation of Package-owned endpoint calls.
- `usePackageStation.ts`, `usePackageFamilyStation.ts`, and `useSurfacePackages.ts` — Package and Package Family state, mutations, and surface reads.
- `tierOccupants.ts`, `rateSheetLabels.ts`, and `evaluateTierPricing.ts` — Package-owned pure projections, labels, and pricing evaluation.
- `surface/packageFamily/`, `surface/tierSurface/`, `surface/packageTierWorkspace/`, and `surface/rateSheetTool/` — Package Family and Tier surface adapters, the Tier workspace read/projection, and the Rate Sheet tool's read/edit/save controller (reusing the Package Manager contract).
- `presentation/package-tier-workspace/` and `presentation/rate-sheet-tool/` — the Package-owned Tier workspace and Rate Sheet authoring presentation kits.
- `drawer/package-family/` and `drawer/tier/` — Package-owned drawer compositions, controllers, dialogs, and footer presentation.
- `drawer/editors/` and `drawer/schema/` — Package-owned editors, entity manifests, and bindings.
- `vocabulary.ts` — Package-owned Tier keys and labels.
- `register.ts` — registers Package navigation, destination, sources (including the `rate-sheet-tool` controller source), the Tier workspace and Rate Sheet tool kits, and drawers with Station Manager. It is imported only by `resources/ts/modules/admin-station.ts` and is never re-exported from `index.ts`.

## Boundaries

External consumers import only `index.ts`; the sole exception is a documented type-only import of `types.ts` where the public barrel would close a dependency cycle. Sibling files import `./types` / `./api` directly, never the barrel. Presentation must not call `api.ts`. Route ownership — not a Package-shaped name or URL — decides whether an endpoint belongs here. Service-scoped Package Station URLs use the Service id as navigation context only; Package Station retains persistence authority.

Host-engine contracts and helpers come from `@/station-manager`. Imports from `@/admin-station/presentation/` and `@/admin-station/shell/icons` remain legal consumption of Admin Station presentation/control capabilities. `register.ts` remains an entry-only module and must not enter the public barrel.

Read [Package Manager](../../../../../../docs/code-map/package-manager.md), [Tiers](../../../../../../docs/code-map/tiers.md), and [Rate Sheet](../../../../../../docs/code-map/rate-sheet.md).

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.
