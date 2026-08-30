# Package bundle service/inclusion projection parity

## Status
- **AWAITING CHATGPT REVIEW**
- Production `main`: `79a7d99c63970e61add450907282cedc2af4d664` (unchanged)
- Correction review head: `c2dd1a15d7ec6cfa2d95f1cf54bfd0f7165a1bef` (2 commits ahead of production: `4935f2b9` + this round's `c2dd1a15`)
- Source push: **NOT APPROVED**
- Auditor verdict carried over: **Proceed with safeguards**

## Accepted direction
The Bundle remains one commercial Rate Sheet selection/pricing row. Read/display inclusion projection expands its live-resolved `includes[]`; the Bundle shell is not itself an Inclusion. Service/Category provenance continues to come from those real supplied rows. No pricing, Leg, persistence, schema, identity, or authoring changes.

## Auditor review of `4935f2b9...`
The branch is exactly one commit ahead of production and touches only the same five expected files. The shell-to-children expansion is directionally correct, but two frontend contract defects block production.

### 1. Frontend dedupe is missing
Backend `composeTierGroup()` now correctly dedupes supplied children by authoritative `(source_rate_sheet_id, item_id)` and also dedupes a child reached both directly and through a Bundle.

Frontend `projectTierInclusions()` simply `flatMap`s Bundle children, while Group/Rate Sheet `connectedInclusions` sums `includes.length`. Therefore a child reached directly + through a Bundle, or through two Bundles, can display/count twice even though backend Family/Group composition counts it once. This violates the recorded acceptance rule and can recreate cross-surface disagreement.

**Required:** use the same authoritative supplied-row identity for admin read-projection dedupe. Preserve intentional commercial/Leg duplication outside this admin projection.

### 2. Expanded child rows inherit invalid Tier-Inclusion actions
`TierLowerDeck` gives every `DeckInclusion` View/Edit actions and dispatches `inclusion.itemId` as the Tier's Rate Sheet selection key. A Bundle child is **not** a top-level Tier selection; the Tier selected the Bundle shell. Existing `resolveTierInclusion()` only resolves a selected candidate with `source_type === 'inclusion'`.

So the new child row would dispatch a child `item_id` into a drawer contract that cannot resolve it. Making that child editable as if it were directly selected would also violate Bundle commercial/quantity ownership.

**Required:** inspect and reuse the established Bundle/Inclusion admin interaction semantics. Bundle-supplied children may be displayed as real inclusions, but their row actions must not falsely address them as direct Tier selections or create a second quantity/mutation path. Keep the Bundle shell as the only Tier commercial selection.

## Acceptance for next review
Add focused TS regression coverage for direct+Bundle and Bundle+Bundle dedupe, plus the expanded-child row action/interaction contract. Backend tests already cover direct+Bundle dedupe; keep them. Report changed files/tests and push only to the review branch, then set **AWAITING CHATGPT REVIEW** and stop.

## Claude Report — round 2 — 2026-08-30

Both findings addressed on the same review branch, one new commit
(`c2dd1a15`, on top of `4935f2b9`).

**1. Frontend dedupe.** `deck.ts` now derives every real Inclusion identity
through one shared `inclusionKeysFor()`/`inclusionKey()` pair, keyed by the
same authoritative `(rate_sheet_id, item_id)` pair `composeTierGroup()`
dedupes by server-side (an ordinary row's own bound sheet; a Bundle child's
own `source_rate_sheet_id`, since a Bundle may compose across sheets).
Each lane dedupes in its own scope: `projectTierInclusions()` (Details
lane) and `projectTierRateSheet()` (Rate Sheet connection) dedupe globally
across the whole Tier's selections; `projectTierRateSheetGroups()` dedupes
per group bucket (first occurrence wins, matching backend selection order).
A row reached directly + via a Bundle, or via two different Bundles, is now
one Inclusion everywhere, never two.

**2. Row-action contract.** Added `addressable: boolean` to `DeckInclusion`
— `true` for an ordinary directly-selected row (its `itemId` IS the Tier's
own selection key, safe to dispatch), `false` for a Bundle-supplied child
(the Tier actually selected the Bundle shell; the child's `itemId` resolves
to no top-level selection). `TierLowerDeck.tsx`'s `InclusionRow` now omits
the View/Edit `StationSplitAction` entirely for a non-addressable row — no
new interaction model invented, the action cell just stays present-but-empty
so row grid alignment is unchanged. Confirmed via `resolveTierInclusion()`
(`tierInclusionRecord.ts`) that a child's `itemId` genuinely cannot resolve
there, matching the audit's diagnosis exactly.

**Unrelated slip caught and fixed:** the dedup key helper's separator
accidentally became a literal NUL byte instead of a printable character
mid-edit, which made `deck.ts` diff as binary. Replaced with `::`; scanned
every `.ts`/`.tsx` file touched this session for the same issue — none
found elsewhere.

**Regression coverage:** `scripts/package-tier-workspace-contract.ts` adds
a direct+Bundle overlap fixture (`rate_inc_a` reached both directly and via
a second Bundle) and a Bundle+Bundle overlap fixture (two Bundles both
supplying `rate_bundle_child`), asserting the Details lane, Groups lane,
and Rate Sheet connection all dedupe to the same 3 distinct real rows
(`connectedRows` still counts all 6 physical selections, `connectedInclusions`
dedupes to 3), plus an `addressable === false` assertion on the expanded
child row.

**Validated:** `npx tsc --noEmit`, `npm run contract:package-tier-workspace`,
`npm run contract:tier-connections`, `npm run contract:package-tier-workspace-shell`,
`php tests/tier-group-composition.php` (backend unchanged this round, still
green), `npm run build`, `npm run docs:check` — all pass.

**Files changed this round:** `dist/js/admin-station.js`,
`resources/ts/package-station/presentation/package-tier-workspace/TierLowerDeck.tsx`,
`resources/ts/package-station/surface/packageTierWorkspace/deck.ts`,
`scripts/package-tier-workspace-contract.ts` (backend `PackageRepository.php`
and its PHP test untouched this round — no new backend defect was found).
