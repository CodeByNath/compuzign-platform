# CompuZign AI Index

## Read order

1. [AGENTS.md](../AGENTS.md)
2. `docs/ai-index.md` (this index)
3. The primary relevant [Code Map](code-map/000-README.md)
4. Authoritative source and stable `SECTION:` markers
5. Related Code Maps only when the source crosses a boundary
6. Relevant [Project History](project-history/000-README.md) only when needed

## Platform model

**Station Manager** is the shared platform pattern. Each station has two sibling surfaces:

- **Station Home** is the primary reading, browsing, monitoring, and showcase surface.
- **Station Drawer** is the single first-level editing surface. A drawer may contain tabs for a larger entity family, but drawers never nest.

Closing a drawer returns to the same Home state. Stations share this interaction pattern without sharing persistence authority.

The intended station family is Service, Package, Promotion, Subscription, Bundle, and CRM. This is a platform direction, not an implementation claim: consult the current Code Maps and source to determine which stations and capabilities exist today.

## Ownership rule

- Station placement does not transfer persistence authority.
- Service Catalogue, Package Manager, Tiers, Cost Builder, and Quote Builder retain their established authorities.
- UI composition and persistence ownership are separate concerns.
- Source code remains authoritative when documentation conflicts.

## Navigation rule

- Read only the primary Code Map first.
- Follow related maps only when implementation crosses that boundary.
- Do not scan the whole repository before using maps and source markers.
- Use Project History to understand completed architectural decisions; it is not mandatory reading for routine tasks.

## Documentation roles

- **AGENTS.md** — universal working rules.
- **docs/ai-index.md** — platform orientation and read order.
- **Code Maps** — current subsystem ownership, entry points, boundaries, and source markers.
- **Local CLAUDE.md files** — short local pointers or boundary notes only.
- **Project History** — immutable completed milestones.

## Validation rule

- Run focused validation during implementation.
- Run complete relevant validation once before completion.
- Use documented TypeScript, build, contract, Code Map link, and diff checks as applicable.
- Do not run unrelated validation merely to satisfy a generic checklist.
