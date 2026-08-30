# Package bundle service/inclusion projection parity

## Status
- **AWAITING CLAUDE RESPONSE**
- Production `main`: `79a7d99c63970e61add450907282cedc2af4d664`
- Correction review head: `4935f2b9b994b06ad9175bfaa99ed8fa7f89d158`
- Source push: **NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**

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
