# Upgrade journey — active correction track

## Status
- **AWAITING CLAUDE'S PUSH — user action required, blocked for Claude by the auto-mode git classifier**
- Auditor verdict: **Proceed with safeguards** — approval basis unchanged, see below.
- Production remains `main@a42eeba88c96d2e5d0a57cd498b270afe1e9baa1`, deploy `33964003314` / #953 successful. `6a03a182` has NOT reached `main` yet.
- Branch hygiene (below) is complete. The only remaining step to reach `AWAITING LIVE VALIDATION` is the fast-forward push itself.

## Claude cannot push to main in this environment
Both `git merge --ff-only 6a03a182` while on `main` and any direct push touching `main` are denied by the Claude Code auto-mode permission classifier in this environment — this is a standing, repeat-confirmed limitation, not a one-off failure worth retrying. The user must run this manually:

```
git checkout main
git merge --ff-only 6a03a18239cec8fa32ce13c5a3bf626293d6f0bd
git push origin main
```

After that lands, tell Claude the resulting SHA (should be `6a03a182` itself, ff-only) so it can confirm the GitHub Actions deploy and move the doc to `AWAITING LIVE VALIDATION`.

## Independent clean-head audit
Fresh cycle confirms `6a03a182` is exactly **one commit** ahead of production with merge-base `a42eeba8`; rejected `0e0d4fc3`, `1e99da02`, prior `c513b516` ancestry, and unrelated `d3eb4dc0` are not in the candidate ancestry.

Git object verification is stronger than the reported empty diff: both accepted final state `c513b516` and clean candidate `6a03a182` point to the **same tree SHA `0e1757948075075e83f4a4a9fe6f209fe07e291a`**. Therefore the clean candidate is byte-for-byte the previously audited final tree, with clean ancestry.

The already accepted behavior remains the approval basis:
- cart = focused-Tier base inclusions once + `Extensions billed X`, no raw Period dump;
- detailed Review/PDF/View-Print = shared View Details period semantics, with unchanged continuations suppressed;
- Bundle children display-only in totals;
- no fabricated multi-Leg base when Headline is unresolved;
- customer quote snapshot remains identifier-safe and never live-re-resolved;
- `legPaymentSummaries` remains TCV/payment authority.

## Approved source action
Claude may fast-forward/push **only `6a03a18239cec8fa32ce13c5a3bf626293d6f0bd`** to `main`, then record exact resulting `main` SHA and GitHub Actions/deploy result. No additional source change in that push.

## Branch hygiene — complete
Inventoried all 14 non-protected branches other than `main`/`Project-work-instructions`/the active `review/upgrade-journey-finalisation`. Verified each by ancestry (`git merge-base --is-ancestor`) and, for the non-ancestor cases, by direct content comparison against current `main`:

**Deleted (remote + pruned locally) — proven merged or superseded:**
- `fix/composable-tier-workspace-launcher` — ancestor of `main`.
- `phase/composable-tier-occupant` — ancestor of `main`.
- `review/composable-live-correction-round` — ancestor of `main`.
- `review/composable-quote-cart-connection` — ancestor of `main`.
- `review/composable-request-pdf-email` — ancestor of `main`.
- `review/composable-tier-admin-customer-policy` — ancestor of `main`.
- `review/composable-tier-admin-ux` — ancestor of `main`.
- `review/composable-tier-customer-policy` — ancestor of `main`.
- `review/quote-sidebar-scroll-reachability` — ancestor of `main`.
- `review/request-flow-hidden-scrollbars` — ancestor of `main`.
- `review/request-flow-rail-reachability` — ancestor of `main`.
- `review/crm-1c-request-actions` — NOT a literal ancestor (1 commit ahead, 59 behind), but its one commit's substance (the `cz-icon-btn` → `cz-station-drawer-iconbtn` collision fix in `IconButton.tsx`, `admin-station.css`, `CLAUDE.md`) is present byte-for-byte in `main`'s current tree, and `main`'s own `requests-admin-station-surface-contract.ts` asserts the same rename with MORE coverage than the branch's own diff had. Confirmed independently re-implemented into `main`'s history under a different commit path — safe to delete.

**Preserved — real unmerged work, reported not deleted:**
- `review/composable-tier-customer-ux` (`83f5dbcd`) — a test-only Phase 2B1 regression script (`tests/composable-offer-browser-regression.mjs` + one `package.json` script entry, "no production change"). Confirmed absent from `main`. Unresolved; needs an explicit decision (land it, or confirm it's superseded by different test coverage) before deletion.
- `review/quote-email-billed-item-separators` (`add030a7`/`bf727fc7`) — adds `NotificationTemplates::emailItemDivider()` plus its own dedicated test `tests/quote-email-billed-item-separators.php`. `main` independently grew its own, differently-shaped item-separation logic in `93ac03ec` ("Fix cart hierarchy order, complete Total Commitment, and email item separation") on the same day, but `main` has neither an `emailItemDivider()` function nor this branch's specific `border-top:1px solid #e3e3e3` marker — the two implementations are NOT proven equivalent. Preserved; needs a human check of whether `93ac03ec` already covers this branch's exact separator requirement (adjacent top-level items only, never before-first/after-last/between-inclusion-rows) before this branch can be called superseded.

`review/upgrade-journey-finalisation` (`6a03a182`) is the one active branch for this work item; per the rule above, delete it once `6a03a182` is confirmed merged into `main`.

## Required live gate
Fresh Starter Cloud quote, read-only validation:
1. Cart: base list once; **Extensions billed Annually** -> Static IP Block qty 2; no Period headings.
2. View Details and PDF/Review/View-Print: `Plan start–Month 10` monthly fact/table once; Month 11 shows monthly continuation + new annual $80 and Static IP qty 2 x $40 = $80; unchanged monthly table not repeated; final open range says `Ongoing`.
3. Email mirrors the same semantics and is actually received.
4. Customer quote JSON exposes no internal Leg/Rate Sheet identifiers.
5. Main -> Upgrade -> Add-on ordering, TCV, initial payments, quote identity and legacy fallback remain unchanged.

Do not close until deployment, branch hygiene report, and live customer behavior agree.