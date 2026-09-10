# Cart Initial Payment Must Include Add-ons

## Status
- **AWAITING LIVE VALIDATION**
- Auditor verdict: **Proceed**.
- Production `main`: `8406252c421f2adfb65eba5a54464b039f7f4550` (was `1a9b6cc0322e662dbad233532c44bd1ad40bbe30` before this push).
- Approved candidate pushed to `main`; review branch deleted. Production `main` is now `8406252c421f2adfb65eba5a54464b039f7f4550`.
- Candidate tree: `b93fd1fa224aff51ef50eddf869df4694a5137fc`.
- Independent GitHub compare: **1 ahead / 0 behind**, merge base exact production `1a9b6cc0`.

## Defect
KAIROS primary + add-on can be quoted; replacing the KAIROS primary with OMNIA correctly leaves the KAIROS add-on in the Cart, but Initial Payment previously omitted that surviving add-on's starting charge.

## Accepted correction
Initial Payment is now consistently derived from every surviving Family Tier line with valid `legPaymentSummaries`: primary + composable/Upgrade + add-on. The existing helper semantics remain unchanged: each item contributes only streams at its own earliest `startMonth`, same-cycle starts aggregate, later-starting Legs do not join the initial figure.

Total Contract Value remains on the existing primary/composable-only population. No add-on finite subtotal was added to TCV.

The same population correction is carried through:
- Cart `QuoteSummary.tsx`;
- Review & Finalise `OrderSummary.tsx`;
- proposal/PDF/Quote View shared `QuoteProposalPreview.tsx`;
- PHP email `NotificationTemplates.php`.

The stale comments were corrected to document the two different populations explicitly. The rewritten parity assertions are accepted: they now separately pin TCV and Initial Payment rather than preserving the superseded shared-population bug.

## Independent review
GitHub confirms one clean candidate commit from current production, not the earlier review stack. Expected source, PHP renderer, tests/contracts, package script entry and generated bundles only are changed. OrderSummary and QuoteProposalPreview now clearly retain `familyCommercialItems` for TCV and use `familyInitialPaymentItems = [...familyCommercialItems, ...familyAddonItems]` only for Initial Payment.

Claude reports the new regression (24 checks), relevant quote/request/PDF/email contracts, TypeScript, build, docs and affected PHP tests green; listed baseline failures reproduce on clean production and are outside this change.

## Must preserve
Surviving add-ons; cart ordering; quote snapshots; per-item payment rows; per-item earliest-start semantics; same-cycle aggregation; current TCV population; ongoing/finite disclosure; quantity; composable behavior; legacy fallback; email/PDF structure.

## Must not substitute
No deleting/reparenting add-ons; no TCV broadening; no flat-price fabrication; no live Rate Sheet re-resolution; no second Initial Payment algorithm; no cross-cycle arithmetic.

## Claude — next action
Fast-forward **exactly `8406252c421f2adfb65eba5a54464b039f7f4550`** to `main`; do not amend or add changes.

After push:
1. record exact `main` SHA/tree;
2. record `Deploy to Hostinger` run id + conclusion;
3. verify review branch is ancestor of `main`, delete it locally/remotely;
4. set **AWAITING LIVE VALIDATION** and stop.

## Live validation
Reproduce KAIROS add-on + replacement OMNIA primary. Add-on remains. Cart, Review & Finalise and proposal/PDF must show the same Initial Payment including OMNIA starting charge(s) plus the surviving KAIROS add-on's own starting charge(s), excluding later-starting Legs. Email must match if submitted. TCV must remain unchanged.

---

## Claude Report — production push — 2026-09-10

### 1. Production `main`
- SHA: **`8406252c421f2adfb65eba5a54464b039f7f4550`**
- Tree: **`b93fd1fa224aff51ef50eddf869df4694a5137fc`**

`main` is the approved candidate exactly — same SHA and same tree as the
head approved above. Nothing was amended, rebased or added during the push;
it was a pure fast-forward of the reviewed commit.

### 2. Deployment
- Workflow: **`Deploy to Hostinger`**
- Run id: **`34460597631`**
- Head SHA: `8406252c421f2adfb65eba5a54464b039f7f4550`
- Attempt: **1**
- Status/conclusion: `completed` / **`success`**

Read from the GitHub Actions API for that exact head SHA, which reports
exactly one run for the commit.

### 3. Branch hygiene — done
`review/cart-initial-payment-addons` resolved to
`8406252c421f2adfb65eba5a54464b039f7f4550`, i.e. exactly production `main`:
`git merge-base --is-ancestor` -> ancestor, and
`git rev-list --left-right --count origin/main...review/cart-initial-payment-addons`
-> `0 0`, no divergence in either direction. Deleted from `origin` and
locally. `origin` now carries only `main` and `Project-work-instructions`.

No source was changed in this round.

### 4. Status
Set to **AWAITING LIVE VALIDATION**.

### What Nath should see
Quote a KAIROS primary plus a KAIROS add-on, then replace the primary with
OMNIA. The KAIROS add-on stays in the cart (unchanged behavior). Initial
Payment must now read the same figure in the Cart, in Review & Finalise and
in the proposal/PDF — OMNIA's own starting charge(s) **plus** the surviving
KAIROS add-on's own starting charge(s) — with no later-starting Leg included.
If the quote is submitted, the confirmation email must show the same figure.

Total Contract Value must be unchanged from before this deploy: it still
counts primary and composable lines only, so the add-on's own subtotal must
NOT appear in it. A TCV that moved is a defect, not a success.
