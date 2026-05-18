# CompuZign Platform — Phase 1 Architecture & Delivery Freeze

## Document Purpose

This document records the current CompuZign platform architecture, what has already been built, what the system is evolving toward, what is frozen for Phase 1 delivery, and what should be executed later.

The goal is to prevent architecture drift, repeated decision-making, and unnecessary refactoring while the project moves into delivery mode.

---

# 1. Current Project Status

CompuZign has moved beyond prototype stage.

The project now has a working backend architecture, a modular frontend runtime, live REST API integration, reusable frontend modules, and shortcode-mounted application sections.

The platform is now entering:

```txt
Phase 1 Architecture Freeze
```

This means the foundation is considered stable enough for delivery work. The focus now shifts from architecture invention to product polish, usability, visual consistency, and demo readiness.

---

# 2. What We Built

## 2.1 Modular API-Driven Frontend Runtime

A lightweight frontend runtime architecture that separates backend business logic from frontend rendering and interaction layers.

The backend owns data, API routes, admin logic, structured content, and service records.

The frontend owns rendering, interaction, state, user experience, and application behaviour.

---

## 2.2 Headless-Compatible CMS Architecture

The backend acts primarily as:

* CMS/admin layer
* business data layer
* REST API platform
* plugin runtime
* service catalog management layer
* importer/management system

The frontend operates as an independent application layer mounted into controlled frontend regions.

This is not a traditional theme-rendered frontend architecture.

---

## 2.3 Component-Based Frontend System

A reusable component architecture has been introduced for modular UI sections, application modules, and composable interface patterns.

Current examples include:

* homepage hero module
* stats/numbers module
* services overview module
* CTA band module
* Cost Builder application module
* reusable UI wrappers
* pricing/tier components
* quote summary component

---

## 2.4 Dynamic Module Rendering System

Frontend sections are rendered dynamically through registered modules and controlled mount points rather than tightly coupled PHP-rendered templates.

Current Phase 1 mounting is shortcode-based.

Example:

```txt
[compuzign_hero]
[compuzign_stats]
[compuzign_services_overview]
[compuzign_cta_band]
[compuzign_cost_builder]
```

These shortcodes output mount points. The frontend runtime mounts the correct Preact module into each mount point.

Shortcodes are currently being used as controlled runtime markers, not as the final long-term template strategy.

---

## 2.5 Runtime Configuration Layer

A centralized runtime configuration system exposes the required frontend configuration before module scripts execute.

Current runtime config includes:

* API root URL
* REST nonce
* contact URL
* Cost Builder URL

This keeps runtime config separate from bundled frontend code and avoids script-ordering issues.

---

## 2.6 Typed REST Integration Layer

A strongly typed API communication layer connects frontend modules to backend business data through structured response contracts.

The frontend does not call random fetch requests throughout components. API access is centralized through typed endpoint functions and reusable hooks.

This improves maintainability, future API changes, and developer onboarding.

---

## 2.7 Design Token & Atomic UI System

Atomic Engine acts as the design-system source of truth.

It contains:

* design tokens
* resets
* base typography
* layout primitives
* button styles
* card styles
* form styles
* tab styles
* modal styles
* utilities

Frontend components should use Atomic Engine classes rather than inventing isolated styling systems.

---

## 2.8 Lightweight Application Runtime

The frontend runtime can mount and manage multiple independent frontend modules on the same page.

This allows the platform to grow from individual sections into larger application experiences without replacing the architecture.

---

## 2.9 Shared Module Bundle Architecture

The frontend build uses module-based loading and shared runtime chunks.

This allows homepage modules and application modules to share common runtime code without duplicating dependencies.

The result is a small, efficient frontend payload suitable for WordPress-hosted environments.

---

## 2.10 Progressive Frontend Migration Strategy

The current architecture allows legacy frontend systems, temporary Elementor layouts, and modern runtime modules to coexist during migration.

Elementor is currently treated as a temporary page/layout shell.

The long-term frontend should move toward Atomic Engine + runtime modules + controlled templates.

---

# 3. What We Are Building Toward

## 3.1 Frontend Application Platform

A scalable frontend platform capable of powering:

* service portals
* onboarding systems
* dashboard interfaces
* quote workflows
* pricing comparison systems
* transactional flows
* client-facing business applications

---

## 3.2 Dynamic Template Runtime

A future runtime-driven frontend rendering system where templates, modules, and layouts are selected dynamically through contextual conditions.

Examples:

* homepage template
* single service template
* service archive template
* search template
* 404 template
* onboarding template
* quote workflow template

This is not required for Phase 1 delivery.

---

## 3.3 Reusable Business Module Ecosystem

A library of reusable frontend modules for:

* pricing systems
* service catalogs
* onboarding flows
* dashboards
* forms
* navigation systems
* quote summaries
* client interactions
* CTA sections
* comparison tables

---

## 3.4 Application-Oriented CMS Layer

The backend should continue evolving toward structured data, APIs, workflows, permissions, and operational management rather than traditional page rendering.

The backend should not become responsible for frontend application UI.

---

## 3.5 Developer-First Runtime Architecture

The platform remains code-first, modular, and developer-controlled.

The goal is not to clone a visual page builder.

The goal is to take the strongest architectural ideas from modern builders:

* reusable modules
* dynamic components
* template/display conditions
* frontend-rendered layouts

while avoiding drag-and-drop complexity during Phase 1.

---

## 3.6 Future Content & Layout Management Layer

Later, business users may be able to edit content, configuration, module settings, and selected page content without touching code.

This should come after the runtime and module system are stable.

---

## 3.7 Portable Frontend Infrastructure

The frontend should remain portable enough to move beyond WordPress if needed.

The architecture should avoid deep coupling between frontend rendering and PHP templates.

---

## 3.8 Scalable Multi-Module Runtime

The frontend runtime should support multiple independently mounted modules within a unified experience.

Examples:

* homepage modules
* quote builder
* pricing comparison
* onboarding flow
* service portal
* client dashboard

---

## 3.9 Enterprise Service Experience Platform

The long-term product direction is an enterprise-style frontend system for:

* complex service presentation
* pricing comparison
* quote generation
* onboarding workflows
* client handling
* operational interaction systems

---

## 3.10 Runtime-Composed Interface Architecture

The long-term rendering model is composed from reusable modules, templates, and layout primitives rather than static page templates.

---

# 4. Current Phase 1 Freeze Decision

## 4.1 Freeze Statement

The current runtime architecture is approved and frozen for Phase 1 delivery.

No major architecture changes should be made before the Phase 1 presentation/demo version is complete.

---

## 4.2 Why We Are Freezing Architecture

The project already has enough foundation to deliver a working product experience.

Further architectural expansion now would create risk, delay, and instability.

Phase 1 success depends on polish, clarity, responsiveness, interaction quality, and presentation value — not more framework work.

The current architecture already supports:

* modular frontend rendering
* REST-driven data
* reusable components
* homepage sections
* Cost Builder application module
* runtime config
* shortcode-controlled mounting
* future module expansion

That is enough for Phase 1.

---

# 5. What Is Allowed During Phase 1 Freeze

Proceed only with work that improves delivery quality without changing the foundation.

Allowed work:

* safe cleanup tasks
* UX polish
* homepage refinement
* Cost Builder refinement
* responsive fixes
* visual consistency
* interaction improvements
* copy refinement
* button/CTA consistency
* mobile polish
* accessibility improvements
* demo preparation
* minor bug fixes
* shortcode placement/testing
* frontend module styling
* build verification

---

# 6. What Is Not Allowed During Phase 1 Freeze

Do not perform work that expands or destabilizes architecture.

Do not:

* redesign the frontend runtime
* refactor the importer
* rewrite the procedural bridge
* expand runtime abstractions
* introduce new frameworks
* add visual builder systems
* build editor/admin UI
* build developer builder UI
* implement full template condition routing
* add global state libraries
* add router libraries
* change REST response contracts unnecessarily
* move large backend systems
* replace the current boot chain
* rewrite Atomic Engine
* remove Elementor prematurely

---

# 7. Phase Plan

## Phase 1 — Delivery Version

### Goal

Deliver a polished, working product/demo version of the homepage modules and Cost Builder page.

### Focus

* homepage module presentation
* Cost Builder UX
* quote selection flow
* responsive behaviour
* CTA flow
* visual consistency
* Atomic Engine styling consistency
* demo readiness

### Execute Now

This is the active phase.

### Completion Criteria

Phase 1 is ready when:

* homepage modules render correctly
* Cost Builder renders live REST data
* quote selection works
* quote summary/sidebar works
* mobile layout is acceptable
* visual style is consistent
* no major console/runtime errors
* build passes cleanly
* client/demo flow can be shown confidently

---

## Phase 1.1 — Safe Cleanup

### Goal

Remove low-risk confusion without changing behaviour.

### Safe Tasks

* delete confirmed dead `app/core/*` files
* remove debug `error_log()` calls from dead procedural files
* add `compuzign-core` to module script handling if needed
* clean `.DS_Store` files
* update `.gitignore`
* document active vs legacy paths

### Execute

During Phase 1 only if time allows and changes are small.

If any cleanup causes uncertainty, defer it.

---

## Phase 2 — Post-Delivery Architecture Consolidation

### Goal

Reduce transitional technical debt after Phase 1 is presented or shipped.

### Tasks

* consolidate importer architecture
* move importer logic into proper service classes
* remove procedural importer bridge when safe
* finalize meta schema migration
* remove dead procedural REST/pricing files
* resolve duplicated normalization logic
* decide final `dist/` and `vendor/` version-control policy
* optimize Atomic Engine bundling
* resolve runtime config type duplication

### Execute

Only after Phase 1 delivery is stable.

---

## Phase 3 — Dynamic Template Runtime

### Goal

Move beyond shortcode-only mounting toward condition-based template/module rendering.

### Tasks

* implement page conditions
* implement single post/service conditions
* implement archive conditions
* implement search and 404 conditions
* inject page context into runtime config
* define template registry
* create template-level module composition

### Execute

After Phase 1 and Phase 2 cleanup.

Do not start this before the current product experience is stable.

---

## Phase 4 — Content & Module Management Layer

### Goal

Allow business users to manage content and module-level configuration without touching code.

### Possible Tasks

* admin UI for module settings
* content controls for homepage modules
* editable CTA text
* editable stats
* editable service highlights
* display controls
* module visibility settings

### Execute

After dynamic template runtime is stable.

---

## Phase 5 — Developer Builder Layer

### Goal

Create a developer-facing structure editor or app-building interface for future projects.

### Important Note

This is not Phase 1.

This should remain separate from the immediate CompuZign delivery path.

### Execute

Only after the runtime, modules, templates, and content management layer are proven.

---

# 8. Current Technical Debt Register

## 8.1 Transitional Procedural Bridge

The OOP architecture currently bridges into procedural importer/meta logic.

This is acceptable for Phase 1.

Do not refactor the importer before delivery.

Reason:

* importer works
* XLSX parsing is fragile
* changing it now risks breaking validated behaviour

Execute cleanup after Phase 1.

---

## 8.2 Dead Procedural Files

Some legacy procedural files are confirmed dead and not in the active boot path.

They should be removed later or safely before delivery if there is time.

Do not delete the entire `app/` folder because active PHP mount templates still live there.

---

## 8.3 Runtime Conditions Are Stubbed

Shortcode mounting works now.

Page/archive/single conditions are typed but not implemented.

This is intentional.

Do not expand condition logic before Phase 1 delivery.

---

## 8.4 Atomic Engine CSS Bundling

Atomic Engine currently loads multiple CSS files.

This is acceptable during Phase 1.

Later, compile Atomic Engine into a single optimized build output.

---

## 8.5 Built Asset Version-Control Policy

`dist/` and `vendor/` policy should be finalized after deployment workflow is stable.

For Phase 1, do not let repo hygiene work disrupt delivery.

---

# 9. Architecture Freeze Boundaries

Do not change these before Phase 1 delivery:

* plugin boot order
* shortcode mount IDs
* runtime config object shape
* REST route names
* Cost Builder response shape
* Vite entry point names
* registry API
* Atomic Engine design-system role
* current frontend/backend boundary
* current importer bridge

---

# 10. Next Immediate Steps

## 10.1 Product Polish

* improve module visual quality
* refine Cost Builder card hierarchy
* improve pricing tier layout
* improve quote sidebar presentation
* refine homepage copy
* tighten mobile responsiveness
* improve CTA clarity

---

## 10.2 Validation

Browser checks:

```js
window.CompuZignConfig
```

Expected:

```js
{
  apiRoot: "...",
  nonce: "...",
  contactUrl: "...",
  costBuilderUrl: "..."
}
```

Mount checks:

```js
document.getElementById('compuzign-hero')
document.getElementById('compuzign-cost-builder')
```

Network checks:

* homepage bundle loads
* cost-builder bundle loads
* shared runtime chunk loads
* REST API returns service data
* no module-loading errors

---

## 10.3 Recommended Test Shortcodes

Use this stack on a test page:

```txt
[compuzign_hero]

[compuzign_stats]

[compuzign_services_overview]

[compuzign_cost_builder]

[compuzign_cta_band]
```

---

# 11. Final Direction

The project should now move from architecture mode into delivery mode.

The platform foundation is strong enough.

Current priority:

```txt
Polished Phase 1 product experience
```

Not:

```txt
More architecture expansion
```

After Phase 1 delivery, return to cleanup and consolidation with less risk.

---

# 12. Active Execution Queue

## Active Now (Phase 1 Delivery)

- homepage UX polish
- Cost Builder refinement
- responsive improvements
- CTA flow refinement
- visual consistency
- module styling polish
- quote sidebar improvements
- demo readiness
- browser/runtime validation

---

## Deferred Until After Phase 1

- importer refactor
- procedural bridge removal
- dynamic template runtime
- page/archive/single conditions
- builder/editor UI
- Atomic Engine bundling optimization
- dist/vendor deployment policy cleanup
- MetaSchema consolidation
- advanced runtime abstraction expansion

---

## Frozen Areas

Do not modify before delivery:

- runtime registry API
- REST response contracts
- shortcode mount IDs
- boot sequence
- Vite entry structure
- runtime config contract