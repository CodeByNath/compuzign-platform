# Cart Initial Payment Parity

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `36ba345d920fff59adcd38bafc85d91e2bc3dbc6`.
- Previous `main`: `8271bb0259c199724979ecc4c1d0647454df3c91` (now the parent).
- Shipped tree: `0e69543dd3afba44ca1436bd196efa9f00e99e95`.
- Review branch `feat/cart-initial-payment-parity`: **deleted**, local and
  remote. Repository is back to `main` + `Project-work-instructions`.

## Accepted fix
The candidate makes the exact correction requested and nothing architectural:

- old trigger: stream-aware totals only when a Family item has more than one payment stream;
- corrected trigger: stream-aware totals whenever a Family item has one or more authoritative `legPaymentSummaries`.

The same semantic trigger now applies in:
- Cart (`QuoteSummary.tsx`)
- Review & Finalise (`OrderSummary.tsx`)
- proposal/PDF/Quote View (`QuoteProposalPreview.tsx`)
- admin/customer email (`NotificationTemplates.php`)

`QuoteDetailsOverlay.tsx` remains untouched because Total Commitment was already correct.

## Audit evidence
Actual diff is one clean commit directly on production `main`. The four presentation gates are changed consistently from `> 1` to `> 0`; existing payment helpers, populations, `calcQuoteTotals()`, quote snapshots, pricing/resolvers and ongoing/Until Cancelled behavior are not rewritten.

The live KAIROS fixture is covered as:
`$675 primary + $55 Upgrade + $580 add-on = $1,310 Initial Payment`.

Claude's mounted regression reads the real Cart, Total Commitment, Review & Finalise and proposal surfaces independently and reports `$1,310` on all. PHP coverage proves the same for admin/customer email and preserves the no-summary legacy flat path. The previously weak cross-surface scraper was also corrected so each surface is read from its own fresh container.

Pre-existing failures reported by Claude were independently separated from this candidate and are not caused by this diff; they do not alter this approval.

## Must preserve after push
No composable flat-price patch; no new calculator; no Family/Tier special cases; Initial Payment stays primary + composable + add-ons; each surface's existing Contract Value population stays unchanged; true no-summary quotes keep the legacy flat path.

## Next action
Push **exact candidate `36ba345d920fff59adcd38bafc85d91e2bc3dbc6` unchanged** to `main`. Record resulting `main` SHA and deployment evidence here, set **AWAITING LIVE VALIDATION**, remove the review branch once merged per branch hygiene, and stop. Do not amend or rebuild the approved source candidate before push.

---

## Push record

Approved candidate `36ba345d920fff59adcd38bafc85d91e2bc3dbc6` pushed to `main`
**unchanged**, as instructed. Verified after the fact, not assumed:

- `origin/main` now resolves to `36ba345d`, with `8271bb02` as its parent — a
  clean single-commit fast-forward, no merge commit;
- the shipped tree is `0e69543dd3afba44ca1436bd196efa9f00e99e95`, identical to
  the tree recorded in the approval above. Nothing was amended, rebuilt or
  rebased between audit and push, per the explicit instruction not to;
- `git merge-base --is-ancestor` confirmed the review branch was a merged
  ancestor of `main` before either branch ref was removed.

Claude's own `git push` to `main` was blocked by the local Claude Code auto-mode
classifier (`[Production Deploy]`), as it is for every `main` push in this
workflow; Nath ran the exact fast-forward command.

### Deployment evidence — NOT captured
`gh` is not installed in this environment and no other Actions-reading tool is
available here, so **no GitHub Actions run status was retrieved**. This is an
explicit gap, not a pass. From the repository alone:

- `.github/workflows/deploy.yml` triggers on push to `main` filtered to
  `wp-content/plugins/compuzign-platform/**`, which this commit touches, so the
  workflow is expected to have fired;
- it runs `npm install` + `npm run build` in the plugin directory, then pushes
  source to Hostinger over SSH and SCPs the freshly built `dist` over the
  deployed one. CI rebuilds `dist` itself, so the committed `dist/js/*` is not
  what ships — the CI build output is. Both come from the same source in this
  tree.

**The run result for `36ba345d` must be confirmed green before closure.** This
push also changes a PHP file (`NotificationTemplates.php`), which is deployed by
the SSH source step rather than the SCP `dist` step — so a green run matters for
the email fix specifically, not only the bundled JS.

## Live validation — pending

The one number to check is **$1,310** on the live KAIROS quote
(`$675` Business Pro + `$55` Upgrades + `$580` Backup & DR Shield), in every
place it appears:

1. **Cart footer** — was `Est. monthly total $1,255 + 1 item at custom pricing`;
   must now read Initial Payment `$1,310` with no "custom pricing" note.
2. **Total Commitment overlay** — was already `$1,310`; must be unchanged.
3. **Review & Finalise** — was `$1,255`; must now agree.
4. **Proposal / PDF** — was `$1,255`; must now agree.
5. **Admin + customer email** — was `$1,255`; must now agree.
6. **View/print quote opened from the email** (Nath's own addition this round) —
   renders `QuoteProposalPreview`, so it follows item 4; worth opening from a
   real email rather than assumed.

Non-change boundary to confirm while there:
- an ongoing monthly quote still reads `Until Cancelled`, with no fabricated
  Total Contract Value;
- a legacy / Cost Builder quote with no `legPaymentSummaries` still shows its
  ordinary flat `Est. X total` and no Initial Payment row;
- a mixed quote still shows legacy Service/bundle totals alongside the Family
  block, not instead of it;
- quoted identity is unchanged — the composable line still reads **Upgrades**
  beside its primary.

Do not mark **CLOSED** until the Actions run is confirmed and live behavior
matches on all six surfaces.
