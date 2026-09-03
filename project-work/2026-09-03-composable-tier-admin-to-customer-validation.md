# Composable Tier — continuous work track

## Status
- **AWAITING LIVE VALIDATION — browser agent action required.**
- Auditor verdict: **Proceed with safeguards.**
- Independently verified production: `main@84ebbb2850f9e8f9ead8cec8c13ee67462cb3f33`.
- Independently verified GitHub Actions **Deploy to Hostinger #937**, run `33754346845`, `head_sha=84ebbb2850f9e8f9ead8cec8c13ee67462cb3f33`, completed **success**.

## Accepted architecture
One aggregate composable `FamilyTierQuoteItem`; centralized `primary | addon | composable` identity; Family+Tier-System composable key; no per-inclusion products; no `is_addon` reuse; zero-selected/no-required removes line; required-only persists; primary and composable are independent; commercial facts come only from the latest successful server preview. Request/PDF/email is not part of this phase.

Reactive callback-loop blocker was corrected before production. Mounted regression proves one user interaction produces one preview/cart write and an unchanged post-commit render does not continuously retrigger.

## Browser Agent — live customer validation
Use deployed customer `/pricing/`. Hard-refresh first. This validation may change only this browser's quote/cart selection state; **do not alter Admin, Package records, pricing, policy, WordPress configuration, or other persistent platform data.**

Run these checks against KAIROS/its existing published composable offer and record PASS/FAIL with screenshots:

1. **Standalone Build Your Own:** ensure no normal KAIROS primary Tier is selected. Add the authorized optional Block Storage inclusion. Confirm exactly **one** composable quote/cart line appears with the resolved payment stream/amount. Screenshot.
2. **No reactive loop:** after Add, wait at least **3 seconds without touching anything**. Cart line, total and preview must remain stable: no repeated spinner/flicker, duplicate line, changing count, or repeated visible refresh behavior.
3. **Remove empty composition:** remove Block Storage. Because current live policy has no required inclusion, the composable cart line must disappear completely rather than remain as a zero-value item. Screenshot.
4. **Coexistence / Upgrade your build:** select a normal KAIROS Tier (keep an existing Add-on too if available), then add Block Storage under **Upgrade your build**. Confirm primary + composable (+ Add-on when present) coexist as separate lines; composable must not replace either. Screenshot.
5. **Totals exactly once:** verify quote item count, composable payment stream and Total Contract Value include the composable line once only. No duplicate contribution.
6. **Update not duplicate:** if quantity control is available, change quantity once; otherwise Remove then Add once. Confirm one existing composable line updates/reappears, never a second composable line. Wait 3 seconds again for stability.
7. **Independence:** remove/change the normal primary and confirm composable remains. Then re-add a primary and remove only composable; confirm primary/Add-on remain.
8. **Reload/reseed:** with a composable selection present, reload/hard-refresh. Confirm the composable choice re-seeds correctly and the cart remains unchanged merely from viewing/waiting 3 seconds.

Stop and capture evidence immediately if: composable replaces primary/Add-on; two composable lines appear; empty composition remains in cart; totals double-count; cart changes during idle; reload changes cart without interaction; or pricing differs between preview and cart.

## Next gate
Browser Agent should write results into this same file. If all pass, set **AWAITING CHATGPT REVIEW** for auditor acceptance. If any fail, record exact reproduction + screenshot and set **AWAITING CHATGPT REVIEW**. Do **not** start Request/PDF/email work yet.