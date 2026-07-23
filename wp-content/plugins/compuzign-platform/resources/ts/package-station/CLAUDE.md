# Package Station — Frontend Peer

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

`resources/ts/package-station/` is the top-level Package peer's data, surface, presentation, and drawer boundary: it owns Package TypeScript contracts, endpoint implementations, station state, pure derivations, surface adapters, the Tier workspace presentation kit, and Package Family/Tier drawer composition. It is not part of the Admin Station host, and other peers consume Package only through `index.ts`.

- `types.ts` — Package contracts. Shared pool and Cost Builder contracts remain in `api/types/`; `PromotionTier` remains Promotion-owned in `api/types/admin.ts` and is imported type-only solely to preserve the existing `SurfacePackageSummary` contract.
- `api.ts` — the single implementation of Package-owned endpoint calls.
- `usePackageStation.ts`, `usePackageFamilyStation.ts`, and `useSurfacePackages.ts` — Package and Package Family state, mutations, and surface reads.
- `tierOccupants.ts`, `rateSheetLabels.ts`, and `evaluateTierPricing.ts` — Package-owned pure projections, labels, and pricing evaluation.
- `surface/packageFamily/`, `surface/tierSurface/`, and `surface/packageTierWorkspace/` — Package Family and Tier surface adapters plus the Tier workspace read/projection.
- `presentation/package-tier-workspace/` — the Package-owned Tier workspace presentation kit.
- `drawer/package-family/` and `drawer/tier/` — Package-owned drawer compositions, controllers, dialogs, and footer presentation.
- `drawer/editors/` and `drawer/schema/` — Package-owned editors, entity manifests, and bindings.
- `vocabulary.ts` — Package-owned Tier keys and labels.

## Boundaries

External consumers import only `index.ts`; the sole exception is a documented type-only import of `types.ts` where the public barrel would close a dependency cycle. Sibling files import `./types` / `./api` directly, never the barrel. Presentation must not call `api.ts`. Route ownership — not a Package-shaped name or URL — decides whether an endpoint belongs here. Service-scoped Package Station URLs use the Service id as navigation context only; Package Station retains persistence authority.

Read [Package Manager](../../../../../../docs/code-map/package-manager.md), [Tiers](../../../../../../docs/code-map/tiers.md), and [Rate Sheet](../../../../../../docs/code-map/rate-sheet.md).

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.
