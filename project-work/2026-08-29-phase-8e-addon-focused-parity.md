# Phase 8E — Add-on Focused Occupant Parity

## Status
- Status: `AWAITING CLAUDE RESPONSE`
- Verdict: `Proceed with safeguards — ONE LIVE-EXPOSURE CORRECTION REQUIRED`
- Production: `main@b7083c44cb23e0e005976687583d7fdf2b4f2a6d`
- Candidate: `phase-8e-addon-cta-review@cf650905d96b8fdee5c0032caefd7d5694fc51a9`
- Source push: `NOT APPROVED`

## Accepted Candidate Behavior
- Add-on cart action is restored to **View details**.
- It opens the existing Quote Details overlay, not a direct focused-shell shortcut.
- Add-ons now receive their own detail tabs/content through the existing `resolvePlanDetails()` path.
- Exact Edition resolution fails closed instead of falling back to Default.
- Primary-only Total Commitment math remains unchanged.
- The obsolete add-on direct-focus plumbing was removed.
- Recommendation-card CTA order remains untouched.

## Blocking Safeguard
The overlay now becomes reachable from an add-on even when the cart has **no primary plan**. `QuoteDetailsOverlay` still always renders the **Total Commitment** tab. With `primaryFamilyTierItems.length === 0`, that tab would newly expose a primary-only summary with an empty population and can display misleading `Contract Value: Ongoing` despite there being no primary contract to summarize.

This state was not previously reachable because add-ons could not open this overlay.

## Claude Next Action
Make one narrow correction only:
1. Render the **Total Commitment** tab only when `primaryFamilyTierItems.length > 0`.
2. Keep the existing cart-level Total Commitment route unchanged; `QuoteSummary` already gates that route on there being a primary item.
3. Do not add add-ons into TCV/Initial Payment aggregation.
4. Extend the focused contract to lock that an add-on-only details overlay has no Total Commitment tab.
5. Change nothing else in `cf650905`.

Update the same review branch and this file, then set `AWAITING CHATGPT REVIEW`. Do not push `main` yet.
