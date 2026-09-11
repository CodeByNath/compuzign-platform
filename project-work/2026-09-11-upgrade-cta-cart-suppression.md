# Upgrade CTA Cart Suppression

## Status
- **CLOSED**
- Auditor verdict: **Proceed**.
- Production `main`: `2c2c83e2096872b2847300afef307ffe27441af8`.
- Production tree: `dadd4d81c7dd46d079688cf962e840a29eb5dbf9`.
- Deploy `34568147718`: **success**.
- Review branch removed; remote contains only `main` and `Project-work-instructions`.
- Nath live validation: **PASS**.

## Final accepted behavior
When the **Upgrade your build** CTA is visible inside Recommendations with **Browse Catalogue** and **Maybe next time**, the Cart is hidden.

Accepted transitions:
- Add-on-only Recommendations -> Cart visible.
- Upgrade CTA visible (`pending`) -> Cart hidden.
- Browse Catalogue / Upgrade browsing -> Cart hidden.
- **Maybe next time** -> CTA gone; Cart visible again.
- Exit Upgrade browsing -> Cart visible again.
- Globally lone Tier, ordinary Tier Add to Quote, cross-audience and explicit focused inspection remain unchanged.

## Final implementation
`FamilyTierAdapter.tsx` keeps the accepted `resolvedStep` architecture and adds only the derived condition:

```ts
const upgradeCtaVisible = resolvedStep === 'recommendations'
  && upgradeGateActive === 'pending';
```

`quoteSuppressed` includes `upgradeCtaVisible`. No persistent Cart state was added. The condition reuses the same `upgradeGateActive === 'pending'` fact that renders the CTA, so Cart suppression follows the actual CTA state.

Independent pre-push review confirmed the candidate was exactly one commit ahead of the prior production `main` and changed only `FamilyTierAdapter.tsx`, generated `dist/js/cost-builder.js`, and `tier-next-step-navigation-regression.mjs`. Regression coverage increased to 81 mounted checks. Claude reported TypeScript/build/docs green and no new JS baseline failures.

## Production evidence
Independent GitHub verification confirms current `main` is exactly `2c2c83e2096872b2847300afef307ffe27441af8` with tree `dadd4d81c7dd46d079688cf962e840a29eb5dbf9`.

GitHub Actions run `34568147718` (`Deploy to Hostinger`) completed successfully for head SHA `2c2c83e2`, attempt 1.

The review branch was removed after merge ancestry verification. Nath has confirmed the deployed customer behavior passed live validation.

This work is accepted and immutable; any later change belongs in a new work file.

## Open items carried forward
- `2026-09-10-cart-initial-payment-addons.md` — deferred live validation.
- `regression:composable-quote-cart-loop` — pre-existing red on `main`, undecided.
- `2026-08-30-quote-email-billed-item-separators.md` — abandoned historical work; dangling commits remain outside this closure.
