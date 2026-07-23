# Architecture Health Checklist — v1

**Status:** Current platform standard
**Scope:** Review gate for source, architecture, and documentation changes
**Current implementation authority:** [Code Map index](../code-map/000-README.md)

Expected answer to every question is **No**. A Yes is blocking unless the change includes an explicit, reviewed architectural decision that preserves capability, ownership, validation, and public contracts.

## Responsibility and placement

- [ ] Did a file, hook, component, controller, or utility acquire an unrelated reason to change?
- [ ] Was one cohesive operation fragmented into tiny files that obscure its flow?
- [ ] Does an oversized coordinator contain independent presentation, mutation, lifecycle, or persistence responsibilities that have coherent boundaries?
- [ ] Was code placed outside the domain or authority that owns its behaviour?
- [ ] Was code moved to a shared directory because of visual similarity rather than shared semantics and ownership?
- [ ] Does a shared directory or abstraction have fewer than two meaningful consumers?
- [ ] Did a source move omit imports, contracts/tests, Code Maps, local instructions, link checks, or applicable generated output?

## Drawer architecture

Current boundaries are:

- `resources/ts/drawer-kit/` — generic renderer and interaction primitives;
- `resources/ts/entity-drawers/<entity>/` — host-neutral entity compositions and entity-specific behaviour;
- `resources/ts/admin-station/` — Admin Station shell, surfaces, registries, and adapters; the sole admin frontend host.

- [ ] Did generic kit code acquire entity branching, endpoint calls, or persistence knowledge?
- [ ] Did entity composition move into a host shell or surface registry?
- [ ] Did `AdminStationDrawer` or another shell branch on entity instead of resolving a registration?
- [ ] Did a presentation component call an endpoint rather than an authoritative station/hook/service?
- [ ] Was a mature drawer, inline editor, notification panel, status pill, or lifecycle footer duplicated to obtain different presentation?
- [ ] Did a host fork capability instead of mounting the host-neutral composition through `EntityDrawerHostBridge`?
- [ ] Was `StepContext` imported into `drawer-kit/`, `entity-drawers/`, or Admin Station?

## Capability and abstraction

- [ ] Did a cleanup remove established actions, guards, states, confirmations, validation, or error handling?
- [ ] Did an abstraction collapse domain-specific behaviour into a lowest-common-denominator API?
- [ ] Did a generic placeholder replace an authoritative action or explicit domain rule?
- [ ] Was complexity hidden in a large parameter/configuration object or merely moved without improving dependency direction?
- [ ] Was future anticipated reuse used as the only evidence for sharing?

## Authority, identity, and lifecycle

- [ ] Did screen placement transfer source or persistence ownership?
- [ ] Did a component bypass the authoritative station, controller, repository, WordPress entity API, or lifecycle boundary?
- [ ] Was native identity parsed, stringified, numerically coerced, or replaced with display/slot identity?
- [ ] Did presentation code write lifecycle state or render raw storage vocabulary as user-facing status?
- [ ] Did module status or notification rules move out of `drawer-kit/utils/moduleStatus.tsx` or the domain-organised `drawer-kit/utils/moduleNotifications/` modules without a justified ownership change?

## Proof and documentation

- [ ] Is a new or changed element/mode missing from the applicable snapshot contract?
- [ ] Is a changed REST or persistence contract missing focused validation?
- [ ] Does current guidance link to a moved or deleted source path?
- [ ] Is source movement undocumented in the affected Code Map?
- [ ] Does a Code Map exceed 600 words or cover more than one owning subsystem?
- [ ] Is a historical architecture or Project History document being used as current path authority?
- [ ] Does the final report claim PHP, browser, integration, or runtime verification that was not performed?

## Verdict

All boxes No: the architecture check passes. Any Yes requires correction or an explicit architectural decision recorded in the appropriate current standard; Project History is created only with user approval after a qualifying milestone.
