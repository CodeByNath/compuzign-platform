# Package Station — Frontend Peer

Global policy is defined by [AGENTS.md](../../../../../../AGENTS.md).

## Ownership and entry points

`resources/ts/package-station/` is the top-level Package peer's data, surface, presentation, and drawer boundary: it owns Package TypeScript contracts, endpoint implementations, station state, pure derivations, surface adapters, the Tier workspace presentation kit, and Package Family/Tier drawer composition. It is not part of the Admin Station host, and other peers consume Package only through `index.ts`.

- `types.ts` — Package contracts. Shared pool and Cost Builder contracts remain in `api/types/`; `PromotionTier` remains Promotion-owned in `api/types/admin.ts` and is imported type-only solely to preserve the existing `SurfacePackageSummary` contract.
- `api.ts` — the single implementation of Package-owned endpoint calls.
- `usePackageStation.ts`, `usePackageFamilyStation.ts`, and `useSurfacePackages.ts` — Package and Package Family state, mutations, and surface reads.
- `tierOccupants.ts`, `rateSheetLabels.ts`, and `evaluateTierPricing.ts` — Package-owned pure projections, labels, and pricing evaluation.
- `surface/packageFamily/`, `surface/tierInstance/`, `surface/tierSurface/`, `surface/packageTierWorkspace/`, and `surface/rateSheetTool/` — Package Family adapters; Tier instance/assignment state and pure models; exact Family-assignment workspace resolution, fixed-slot/Rate-Sheet inventory projections and instance-scoped drawer adapters; and the Rate Sheet tool controller plus `useTierRateSheetDrawer`, which scopes that controller to one Tier's connection without adding a reader, editor, or endpoint. Pool creation has no surface adapter: Families, Rate Sheets and the groups a sheet stores are created by the drawers that already own those writes, and the workspace only re-reads them through the `refetch` it hands the drawer host at dispatch.
- `presentation/package-tier-workspace/` and `presentation/rate-sheet-tool/` — the Package-owned Tier workspace presentation kit and the Rate Sheet drawer content. Its Connections and Settings lanes share the workspace-local `DeckDisclosure.tsx` accordion — presentation state only, no shared accordion framework; Connections uses it uncontrolled, Settings drives it from one open-section id shared with `TierSettingsNav.tsx`. Settings itself is `TierSystemSettings.tsx` (shell and Package Manager launchers) and `FocusedTierSettings.tsx`; it holds no creation form, because every pool subject launches the drawer that owns that record. See [Package Home Settings](../../../../../../docs/code-map/package-settings.md). `rateSheetParts.tsx` is the one implementation of `cz-rate-sheet-tool__groups` and `cz-rate-sheet-tool__grid`; `RateSheetTool.tsx` (`rate-sheet`) and `TierRateSheetDrawer.tsx` (`tier-rate-sheet`, `tier-rate-sheet-group`) both render it and neither duplicates an editor.
- `drawer/package-family/`, `drawer/tier/`, `drawer/inclusion/`, and `drawer/tier-rate-sheet/` — Package-owned drawer compositions, controllers, dialogs, routing tokens, and footer presentation. `drawer/tier/` also holds the registration address `tier-register:[familyId]`, which opens that same drawer before any instance exists; see [Tier System Registration](../../../../../../docs/code-map/tier-registration.md). `drawer/inclusion/` covers one Tier's use of one Rate Sheet row: it addresses `(tier_instance_id, slotId, item_id)`, resolves by stored id inside the slot's bound sheet only, and persists quantity through `usePackageStation.saveTierFeatures` — it owns no persistence of its own. `drawer/tier-rate-sheet/` holds the routing tokens for one Tier's connection to a whole sheet or to one group inside it, addressed `(tier_instance_id, slotId, rate_sheet_id[, group_id])` and committed through the Package Manager save.
- `drawer/editors/` and `drawer/schema/` — Package-owned editors, entity manifests, and bindings.
- `vocabulary.ts` — Package-owned Tier keys and labels.
- `register.ts` — registers Package navigation, destination, sources, the Tier workspace kit, and drawers (`package-family`, `package-family-create`, `tier`, `tier-inclusion`, `rate-sheet`) with Station Manager. It is imported only by `resources/ts/modules/admin-station.ts` and is never re-exported from `index.ts`.

## Boundaries

External consumers import only `index.ts`; the sole exception is a documented type-only import of `types.ts` where the public barrel would close a dependency cycle. Sibling files import `./types` / `./api` directly, never the barrel. Presentation must not call `api.ts`. Route ownership — not a Package-shaped name or URL — decides whether an endpoint belongs here. Service-scoped Package Station URLs use the Service id as navigation context only; Package Station retains persistence authority.

Host-engine contracts and helpers come from `@/station-manager`. Imports from `@/admin-station/presentation/` and `@/admin-station/shell/icons` remain legal consumption of Admin Station presentation/control capabilities. `register.ts` remains an entry-only module and must not enter the public barrel.

Read [Package Manager](../../../../../../docs/code-map/package-manager.md), [Package Home Settings](../../../../../../docs/code-map/package-settings.md), [Tiers](../../../../../../docs/code-map/tiers.md), [Tier Capability](../../../../../../docs/code-map/tier-capability.md), and [Rate Sheet](../../../../../../docs/code-map/rate-sheet.md).

## Validation

From the plugin root: `php tests/tier-capability-invariants.php`, `npm run contract:package-family-capability`, `npm run contract:package-tier-workspace`, `npm run contract:tier-instance-scope`, `npm run contract:tier-instance-tool`, `npx tsc --noEmit`, `npm run build`, and `npm run docs:check`.
