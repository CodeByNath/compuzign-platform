# Single Occupant Focused State After Quote

## Status
- **CLOSED**
- Auditor verdict: **Proceed**.
- Production `main`: `67a5a7afd38a105059d92ca41ad020feaf472767`.
- Production tree: `4b379661a00df5f5d97610ebe86552c96a931c03`.
- Deploy `34559388908`: **success**.
- Review branch removed; remote contains only `main` and `Project-work-instructions`.
- Nath live validation: **PASS**.

## Final accepted navigation rule
A successful **Add to Quote** from either a normal Tier card or a normal Tier focused shell completes the Tier-selection step. The Cart is visible only when the resolved flow has no blocking workspace between that Tier action and the Cart.

Cart visibility is never a persistent `showCart` flag. It remains actual quote contents × the current resolved navigation step.

Accepted step behavior:
- `tier_landing` -> Cart suppressed;
- `focused_inspection` -> Cart suppressed;
- `upgrade_browsing` -> Cart suppressed;
- `recommendations` -> Cart eligible;
- `cart` -> Cart eligible;
- `tier_comparison` -> Cart eligible when quote contents exist.

Upgrade `pending` is part of Recommendations, not the focused browsing workspace. X eligibility is intentionally independent from Cart eligibility; a cross-audience single-visible quoted Tier may have a working X while the Cart is visible because no intermediate post-Add-to-Quote step exists.

## Accepted refinements
- Globally lone quoted Tier remains focused, no X, Cart appears after quote.
- Exact quoted Tier Edition remains visible after Add to Quote and after reload; no visual reset to Default.
- Restored browser cart resolves to the same lone-Tier presentation as the in-session flow.
- Quoted Add-on cards return showing the exact quoted Add-on Edition.
- Add-on/Recommendations behavior remains intact.
- Upgrade pending shows Recommendations + Cart; Browse Catalogue hides Cart; exiting browsing restores Cart.
- Existing Add-ons + Upgrade presentation remains unchanged.
- Non-lone X / dismiss / View Plan behavior remains functional.

## Evidence
Independent GitHub verification confirms current `main` is exactly `67a5a7afd38a105059d92ca41ad020feaf472767` with tree `4b379661a00df5f5d97610ebe86552c96a931c03`, parent `fd2878385b23becf1478018b94db47b5a50d7cf9`.

GitHub Actions run `34559388908` (`Deploy to Hostinger`) completed successfully for head SHA `67a5a7af`, attempt 1.

Source validation supplied before approval included the mounted `tier-next-step-navigation` regression (78 checks), updated single-occupant regression, TypeScript, build, docs, and JS-suite baseline comparison with no new failures.

Nath has now confirmed the deployed navigation behavior passed live validation. This work is accepted and immutable; any later navigation change belongs in a new work file.
