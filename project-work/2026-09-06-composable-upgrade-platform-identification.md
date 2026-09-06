# Tier Catalogue Platform Identification — CZTC / CZTEC

## Status
- **CLOSED**
- Auditor verdict: **Proceed**.
- Production: `main@badb36641577a2c8e4fdd2581dc4391750ae62df`.
- Deploy: GitHub Actions run #958 succeeded for exact `badb3664`.
- Review branches cleaned from origin.

## Accepted architecture
One Admin **Tier Catalogue** model only.
- Catalogue occupant: normal Tier identity `CZT...` + Catalogue identity `CZTC...`.
- Catalogue Edition: normal Edition identity `CZTE...` + Catalogue Edition identity `CZTEC...`.
- `CZTU/CZTEU` retired.
- `is_upgrade_offer` removed; no declaration/gate.
- Catalogue identity is inherent to the existing composable occupant/Edition lifecycle.
- Existing customer-facing **Upgrade Your Build / Build Your Own routes remain unchanged** and may later enter CRM as separate transaction routes while carrying the same Catalogue identity family.

## Accepted implementation
- Existing U policy/types/storage/projection/adapters/migration path converted to Catalogue (`CZTC/CZTEC`).
- composable occupant settlement reserves CZTC alongside CZT unconditionally.
- composable Edition activation reserves CZTEC alongside CZTE unconditionally.
- migration enumeration targets only the composable/Tier Catalogue occupant and its Editions/bin records, not ordinary Tier slots.
- Admin Overview uses Catalogue terminology.
- no customer route, pricing, Commercial Legs, quote/cart, Request, PDF/email/order, billing, resolver, or CRM changes were part of this phase.

## Live validation
User supplied live Admin screenshots after deployment showing:
- Build Your Own / Tier Catalogue Overview retains Tier Platform ID `CZT6VKAP` and now shows Catalogue Platform ID `CZTCD2Q3T`.
- Edition Overview retains Edition Platform ID `CZTE7G3GK` and now shows Catalogue Platform ID `CZTECM85EN`.
- No separate Upgrade declaration control is present.

This satisfies the final identity gate. Do not reopen this architecture without hard evidence. New frontend presentation corrections belong in a separate work file.