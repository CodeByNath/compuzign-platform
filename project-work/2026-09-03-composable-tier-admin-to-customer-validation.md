# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — Request/PDF/email implementation approved with safeguards.**
- Auditor verdict: **Proceed with safeguards.**
- Accepted production: `main@84ebbb2850f9e8f9ead8cec8c13ee67462cb3f33`; Deploy #937 succeeded.

## Accepted chain
Admin/customer configurator and aggregate composable quote/cart line are accepted live. Do not reopen them without hard evidence. Overall work remains open; final UI/UX refinement follows representation-chain acceptance.

## Audit decision — Request / PDF / email
Claude’s main finding is confirmed independently: `RequestSchema.php` uses an explicit `family_tier` allow-list and currently drops the composable discriminator; downstream proposal/email logic still assumes binary primary/Add-on. Persisting the discriminator without fixing those readers would misclassify Build Your Own as primary.

### Implement now
1. Persist optional **`isComposable`** through the Request REST schema/sanitizer, `RequestLine`, and Request→cart reconstruction. Absent must remain false for legacy Requests.
2. **Do not persist `composableSelection` in Request.** It is browser edit/reseed intent. A submitted Request is an immutable terminal snapshot; selected inclusion names/quantities already live in `inclusionItems`, and commercial streams in `legPaymentSummaries`.
3. Use one centralized/request-side `primary | addon | composable` classification convention (composable first, then Add-on, else primary). Guard impossible Add-on+composable state; do not scatter raw `!isAddon` assumptions.
4. Admin Request/proposal/print/PDF/customer email must show the aggregate composable line distinctly as **Build Your Own**, never primary/Add-on and never raw Platform IDs.
5. Reuse stored `inclusionItems` for selected inclusion/quantity display and stored `legPaymentSummaries` for payment streams/TCV. Include composable **exactly once** in combined totals.
6. Never re-resolve an old Request against current Rate Sheet, occupant, policy or resolver state.
7. Preserve existing primary/Add-on Request behavior when `isComposable` is absent.
8. Keep the unrelated pre-existing `planDurationMonths` Request-persistence gap **deferred**; do not fold it into this phase.
9. No pricing/resolver/Rate Sheet/entity/identity changes and no occurrence-month math change.

## Required verification
At minimum cover:
- primary + composable same Family/Tier System reconstruct with distinct roles/keys;
- composable-only Request;
- primary + composable + Add-on representation;
- stored inclusion quantities and per-Leg streams survive Request round-trip;
- proposal/PDF totals include composable once;
- customer email identifies Build Your Own and uses stored snapshot values;
- legacy Request fixture with no `isComposable` remains unchanged;
- impossible Add-on+composable input is handled deterministically/rejected at the appropriate write boundary.

Do not rely on “no PHPUnit” as a reason to leave PHP untested. Inspect the repository’s existing PHP/CLI request-schema regression scripts and extend/reuse the applicable convention if present; otherwise add the smallest executable regression harness consistent with repository practice. Frontend contracts should directly exercise Request→cart role/key reconstruction and proposal totals.

Run focused tests/contracts, typecheck, build and docs checks. Push the exact implementation to a **non-production review branch**, record changed files/SHA/test evidence here, set **AWAITING CHATGPT REVIEW**, and do not push `main`.