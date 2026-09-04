# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — PHASE 0 IDENTITY SAFEGUARD**
- Auditor verdict: **Stop — architectural risk**
- Current production/source: `main@eaead45338f9cc464e56d4510fa798d8b4c558b3`
- Reviewed correction head: `review/upgrade-journey-finalisation@be0e10bfa7665343989f66c71d7126e3580c7294`

## Architecture direction
One active journey only: **Upgrade your plan/build**. Standalone Build Your Own is deferred/disabled. Upgrade must never fall through, relabel, transition, or survive as standalone Build Your Own.

## Platform identity / occupant rule
Use the **CompuZign Platform skill** for identity work. Reuse the existing Tier/Edition occupant pipeline; no parallel allocator/persistence/resolver/order system.

- Tier: Default `CZT...`; Upgrade `CZTUXXXXX`; future Custom `CZTCXXXXX`
- Edition: Default `CZTE...`; Upgrade `CZTEUXXXXX`; future Custom `CZTECXXXXX`
- `CZTC`/`CZTEC` reserved for later Build Your Own only.
- Existing `tierOccupantId`/occupant identity is the native foundation; Platform IDs are the permanent platform identity layered through the existing identifier machinery.

## Auditor review
Phase 0 reset and orphan correction are otherwise accepted in shape. `FamilyTierAdapter` gates the browser to a selected base and forces `upgrade_your_build`; `removeFamilyTierSystemQuoteItems()` now removes base + add-ons + Upgrade; replacing a genuinely different base removes the Upgrade; same-base reconfirm preserves it. This correctly prevents the former standalone fallback/orphan behavior.

**Remaining blocker:** `replaceFamilyNormalQuoteItem()` currently decides whether the base changed using only `tierPlatformId + tierEditionPlatformId`. That is weaker than the platform's existing occupant identity model and conflicts with the explicit instruction that the Tier occupant ID is the foundation. The active customer base is an exact occupant (and, where applicable, an exact Edition), not merely two possibly absent/stale display-facing Platform-ID fields.

## Exact correction
1. Make the base-equivalence/swap guard use the existing native occupant identity (`tierOccupantId`) as mandatory identity, plus exact Edition identity where applicable. Platform IDs may be checked additionally, but must not replace occupant identity.
2. Same exact occupant + same Edition reconfirm must preserve the Upgrade. Any different occupant or different Edition must remove it.
3. Add contract cases that prove occupant change removes the Upgrade even if other Tier-facing fields happen to match, and same occupant/same Edition preserves it.
4. Do not add a new identity model, draft tracker, `CZTU`/`CZTEU` minting, or Upgrade finalisation yet. This remains Phase 0 isolation.

Return exact files/tests/review SHA and set **AWAITING CHATGPT REVIEW**. Do not push to `main`.