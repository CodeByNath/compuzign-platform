# Cart Bundle + Upgrade Refinements

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `8406252c421f2adfb65eba5a54464b039f7f4550`.
- Review branch: `review/cart-bundle-upgrade-refinements` @ `71773ead49c736aec8779ee57ccdf4f31d021470`, exactly **1 ahead / 0 behind** production.
- **SOURCE PUSH NOT APPROVED.**

## Audit result
Both requested fixes are functionally correct.

### Bundle compact disclosure
`InclusionDisclosurePanel` now uses the already-carried `isChild` fact:
- Bundle parent keeps its real price/line total.
- Bundle children render **Included / Included**.
- Only non-child rows with an actual numeric `lineTotal` contribute to the compact Total.
- `undefined` can no longer reach the reducer or `formatPrice()`, removing `$NaN` / accidental `Contact Us` without globally treating unresolved rows as Included.

This preserves the established View Details Bundle semantics and keeps Cart quick view + Total Commitment aligned through the same shared renderer.

### Upgrade preservation + CTA
`replaceFamilyNormalQuoteItem()` now replaces only the primary and carries existing composable/Upgrade and add-on lines through unchanged. Tier/Edition swaps therefore preserve the exact Upgrade snapshot rather than repricing/rebuilding it.

Recommendations now suppresses the pending **Upgrade your build / Browse Catalogue** CTA when `selectedComposableItem` already exists. The guard is role-derived and narrowed to `pending`, so Manage build (`browsing`) still works. The CTA returns automatically after explicit Upgrade removal.

The old contract assertions that required Upgrade deletion on Tier/Edition swap encoded the superseded rule; their rewrites are accepted.

## Required correction before push approval
`quote.ts` still contains stale comments contradicting the accepted implementation:
1. `upsertFamilyComposableQuoteItem()` says the reverse direction — a primary being removed **or swapped** — drops the Upgrade via `replaceFamilyNormalQuoteItem()` / `removeFamilyTierSystemQuoteItems()`.
2. `removeFamilyComposableQuoteItem()` likewise says removing/**swapping** the primary drops it.
3. The new `replaceFamilyNormalQuoteItem()` doc says the Upgrade leaves only when explicitly removed/replaced, but whole-system primary removal still intentionally cascades through `removeFamilyTierSystemQuoteItems()`.

Correct only these comments so the rule is precise: **primary Tier/Edition replacement preserves Upgrade; removing the Family Tier system still removes it under the existing no-standalone-Upgrade rule.** No behavior change.

Then rebuild one clean candidate from current production `main` (single commit, 1 ahead / 0 behind), re-run the focused regression/contracts, and return at **AWAITING CHATGPT REVIEW**. Do not push `main`.

## Must preserve
Exact Upgrade snapshot on Tier/Edition swap; no duplicate CTA while Upgrade exists; Manage build; whole-system removal cascade; Bundle child Included semantics; genuine unresolved non-Bundle behavior; add-ons; cart ordering; pricing/Rate Sheet authority.

## Must not substitute
No route redesign, no Tier-attached Upgrade identity, no live repricing, no global `undefined => Included`, no disabling whole-system cleanup, no label matching.

## Note
`regression:composable-quote-cart-loop` is reported red on clean `main` as well. Treat as a separate baseline issue unless later evidence ties it to this candidate.

---

## Claude Report — round 2 (comment cleanup + clean candidate) — 2026-09-10

### Final candidate
- Branch: `review/cart-bundle-upgrade-refinements` (same name reused).
- Candidate head: **`71773ead49c736aec8779ee57ccdf4f31d021470`**
- Tree: **`4127e39c87b96226cdba37b64d3d6f12f90ea70d`**
- Parent: production `main@8406252c421f2adfb65eba5a54464b039f7f4550`.
- **1 ahead / 0 behind production.**
- `origin` carries only `main`, `Project-work-instructions` and this one review branch. The superseded 2-commit stack is gone.

### Required correction — all three comments fixed
No behavior changed. Verified mechanically: every changed line in `quote.ts`
is a comment line (the diff contains no non-comment `+`/`-` line), and the
built bundles are byte-identical, since comments strip out at build.

1. **`upsertFamilyComposableQuoteItem()`** — previously "the reverse
   direction — a primary being removed **or swapped** — drops this line — is
   replaceFamilyNormalQuoteItem()'s/removeFamilyTierSystemQuoteItems()'s job".
   Now states that only the whole Family Tier system being REMOVED drops the
   line, that this is `removeFamilyTierSystemQuoteItems()`'s job alone, and
   that a primary Tier/Edition REPLACEMENT is deliberately not part of that
   cascade because an Upgrade belongs to the Family, not the Tier/Edition.

2. **`removeFamilyComposableQuoteItem()`** — previously "the reverse cascade
   — removing/**swapping** the primary also drops this line — lives in
   removeFamilyTierSystemQuoteItems()/replaceFamilyNormalQuoteItem() above".
   Now names only `removeFamilyTierSystemQuoteItems()`, and says explicitly
   that swapping the primary Tier/Edition is NOT part of that cascade.

3. **`replaceFamilyNormalQuoteItem()`** — my own new docblock ended "the
   Upgrade line now leaves the cart only when the customer explicitly removes
   or replaces the Upgrade itself", which omitted the whole-system cascade
   and so read as more absolute than the real rule. Now states both halves: a
   primary Tier/Edition replacement never removes the Upgrade; it also leaves
   when the whole Family Tier system is removed and
   `removeFamilyTierSystemQuoteItems()`'s existing no-standalone-Upgrade
   cascade clears it alongside the primary and every Add-on.

### Sweep for other traces
Grepped source, contracts and docs for any remaining claim that a swap drops
the Upgrade — none found. Two accurate mentions of the superseded framing were
deliberately left alone:

- `quote.ts`'s `removeFamilyTierSystemQuoteItems()` docblock still explains the
  Phase 0 no-standalone reasoning, which remains the live rule for
  whole-system removal;
- `replaceFamilyNormalQuoteItem()`'s own docblock describes the old
  Tier-dependency as history ("previously… That dependency is no longer the
  rule"), which is the correct framing for why the code changed.

One adjacent line I did **not** touch, per "correct only these comments":
`composable-quote-cart-contract.ts:261` still says "removing the primary ALSO
removes the **dependent** Upgrade line". The behavior it asserts is the
whole-system removal cascade and is correct; only the word "dependent" carries
the old framing. Say the word and I will tighten it.

### Clean candidate
Rebuilt as a single commit parented on production `main` rather than pushing
the 2-commit stack. Verified equivalence: the candidate tree `4127e39c` is
**byte-identical** to the reviewed-and-corrected working tree (`git diff`
between them is empty). Nothing was re-derived into the new commit.

### Re-run on the rebuilt candidate
`npm run build` reproduces the committed `dist/` exactly (working tree clean
after a fresh build from the candidate itself).

Green: `regression:cart-bundle-upgrade-refinements` (33 checks),
`contract:composable-quote-cart`, `contract:composable-recommendations-cta`,
`contract:package-family-cart`, `contract:quote-cart-addon`,
`contract:composable-offer-eligibility`, `contract:composable-live-correction`,
`contract:composable-request-line`, `contract:cost-builder-isolation`,
`contract:package-builder-regression-lock`,
`contract:request-flow-family-tier-parity`,
`regression:cart-initial-payment-addons` (24), `npx tsc --noEmit`,
`npm run build`, `npm run docs:check`.

Unchanged pre-existing baseline failures (all previously verified as failing
on clean `main`): `contract:package-builder-flow`,
`contract:platform-identity-schema`, `regression:composable-quote-cart-loop`,
`php tests/tier-capability-invariants.php`,
`php tests/quote-view-http-boundary.php`,
`php tests/quote-view-email-link.php`.

### Diff summary — 13 files
| File | Change |
| --- | --- |
| `cost-builder/InclusionDisclosure.tsx` | Bundle-child Included semantics; numeric priced test |
| `utils/quote.ts` | Upgrade preserved on primary replacement; three docblocks corrected |
| `package-builder/FamilyTierAdapter.tsx` | shell-level CTA suppression gate |
| `scripts/cart-bundle-upgrade-refinements-regression.mjs` | new, 33 checks |
| `scripts/composable-quote-cart-contract.ts` | rule + disclosure assertions rewritten |
| `scripts/composable-recommendations-cta-contract.ts` | new property 10 |
| `package.json` | registers the regression |
| `dist/js/*` (6 files) | rebuilt bundles |

No source pushed to `main`.

### Status
Set to **AWAITING CHATGPT REVIEW**.
