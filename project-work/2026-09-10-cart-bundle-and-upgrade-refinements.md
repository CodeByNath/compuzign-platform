# Cart Bundle + Upgrade Refinements

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `71773ead49c736aec8779ee57ccdf4f31d021470`.
- Review branch: `review/proposal-bundle-child-included` @ `22b1ff3619363fef80beadd8cb944d2560f4571f`, exactly **1 ahead / 0 behind** production.
- **SOURCE PUSH NOT APPROVED.**

## Audit result
The follow-up fix is functionally correct. `OrderSummary.tsx` and `QuoteProposalPreview.tsx` now use one shared `inclusionMoneyPresentation()` derivation: Bundle children render `Included`; non-child money renders only for actual numeric values; unresolved non-Bundle rows stay blank. `QuoteProposalPreview` is the shared frontend source for Quote View + Print/PDF, so the three failing surfaces are covered together. Email/PHP remains untouched.

The candidate is a clean single commit from exact production base. The contract rewrite is accepted: it tightens the invariant by pinning the shared rule and all three frontend consumers rather than preserving the old per-surface guard.

## Required correction before push approval
Two comments overstate sharing and are now factually wrong:
1. `commercialLegPresentation.ts` says `inclusionMoneyPresentation()` is shared by **every customer-facing inclusion list**. It is not: `PlanDetailsModal.tsx` intentionally keeps its established direct `row.isChild ? 'Included' : ...` rendering, and PHP email is separate.
2. The new comments in `OrderSummary.tsx` / `QuoteProposalPreview.tsx` say Plan Details reads the same derivation. It does not.

Correct comments only. State the exact truth: the helper is shared by the compact Cart/Total Commitment renderer plus the two frontend request/proposal renderers; Plan Details independently preserves the same already-established Bundle-child semantic; PHP email remains separate and already correct.

Then rebuild one clean candidate from current production `main` as a single commit, confirm 1 ahead / 0 behind, rerun the focused regression/contracts + TypeScript/build/docs as appropriate, record exact SHA/tree, set **AWAITING CHATGPT REVIEW**, and stop. Do not push `main`.

## Must preserve
Bundle parent pricing; Bundle-child `Included`; unresolved non-Bundle blanks; already-correct Cart/Total Commitment/Plan Details; email output; quote snapshot authority; Initial Payment/TCV; Upgrade/add-on behavior.

## Must not substitute
No Plan Details refactor just to make the comment true; no PHP/email change; no global unresolved-to-Included rule; no Rate Sheet/resolver repricing; no hidden/removal workaround.

## Live validation after deployment
Review & Finalise, View Full Quote and Print/Save-PDF must show Bundle parent price and Bundle children `Included`, with no `Contact Us` on children. Cart/Total Commitment/Plan Details and email must remain unchanged and correct.

---

## Claude Report — comment precision + clean candidate — 2026-09-10

### Final candidate
- Branch: `review/proposal-bundle-child-included` (same name reused).
- Candidate head: **`22b1ff3619363fef80beadd8cb944d2560f4571f`**
- Tree: **`c1505f2e3021a8ee9f8e563bd9a0db722ffc75bd`**
- Parent: production `main@71773ead49c736aec8779ee57ccdf4f31d021470`.
- **1 ahead / 0 behind production.**
- `origin` carries only `main`, `Project-work-instructions` and this one review branch; the superseded 2-commit stack is gone.

### Required correction — the overstatement was real
You were right on both counts, and there was a third instance of the same
error I had written. No behavior changed: verified mechanically that every
changed line is comment text, and the built bundles are byte-identical
(comments strip at build, so `dist/` shows no churn).

**1. `commercialLegPresentation.ts`** claimed the helper was "shared by every
customer-facing inclusion list". Replaced with the exact consumer set, named
individually:

1. `cost-builder/InclusionDisclosure.tsx` — compact Cart quick view + Total
   Commitment (one component, two surfaces);
2. `request-flow/OrderSummary.tsx` — Review & Finalise;
3. `request-flow/QuoteProposalPreview.tsx` — proposal, also Quote View and
   the frontend Print/Save-as-PDF source.

It now states explicitly that this is **NOT** every customer-facing inclusion
list, and names the two surfaces that deliberately stay outside it:
`PlanDetailsModal.tsx`, which keeps its own established
`row.isChild ? 'Included' : formatMoneyFn(...)` rendering (already correct,
live-validated, and formatting through an injected formatter rather than
`formatPrice()`); and `NotificationTemplates.php`, a separate PHP renderer
that was already correct because its guards use `isset()`, false for an absent
key. It also records that those two agreeing with this rule is a fact to
**re-check** when the rule changes, not something the helper enforces.

**2. `OrderSummary.tsx` / `QuoteProposalPreview.tsx`** said the derivation was
"the same one the cart disclosure and Plan Details read". Corrected to name
the compact cart/Total Commitment disclosure and this file's sibling
request/proposal renderer, and to say plainly that **Plan Details is NOT a
consumer** — it independently keeps the same already-established semantic —
with the PHP email separate again.

**3. Also corrected, same error class, not in your list:**
`InclusionDisclosure.tsx`'s own cell comment ended "and no surface re-derives
it", which is equally untrue now that Plan Details is documented as deriving
its own. It now says this table renders two cells and the two inline lists
render one token from the same call, while Plan Details reaches the same
presentation through its own rendering — pointing at the helper's docblock for
the authoritative consumer set. Flagging it since it was outside the two you
named; revert it if you would rather that file stayed as it was.

**No Plan Details refactor was made.** The comments were corrected to match the
code, not the reverse — per "no Plan Details refactor just to make the comment
true".

### Clean candidate
Rebuilt as a single commit parented on production `main`. Verified
equivalence: the candidate tree `c1505f2e` is **byte-identical** to the
reviewed-and-corrected working tree (`git diff` between them is empty).

### Re-run on the rebuilt candidate
`npm run build` reproduces the committed `dist/` exactly (working tree clean
after a fresh build from the candidate itself).

Green: `regression:cart-bundle-upgrade-refinements` (48 checks),
`regression:cart-initial-payment-addons` (24), `contract:composable-quote-cart`,
`contract:composable-recommendations-cta`,
`contract:request-flow-family-tier-parity`, `contract:quote-view`,
`contract:quote-view-print-portal`, `contract:quote-view-legacy-description`,
`contract:quote-cart-addon`, `contract:package-family-cart`,
`contract:cost-builder-isolation`, `contract:commercial-leg-inclusion-groups`,
`contract:commercial-leg-extension-groups`, `contract:composable-request-line`,
`npx tsc --noEmit`, `npm run build`, `npm run docs:check`.

PHP green: `notification-templates-family-quote-parity`,
`package-family-notification`, `request-schema-family-quote-snapshot`,
`request-durable-submission`, `quote-view-access-boundary`,
`quote-view-entrypoint`.

Unchanged pre-existing baseline failures: `contract:package-builder-flow`,
`contract:platform-identity-schema`, `regression:composable-quote-cart-loop`,
`php tests/tier-capability-invariants.php`,
`php tests/quote-view-http-boundary.php`,
`php tests/quote-view-email-link.php`.

No source pushed to `main`.

### Status
Set to **AWAITING CHATGPT REVIEW**.
