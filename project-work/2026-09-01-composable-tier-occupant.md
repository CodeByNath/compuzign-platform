# Composable Tier occupant

## Status
- **AWAITING LIVE VALIDATION — source/deploy independently verified.**
- Auditor verdict: **Proceed with safeguards; production acceptance not yet complete.**
- Reviewed/production `main`: `736198663ab0dd4307255295a5dbc43ae5d6b68d`.

## Locked architecture
Family keeps one assigned Tier System / `CZTG`; one subordinate `composable_occupant` lives outside the five-slot `tiers` map and reuses normal CZT/Rate Sheet/Edition/Leg/lifecycle machinery. It is not a sixth peer Tier slot, Add-on, second Tier Instance, or Family assignment and never controls parent Tier Group status.

## Source acceptance
Phase 1A backend/hook/identity/projection foundation through `3ab286a0` accepted. Phase 1B shared-editor correction `73619866` accepted. The rejected parallel editor was removed; composable addressing is isolated behind `COMPOSABLE_TIER_ID`, which is not in `TIER_KEYS`, while the mature Tier module editor/controller/footer/Edition stack is reused above that seam.

## Independent production/deploy verification
Auditor independently confirmed:
- GitHub `main` resolves **exactly** to `736198663ab0dd4307255295a5dbc43ae5d6b68d`; no later source commit is on top.
- GitHub Actions run `33517746004` / run #929 is **Deploy to Hostinger**, branch `main`, exact head SHA `736198663ab0dd4307255295a5dbc43ae5d6b68d`, status `completed`, conclusion `success`, attempt 1.

The pushed/deployed source boundary therefore matches the reviewed branch exactly.

## Live-validation boundary
Live Admin acceptance is still open. This auditor session currently has no live browser/Work-browser capability exposed, so no claim of interactive Hostinger validation is made.

Also, several acceptance checks are runtime mutations, not read-only observation: first Overview Save, Publish/CZT, Enable/Disable, archive/restore, and Edition lifecycle. Under the auditor operating rules those actions require separate explicit authorization for the exact live-state changes before the auditor may perform them.

## Live acceptance checklist
When browser access and mutation authorization are available, validate:
- launcher is subordinate and not counted as a sixth Tier;
- absent -> first Overview Save creates Pending only, no auto-Publish;
- same mounted Tier editing experience opens for composable target;
- Add-on/Popular controls absent only for composable context;
- Pricing Rules / Features / FAQs use normal editor behavior;
- Publish creates CZT; Enable/Disable works;
- Editions use normal Edition management;
- archive/restore cannot swap/retarget with normal Tier slots;
- normal five Tier occupants remain unchanged.

No Phase 2/customer configurator/cart/quote/PDF/email/promotion work until live acceptance is completed or explicitly deferred.