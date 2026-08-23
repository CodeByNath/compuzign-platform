---
name: compuzign-platform-architecture
description: Use before proposing, designing, or auditing any new CompuZign feature, module, field, or entity relationship — anywhere in the platform, not only Package/Tier/Rate Sheet. Classifies the new concept against the platform's identity-preserving composition law, checks whether it needs its own Platform ID family, and flags identity/ownership drift before implementation begins.
---

# CompuZign Platform Architecture

## The law

**CompuZign grows by identity-preserving composition.** An existing
Platform-identified atom keeps its own identity forever. When that atom is
combined with a new, independently-meaningful platform concept, the
*combination* gets its own new Platform ID — the original atom's identity
is never copied, replaced, or flattened into it. That new composition may
later serve as an atom inside a still-higher composition.

This is not a Package/Tier-specific rule. It is CompuZign's general growth
pattern; apply it to any subsystem.

## Before proposing anything, audit first

Do not design a new field, entity, or relationship before completing this
audit, in order:

1. **Audit existing ownership.** Which file/class already owns pricing,
   orchestration, lifecycle, projection, and identity for the area this
   touches? Read `references/domain-ownership-map.md`. Never assume a new
   layer is needed until you've confirmed no existing owner already covers it.
2. **Identify what identities already exist and must survive.** List every
   Platform ID already touching this data. Every one of them must still
   resolve, unchanged, after your change.
3. **Classify the new concept** — see the three-rung model below.
4. **If it's a composition, is a new Platform ID family actually
   justified?** Only when some other layer will need to address it
   independently later. See `references/platform-id-families.md` for the
   closed vocabulary and how to extend it (one entry in
   `PlatformIdentifierPolicy`, then wire the owning domain — the engine
   itself never branches on domain storage).
5. **Preserve identity through every write/read/projection boundary.** A
   Platform ID present in storage must still be present after every
   sanitize/extract/settle/project step between storage and the consumer
   that needs it. Trace the chain end to end; do not assume a field
   "carries through" without checking each hop.
6. **Reject position/index/label as durable ownership.** Array position,
   `sort_order`, and human-readable labels are never identity. Match by
   Platform ID or stable internal id, always.
7. **Never flatten a higher-order composition back into its source
   identity.** A Bundle, Leg, or similar composition keeps its own ID
   alongside the atom(s) it composes — never merge the two into one.
8. **Distinguish identity drift from ownership drift.** Identity drift:
   the wrong ID is exposed, dropped, or conflated (e.g. two things sharing
   a source id treated as the same object). Ownership drift: a
   parent-owned rule is derived from a child's own field instead of the
   parent's own data. Both are violations; name which one you're looking at.
9. **Reuse existing Platform Identifier infrastructure.** Never invent a
   parallel repair/migration/backfill mechanism when
   `PlatformIdentifierStation`'s reserve/claim/bind/dry-run-assign engine
   already covers the shape you need — extend its existing entity-type
   list and adapter instead.

## Three-rung classification

1. **Attribute — no identity.** Pure metadata on an existing field.
   Nothing else will ever need to address it on its own.
2. **Scoped child — real Platform ID, parent-qualified, not
   independently reusable.** It has its own ID and can be addressed, but
   only within its parent's scope (e.g. `(parent_id, child_id)`). It is
   never reused as its own unit elsewhere on the platform.
3. **Independent atom — own Platform ID family, independently
   meaningful, may participate in higher-order composition.** It can be
   referenced, composed, and reasoned about on its own, and may itself
   become one ingredient of a still-higher composition later.

Getting the rung wrong is itself the most common failure mode: minting an
ID family for something that will only ever be rung 1 or 2 is over-
identification; leaving something at rung 1 when another layer will need
to address it independently is under-identification. When unsure, check
`references/identity-composition-model.md` for the worked contrasts.

## Reject these patterns

- Replacing an upstream Platform ID with a downstream one.
- Using array position, `sort_order`, or a label as durable identity.
- A source-of-truth layer (e.g. Rate Sheet) absorbing a consumer's own
  orchestration/contract behavior.
- A variant/presentation layer (e.g. Tier Edition) standing in for a
  genuinely different composition concept (e.g. multi-cycle billing) it
  was never designed to own.
- Flattening a composition's own identity into the atom it composes, or
  vice versa.
- Suppressing or merging two independently-identified compositions merely
  because they share an underlying source id.
- Minting identity in a read/projection path — identity is written only
  at a settle/mutation boundary, never synthesized on read.
- Building a new repair/migration/backfill tool when
  `PlatformIdentifierStation`'s existing mechanism already covers the shape.
- Inventing a new layer without first completing the ownership audit above.

## Two lessons already paid for — do not relearn them

- **Shared source identity does not make two independently identified
  compositions the same object.** Two compositions claiming the same
  underlying atom is normal, not a collision; never suppress one because
  they reference the same source id.
- **Parent-owned rules must not be derived from a child's own field.** If
  a boundary/limit/policy belongs to the parent, compute it from the
  parent's own data — never infer it from whichever child happens to be
  present.

## References

- `references/identity-composition-model.md` — the three-rung ladder in
  depth, with the attribute/scoped-child/atom contrast worked through.
- `references/domain-ownership-map.md` — which files own pricing,
  orchestration, lifecycle, projection, and identity infrastructure.
- `references/platform-id-families.md` — the full closed Platform ID
  vocabulary and how to extend it.
- `references/architecture-examples.md` — nine proven repo examples of
  the law holding (and, twice, briefly not holding until fixed).
- `references/deviations-and-exceptions.md` — where the platform
  deliberately does not mint new identity, and the two real historical
  violations, with their fixes.
