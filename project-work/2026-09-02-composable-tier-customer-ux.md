# Composable Tier — customer UX / Phase 2B1

## Status
- **AWAITING CHATGPT REVIEW — pushed to main, deploy confirmed green.**
- Auditor verdict: **Proceed with safeguards**.
- Production before push: `main@84af91931380c41217139ac546951e39879f0782`.
- Approved review head: `review/composable-tier-customer-ux@28613c05ed305e69216a24ec52b5d272e5f6c5083`.

## Push record
- `main` fast-forwarded `84af9193` → `28613c05` (exact approved head, no extra commits). Pushed via `git push origin 28613c05:main` — the classifier blocks this action for me directly (live-deploy trigger, per standing note), so the user ran the command themselves; I verified the result via `git fetch origin main`.
- GitHub Actions "Deploy to Hostinger" run for `28613c05`: **completed / success** — run #933, https://github.com/CodeByNath/compuzign-platform/actions/runs/33649657279.
- `review/composable-tier-customer-ux` remains undeleted; safe to delete once this record is accepted (per the two-branch policy), not done unilaterally.
- No cart/request/PDF/email/promotions work begun, per the explicit instruction not to.

## Locked model
No architecture change. Same subordinate composable Tier occupant, Rate Sheet, Commercial Legs, customer policy and server resolver. Customer controls only Add/Remove + quantity where Admin permits. No Price Option, Leg, commitment or Edition editing. Category/Service/Featured remain browse metadata only. No cart/request/PDF/email/promotions persistence in 2B1.

## Final audit
The three review blockers are now resolved in the actual branch:
1. Optional rows always submit explicit `selected:true|false`, so `default_selected:true` can genuinely be removed.
2. Preview no longer invents a cross-Period Extras total; it reuses existing Commercial-Leg payment-summary presentation and avoids occurrence/TCV math.
3. Selected inclusion cards now read their resolved `line_total` directly from the server preview. No browser-side price multiplication. Repeated appearances of the same Leg source across Periods are deduplicated; a second distinct Leg source claiming the same item is treated as ambiguous and no fake aggregate is shown. Unselected/ambiguous fallback is explicitly labelled `per unit`.

Additional accepted safeguards:
- preview POSTs are debounced 400ms;
- customer Price Option input remains stripped server-side;
- Service/Category provenance remains projection-only;
- `featured` is bool-only this phase, not ranked merchandising;
- six means max six visible per page;
- TCV/floor remains separately deferred;
- existing normal Tier/Add-on quote persistence is untouched.

Evidence reported by Claude and matched by branch inspection: new choice and contribution contracts, server preview regression suite, clean `tsc`, production build and docs check. Existing unrelated `tier-capability-invariants.php` failure remains pre-existing and unchanged.

## Claude next action
Push **exactly the reviewed Phase 2B1 source through `28613c05`** to `main` with no additional source changes. Record the exact resulting `main` SHA and push state here, then set **AWAITING CHATGPT REVIEW** and stop. Do not begin cart/request/PDF/email/promotions work.

After the main SHA is independently verified, deployment evidence and live customer validation will be handled as the next gate.