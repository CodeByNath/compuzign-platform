# Phase 8J — Submitted Quote / Email Parity

## Status
- `SOURCE PUSH APPROVED` — exact 8J-B candidate only.
- 8J-A accepted/deployed at `main@f152134eac87c0cf84414ac6217794e7a4ca0102`.
- Auditor verdict: `Proceed with safeguards`.
- Phase 8I remains the accepted cart/review/proposal reference; do not reopen or improve its semantics here.

## Locked Architecture
Keep `/requests/submit`, `cz_quote_<ref>`, WordPress transient storage and the **7-day expiry** unchanged.

Existing flow stays intact: the same submitted quote payload feeds the existing admin notification and customer email builders. 8J only wires the richer Family snapshot already established by the accepted cart/review/PDF work into that existing notification path. Do not invent a new quote engine, identity model, persistence model, resolver, or commercial rule.

## Phase 8J-A — Accepted
`main@f152134eac87c0cf84414ac6217794e7a4ca0102`; Hostinger workflow #913 succeeded. RequestSchema now preserves the Family snapshot fields the final quote surfaces already use.

## Phase 8J-B — Independent Re-audit
Review branch `phase-8j-b-quote-email-parity`; candidate `c8a0f2b43b94631232fa5befcb2b1d679f295a9b`; exactly one commit ahead of accepted main. Four-file scope only: `NotificationTemplates.php`, focused email parity test, existing Family notification test, quote-builder Code Map.

### Correction to prior auditor finding
The previous instruction claiming a Family add-on must not trigger enhanced Family summary mode was **wrong and is withdrawn**. Source-first re-audit of the accepted Phase 8I implementation confirms both `OrderSummary.tsx` and `QuoteProposalPreview.tsx` deliberately compute `hasMultiStreamItem` across **all Family items**, then exclude all Family items from general totals while primary-only `familyMainItems` feed combined Contract Value/Initial Payment. Candidate 8J-B reproduces that exact established behavior. Do not “fix” or reinterpret it in email work.

The existing notification architecture also already has separate public `buildAdminHtmlEmail()` and `buildCustomerHtmlEmail()` entry points while sharing row/totals helpers. Candidate keeps that flow and only adds Family-aware rendering from the submitted snapshot. Admin retains operational CZ IDs; customer output suppresses them to match accepted customer quote surfaces. Legacy/non-Family fallback remains.

### Audit verdict
`Proceed with safeguards.` No architectural blocker found in candidate `c8a0f2b...`. The email must mirror the existing accepted cart/PDF behavior even where a hypothetical alternative rule might seem preferable; parity is the requirement for this phase.

## Claude — Production Action
1. **Do not implement the previously requested add-on correction.** If any uncommitted/local correction work was started after coordination commit `9003d867...`, discard only that 8J-B correction work and return the review branch to exact candidate `c8a0f2b43b94631232fa5befcb2b1d679f295a9b`.
2. Reconfirm `origin/main` is exactly `f152134eac87c0cf84414ac6217794e7a4ca0102`.
3. Fast-forward `main` to **exactly** `c8a0f2b43b94631232fa5befcb2b1d679f295a9b`; no amend, new source commit, merge commit, or extra cleanup.
4. Push `main` and allow normal GitHub Actions Hostinger deployment.
5. Record resulting full `main` SHA and workflow run/status here; set `AWAITING CHATGPT REVIEW`; stop.
6. Do not begin 8J-C or make further email/cart/PDF changes.

## Phase 8J-C — Not Authorized
Post-deployment cross-boundary/customer-email validation follows only after the exact 8J-B production push is independently verified.
