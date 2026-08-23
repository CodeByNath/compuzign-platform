# Identity Composition Model

## The three rungs, in depth

### Rung 1 — Attribute (no identity)

Pure metadata riding an existing identified field. No Platform ID, no
`option_id`/child-id of any kind, no reservation, no adapter, no
enumeration. Nothing downstream ever needs to address it independently —
it is read as part of reading its owner.

**Proven example:** `default_price_label` on a Rate Sheet row. It names
the row's own existing `unit_price` — display-only. The codebase states
this explicitly: "not a price option: no `option_id`, no Platform ID, no
identity work of any kind" (`SurfacePackages/CLAUDE.md`). The row's own
`CZPRCI` is completely untouched by its presence.

### Rung 2 — Scoped child (real Platform ID, parent-qualified, not
independently reusable)

Has a genuine Platform ID and can be addressed — but only within its
parent's own scope, and only ever read/written alongside that parent. It
is never referenced from outside its parent, never composed into a
different parent, never appears in a "give me every X across the
platform" listing that isn't also scoped by the parent.

**Proven example:** Price Option, `CZPRCIO`. Its native reference is
`(rate_sheet_id, item_id, option_id)` — a further-qualified child of its
own row. The row's own default `unit_price`/`CZPRCI` stays completely
untouched by a Price Option's presence, and a Price Option never carries
quantity/billing-cycle/commitment/Edition meaning of its own — it borrows
all of that from the row it qualifies.

**A second proven example, at rung 2 but easy to mis-classify:** the
Bundle-inclusion reference, `CZPRCBI`/`CZPRCBIO`. It has its own Platform
ID and addresses a specific `(source_rate_sheet_id, source_item_id)`
supplied-content link — but it exists only inside its owning Bundle's own
`supplied_content[]`, is pruned automatically when its target row
disappears, and is never itself composed into anything else.

### Rung 3 — Independent atom (own Platform ID family, independently
meaningful, may participate in higher-order composition)

Addressable on its own, composable by multiple different higher-order
parents, and reasoned about independently of any one consumer. Critically:
being composed by a higher layer never requires that layer to know how
the atom itself was assembled.

**Proven example:** a Rate Sheet row (`CZPRCI`). It is priced, selected,
and referenced by `(rate_sheet_id, item_id)` from Tier occupants, Tier
Editions, and Commercial Legs alike — none of which need to know whether
the row behind that `item_id` is an ordinary row or a Bundle-backed one:
"NO consumer learns Bundles exist: Tier storage and selection stay
`{ item_id, quantity, price_option_id }`" (`SurfacePackages/CLAUDE.md`).

**Proven example, one layer up:** a Bundle (`CZPRCB`). It is itself
built from rung-3 atoms (the Rate Sheet rows it supplies), gets its own
independent identity because Tier/Edition/Cost-Builder layers need to
address "this specific combination" on its own — and its own linked
commercial row still carries a full, separate `CZPRCI`/`CZPRCIO`
identity. Two coexisting identities, neither replacing the other:
"`CZPRCB` never replaces `CZPRCI`; the two are separate, coexisting
identities."

**Proven example, two layers up:** a Commercial Leg (`CZTL`/`CZTEL`). It
composes a Tier occupant's/Edition's own Rate Sheet selections (rung-3
atoms) into an independently identified, independently priced commercial
component — while every inclusion beneath it keeps its own `item_id` →
`CZPRCI`/`CZPRCIO` identity completely untouched.

## How to tell rungs 2 and 3 apart when it's not obvious

Ask: **if a second, unrelated parent needed to reference this same thing,
could it, using the same identity, without going through the first
parent?** If yes, it's rung 3. If the concept only ever makes sense
already inside its one parent's own record, it's rung 2 — minting a
family for it anyway produces an identity nobody ever needs to look up
independently, which is pure overhead.

## Common misclassification traps

- **Treating rung 2 as rung 1** (giving something no identity when a
  sibling layer will actually need to reference it on its own later) —
  this was the Default Leg bug: the Default Leg always deserved a real
  `CZTL`/`CZTEL` (rung 3, not an attribute), but the identity was missing
  from the resolver's own emitted output and from one Cost Builder
  extraction path until both were fixed.
- **Treating rung 3 as rung 1** (assuming two things are "the same" merely
  because they share an underlying source id) — the cross-Leg suppression
  bug: two independently-identified Legs claiming the same underlying
  `item_id` were treated as a collision instead of two separate rung-3
  compositions, and one silently erased the other's contribution.
- **Promoting something to rung 3 that only ever needs rung 2** — watch
  for this when a new field feels like it "deserves" a Platform ID out of
  symmetry with a sibling, not because anything actually needs to address
  it independently.
