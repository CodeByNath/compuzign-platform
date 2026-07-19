# CompuZign Platform — Architecture Standards v1

**Status:** Current platform standard
**Scope:** Stable backend, frontend, ownership, contract, and runtime constraints
**Working standard:** [AGENTS.md](../../AGENTS.md)
**Current source navigation:** [Code Map index](../code-map/000-README.md)

## 1. Authority before pattern

CompuZign is a relational, data-driven platform. Business truth belongs to its owning entity or domain; consumers receive shaped data and do not become authorities because they display or edit it.

There is no mandatory one-size-fits-all repository/builder pipeline. Use the smallest cohesive path that preserves the real authority:

```text
WordPress entity/meta → domain controller/service → typed endpoint → station hook → consumer
PackageRepository option → domain controller/builder → typed endpoint → station hook → consumer
WordPress catalogue → repository → PricingBuilder → typed endpoint → public consumer
```

A repository is appropriate when it owns meaningful querying, storage, migration, or projection behaviour. It must not be introduced merely to wrap a single WordPress call. Controllers may coordinate WordPress entity APIs when that is the established cohesive domain boundary.

## 2. Backend domains

Backend modules live under `src/Modules/<Domain>/` and register through their module boundary. `Core/Plugin.php` orchestrates module boot; it does not acquire domain business logic.

- Controllers own route registration, permissions, request validation, orchestration, and response contracts.
- Support classes own cohesive schemas, sanitization, readiness, lifecycle, or shared rules.
- Repositories own meaningful storage/query/migration authority where the domain has one.
- Services/builders own non-trivial projection or business assembly.
- Templates render mount surfaces and must not become query or business-rule authorities.

Route location does not determine domain ownership. Compatibility URLs may retain another domain's navigation context while handlers and persistence stay with the true owner.

## 3. Persistence and relationships

Use WordPress posts, terms, taxonomy relationships, metadata, and options according to the established subsystem authority. Do not introduce parallel storage or copy data merely for convenient UI access.

- Taxonomies suit shared classification, queryable relationships, and term enrichment.
- Entity meta suits entity-owned structured state.
- Options/repositories suit Package Station's established aggregate persistence.
- References across domains must write through the owning public contract.

Registration is not ownership: centralized post-type or taxonomy registrars may declare an entity while its domain module owns behaviour. A nested REST path is likewise not ownership.

## 4. REST and TypeScript contracts

Routes live under the existing `/compuzign/v1/` namespace and are registered by controllers. Preserve capability checks, validation, response shapes, and compatibility paths.

Every consumed response and mutation payload must have an accurate TypeScript contract. Keep a contract with its owning frontend station or neutral API type module; do not duplicate shapes or re-export them from unrelated legacy barrels. `any`, inline response guesses, and identity coercion are contract failures.

## 5. Frontend ownership

Hooks, stations, and domain services own fetch/mutation state. Presentation components receive data and intents; they do not call endpoints, persist lifecycle, or duplicate business truth.

Screen placement and source ownership are separate:

- `resources/ts/drawer-kit/` owns generic schema rendering, editor chrome, status/notification presentation, actions, and host bridges.
- `resources/ts/entity-drawers/<entity>/` owns host-neutral entity drawer composition and entity-specific coordination.
- `resources/ts/admin-station/` owns Admin Station navigation, surfaces, registries, shell adapters, and its one drawer shell.
- `resources/ts/components/admin/` owns Command Centre routing/hosts and any domain UI that has not moved to a neutral owner.

Package Family, Category, Service, and Tier compositions mount in both hosts. Neither host may fork a reduced copy. Generic shells must not branch on entity; registries select entity adapters, and adapters preserve native record identity.

## 6. Shared systems

Shared code requires at least two genuine consumers, the same semantic responsibility, stable common behaviour, and no domain-authority leakage. Visual similarity and anticipated reuse do not qualify.

Keep domain notification rules in the domain-organised `drawer-kit/utils/moduleNotifications/` modules behind their barrel. Keep cross-domain presentation status in `drawer-kit/utils/moduleStatus.tsx`. A shared renderer derives or displays state; it never persists it.

Do not duplicate the mature drawer kit, station lifecycle, typed transport, relation provider, status pill, notification panel, inline editor, or lifecycle footer systems to obtain a different appearance. Extend them without capability loss when semantics are genuinely shared; keep behaviour local otherwise.

## 7. Runtime and shell boundary

The WordPress theme is a passive compatibility, lifecycle, and routing surface. The platform plugin owns application UI, Atomic Engine styles, runtime configuration, state, REST behaviour, requests, pricing, and operational systems.

```text
WordPress route → shell template → content/shortcode mount → platform runtime → module
```

Runtime configuration flows through `window.CompuZignConfig`. Required CSS must be registered early enough for the page lifecycle; shortcode execution must not be assumed to place styles in an already-rendered `<head>`.

## 8. Change standard

Preserve capability, validation, authority, native identity, dependency direction, runtime safety, and public contracts together. Line count, fewer files, generic reuse, or delivery speed is never a sufficient reason to compromise them.

Before replacing UI or infrastructure, inventory established actions, states, guards, error handling, persistence, and downstream contracts. After ownership or paths move, update imports, contracts/tests, Code Maps, local instructions, links, and applicable generated output. Validate only what was actually run and report missing PHP or browser runtime honestly.
