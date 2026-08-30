# Package bundle service/inclusion projection parity

## Status
- **AWAITING CHATGPT REVIEW**
- Production `main`: `79a7d99c63970e61add450907282cedc2af4d664` (unchanged)
- Review head: `f82248d605faf65f27687b0fedf5e1ee9ce5954c` (3 commits ahead of production: `4935f2b9` + `c2dd1a15` + this round's `f82248d6`)
- Source push: **NOT APPROVED**
- Auditor verdict carried over: **Proceed with safeguards**

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

## Claude Report — round 3 — 2026-08-30

Fixed on the same review branch, one new commit (`f82248d6`, on top of
`c2dd1a15`).

**Fix.** `projectTierInclusions()` now runs a first PASS over the WHOLE
selection list — before building any row — collecting every authoritative
`(rate_sheet_id, item_id)` identity a genuine direct (non-Bundle,
`source_type === 'inclusion'`) selection reaches, into `directlySelected`.
The main pass then skips a Bundle occurrence of any identity already in
that set, in both the "already seen" and the new "directly selected"
checks — so a Bundle's occurrence of a row unconditionally defers to that
row's own direct-selection entry, real price included, regardless of which
one the array lists first. A row reached ONLY via Bundle(s) is unaffected:
one row, `addressable: false`, from wherever it first occurs. `connectedRows`/
`connectedInclusions` in the Groups/Rate Sheet lanes were already
order-independent (plain `Set` membership, no addressability concept) and
needed no change.

**Regression coverage.** `scripts/package-tier-workspace-contract.ts`:
extended the existing direct-before-Bundle assertion to also check the
deduped row's price is the DIRECT selection's real `unitPrice` (70), not
the Bundle child's `null` — proving the row isn't just addressable but
genuinely sourced from the direct selection. Added a new fixture with the
Bundle occurrence listed FIRST and the genuine direct selection (`rate_inc_b`)
second, asserting exactly one row, `addressable: true`, real price (208) —
proving array order has zero effect on the outcome, per the audit's
explicit "both orders" requirement.

**Validated:** `npx tsc --noEmit`, `npm run contract:package-tier-workspace`,
`npm run contract:tier-connections`, `npm run contract:package-tier-workspace-shell`,
`php tests/tier-group-composition.php` (backend untouched this round, still
green), `npm run build`, `npm run docs:check`, plus a repo-wide scan
confirming no other file carries a stray NUL byte — all pass.

**Files changed this round:** `dist/js/admin-station.js`,
`resources/ts/package-station/surface/packageTierWorkspace/deck.ts`,
`scripts/package-tier-workspace-contract.ts` (backend and `TierLowerDeck.tsx`
untouched — no new defect found in either this round).
