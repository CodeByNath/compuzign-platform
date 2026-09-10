# Cart Bundle + Upgrade Refinements

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed**.
- Production `main`: `22b1ff3619363fef80beadd8cb944d2560f4571f` (was `71773ead49c736aec8779ee57ccdf4f31d021470` before this push).
- Approved candidate pushed to `main`; review branch deleted. Deploy run `34487644025`, success.
- Candidate tree: `c1505f2e3021a8ee9f8e563bd9a0db722ffc75bd`.
- GitHub compare: exactly **1 ahead / 0 behind**, merge base is exact production `main`.

## Accepted correction
The frontend Bundle-child presentation defect is fixed consistently:
- `OrderSummary.tsx` — Review & Finalise uses shared `inclusionMoneyPresentation()`.
- `QuoteProposalPreview.tsx` — proposal, Quote View and frontend Print/Save-PDF use the same rule.
- `InclusionDisclosure.tsx` — compact Cart/Total Commitment remains on the same shared rule with its already-live-validated behavior unchanged.
- Bundle parent keeps its real price/line total.
- Bundle children render `Included` and never fall through to `formatPrice(undefined)` / `Contact Us`.
- Genuine unresolved non-Bundle money remains blank.
- `PlanDetailsModal.tsx` intentionally remains an independent, already-correct renderer of the same Bundle-child semantic.
- `NotificationTemplates.php` remains separate and already correct; no PHP/email change.

The comment-only follow-up is accepted. Comments now describe the exact consumer set rather than falsely claiming every customer inclusion renderer shares the helper. No Plan Details refactor was introduced.

Claude reports the 48-check focused regression, Initial Payment regression, affected quote/request/print contracts, TypeScript, build, docs and listed PHP checks green. Known baseline failures remain unchanged and reproduced on clean production.

## Must preserve
Bundle parent pricing; Bundle-child `Included`; unresolved non-Bundle blanks; already-correct Cart/Total Commitment/Plan Details/email; quote snapshot authority; Initial Payment/TCV; Upgrade/add-on behavior.

## Claude — next action
Fast-forward **exactly `22b1ff3619363fef80beadd8cb944d2560f4571f`** to `main` unchanged. Do not amend or add source changes.

After push:
1. record exact `main` SHA/tree;
2. record `Deploy to Hostinger` run id + conclusion;
3. verify `review/proposal-bundle-child-included` is an ancestor of `main`, then delete it local + remote;
4. set **AWAITING LIVE VALIDATION** and stop.

## Live validation after deployment
Review & Finalise, View Full Quote and Print/Save-PDF must show the Bundle parent price and Bundle children `Included`, with no `Contact Us` on children. Cart quick view, Total Commitment, Plan Details and email must remain unchanged and correct.

---

## Claude Report — production push (proposal Bundle-child) — 2026-09-11

### 1. Production `main`
- SHA: **`22b1ff3619363fef80beadd8cb944d2560f4571f`**
- Tree: **`c1505f2e3021a8ee9f8e563bd9a0db722ffc75bd`**

`main` is the approved candidate exactly — same SHA and same tree. Pure
fast-forward; nothing amended, rebased or added.

### 2. Deployment
- Workflow: **`Deploy to Hostinger`**
- Run id: **`34487644025`**
- Head SHA: `22b1ff3619363fef80beadd8cb944d2560f4571f`
- Attempt: **1**
- Status/conclusion: `completed` / **`success`**

Read from the GitHub Actions API for that exact head SHA (one run reported for
the commit). It was still `in_progress` immediately after the push and was
watched through to completion rather than assumed.

### 3. Branch hygiene — done
`review/proposal-bundle-child-included` resolved to
`22b1ff3619363fef80beadd8cb944d2560f4571f`, i.e. exactly production `main`:
`git merge-base --is-ancestor` -> ancestor, and
`git rev-list --left-right --count origin/main...review/proposal-bundle-child-included`
-> `0 0`, no divergence in either direction. Deleted from `origin` and locally.
`origin` now carries only `main` and `Project-work-instructions`.

No source was changed in this round.

### 4. Status
Set to **AWAITING LIVE VALIDATION**.

### What to check live
**Must now be fixed** — Bundle parent shows its real price, every Bundle child
reads `Included`, and no `Contact Us` appears on a child, on all three:
1. **Review & Finalise**
2. **View Full Quote** (standalone quote-view)
3. **Print / Save-as-PDF** from that frontend quote

**Must be unchanged and still correct** — these were already passing and no
behavior was altered for them, so any difference here is a regression, not a
fix:
4. Cart quick view
5. Total Commitment disclosure
6. Full Plan Details
7. The customer email (no PHP was touched at all)

One boundary worth a deliberate look while testing: a genuinely unpriced
**non-Bundle** inclusion must still render blank money, **not** `Included`.
That is the one place an over-broad fix to this would show, and it is
contract-covered but only live testing proves the real snapshot shape.

### Work item state
Every correction in this file is now deployed:
- Bundle children in compact disclosures (live-validated);
- Upgrade preserved across Tier/Edition swaps (live-validated);
- duplicate Recommendations CTA suppressed (live-validated);
- Bundle children on Review/quote-view/print (this round, awaiting validation).

Once the four surfaces above check out, this file has no further
implementation and can be closed.

### Still open, separately
- **`2026-09-10-cart-initial-payment-addons.md`** remains at
  `AWAITING LIVE VALIDATION — DEFERRED BY NATH`. Its check (KAIROS add-on +
  replacement OMNIA primary; Cart, Review & Finalise, proposal/PDF and email
  agreeing on Initial Payment, TCV unchanged) is still outstanding and has now
  been deployed for two rounds.
- **`regression:composable-quote-cart-loop`** is still red on production `main`
  as a pre-existing baseline issue, untouched by any candidate in this file and
  still awaiting a decision on whether it gets its own work item.
