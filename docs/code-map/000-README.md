# Repository Code Map

The Code Map points to the **current implementation**: the small set of authoritative files needed to understand and safely change a subsystem. It is separate from [Project History](../project-history/000-README.md), which records completed decisions and milestones. Code maps are updated in place when code moves; completed Project History documents remain closed and immutable.

## Subsystem Index

### Admin Station platform

- [Station Manager](station-manager.md)
- [Admin Station](admin-station.md)
- [Admin Station Navigation & Resolver](admin-station-navigation.md)
- [Admin Station Surface Binding](admin-station-surface-binding.md)
- [Admin Station Drawer](admin-station-drawer.md)
- [Entity Drawer Recovery](entity-drawer-recovery.md)
- [Admin Station Home Shell](admin-station-home-shell.md)
- [Admin Station Styles](admin-station-styles.md)
- [Station Tab Set](station-tab-set.md)
- [Admin Station List System](admin-station-list-system.md)
- [Admin Station Cards](admin-station-cards.md)
- [Drawer System](drawer-system.md)

### Catalogue and commercial domains

- [Package Station](package-station.md)
- [Package Manager](package-manager.md)
- [Package Home Settings](package-settings.md)
- [Service Catalogue](service-catalogue.md)
- [Service Station](service-station.md)
- [Service Connections](service-connections.md)
- [Rate Sheet](rate-sheet.md)
- [Rate Sheet Bundle](rate-sheet-bundle.md)
- [Rate Sheet Bundle Authoring](rate-sheet-bundle-authoring.md)
- [Focused-Tier Rate Sheet Connections](tier-rate-sheet-connections.md)
- [Tiers](tiers.md)
- [Tier Occupant Lifecycle](tier-occupant-lifecycle-repair.md)
- [Tier System Registration](tier-registration.md)
- [Tier Capability Instances and Assignments](tier-capability.md)
- [Tier Add-on Selection](tier-addon.md)
- [Tier Edition](tier-edition.md)
- [Composable Tier Occupant](tier-composable-occupant.md)
- [Commercial Legs](commercial-legs.md)
- [Promotions](promotions.md)
- [Categories](categories.md)
- [Service Category Groups](category-groups.md)

### Public and shared systems

- [Platform Identifier Station](platform-identifier-station.md)
- [Homepage](homepage.md)
- [Cost Builder](cost-builder.md)
- [Package Builder Focused Shell](package-builder-focused-shell.md)
- [Plan Details](plan-details.md)
- [Quote Builder](quote-builder.md)
- [Lifecycle and Module State](lifecycle-system.md)

## How to Use and Maintain This Map

This README is the routing index; do not treat it as a substitute for a subsystem map. For a first-time task:

1. Choose the closest subsystem from the index above. If a task crosses boundaries, begin with the primary owning subsystem and follow only its necessary **Related Code Maps** links.
2. Read that subsystem map before searching or modifying source.
3. Read [Project History guidance](../project-history/000-README.md) and only relevant milestone documents when historical decisions are needed or the task is major work.
4. Open the authoritative source links from the selected map and proceed with the audit or implementation.

**Do not load every Code Map file automatically. Do not load the entire Project History directory.** If no map clearly owns the task, inspect only enough source to identify the owner, then create or correct a focused map rather than reading every map.

A source move is incomplete until imports and tests/contracts are updated, affected Code Maps and local instructions reflect the new ownership, links and paths are verified, and generated output is rebuilt when applicable. Keep each subsystem map at no more than 600 words. If a map begins to cover another distinct responsibility, create a focused map and index it exactly once rather than enlarging the existing map.

Code Map maintenance does not create a historical record. After a major implementation, also ask whether a new immutable Project History document should be created; never create one automatically or rewrite a closed history document to reflect the current layout.
