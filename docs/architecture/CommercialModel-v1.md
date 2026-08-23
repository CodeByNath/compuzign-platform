# CompuZign Commercial Model (Canonical)

**Status:** Current domain standard
**Scope:** Service Catalogue supply authority and Package-owned commercial configuration

This contract freezes the ownership boundary between the source catalogue and
the commercial Package domain. It supersedes any flow that onboards individual
Service inclusions or FAQs into a Package.

## 1. Service Catalogue — source domain

The Service Catalogue owns Service Category Groups, Categories, Services,
Inclusions, FAQs, Service lifecycle and Service availability. It describes what
exists and never knows about Packages, Rate Sheets, commercial groups or Tiers.

```text
Service Category Group
└── Category
    └── Service
        ├── Inclusions
        └── FAQs
```

## 2. Package Manager — commercial domain

Package Manager consumes source entities through provider-owned supply
relationships. Service is the first source provider; Package remains capable of
bundling any registered source type.

Package Manager owns Package Families as commercial groupings of Services,
connects sources, resolves their supplied content, maintains commercial
configuration, organises Commercial Groups, and maintains Rate Sheets. It never
changes or copies catalogue identity or catalogue placement.

```text
Connected source entities
        │
        ▼
Provider resolves supplied content
        │
        ▼
Rate Sheet
```

## 3. Rate Sheet

The Rate Sheet is the Package-owned commercial catalogue. It automatically
receives every item exposed by connected sources. For a connected Service this
means its Inclusions and FAQs; the administrator does not onboard those items
individually.

Each Rate Sheet row owns Unit, Price, Quantity, commercial availability,
Commercial Group and Display Order. It retains immutable, provider-qualified
source provenance.

## 4. Commercial Groups

Commercial Groups are Package-owned option/presentation structures, distinct
from Package Families. They organise
supplied content into solutions and may contain content from multiple source
entities. They do not alter Service Category Group, Category, Package Family,
Service, or source-item identity.

Commercial Groups are reusable downstream presentation sections, not merely
Rate Sheet sorting labels.

## 5. Tiers

Tiers compose Commercial Groups and their configured Rate Sheet rows into
customer-facing offers. Tiers do not build or modify Services.

```text
Source item → Rate Sheet row → Commercial Group → Tier
```

Tier choices borrow Package grouping, ordering, pricing and availability at
read time. Source provenance and Package structure are never copied into Tier
storage.

## 5a. Commercial Legs

A Tier occupant and a Tier Edition each own their own commercial
composition over that same Rate Sheet — the Rate Sheet row remains the
atomic pricing source of truth; Commercial Legs never recompute or
duplicate it. An Edition is a vertical variant of the occupant's offer
(e.g. a different Rate Sheet binding), never a mechanism for multi-cycle
billing. Multi-cycle and time-scoped billing is expressed instead by every
Tier occupant/Edition owning a born-with Default Leg plus zero or more
Additional Legs — independent, possibly overlapping, independently
identified commercial components, each resolved from the same Rate Sheet
without altering source, supply, or Rate Sheet identity. A finite
commitment belongs to the parent Tier/Edition, never to any one Leg. See
[Commercial Legs](../code-map/commercial-legs.md).

## 6. Three simultaneous identities

1. **Source identity** — provider, catalogue placement, source entity and
   exposed item. Owned forever by the source domain.
2. **Supply identity** — the Package's durable relationship to a source entity.
   This establishes supply.
3. **Commercial identity** — stable Rate Sheet row, Commercial Group, Unit,
   Price, Quantity, availability and order. Owned by Package Manager.

The Package source and item references are provider-neutral:

```text
source relationship = provider_key + entity_type + entity_id
source item          = source relationship + item_type + item_id
```

## 7. Availability invariant

An unavailable source relationship is retained. Its known Rate Sheet rows,
commercial configuration and Tier selections remain visible, become
unavailable, and pricing fails closed. When the same source returns, the same
row identities become available again.

## Governing principle

> The Service Catalogue explains what the source is and where it belongs.
> Package Manager explains how the source's supplied content is commercially
> configured, organised and presented. Tiers compose those commercial groups
> into customer-facing offers.
