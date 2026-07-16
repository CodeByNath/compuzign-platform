# Tiers

## Purpose

Manages the fixed Package Station tier occupants, including overview content, pricing, inclusions, FAQs, enabled state, and archive/bin transitions.

## Ownership

Each tier occupant owns its module drafts and lifecycle inside the Package Station. The station owns the fixed tier slots and bin. Service catalogue records can supply pricing inputs, but do not own package-tier configuration.

## Main Entry Points

### [ServiceTierStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/ServiceTierStep.tsx)

Contains the dynamic settled-occupant overview cards and pricing table, current/bin tabs, individual Tier Details/Connections drawer, overview/features/FAQ editors, publish and lifecycle buttons, restore conflicts, and confirmation dialogs. The Admin card grid loops over the occupant collection derived from `station.tiers`, excludes empty shells, and uses `occupant_id` for card/drawer identity. The resolved `slotId` remains the mutation address. Use this file when changing Tier cards, drawers, summaries, navigation, or lifecycle actions.

- [PackageManagerTierCards.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageManagerTierCards.tsx) renders compact cards for the station's settled occupant collection and hands both `occupantId` and `slotId` to View/Edit actions inside Station Manager. Empty shells are omitted.
- [tier.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/entities/tier.ts) declares Tier drawer tabs and module placements. Use it when moving schema-rendered Tier modules.

## UI and Drawers

- [TierOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/TierOverviewEditor.tsx) edits label, audience, price/contact mode, billing cycle, and popular treatment. Use it for Tier overview form fields.
- [tier.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/shells/bindings/tier.tsx) defines Tier shell data and overview/features/FAQ editor bindings. Use it for schema-rendered Tier content.
- [BinStation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/stations/BinStation.tsx) provides broader archived/trashed entity tables; Package occupant bin handling remains in `ServiceTierStep`.

## State and Providers

- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageStation.ts) owns station loading and Tier draft, settle, enable, popular, pool, archive, restore, trash, and delete mutations. Use it for Tier client state or API actions.
- [tierOccupants.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/utils/tierOccupants.ts) projects fixed internal shells into the dynamic Admin occupant collection and resolves stable occupant IDs back to slot IDs.
- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/modules/packages/evaluateTierPricing.ts) derives Tier line totals and pricing issues. Use it for Rate Sheet pricing rules.

## Internal File Navigation

| Concern | Marker | Contains | Read when... |
| --- | --- | --- | --- |
| Drawer state | `SECTION: TIER_DRAWER_STATE` | Identity, drafts, tabs, guards | Changing Tier state |
| Lifecycle | `SECTION: TIER_LIFECYCLE` | Publish, status, popular, bin | Changing Tier actions |
| Editors | `SECTION: TIER_MODULE_EDITORS` | Overview, inclusions, FAQs | Changing authoring |
| Bindings | `SECTION: TIER_MODULE_BINDINGS` | Tier/Package/Service shells | Changing module data |
| Render | `SECTION: TIER_DRAWER_RENDER` | Overview, detail, bin, dialogs | Changing Tier UI |
| Tier schema | `SECTION: TIER_OCCUPANTS` | Slot normalization and projection | Changing occupant shape |
| Tier lifecycle | `SECTION: TIER_LIFECYCLE` | Drafts, status, settling | Changing schema transitions |
| Occupant bin | `SECTION: OCCUPANT_BIN` | Archive/restore/trash/delete | Changing bin behavior |
| Tier backend | `SECTION: PACKAGE_STATION` | Matching routes and handlers | Changing Tier REST behavior |

## Runtime Flow

`ServiceTierStep` composes Package overview, Tier detail, and occupant-bin views. Cards use stable `occupant_id`; mutations resolve it to the fixed `slotId`. Persistence remains in `usePackageStation` and backend boundaries.

## Backend and Persistence

- [PackageSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) defines current Package/Tier defaults, sanitization, projections, and occupant compatibility. Its normalized Tier detail exposes the existing `current_occupant.id` as `occupant_id` without changing persistence. Use it for authoritative station schema behavior.
- [PackageStationSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/Packages/Support/PackageStationSchema.php) preserves legacy Service-hosted station compatibility. Use it only when tracing migration-era data behavior.
- [PackageStationController.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Http/PackageStationController.php) registers Tier module, enabled, popular, bin, and settle routes. Use it for backend Tier actions. Tier saves carrying `new_inclusions`/`new_faqs` write through [ServicePools.php](../../wp-content/plugins/compuzign-platform/src/Modules/Service/Support/ServicePools.php), because those pools are Service-owned.

## Validation

- [tier-occupant-compatibility.php](../../wp-content/plugins/compuzign-platform/tests/tier-occupant-compatibility.php)
- [tier-occupant-admin-contract.ts](../../wp-content/plugins/compuzign-platform/scripts/tier-occupant-admin-contract.ts)
- [package-manager-schema.php](../../wp-content/plugins/compuzign-platform/tests/package-manager-schema.php)

## Related Code Maps

[Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), and [Lifecycle](lifecycle-system.md).
