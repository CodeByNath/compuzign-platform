# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `4a73ed87`.
- Approved candidate: `review/composable-edition-set-completeness` @ `72bee36b`.

## Scope lock — Nath approved
Fix **only the composable occupant / Tier Catalogue customer Upgrade path**. Do not alter normal Tier occupants, Add-on occupants, normal Tier Edition behavior, or any other occupant resolver/projection.

Pricing on deployed `4a73ed87` is **PASS** and remains untouched.

## Independent verification
- `72bee36b` is exactly **one commit ahead** of `main@4a73ed87`, behind by 0.
- Merge base is exactly `4a73ed87`.
- Changed files are the accepted six-file net diff only.
- Candidate tree SHA: `4434126fa5e8e148ed8b991c7e3b3cf8c1cb2bd4`.
- Previously reviewed `53f492b0` tree SHA: `4434126fa5e8e148ed8b991c7e3b3cf8c1cb2bd4`.
- Therefore the final candidate is byte-identical to the already-reviewed accepted source tree; only ancestry changed.

## Accepted source state
- Composable-only Edition visibility correction: normal Tier/Add-on paths retain their existing filter; only `composable_offer` skips the extra `edition_platform_id` visibility gate.
- Selected composable Edition uses its own non-empty `inclusions_override`; empty override falls back to composable Default inclusions.
- Active-only eligibility remains upstream; disabled composable Edition coverage remains in place.
- No pricing/server-preview change in this round.

## Claude — next action
Push **exactly `72bee36b` unchanged** to `main` using the normal approved workflow. Do not amend, combine, or add any other source change.

After push, record in this same file:
- exact resulting `main` SHA;
- confirmation production tree equals approved tree `4434126fa5e8e148ed8b991c7e3b3cf8c1cb2bd4`;
- GitHub Actions/deployment run and outcome.

Then set **AWAITING LIVE VALIDATION** and stop.

Live validation after deployment must verify:
1. full customer-valid composable Edition set appears in the cue;
2. selecting each visible composable Edition loads its own inclusion rows/prices when overridden;
3. empty Edition override falls back to composable Default;
4. pricing remains working;
5. normal Tier/Add-on customer behavior remains unchanged.

**Must preserve:** working pricing, server preview authority, composable Edition resolver, Upgrade journey, label UI, every non-composable occupant path.
**Must not substitute:** any normal Tier/Add-on behavior change, inactive Edition exposure, hardcoded Edition names/counts, second resolver, or extra customer steps.
