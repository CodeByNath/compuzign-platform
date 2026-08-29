# Phase 8G — Bundle Inclusion Parity

## Status
- Phase 8E / 8F / 8G: `CLOSED`
- Verdict: `Proceed`
- Production: `main@41c31b41ba51d594f1a4896c2a9ab7175b3f02cc`
- Deployment: GitHub Actions run `33254216051` — `SUCCESS`

## Requirement
OMNIA Basic’s **Foundation Bundle** children must appear in Plan Details, cart View details, Review & Finalise Quote, expanded proposal, and Print/Save-as-PDF. Foundation Bundle remains one priced commercial row at $4,000/month; children are display-only and never affect totals.

## Accepted Source
The independently reviewed production change:
- renders existing `CommercialLegPricedItem.includes` beneath bundle parents in shared Plan Details;
- keeps table arithmetic restricted to top-level priced items;
- snapshots existing `effective.inclusionItems` onto optional `FamilyTierQuoteItem.inclusionItems` at Add to Quote;
- uses that selection-time snapshot in review/proposal, with `features` fallback for old carts;
- applies the presentation to Family primaries and add-ons;
- parent-scopes child render keys, including repeated child IDs across different bundles;
- leaves Package/Rate Sheet resolution, identity, pricing, Contract Value, Initial Payment, occurrences, routing/mutation, submission, persistence, admin, and legacy paths unchanged.

The known request-persistence gap remains intentionally deferred.

## Production and Deployment Evidence
Claude fast-forwarded `main` from `5b972870...` to the exact accepted SHA `41c31b41...`. Independent GitHub inspection confirms that SHA is the current production tip and contains the accepted two-commit Phase 8G change only.

Actions run `33254216051` completed successfully. Checkout, frontend dependency installation, frontend build, SSH source deployment, and SCP dist deployment were all reported successful.

## Live Browser Validation — 2026-08-29
Read-only validation passed at `https://compuzign.weerax.com/pricing/`.

The pre-deployment temporary two-item cart was cleared with Nath’s explicit authorization. A fresh OMNIA Basic selection was then created from the deployed build, ensuring the new structured inclusion snapshot—not stale cart data—was tested.

Passed:
1. **Plan Details:** Foundation Bundle plus:
   - Website, Web-Site Revamp
   - Online Banking & Member Services (Open Account Online)
   - Online Payment / Wire Transfer
2. **Billing arithmetic:** Foundation Bundle appears once at quantity 1, unit price $4,000.00, total $4,000.00. Children show quantities but no independent price/total. Monthly total remains $4,000.00.
3. **Cart View details:** same parent/three-child table and unchanged $4,000.00 monthly total.
4. **Review & Finalise Quote:** bundle parent and all three children appear; estimated monthly total remains $4,000/month.
5. **View full quote:** printable proposal contains the same hierarchy and unchanged total.
6. **Print / Save as PDF:** print action invoked successfully; page remained responsive.

No contact details were entered, no quote was submitted, and no WordPress, pricing, package, user, storage, or persistent runtime record was changed. The browser now contains only the fresh temporary OMNIA Basic quote.
