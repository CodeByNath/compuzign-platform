# Architecture Examples

Nine repo-proven applications of the law. Each names the files/commits so
they can be re-read directly rather than trusted from this summary.

## 1. Bundle dual identity

A Bundle (`CZPRCB`) composes existing Rate Sheet rows, but its own linked
commercial row still carries a full, separate `CZPRCI`/`CZPRCIO`
identity through the same reservation loop every ordinary row uses.
Neither identity replaces the other. **What would go wrong without this:**
collapsing the Bundle's own identity into its row's `CZPRCI` (or vice
versa) would make it impossible to address "this specific Bundle
combination" independently of "this specific priced row," breaking any
consumer that needs one without the other. Source: `SurfacePackages/CLAUDE.md`.

## 2. Bundle-inclusion reference identity

Each of a Bundle's `supplied_content[]` entries is its own
`CZPRCBI`-identified record naming `(source_rate_sheet_id,
source_item_id)` — a live reference, never a copy. The referenced row's
own `CZPRCI` is untouched, and the reference is pruned automatically
(`PackageManagerSchema::reconcileSuppliedContent()`) when its target
disappears. **What would go wrong without this:** copying the row instead
of referencing it would let the Bundle's view of a row drift from the
row's own live state.

## 3. Commercial Leg identity (`CZTL`/`CZTEL`)

A Tier occupant's/Edition's born-with Default Leg plus every Additional
Leg each carry a real, independent Platform ID once resolved, composing
the same underlying Rate Sheet without altering it. Commits `708e0efb`
(stable identity), `22004f4a` (add `CZTL`/`CZTEL` as real entity types),
`527d73a7` (resolver introduction). **What would go wrong without this:**
Legs would have no way to be addressed, migrated, or repaired
independently of their parent occupant/Edition.

## 4. `leg_index` → `leg_platform_id`

Inclusion `leg_assignments[]` used to address a Leg by its array position
(`leg_index`); `e357d454`/`77fae4be` replaced this with `leg_platform_id`,
matching by the Leg's own stable Platform ID regardless of array order.
Proven by `tests/tier-commercial-leg-identity.php`'s own scenario: move a
Leg from position 4 to position 2, and every other Leg must keep both its
own id and its own billing terms. **What would go wrong without this:**
reordering, inserting, or removing a Leg would silently reassign which
Leg an existing assignment pointed at.

## 5. Tier Edition's occupant-qualified identity

`CZTE`'s native reference is `(tier_instance_id, occupant_id, editionId)`
— explicitly occupant-qualified, not slot-qualified, mirroring
`tierOccupant()`'s own pattern (`platform-identifier-station.md`).
**What would go wrong without this:** an Edition's identity would break
if its parent occupant ever moved slots, since slot position is not
occupant identity either.

## 6. Cross-Leg suppression fix

`dc150a4e` removed a bucketing rule that dropped an inclusion from
Default's own resolved component whenever *any* active Additional Leg
also claimed the same `item_id` — treating a shared source atom as if it
made two independently-identified Legs the same commercial object.
Corrected: each active identity (Default included) gets its own
independent component regardless of what any other Leg claims. This is
the canonical proof of "shared source identity does not make two
compositions the same object."

## 7. Commitment-anchor ownership fix

`98e89bf7` corrected `clampCommercialLegTimelineToCommitment()`/
`checkFiniteCommitmentLegCap()`, which derived the parent Tier/Edition's
own commitment boundary as `container['from_month'] + value - 1` — but
`from_month` is structurally the *Default Leg's own* field, not a
parent-only anchor, so a Default Leg starting at month 5 silently shifted
the cap to 52 instead of 48. Fixed to `commitmentEnd = (int) $value`
alone, with zero dependency on any Leg's own field. This is the canonical
proof of "parent-owned rules must not be derived from a child's own
field" — an **ownership** violation, distinct from an identity violation.

## 8. Default Leg projection identity gap

Even after the resolver correctly emitted a Leg's real identity
(`113be1d7`), the Tier occupant's own Cost Builder extraction path
(`PackageSchema::extractTierForCostBuilder()`) had an explicit field
whitelist that simply never listed `default_leg_platform_id` — so the
identity existed in storage and in the resolver's own logic, but was
silently dropped at one specific projection boundary (`f4952a50`).
The Tier Edition path was unaffected because it never goes through a
whitelist at all. **What would go wrong without checking every hop:**
assuming "the identity exists in storage" is the same as "the identity
reaches the consumer" — it is not; every extraction/projection function
in between must be checked individually.

## 9. Platform Identifier migration reuse

When `CZTL`/`CZTEL` needed batch backfill for pre-existing records,
`a9570934` added them to the *existing*
`TemporaryMigrationController::ENTITY_TYPES` list and `adapterFor()`
match arm, reusing the already-complete `tierLeg()`/`tierEditionLeg()`
adapters (built for live Publish-time reservation) and bumping the
progress option version — rather than building a second repair mechanism.
**What would go wrong without this:** a second migration surface would
fork the reserve/claim/bind logic, doubling the maintenance burden and
risking the two mechanisms disagreeing about what "already identified"
means.
