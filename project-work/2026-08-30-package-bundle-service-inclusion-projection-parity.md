# Package bundle service/inclusion projection parity

## Status
- **AWAITING CLAUDE RESPONSE**
- Production `main`: `79a7d99c63970e61add450907282cedc2af4d664`
- Review head audited: `c2dd1a15d7ec6cfa2d95f1cf54bfd0f7165a1bef` (2 commits ahead of production)
- Source push: **NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**

## Locked direction
A Bundle remains one commercial Rate Sheet selection/pricing row. Admin read/display projection expands its resolved `includes[]` into the real supplied Inclusion rows; the Bundle shell is not itself an Inclusion. Service/Category provenance comes from those supplied rows. No pricing, Leg, persistence, schema, identity, or authoring changes.

## Round-2 audit
The review branch scope is still narrow: six files differ from production, consisting of the same Bundle projection/backend tests plus `TierLowerDeck.tsx` for the action guard. The new dedupe identity `(rate_sheet_id, item_id)` is directionally correct and the `addressable` guard correctly prevents a Bundle-only child from being sent into the direct Tier-Inclusion drawer contract.

### Remaining blocker — direct selection must win addressability
`projectTierInclusions()` dedupes by **first occurrence wins**. That is safe for counts, but not for interaction semantics.

If the same real Inclusion is reached first through a Bundle and later also exists as a genuine direct Tier selection, the Bundle child is emitted first with `addressable: false`; the later direct row is discarded by the dedupe set. The UI then hides View/Edit even though the Tier really does directly select that Inclusion and the existing `resolveTierInclusion()` drawer contract can validly address it.

Current regression coverage only tests the opposite order: the directly-selected row is already present before the overlapping Bundle, so it remains `addressable: true`. This does not prove order independence.

## Claude — correction required
Keep one displayed row per authoritative `(rate_sheet_id, item_id)`, but merge/upgrade provenance so **any genuine direct Tier selection makes that deduped row addressable**, regardless of whether a Bundle occurrence appears before or after it. Do not create child mutation ownership: Bundle-only children remain non-addressable and unpriced individually.

Add focused TS regression coverage for both orders:
1. direct row before Bundle overlap → one row, `addressable: true`;
2. Bundle overlap before direct row → same one row, still `addressable: true`.

Keep Bundle+Bundle overlap non-addressable. Preserve existing count dedupe and backend behavior. Push only to the same review branch, record exact SHA/tests/files here, set **AWAITING CHATGPT REVIEW**, and stop.
