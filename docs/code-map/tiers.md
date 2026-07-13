# Tiers

## Purpose

Manages the fixed Package Station tier occupants, including overview content, pricing, inclusions, FAQs, enabled state, and archive/bin transitions.

## Ownership

Each tier occupant owns its module drafts and lifecycle inside the Package Station. The station owns the fixed tier slots and bin. Service catalogue records can supply pricing inputs, but do not own package-tier configuration.

## Main Entry Points

### [ServiceTierStep.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/workstations/ServiceTierStep.tsx)

Contains Package overview cards and pricing table, current/bin tabs, individual Tier Details/Connections drawer, overview/features/FAQ editors, publish and lifecycle buttons, restore conflicts, and confirmation dialogs. Use this file when changing Tier cards, drawers, summaries, navigation, or lifecycle actions.

- [PackageManagerTierCards.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/relations/PackageManagerTierCards.tsx) renders compact fixed-slot cards and View/Edit actions inside Station Manager. Use it for manager-level Tier summaries.
- [tier.ts](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/entities/tier.ts) declares Tier drawer tabs and module placements. Use it when moving schema-rendered Tier modules.

## UI and Drawers

- [TierOverviewEditor.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/editors/TierOverviewEditor.tsx) edits label, audience, price/contact mode, billing cycle, and popular treatment. Use it for Tier overview form fields.
- [tier.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/schema/shells/bindings/tier.tsx) defines Tier shell data and overview/features/FAQ editor bindings. Use it for schema-rendered Tier content.
- [BinWorkstation.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/admin/workstations/BinWorkstation.tsx) provides broader archived/trashed entity tables; Package occupant bin handling remains in `ServiceTierStep`.

## State and Providers

- [usePackageStation.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/usePackageStation.ts) owns station loading and Tier draft, settle, enable, popular, pool, archive, restore, trash, and delete mutations. Use it for Tier client state or API actions.
- [evaluateTierPricing.ts](../../wp-content/plugins/compuzign-platform/resources/ts/modules/packages/evaluateTierPricing.ts) derives Tier line totals and pricing issues. Use it for Rate Sheet pricing rules.

## Runtime Flow

`ServiceTierStep` is the Package overview and individual Tier drawer composition root. In overview mode it renders current tier cards, pricing summaries, the parent-Service connection, and archived/trashed bin occupants. It owns restore conflict handling (swap, retarget, or discard pending drafts), trash and permanent-delete confirmations, and context-aware Back/footer behavior.

In individual-tier mode it binds overview, features, FAQs, and Service connection shells; owns transient per-module edit sessions; creates pool items; and invokes `usePackageStation` for save, revert, settle/publish, enable/disable, popular-tier, archive, restore, trash, and delete operations. This is an oversized mixed-responsibility file and a future separation candidate; the hook remains the state/API boundary.

## Backend and Persistence

- [PackageSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/SurfacePackages/Support/PackageSchema.php) defines current Package/Tier defaults, sanitization, projections, and occupant compatibility. Use it for authoritative station schema behavior.
- [PackageStationSchema.php](../../wp-content/plugins/compuzign-platform/src/Modules/Packages/Support/PackageStationSchema.php) preserves legacy Service-hosted station compatibility. Use it only when tracing migration-era data behavior.
- [AdminServicesController.php](../../wp-content/plugins/compuzign-platform/src/Modules/Admin/Http/AdminServicesController.php) registers Tier module, enabled, popular, bin, pool, and settle routes. Use it for backend Tier actions.

## Validation

- [tier-occupant-compatibility.php](../../wp-content/plugins/compuzign-platform/tests/tier-occupant-compatibility.php)
- [package-manager-schema.php](../../wp-content/plugins/compuzign-platform/tests/package-manager-schema.php)

## Related Code Maps

[Package Manager](package-manager.md), [Rate Sheet](rate-sheet.md), and [Lifecycle](lifecycle-system.md).
