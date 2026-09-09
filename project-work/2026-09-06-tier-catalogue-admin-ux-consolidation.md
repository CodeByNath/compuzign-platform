# Tier Catalogue Admin UX Consolidation

## Status
- **SOURCE PUSH APPROVED**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `ee624fdc6d71e9499396097b872afd3bee97b26f`.
- Approved candidate: `fix/quoted-single-tier-dismissible` @ `f9ca5b187c70ef8e4daf2d863e985e2fe540d545`.
- Candidate tree: `d8efeb2201bbb82ff0cc821da2553450a686a95e`.
- GitHub independently confirms 1 ahead, 0 behind, merge base `ee624fdc`.

## Final audit
The stale-dismissal safeguard is correctly applied. `singleTierDismissedTierId` still blocks immediate X bounce-back synchronously at render time, while a separate cleanup effect now genuinely clears stale dismissal state whenever external `selectedTierId` no longer matches the dismissed Tier. That means removal from this component, Quote Summary, or Cart all converge on the same reset boundary.

The cleanup effect is acceptable because it only clears stale local presentation state; it does not open/focus/select a Tier and does not replace the passive render-time single-Tier fallback. The candidate therefore preserves the architecture that fixed the earlier live landing failures.

Accepted behavior:
- unquoted single Tier -> automatic focused landing, no X;
- quoted single Tier -> focused shell with normal sticky X;
- X -> quoted card + focused-shell inactive so Cart can render beside it;
- `View Plan` -> exact quoted Default/Edition reopens in the same shell;
- dismissal persists only while that same primary remains selected;
- remove primary -> locked landing restored and dismissal genuinely cleared;
- re-add same Tier -> fresh quoted focused state, no resurrected dismissal;
- Family/customer-group changes still clear dismissal;
- Family membership/tab rules, Add-ons, Recommendations, Upgrade/composable, pricing, quote identity and Cart behavior remain unchanged.

Mounted regression was extended to the remove/re-add resurrection case; Claude reports 27 checks passing, while the rejected dormant-only head fails the new case. Build, TypeScript, docs check and relevant contracts are reported green. The docs tightening only restores the already-intended <600-word limit and does not alter product behavior.

## Claude — next action
Push **exactly `f9ca5b187c70ef8e4daf2d863e985e2fe540d545`** to `main` by fast-forward only. Do not amend or add any other source/docs change.

After push:
1. record exact resulting `main` SHA and confirm tree `d8efeb2201bbb82ff0cc821da2553450a686a95e`;
2. record `Deploy to Hostinger` run id + conclusion if available;
3. delete the merged topic branch only after confirming it is an ancestor of `main`;
4. set **AWAITING LIVE VALIDATION** and stop.

## Required live validation
Verify: quoted single Tier shows X; X returns to one quoted card with Cart visible; `View Plan` reopens exact quoted Edition; removing the primary restores auto-focused/no-X landing; re-adding the same Tier starts fresh and X works again.

## Out of scope
`commitSelection()` still transiently resets focused Edition to Default immediately after quoting an Edition; unchanged and non-blocking here. Pre-existing `contract:package-builder-flow` ENOENT on removed `FullBuildDetail.tsx` remains out of scope.
