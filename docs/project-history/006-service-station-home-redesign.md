# Service Station Home Redesign

## Date

2026-07-15

## Scope

Admin frontend presentation for the Service Catalogue workstation, its family scope, Details / Connections / Settings collections, and focused manager-owned drawers. This milestone changed no PHP, schema, repository, REST contract, provider authority, persistence ownership, generic entity-drawer architecture, or admin navigation.

## Goal

Transform Your Service Manager from a configuration-heavy workspace into a read-first, browse-first Station Home while preserving the corrected Station Manager architecture: Home remains mounted as the operational dashboard, one selected entity opens in one first-level drawer, and Service-owned and Package-owned state continue through their existing authorities.

## What Changed

- The workstation gained stronger Service Station identity, an operational subtitle, a successful-load freshness indicator, and aligned New Service / New Group actions.
- Four read-only summary cards now show Connected Services, Active Connections, Commercial Groups, and Rate Sheet Rows. They consume the same draft-preferred Package section projections used by the collections and introduce no persisted metrics.
- Primary Package Category Group scopes gained stronger identity, description, status, saved metrics, spacing, and selection treatment. All Groups and Ungrouped became compact utility scopes while remaining first-class filters.
- Details became a modern Services collection with search, compact Category and Status filters, readable identity, Service Category, lifecycle status, derived connection count/health, and explicit View / Edit actions.
- `PackageServicesTable` no longer fetches the Service catalogue independently. `ServiceCatalogWorkstation` passes its already-loaded summaries into `DynamicStationManager` and the collection.
- Service connection counts and health are aggregated from the existing relationship projection and its read-only `sourceServiceId` provenance. No duplicate projection or persisted health field was added.
- Package Category Group assignment moved out of the primary Service row. A focused family-assignment drawer applies changes to the mounted Package manager draft; Station Home Save remains the persistence action.
- Connections adopted the same browse-first collection system while retaining source, group, state, availability, health, filtering, and its focused Edit drawer.
- Settings gained clearer Commercial Group cards and Rate Sheet presentation. Full Rate Sheet setup moved from an inline Home editor into one wide first-level drawer that reuses `PackageRateSheetEditor`. Apply validates through the existing Package provider and updates the mounted draft; Cancel clears preview state. Individual Rate Sheet rows retain focused drawers.
- Responsive behavior now moves summary cards from four columns to two to one, converts dense collections into labelled cards at tablet widths, and keeps family scopes, tabs, filters, actions, and drawers usable on narrow screens.
- Touched Station Home surfaces now use `var(--admin-radius-base)` and `var(--admin-border-blue)` for structural radius and border treatment. Circular operational indicators remain intentionally circular.

## Final Architecture

`ServiceCatalogWorkstation` owns Station Home identity and the loaded catalogue. `DynamicStationManager` owns presentation scope and memoizes the draft-preferred Package section projections shared by metrics and collections. The canonical Service View/Edit route still opens `ServiceViewStep`, which loads and saves through `useServiceStation`.

Package-owned family assignment, connections, Commercial Groups, Rate Sheet rows, and Rate Sheet setup use focused ActionShell drawers. Their Apply actions patch the mounted Package provider draft; the page-level manager Save performs the existing atomic persistence operation. The Home stays mounted behind ActionShell, retaining family scope, active tab, filters, and scroll context.

## Decisions and Invariants

- Station Home is read-first; editing occurs in one first-level drawer.
- Drawers never nest and no full manager renders inside a drawer.
- Service View/Edit remains Service-owned; family and commercial changes remain Package-owned.
- Summary metrics and health are derived presentation only.
- Existing projections and catalogue requests are reused rather than duplicated.
- All Groups and Ungrouped remain reachable scopes.
- No Tier cards or Package Station presentation moved onto Service Home.
- The existing dark admin design system remains authoritative.

## Validation

The milestone was delivered in four commits:

- `7d35071` — `feat: strengthen service station home hierarchy`
- `7a065dd` — `feat: modernize service details collection`
- `2581127` — `feat: refine service connections and settings`
- `aec95f7` — `style: polish service station responsiveness and tokens`

Each phase passed `tsc --noEmit`, a production Vite build, and `git diff --check`. Final validation also passed the manager-coordinator, Package relation-provider, active-Package read-only-provider, and tier-pricing-parity contracts; Service Catalogue Code Map link resolution and the 600-word limit; focused token and responsive-structure audits; and a clean working-tree review. The local environment has no WordPress runtime, so visual verification was structural/static rather than a hosted browser review. No push occurred.

## Deferred Work

- The generic dynamic-drawer proposal remains separate. Category/group-driven arbitrary module composition and changes to the generic drawer tab contract require explicit architectural approval.
- Migration from sidebar station navigation to the planned top station navigation remains deferred.
- Runtime visual review remains for the hosted WordPress environment.

## Related History

- [Your Service Manager — Dashboard and Drawer Architecture Correction](005-your-service-manager-correction.md)
- [Family-First Workspace](003-family-first-workspace.md)
- [Workspace Tab and Section Consolidation](004-workspace-tab-consolidation.md)
