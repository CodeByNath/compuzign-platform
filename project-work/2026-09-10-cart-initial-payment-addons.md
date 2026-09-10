# Cart Initial Payment Must Include Add-ons

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `1a9b6cc0322e662dbad233532c44bd1ad40bbe30`.
- Current review branch: `review/cart-initial-payment-addons` @ `8406252c421f2adfb65eba5a54464b039f7f4550`, 1 ahead / 0 behind production.
- **SOURCE PUSH NOT APPROVED.**

## Audit result
Round 2 fixes the actual customer-state split correctly. Cart, Review & Finalise and proposal/PDF now feed Initial Payment from the whole Family population (primary + composable + add-on), while Total Contract Value remains on its existing primary/composable population. `NotificationTemplates.php` had the same independent omission and is corrected the same way; its Contract Value path remains unchanged.

The rewritten parity assertions are acceptable: the old assertions encoded the defective shared population. The new checks distinguish TCV population from Initial Payment population and are therefore stricter, not weaker.

Independent GitHub compare confirms the branch is based exactly on production and changes only the expected customer/request/email presentation, regression/contract, package script entry and generated bundles.

## Safeguards still required before push approval
1. **Fix stale source comments** in `OrderSummary.tsx` and `QuoteProposalPreview.tsx`. Both still describe “same primary-only Total Contract Value / Initial Payment semantics” and say Family add-ons never enter the combined sum. That is now false and would misdocument the accepted rule. Rewrite only those comments so they clearly say TCV is primary/composable-only while Initial Payment is whole-Family-line.
2. Per branch-hygiene rules, do not ask to push a 2-commit review stack. After the comment correction, produce one clean candidate head from current production `main@1a9b6cc0` containing the accepted final tree for this work item. Reuse the same review branch name if practical; do not leave a superseded review branch.
3. Re-run the focused regression/parity checks affected by the comment-only correction plus TypeScript/build/docs as needed for the rebuilt final candidate. Record exact candidate SHA, tree/diff summary, and confirm 1 ahead / 0 behind production.
4. Stop at **AWAITING CHATGPT REVIEW**. Do not push `main`.

## Must preserve
Surviving add-ons; cart ordering; exact quote snapshots; per-item payment rows; each item's own earliest-start semantics; same-cycle aggregation only; current TCV population; ongoing/finite disclosure; quantity; composable/Upgrade behavior; legacy Cost Builder fallback; email/PDF structure.

## Must remove
Primary/composable-only population from **Initial Payment** on every customer surface, plus the stale comments that still claim that old behavior.

## Must not substitute
Do not delete surviving add-ons; reattach them to another Family; broaden TCV; fake flat add-on pricing; re-resolve Rate Sheets; change the helper algorithm; invent cross-cycle arithmetic; or weaken customer parity tests.

## Live validation after deployment
Reproduce KAIROS add-on + replacement OMNIA primary. The add-on remains. Cart, Review & Finalise, proposal/PDF and email must agree on Initial Payment and include the surviving add-on's own starting charge(s), excluding later-starting Legs. TCV behavior must remain unchanged.

---

## Claude Report — round 3 (safeguards) — 2026-09-10

### Final candidate
- Branch: `review/cart-initial-payment-addons` (same name reused).
- Candidate head: **`8406252c421f2adfb65eba5a54464b039f7f4550`**
- Tree: **`b93fd1fa224aff51ef50eddf869df4694a5137fc`**
- Parent: production `main@1a9b6cc0322e662dbad233532c44bd1ad40bbe30`.
- **1 ahead / 0 behind production** (`git rev-list --left-right --count origin/main...origin/review/cart-initial-payment-addons` -> `0 1`).
- `origin` carries only `main`, `Project-work-instructions` and this one review branch. No superseded branch left behind.

### Safeguard 1 — stale comments corrected
Both files still opened their totals block with "same primary-only Total
Contract Value / Initial Payment semantics … Family add-ons never enter this
combined sum". Rewritten in `OrderSummary.tsx` and `QuoteProposalPreview.tsx`
to state the accepted rule explicitly: `familyCommercialItems` is the TCV
population (primary + composable, add-ons deliberately out, because no
canonical finite-contract math exists for them yet), `familyInitialPaymentItems`
is the Initial Payment population (primary + composable + add-on, because a
surviving add-on is genuinely charged at its own start). The composable line's
membership of both, and the "same shared primitives, never a second
re-derivation" point, are preserved.

**One addition beyond the two files named.** `NotificationTemplates.php`
carried the same now-false claim in `buildQuoteSections()` — "it joins the
combined Family Contract Value/Initial Payment sum below" — which describes
one shared sum. Corrected the same way, since leaving it would have
misdocumented the accepted rule in the third renderer. Flagging it as beyond
the literal instruction; revert it if you would rather it stayed.

Swept the tree afterwards: the only surviving "primary-only Initial Payment"
strings are the two new directional assertions in the email test, which
correctly describe the **superseded** `$5,490.00` figure. No Code Map or doc
mentions Initial Payment at all, so none needed updating.

### Safeguard 2 — one clean candidate, no 2-commit stack
Rebuilt as a single commit whose parent is production `main`, rather than
pushing the round 1 + round 2 stack. Verified equivalence: the candidate tree
`b93fd1fa` is **byte-identical** to the reviewed-and-corrected working tree
(`git diff` between them is empty). Nothing was re-derived or re-typed into
the new commit.

### Safeguard 3 — re-run on the rebuilt candidate
`npm run build` reproduces the committed `dist/` exactly (working tree clean
after a fresh build), so the bundles in this commit match its own source.

Green: `regression:cart-initial-payment-addons` (24 checks),
`contract:request-flow-family-tier-parity`, `contract:cost-builder-isolation`,
`contract:tier-addon-flow`, `contract:tier-edition-switch`,
`contract:quote-sidebar-scroll`, `contract:quote-view`,
`contract:quote-view-print-portal`, `contract:quote-view-legacy-description`,
`contract:quote-cart-addon`, `contract:request-flow-rail-scroll`,
`contract:package-family-cart`, `contract:package-builder-regression-lock`,
`contract:commercial-leg-inclusion-groups`,
`contract:commercial-leg-extension-groups`,
`contract:package-family-request-flow`, `npx tsc --noEmit`, `npm run build`,
`npm run docs:check`.

PHP green: `notification-templates-family-quote-parity`,
`package-family-notification`, `request-schema-is-addon`,
`request-schema-minimum-term`, `request-schema-family-quote-snapshot`,
`request-schema-legacy-snapshot-description`, `request-durable-submission`,
`quote-view-access-boundary`, `quote-view-entrypoint`,
`tier-instance-public-projection`, `tier-public-projection-is-addon`,
`tier-pricing-parity`, `tier-edition-public-projection`.

Unchanged pre-existing baseline failures (all four fail identically on clean
`main`): `contract:platform-identity-schema`,
`php tests/tier-capability-invariants.php`,
`php tests/quote-view-http-boundary.php`,
`php tests/quote-view-email-link.php`.

### Diff summary — 11 files
| File | Change |
| --- | --- |
| `cost-builder/QuoteSummary.tsx` | Initial Payment reads whole `familyTierItems` |
| `request-flow/OrderSummary.tsx` | `familyInitialPaymentItems` + comment corrected |
| `request-flow/QuoteProposalPreview.tsx` | same |
| `Notifications/NotificationTemplates.php` | `familyInitialPaymentRow()` population + comments |
| `tests/notification-templates-family-quote-parity.php` | `$5,589.00`, superseded figure asserted absent |
| `scripts/request-flow-family-tier-parity-contract.ts` | two populations pinned separately |
| `scripts/cart-initial-payment-addons-regression.mjs` | new, 24 checks |
| `package.json` | registers the regression script |
| `dist/js/cost-builder.js`, `dist/js/admin-station.js`, `dist/js/QuoteProposalPreview-CeadC4q_.js` | rebuilt bundles |

No source pushed to `main`.

### Status
Set to **AWAITING CHATGPT REVIEW**.
