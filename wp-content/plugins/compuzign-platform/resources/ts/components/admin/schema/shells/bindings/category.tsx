// Category shell bindings (Schema architecture S6).
//
// Per-module configuration of the overview archetype for the Category
// station: the owned Category Overview shell and the Assigned Services
// summary gateway (D4 — the Package Summary pattern). Everything here is
// presentation; behaviour arrives at render time through ShellBinding,
// assembled by the Category drawer step from useCategoryStation.
//
// The shared serviceOverviewShell is NOT re-declared here: the Category
// Services collection surface (v1.2) resolves it through the category
// manifest's `shells` record under the `service` key.

// Compatibility exports for Command Centre manifests and collection surfaces.
// The actual schemas live beside the host-neutral Category composition.
export {
  categoryOverviewShell,
  categoryServicesShell,
} from '@/entity-drawers/schema/bindings/category';
export type {
  CategoryOverviewShellData,
  CategoryServicesShellData,
} from '@/entity-drawers/schema/bindings/category';
