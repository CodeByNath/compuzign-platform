// Station primitives — store-agnostic mechanics of the module-station pattern.
//
// These are the generic building blocks shared by every station hook
// (`useServiceStation` today; `usePackageStation` later). They operate on a
// "module container" — any object carrying `{ drafts, module_status }` — which is
// the service detail for the Service modules and, in a later phase, a package-station
// tier slot. Keeping them pure and container-shaped is what lets the Package Station
// migration reuse the exact same mechanism instead of copying it.
//
// See docs/architecture/TierModuleL5MigrationSpec-v1.md (P1).

/**
 * A module container: anything holding per-module drafts plus a module-status map.
 * `drafts` is typed as `object` (not `Record<string, unknown>`) so concrete draft
 * interfaces — which have no index signature — satisfy the constraint.
 */
export interface ModuleContainer {
  drafts:        object;
  module_status: Record<string, string>;
}

/**
 * Persist-through patch: return `container` with a single draft slot replaced and
 * `module_status` set. Pure — produces a new object structurally identical to the
 * inline `{ ...container, drafts: { ...container.drafts, [key]: value }, module_status }`
 * it replaces, so it is behaviour-preserving at every call site.
 *
 * `draftValue` is `unknown`: the mechanism is agnostic to what a module's draft is;
 * the caller supplies the endpoint-typed value (or `null` to clear the slot, e.g. revert).
 */
export function patchModuleDraft<C extends ModuleContainer>(
  container:    C,
  moduleKey:    string,
  draftValue:   unknown,
  moduleStatus: Record<string, string>,
): C {
  return {
    ...container,
    drafts:        { ...container.drafts, [moduleKey]: draftValue },
    module_status: moduleStatus,
  } as C;
}

/**
 * Nested variant: patch one module draft on one tier inside a `tiers` map, reusing
 * `patchModuleDraft` for the slot-level write. Lets `usePackageStation` patch a tier
 * slot in place without hand-rolling the same nested spread. Returns the map
 * unchanged when the tier is absent.
 */
export function patchTierModuleDraft<T extends ModuleContainer>(
  tiers:        Record<string, T>,
  tierId:       string,
  moduleKey:    string,
  draftValue:   unknown,
  moduleStatus: Record<string, string>,
): Record<string, T> {
  const slot = tiers[tierId];
  if (!slot) return tiers;
  return { ...tiers, [tierId]: patchModuleDraft(slot, moduleKey, draftValue, moduleStatus) };
}
