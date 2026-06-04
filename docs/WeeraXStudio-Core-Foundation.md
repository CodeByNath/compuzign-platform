# WeeraX Studio Core Foundation

Version: 1.0
Status: Accepted — Frozen
Date: 2026-06-04

Purpose:

This document establishes the core architectural, design, and platform principles of WeeraX Studio.

It serves as the source of truth for future platform decisions, workstation development, UI systems, and client implementations.

---

# Vision

WeeraX Studio is not a website builder.

WeeraX Studio is not a CRM.

WeeraX Studio is not a generic SaaS.

WeeraX Studio is a Business Experience Platform.

Its purpose is to help service-based organisations:

* Present services
* Package services
* Run promotions
* Capture leads
* Generate quotes
* Generate proposals
* Manage operational workflows
* Support future CRM, AI, analytics and automation systems

The website is only one presentation channel.

The admin platform is the primary product.

---

# Core Architecture

WeeraX Studio follows a layered architecture.

## Water Layer (Truth Layer)

The Water Layer owns truth.

Examples:

* Services
* Inclusions
* FAQs
* Service definitions
* Service relationships
* Canonical business data

Rules:

* Truth is protected.
* Commercial decisions do not modify truth.
* Future systems must preserve truth integrity.
* Service ownership belongs here.

Examples:

Managed Endpoint Protection

* Canonical title
* Canonical description
* Canonical inclusions
* Canonical FAQs

These remain true regardless of pricing, promotions, bundles or campaigns.

---

## Surface Layer (Commercial Layer)

The Surface Layer owns presentation and commercial packaging.

Examples:

* Tier Configuration
* Promotions
* Bundles
* Campaigns
* Homepage Collections
* Future commercial products

Rules:

* Surface never modifies Water.
* Surface overlays Water.
* Surface may hide, enhance or package services.
* Surface may change pricing.
* Surface may change commercial presentation.

Surface Packages are commercial containers.

They are not service truth.

---

## Experience Layer

The Experience Layer owns customer and operator experiences.

Examples:

* Website
* Cost Builder
* Admin Workstations
* Proposal Builder
* CRM
* Analytics
* AI Workstations

Rules:

* Experience consumes Water.
* Experience consumes Surface.
* Experience never becomes the source of truth.

---

# Service First Philosophy

Everything begins with a Service.

Not pages.

Not promotions.

Not websites.

Not campaigns.

Services are the atomic business unit.

Future platform capabilities should attach to Services.

Examples:

```
Service
├─ Inclusions
├─ FAQs
├─ Pricing
├─ Promotions
├─ Bundles
├─ Campaigns
├─ Proposals
├─ CRM Opportunities
└─ Analytics
```

The Service Catalog is the centre of the platform.

---

# Commercial Overlay Philosophy

Commercial configuration should never duplicate service truth.

Instead:

```
Water Layer
+
Surface Layer
=============
Experience Output
```

Example:

Water Layer — Managed Endpoint Protection

* description
* inclusions
* FAQs

Surface Layer — Premium Promotion

* discounted pricing
* campaign messaging
* commercial presentation

Experience — Customer sees:

Managed Endpoint Protection + Premium Promotion

without modifying the underlying service.

---

# Workstation Philosophy

The admin is not a dashboard.

The admin is a workstation framework.

Future modules should inherit the same language:

* Service Catalog
* Surface Packages
* Promotions
* Requests
* CRM
* Proposal Builder
* Analytics
* AI Workstations

Users should learn one interaction language and use it everywhere.

---

# Design Philosophy

Hierarchy should come from:

1. Surface
2. Depth
3. Typography
4. Spacing
5. Radius
6. Interaction
7. Colour

Colour should communicate meaning.

Colour should not create hierarchy.

---

# Token Philosophy

No component may invent:

* Typography
* Spacing
* Radius
* Depth
* Interaction
* Colour

Everything must derive from tokens.

If a component requires a new visual pattern:

1. Update the design language.
2. Create a token.
3. Apply the token.

Never hardcode design decisions inside components.

---

# WeeraX Studio Admin Design Language

## Surface System

Single Surface Model

Use `--admin-bg` as the only background surface.

Hierarchy comes from:

* Depth
* Borders
* Typography
* Spacing

Not multiple background colours.

---

## Depth System

| Level | Use |
|---|---|
| Depth 0 | Page |
| Depth 1 | Cards, Tables, Forms |
| Depth 2 | Drawers |
| Depth 3 | Modals, Dropdowns, Popovers |

All depth is tokenized. No raw shadows.

---

## Typography System

Font: IBM Plex Sans
Grid: 4px rhythm

### Large Scale

| Role | Size / LH / Weight |
|---|---|
| Heading-L | 32 / 40 / 600 |
| Subheading-L | 24 / 32 / 400 |
| Label-L | 16 / 24 / 600 |
| Paragraph-L | 16 / 24 / 400 |
| Button-L | 16 / 24 / 600 |
| Icon-L | 24 |

### Base Scale (Default)

| Role | Size / LH / Weight |
|---|---|
| Heading-Base | 24 / 32 / 600 |
| Subheading-Base | 20 / 28 / 400 |
| Label-Base | 14 / 20 / 600 |
| Paragraph-Base | 14 / 20 / 400 |
| Button-Base | 14 / 20 / 600 |
| Icon-Base | 20 |

### Small Scale

| Role | Size / LH / Weight |
|---|---|
| Heading-S | 20 / 28 / 600 |
| Subheading-S | 16 / 24 / 400 |
| Label-S | 12 / 16 / 600 |
| Paragraph-S | 12 / 16 / 400 |
| Button-S | 12 / 16 / 600 |
| Icon-S | 16 |

### Composition Rule

Components should remain inside one scale family unless expressing intentional parent/child hierarchy.

---

## Spacing System

4px rhythm. Approved scale: 4, 8, 12, 16, 24, 32, 48, 64. No arbitrary spacing.

---

## Radius System

Single shared token: `--admin-radius: 4px`

Radius removes sharp edges. It is not a hierarchy mechanism.

Exceptions:

* `border-radius: 50%` — mathematically required circles (dots, indicators)
* `border-radius: 0` — structurally required (table header corners)

---

## Interaction System

Shared states: Default, Hover, Focus, Active, Selected, Disabled

Applies to: Buttons, Tabs, Navigation, Tables, Drawers, Workstations

---

## Button System

| Role | Purpose |
|---|---|
| Primary | Main action |
| Secondary | Supporting action |
| Danger | Destructive action |
| Disabled | Unavailable action |

No additional button styles should be invented.

---

## Table System

All tables share: Surface, Borders, Hover language, Typography, Rhythm.

---

## Drawer System

All drawers share: Surface, Depth, Typography, Rhythm, Action structure.

---

# Semantic Colour System (Phase 9)

Colours communicate meaning. Colours do not create hierarchy.

Families: Accent, Primary, Secondary, Text, Success, Warning, Danger

Each family contains: Dark, Base, Light

Future alpha variants should derive from these families. No unrelated colours should be introduced.

---

# Phase Progress

| Phase | Name | Status |
|---|---|---|
| Phase 1 | Token Foundation | ✓ Complete |
| Phase 2 | Surface Cleanup | ✓ Complete |
| Phase 3 | Depth System | ✓ Complete |
| Phase 4 | Interaction Unification | ✓ Complete |
| Phase 5 | Typography Foundation | ✓ Complete |
| Phase 6 | Radius Normalisation | ✓ Complete |
| Phase 7 | Spacing & Table Normalisation | Pending |
| Phase 8 | Component Normalisation | Pending |
| Phase 9 | Semantic Colour System | Pending |
| Phase 10 | Motion & Accessibility Standards | Pending |

---

# Long-Term Goal

Create a reusable WeeraX Studio platform foundation where:

* Every workstation feels related.
* Every future client inherits the same language.
* Architecture protects business truth.
* Commercial systems remain overlays.
* Experience layers remain consumers.
* Design decisions come from systems, not individual screens.

---

---

# Foundation Freeze Notice

Status: Accepted
Version: 1.0
Date: 2026-06-04

The WeeraX Studio Core Foundation has reached an acceptable and production-usable state.

The following areas are considered complete and frozen:

## Platform Architecture

✓ Water Layer

✓ Surface Layer

✓ Experience Layer

✓ Service-First Architecture

✓ Commercial Overlay Architecture

✓ Workstation Philosophy

## Admin Design Language

✓ Single Surface Model

✓ Single Border Language

✓ Single Radius Language (4px)

✓ Single Depth System

✓ Typography Foundation

✓ Interaction Foundation

✓ Button Hierarchy

✓ Focus Accessibility Foundation

## Documentation

✓ Core Foundation Documentation

✓ Admin Design Language Documentation

✓ Platform Principles Documentation

---

# Freeze Rules

The foundation is now frozen.

Future work should focus on:

* Product capabilities
* Workstations
* User workflows
* Platform features

The following should NOT be redesigned unless a proven platform requirement emerges:

* Architecture layers
* Token philosophy
* Surface model
* Typography foundation
* Radius foundation
* Depth foundation
* Interaction foundation

Bug fixes and small refinements remain acceptable.

Architectural redesign is out of scope unless justified by a future platform need.

---

# Current Priority

The objective now shifts from foundation work to platform development.

Future effort should focus on:

* Service Catalog evolution
* Surface Packages
* Promotions
* Bundles
* Requests
* Proposal Builder
* CRM capabilities
* Analytics capabilities
* AI Workstations

The foundation should support future work rather than become the work itself.
