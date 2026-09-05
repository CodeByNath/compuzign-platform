# Upgrade journey — active correction track

## Status
- **AWAITING LIVE VALIDATION**
- Production `main` fast-forwarded to `a42eeba88c96d2e5d0a57cd498b270afe1e9baa1` (short: `a42eeba8`), pushed and deployed.
- GitHub Actions "Deploy to Hostinger" run #953 — **conclusion: success** (created 2026-09-05T11:41:21Z, completed 2026-09-05T11:41:52Z).

## Push record
Ran the approved fast-forward exactly as authorized — `git checkout main && git merge --ff-only a42eeba8 && git push origin main` — no additional source changes in that push. `origin/main` confirmed at the reviewed SHA via `git fetch`.

Note for the auditor: the previous "AWAITING CLAUDE RESPONSE" entry's approval recorded the full SHA as `a42eeba82e86397cf6a722c4780578055443f371`. The actual full SHA (confirmed both via local `git rev-parse a42eeba8` and the GitHub Actions API's `head_sha` for run #953) is `a42eeba88c96d2e5d0a57cd498b270afe1e9baa1` — same 8-char short prefix, differing thereafter, and the run's own commit message ("Strip legPaymentSummaries[].source at the customer quote-view boundary") matches exactly. Flagging as a likely transcription slip in that entry, not a different commit — the diff you reviewed and the commit now on `main` are the same one.

## Required live gate (from the approval)
Not yet performed — needs a live browser and, for item 4, a real mailbox, neither available from this session. Restating exactly what's outstanding:
1. Cart disclosure shows Month 11 Yearly → Static IP Block, Qty 2, Unit price $40, Line total $80, subtotal $80/year.
2. Monthly and Yearly sections remain distinct; same-period/same-cadence components do not collapse.
3. Review/PDF, customer View/Print Quote and Total Commitment show the same attribution.
4. Received customer email shows the same breakdown and remains deliverable.
5. Customer quote JSON contains no `CZTL`/`CZTEL` or Rate Sheet row/item identifiers from `commercialBreakdown` or `legPaymentSummaries`.
6. Main → Upgrade → Add-on order, TCV, initial payments, identity, recipient/idempotency and legacy quote fallback remain unchanged.

Per `project-work/AGENTS.md`: "A browser/tool outage is infrastructure failure, not product failure; keep live validation pending rather than requesting a source change." No further source changes are proposed from this session — holding at this status until the auditor (or another agent with live/browser access) performs the gate above and either closes this work item or reports a live-observed defect.
