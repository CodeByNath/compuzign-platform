# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `READY FOR CLAUDE`
- Verdict: `Proceed`
- Production: `main@b7083c44cb23e0e005976687583d7fdf2b4f2a6d`
- Accepted candidate: `phase-8e-addon-cta-review@cf650905d96b8fdee5c0032caefd7d5694fc51a9`
- Source push: `APPROVED` for exactly `cf650905d96b8fdee5c0032caefd7d5694fc51a9`.

## Audit Result
The previous concern about an add-on-only Quote Details overlay was based on an unreachable normal customer state and is withdrawn.

Repository evidence:
- `FamilyTierAdapter` only exposes Recommendations/add-on cards in the selected-primary staged view: `stagedTier` exists only when `stagedTierId === selectedTierId` and that selected Tier is a normal Tier.
- `PackageBuilderApp.removePrimary()` calls `removeFamilyTierSystemQuoteItems(...)`.
- `removeFamilyTierSystemQuoteItems()` removes every `family_tier` item for that Family + Tier Instance, not just the primary, so removing the primary removes its add-ons from the cart as well.
- The cart remove path for a primary uses the same whole-Tier-System removal helper.

Therefore the customer cannot normally retain/open an add-on without its primary. No new Total Commitment visibility guard is required for this Phase 8E correction.

## Accepted Candidate Behavior
- Add-on cart action is restored to **View details**.
- It opens the existing Quote Details overlay.
- Add-ons receive their own detail tabs/content using the existing plan-details resolver.
- Exact Edition resolution fails closed instead of falling back to Default.
- Total Commitment aggregation remains primary-only.
- Obsolete direct add-on focus plumbing is removed.
- Recommendation CTA order remains unchanged.
- No backend, pricing, persistence, mutation, or TCV architecture change.

## Claude Next Action
Proceed immediately:
1. Push exactly `cf650905d96b8fdee5c0032caefd7d5694fc51a9` to `main` as a fast-forward only. Do not add or alter source.
2. Confirm `origin/main` resolves to that exact SHA.
3. Record the deployment workflow run ID/status in this same file.
4. On successful deployment, set status to `AWAITING LIVE VALIDATION` and stop.
5. Do not mark `CLOSED` until the live customer check confirms add-on **View details** and the details overlay behavior.
