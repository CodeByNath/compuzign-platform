# Phase 8G — Bundle Inclusion Parity

## Status
- Phase 8E / 8F: `CLOSED`
- Production baseline: `main@5b97287032a4bb00e2d8849fde4ed30f42917eab`
- Phase 8G: `READY FOR CLAUDE`
- Source push: `SOURCE PUSH APPROVED — exact corrected candidate only`
- Verdict: `Proceed`
- Accepted candidate: `phase-8g-bundle-inclusion-parity@41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`

## Requirement
OMNIA Basic’s **Foundation Bundle** children must appear in Plan Details, cart View details, Review & Finalise Quote, expanded proposal, and Print/Save-as-PDF. The bundle remains one priced commercial row at $4,000/month; children are display-only and never affect totals.

## Independent Source Review — Accepted
GitHub confirms the corrected candidate is exactly 2 commits ahead / 0 behind production, with merge base `5b972870...`.

Accepted implementation:
- Plan Details consumes existing `CommercialLegPricedItem.includes`.
- Bundle children render beneath their parent but never enter table totals, Contract Value, Initial Payment, Leg occurrences, or pricing.
- `FamilyTierQuoteItem.inclusionItems?: ServiceInclusion[]` snapshots existing `effective.inclusionItems` at Add to Quote.
- Review and printable proposal use the selection-time snapshot, never live catalog data, with `features` fallback for old cart items.
- Family primaries and add-ons share the presentation.
- No Package/Rate Sheet resolver, identity, routing/mutation, submission, persistence, admin, or legacy-item behavior changed.
- The known request-persistence gap remains deferred.
- The parent-scoped child-key correction at `41c31b41...` is correct. The actual delta from `4659e5a0...` is confined to both key expressions, rebuilt dist JS, and the uniqueness regression. Two bundle parents sharing one child ID now produce distinct keys.
- Reported type-check/build and focused/full contract evidence are accepted; the three established unrelated baseline failures remain unchanged.

## Claude — Authorized Push
1. Immediately before pushing, verify `origin/main` is still exactly `5b97287032a4bb00e2d8849fde4ed30f42917eab`. If it moved, stop and report; do not merge or rebase.
2. Fast-forward `main` to the exact accepted SHA `41c31b41ba51d594f1a4896c2a9ab7175b3f02cc` only. Do not amend, rebuild, squash, cherry-pick into a new SHA, or include unrelated work.
3. Push `main`.
4. Record:
   - resulting full `main` SHA;
   - confirmation it equals the accepted SHA;
   - push output;
   - GitHub Actions deployment run ID/status;
   - checkout, frontend build, SSH source deployment, and dist deployment results.
5. Set Phase 8G to `AWAITING LIVE VALIDATION` only after deployment succeeds. If deployment fails or the pushed SHA differs, stop and report.

## Live Acceptance Pending
After successful deployment, ChatGPT must validate OMNIA Basic across Plan Details, cart View details, Review & Finalise Quote, expanded proposal, and Print/Save-as-PDF. Foundation Bundle children must appear everywhere while the parent remains priced once at $4,000/month and all totals remain unchanged.
