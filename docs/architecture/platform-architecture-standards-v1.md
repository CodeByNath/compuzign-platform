# CompuZign Platform — Architecture Standards v1

Status: Internal Architecture Standard
Scope: Platform-wide development guidelines
Applies to: Current and future modules, CPT ecosystems, APIs, frontend consumers, and relational data systems.

---

# 1. Core Philosophy

The platform is a relational data-driven ecosystem.

Data owns truth.
Components consume shaped data.
Relationships create ecosystems.

The architecture follows a river model:

```txt
Reservoirs
= CPTs / taxonomies / structured entities

River
= shared data layer + repositories + builders + APIs

Channels
= view models / payload shaping

Ecosystems
= frontend consumers, portals, PDFs, homepage sections, dashboards
```

Consumers must never become owners of business truth.

---

# 2. Platform Stack Standard

Every domain/module follows the same architectural flow:

```txt
CPT / Entity
→ Repository
→ Builder / View Model
→ REST API
→ Hook
→ Consumer Components
```

Example:

```txt
cz_service
→ ServiceRepository
→ PricingBuilder
→ GET /compuzign/v1/cost-builder
→ useCostBuilder()
→ Cost Builder Components
```

This is the official platform pattern.

---

# 3. Module Structure Standard

Each module is self-contained.

Standard structure:

```txt
src/Modules/[Domain]/
├── [Domain]Module.php
├── Http/
│   └── [Domain]Controller.php
├── Repositories/
│   └── [Entity]Repository.php
├── Services/
│   └── [Domain]Builder.php
├── Support/
│   ├── [Entity]Schema.php
│   └── [Entity]Parser.php
└── Templates/
```

Rules:

* Modules register themselves.
* Plugin::boot() orchestrates only.
* Business logic never lives in Plugin.php.
* Templates never query WordPress directly.

---

# 4. Repository Rules

Repositories are the only layer allowed to access WordPress data APIs.

Repositories:

* own get_posts()
* own get_post_meta()
* own wp_get_post_terms()
* own WP_Query logic
* resolve relationships

Repositories do NOT:

* shape API payloads
* apply frontend formatting
* own business ordering
* return presentation-ready structures

Repositories return:

* WP_Post
* WP_Term
* raw associative arrays
* entity-level data

---

# 5. Builder / View Model Rules

Builders shape data for consumers.

Builders:

* consume repositories
* normalize data
* apply business rules
* shape payloads
* filter inactive records
* apply ordering
* resolve defaults

Builders do NOT:

* call WordPress APIs directly
* render UI
* contain frontend logic

Every API payload must originate from a Builder.

---

# 6. REST API Standards

Every consumer receives shaped data through REST APIs.

Rules:

* all routes live under `/compuzign/v1/`
* routes registered in Controllers only
* no procedural route registration
* no direct repository access from templates/components

Pattern:

```txt
Controller
→ Builder
→ Repository
→ WordPress
```

REST APIs are the official bridge between:

* backend systems
* frontend systems
* portals
* PDFs
* future integrations

---

# 7. Frontend Consumption Rules

Frontend components are consumers only.

Components:

* receive props
* render shaped data
* manage UI state
* manage interaction state

Components must NOT:

* own business truth
* duplicate catalog data
* hardcode relational business structures
* create parallel service definitions

Hooks own data fetching.

Pattern:

```txt
api/endpoints/
→ hooks/
→ root consumer
→ child components
```

---

# 8. TypeScript Contract Rules

Every endpoint has a matching TypeScript contract.

Pattern:

```txt
resources/ts/api/types/[module].ts
```

Rules:

* no duplicated object shapes
* no inline API object typing
* no `any`
* contracts reflect Builder payloads exactly

Frontend contracts are consumers of backend contracts.

---

# 9. Relationship Architecture Standard

Relationships flow through a defined pipeline.

```txt
Entity Storage
→ Relationship Resolution
→ Builder Shaping
→ API Contract
→ Consumer Rendering
```

Example:

```txt
Case Study
→ related service IDs
→ ServiceRepository resolves services
→ CaseStudyBuilder shapes preview data
→ API returns typed relationship payload
→ component renders relationship
```

Components never resolve raw relationships.

---

# 10. Data Ownership Rules

Business truth belongs to entities.

Correct ownership:

```txt
Service
→ pricing
→ features
→ tiers
→ FAQs
→ bundles
→ billing cycles
```

Incorrect ownership:

```txt
ComparePlans.tsx owns features
FaqAccordion.tsx owns FAQs
Homepage component owns categories
```

Consumers may decorate data.
They must not redefine truth.

---

# 11. Taxonomy vs Meta Rules

Use taxonomies for:

* shared classification
* filtering
* bidirectional relationships
* queryable concepts

Use post meta for:

* entity-specific structured data
* non-query relationship detail
* pricing/configuration fields

Examples:

Correct taxonomy:

```txt
cz_service_category
cz_billing_cycle
```

Correct meta:

```txt
service pricing
tier features
SLA
notes
```

---

# 12. Relationship Standards

Preferred relationship patterns:

## A. Shared Taxonomy

Best for:

* category-based ecosystems
* bidirectional discovery

Example:

```txt
cz_service_category
attached to:
- cz_service
- cz_case_study
- cz_partner
```

---

## B. ID References in Meta

Best for:

* curated relationships
* forward references

Example:

```txt
related_service_ids: [42, 67]
```

Repositories resolve IDs.

---

## C. Term Meta

Best for:

* category enrichment
* icons
* display order
* marketing metadata

Example:

```txt
display_order
icon_key
marketing_tagline
```

---

# 13. Runtime Context Standard

PHP-to-JS runtime context flows through:

```txt
window.CompuZignConfig
```

Only.

Examples:

* API root
* nonce
* page type
* active entity slug
* feature flags
* runtime URLs

No inline PHP-generated JS logic elsewhere.

---

# 14. Session State Rules

Session state must capture enriched snapshots at selection time.

Example:

```txt
QuoteItem
→ categoryName
→ billingCycle
→ features[]
→ pricing snapshot
```

Do not rely on future re-fetching for transactional flows.

This applies to:

* quotes
* onboarding
* subscriptions
* portal actions
* PDFs

---

# 15. Platform Standards Going Forward

Future modules should follow the same ecosystem model.

Examples:

```txt
cz_case_study
→ CaseStudyRepository
→ CaseStudyBuilder
→ API
→ Homepage / Portfolio Components
```

```txt
cz_partner
→ PartnerRepository
→ PartnerBuilder
→ API
→ Partner Showcase Components
```

```txt
cz_client
→ ClientRepository
→ SubscriptionBuilder
→ Portal API
→ Client Dashboard
```

---

# 16. Anti-Patterns To Avoid

Never:

* duplicate business truth in components
* create parallel route systems
* mix procedural and OOP implementations
* hardcode catalog mirrors
* bypass builders
* bypass repositories
* place WP queries in templates
* add more isolated constants for shared business concepts

---

# 17. Current Canonical River

Current proven architecture:

```txt
cz_service
→ ServiceRepository
→ PricingBuilder
→ REST API
→ useCostBuilder()
→ Cost Builder Components
```

This is the foundation pattern for the platform.

The river already exists.

The goal of future development is:

* connect new ecosystems to the river
* avoid fragmented private wells
* keep business truth centralized
* allow consumers to evolve independently
* preserve modular fault isolation
