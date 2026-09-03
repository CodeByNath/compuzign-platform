# Composable Tier — Admin → customer browser handoff

## Status
- **AWAITING LIVE VALIDATION — exact approved fix deployed.**
- Auditor verdict: **Proceed with safeguards.**
- Production `main@41884a41ab7f0e21c52dc8e9158c126aace1abf9`.
- Hostinger deploy #935 / run `33708795165`: completed / success for exact `head_sha=41884a41ab7f0e21c52dc8e9158c126aace1abf9`.

## Accepted corrections
The deployed fix now enforces the intended external-controller boundary:
- Customer Options reads only the composable occupant's own selected `rate_sheet_selections`, never the whole bound Rate Sheet catalogue.
- Server save validation accepts only inclusion IDs currently owned by that occupant.
- `customer_policy` now survives normal occupant settle/publish; the previous shared `upsertOccupant()` omission is fixed.
- settle performs server-owned pruning of policy entries whose inclusion IDs are no longer selected.
- re-adding a previously removed inclusion never restores its old authorization automatically; it returns Not offered until Admin explicitly authors it again.

No cart/quote/Request/PDF/email/promotions/TCV work is part of this phase.

## Independent source/deployment verification
- GitHub `main` resolves exactly to approved `41884a41ab7f0e21c52dc8e9158c126aace1abf9`.
- Deploy #935 succeeded on that exact SHA.
- No further Claude source work is authorized unless live validation exposes a genuine defect.

## Live validation — browser chat
Use the already-configured real KAIROS Build Your Own occupant in `https://compuzign.weerax.com/studio/`. Do not create new fake records.

First verify the immediate defect:
1. Open Build Your Own → Customer Options → Edit.
2. Expected rows are exactly the occupant's three current inclusions:
   - 2 vCPU
   - Block Storage
   - Backup Storage — BaaS
3. Confirm no other KAIROS Rate Sheet rows appear.

Then exercise policy persistence with a minimal real rule set authorized by Nath in that browser chat:
4. Author one inclusion as Optional (or another simple rule), Save, then settle/publish through the normal Build Your Own lifecycle.
5. Reopen Customer Options and confirm the rule survived Publish.
6. For stale-policy regression, choose one test inclusion only: record its current settings, remove it through the normal occupant Features flow, settle/publish, re-add that same inclusion, settle/publish, reopen Customer Options. It must return **Not offered** rather than restoring its old rule. Restore any intended final rule only if Nath explicitly asks.
7. Stop immediately on any unexpected mutation to the five normal Tier occupants, Family assignment, Rate Sheet data, Legs, Price Options or Editions.

Only after Admin rules are successfully settled should `https://compuzign.weerax.com/pricing/` be validated for Build Your Own / Upgrade your build behavior.

## Follow-up — not part of this live gate
Separately scope **Import all current Rate Sheet inclusions** as a one-time snapshot/bulk-selection action in the normal occupant inclusion editor. No wildcard binding and no automatic future Rate Sheet additions.

## Browser-agent report
Update this same file with exact observed rows, authorized runtime changes, persistence/re-add results, and stopping point. Do not mark CLOSED until both Admin persistence and the corresponding customer behavior are validated.