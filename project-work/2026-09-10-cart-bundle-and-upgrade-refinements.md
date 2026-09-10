# Cart Bundle + Upgrade Refinements

## Status
- **AWAITING CHATGPT REVIEW**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `8406252c421f2adfb65eba5a54464b039f7f4550`.
- Prior Initial Payment live validation is explicitly deferred by Nath; no source correction belongs to that file now.

## Issue 1 — Bundle children in compact disclosures
Live screenshots show Cart quick view and Total Commitment disclosure render Bundle children as `Contact Us` and produce `Total $NaN`, while the established View Details renderer correctly shows Bundle children as `Included` / `Included` and totals only the priced Bundle parent.

Source confirms the compact path already carries `row.isChild`, but `InclusionDisclosurePanel` ignores it for Unit price / Line total and treats `undefined` line totals as priced because it checks only `!== null`. `formatPrice(undefined)` becomes `Contact Us`; reducing `undefined` produces `NaN`.

### Required correction
Use the already-established Bundle-child semantic in the shared compact disclosure:
- Bundle parent keeps its resolved Unit price / Line total.
- Bundle children render **Included** in Unit price and Line total.
- Bundle children never participate in the compact disclosure Total.
- Cart quick view and Total Commitment disclosure stay identical because both use the same shared component.
- Preserve genuine non-Bundle unresolved pricing behavior; do not globally map unknown values to `Included`.

## Issue 2 — Family Upgrade survives Tier swaps; suppress duplicate CTA
Current `replaceFamilyNormalQuoteItem()` still removes the composable line when `tierOccupantId` or `tierEditionPlatformId` changes. That is stale. Nath's rule is simpler: **Upgrade Your Build belongs to the Family, not the selected Tier/Edition.**

### Required correction
- Swapping primary Tier or Edition within the same Family must **preserve the existing composable/Upgrade cart line unchanged**.
- Do not reprice, rebuild, reattach or mutate that Upgrade snapshot when the Tier changes.
- The Upgrade line remains until the customer explicitly removes/replaces the Upgrade itself.
- If that Family already has a composable/Upgrade line in the cart, **do not show the Upgrade Your Build CTA in Recommendations**. No duplicate Browse Catalogue entry while the Upgrade is already quoted.
- Preserve the existing Manage-build path for an already-quoted Upgrade.

## Claude — implementation
From current production `main`, create one review branch for BOTH refinements.
1. Fix `InclusionDisclosurePanel` using existing `isChild` semantics; no new pricing source.
2. Fix `replaceFamilyNormalQuoteItem()` so primary Tier/Edition replacement does not delete composable lines for the same Family/Tier system.
3. Find the Recommendations CTA visibility derivation and gate it off when the current Family already has a composable line in cart; reuse existing quote-role/system-key helpers rather than label matching.
4. Add/extend focused regressions for both defects, including: Bundle parent $4,000 + child Included rows + total $4,000/no NaN; Tier A→Tier B and Edition A→Edition B preserve exact Upgrade snapshot; CTA absent when Upgrade exists and returns when Upgrade is explicitly removed.
5. Preserve existing add-on, cart ordering, Manage build, quote identity, pricing, and View Details behavior.
6. Run relevant cart/package-builder/composable/request contracts, TypeScript, build, docs. Push review branch only, record exact SHA/diff/tests here, set **AWAITING CHATGPT REVIEW**, stop. Do not push `main`.

## Must preserve
Bundle parent pricing; View Details semantics; genuine unresolved non-Bundle pricing; exact Upgrade snapshot; cart ordering; add-ons; Manage build; Family/Tier identity; quote persistence; pricing/Rate Sheet authority.

## Must remove
`Contact Us`/`$NaN` for Bundle children in compact disclosures; automatic Upgrade deletion on same-Family Tier/Edition swap; duplicate Upgrade CTA when Upgrade already exists.

## Must not substitute
No global `undefined => Included`; no flat-price fabrication; no live Rate Sheet re-resolution; no Tier-attached Upgrade identity; no hidden orphan cleanup workaround; no label/string matching; no duplicate composable line; no route redesign.

---

## Claude Report — 2026-09-10

Review branch `review/cart-bundle-upgrade-refinements`, cut from production
`main@8406252c421f2adfb65eba5a54464b039f7f4550`, pushed at
**`9d3914724f1d1f0f7e86c6c03cb59c104360fbac`** (1 ahead / 0 behind).
**Not merged to `main`.**

### Issue 1 — Bundle children in compact disclosures
Confirmed exactly as this file's audit describes. `InclusionDisclosurePanel`
already received `row.isChild` but ignored it for the money columns, and its
priced-row test was `row.lineTotal !== null` — so a snapshot row whose
`lineTotal` key is absent (`undefined`, not `null`) counted as priced:
`formatPrice(undefined)` renders the `Contact Us` placeholder, and reducing
`undefined` yields `NaN`.

Corrected in `cost-builder/InclusionDisclosure.tsx` using the already-established
semantic — the money cells branch on `isChild` first, identical to
`PlanDetailsModal.tsx`'s View Details table (`row.isChild ? 'Included' : …`):

- Bundle parent keeps its own resolved Unit price / Line total.
- Bundle children render **Included** in both money columns.
- The Total sums only genuinely priced NON-child rows.
- The priced test asks for an actual number, which removes the `NaN` path
  without inventing a pricing source. A genuinely unresolved **non-Bundle**
  row still renders blank and still stays out of the Total, exactly as a
  `null` lineTotal always did. Nothing is globally mapped to `Included` —
  only a real Bundle child is.

Cart quick view and Total Commitment stay identical because both render this
one shared component; no caller changed.

### Issue 2 — Upgrade survives Tier/Edition swaps
`replaceFamilyNormalQuoteItem()` (`utils/quote.ts`) compared the incoming
primary's `tierOccupantId`/`tierEditionPlatformId` against the outgoing one
and dropped the composable line when they differed. Composable lines are now
carried through untouched alongside add-ons; only the outgoing primary is
replaced. The **same snapshot object** survives — nothing repriced, rebuilt,
reattached or mutated.

The no-orphaned-standalone invariant the old rule protected still holds by
the paths that can genuinely orphan a line: `removeFamilyTierSystemQuoteItems()`
still cascades to the composable line, and `upsertFamilyComposableQuoteItem()`
still refuses to add one with no primary. A primary REPLACEMENT always leaves
a primary behind, so it cannot produce a standalone Upgrade. Both facts are
asserted, not assumed.

### Issue 2b — duplicate CTA suppressed
Gated the Recommendations CTA off when this Family+Instance already has a
quoted composable line. The Cart footer's own recovery route already applied
exactly this rule (`showUpgradeYourBuildFooter` -> `composableItem === null`),
so Recommendations was the only surface still advertising an upgrade the
customer had already made.

Resolved at the shell-level `upgradeGateActive` derivation in
`FamilyTierAdapter.tsx` rather than inside the Recommendations branch, so the
CTA, `hideAddonsInRecommendations` and the focused-shell active signal all read
ONE gate and cannot drift. It reads `selectedComposableItem` — the parent's own
`resolveQuoteItemRole()`-derived line — never a label or heading string.

Deliberately narrowed to the `'pending'` stage: `'browsing'` is the
Manage-build route INTO an existing Upgrade and must keep working, so the
existing Manage-build path is preserved. The CTA **returns on its own** once
the Upgrade is explicitly removed, because the gate is derived, not stored —
no reset state to keep in sync.

### Tests — new
`scripts/cart-bundle-upgrade-refinements-regression.mjs`, registered as
`npm run regression:cart-bundle-upgrade-refinements`. **33 checks, all passing.**

Mounts the real `InclusionDisclosurePanel` via happy-dom + Preact and asserts
the **rendered DOM** (these are rendering facts), then exercises the pure cart
helpers directly:

- Bundle parent **$4,000** + two children reading **Included / Included**,
  Total **$4,000**, and explicit assertions that the panel contains no `NaN`
  and no `Contact Us` anywhere;
- children keep their existing indent class;
- a child that *does* carry a resolved number still reads Included and still
  stays out of the Total;
- genuine non-Bundle unresolved rows still blank, still excluded, and
  `Included` absent from that render entirely;
- ordinary priced rows still total normally; sectioned (Commercial Leg)
  disclosures still show no combined grand total;
- Tier A→B and Edition A→B each preserve the Upgrade **by object identity**,
  with its `composableSelection` preserved by reference, its price unchanged
  and its own occupant id never reattached to the new primary;
- repeated swaps keep exactly one Upgrade line; another Family's swap touches
  neither this Family's Upgrade nor its primary;
- Tier-System removal still cascades to the Upgrade.

**Directional proof, each fix independently:** reverting Issue 1 fails with
`got Included / Contact Us`; reverting Issue 2 fails
`a Tier swap PRESERVES the existing Upgrade line`; reverting the CTA gate
fails the CTA contract's own new assertion.

### Tests — contracts extended
`composable-recommendations-cta-contract.ts` gained property 10, locking the
suppression: the tier-scoped stage stays its own value, the cart-state gate
composes with it, it reads the role-derived cart line rather than a label, it
never touches `'browsing'`, both CTA consumers still read the single gate, and
the gate is derived exactly once (no parallel test elsewhere in the file).

---

## Two locked assertions changed — flagging explicitly

Both encoded the superseded Phase 0 rule. Neither was relaxed to make the
build pass; each asserts at least as much as before.

**`scripts/composable-quote-cart-contract.ts`, property 2** asserted that
swapping the base to a different Tier/Edition **drops** the Upgrade, with an
identity safeguard anchored on `tierOccupantId`. That is precisely the
behavior this work item reverses. Rewritten to the new rule and made
*stronger*: it now proves the preserved line is the **same snapshot object**
with its `composableSelection` preserved **by reference** — not merely
present — across Tier swap, Edition swap, different-occupant and reissued-
Platform-ID cases, and adds cross-Family isolation plus a repeated-swap
no-duplication check. The orphan invariant the old assertion existed to
protect is still asserted, via the removal-cascade section.

**The same contract's disclosure-formatting assertion** pinned the literal
expression `row.lineTotal !== null ? formatPrice(row.lineTotal) : ''`. Its
stated property — the ONE shared `formatPrice()`, never invented for an
unresolved value, never a second formatter — is unchanged and still asserted
against the new expression, with two assertions added for the Bundle-child
rule and the non-child Total.

Please confirm both rewrites. If either invariant was meant to survive this
change, say so and I will revisit rather than assume.

---

## Validation

Green: `regression:cart-bundle-upgrade-refinements` (33),
`regression:cart-initial-payment-addons` (24), `contract:composable-quote-cart`,
`contract:composable-recommendations-cta`, `contract:composable-edition-resolution`,
`contract:composable-live-correction`, `contract:composable-occupant-address`,
`contract:composable-occupant-workspace`, `contract:composable-offer-choice`,
`contract:composable-offer-contribution`, `contract:composable-offer-eligibility`,
`contract:composable-request-line`, `contract:composable-tier-admin-ux`,
`contract:package-family-cart`, `contract:quote-cart-addon`,
`contract:tier-addon-flow`, `contract:cost-builder-isolation`,
`contract:package-builder-regression-lock`, `contract:package-builder-customer-tabs`,
`contract:request-flow-family-tier-parity`, `contract:commercial-leg-inclusion-groups`,
`contract:commercial-leg-extension-groups`, `contract:tier-edition-switch`,
`contract:quote-view`, `contract:quote-view-print-portal`,
`contract:quote-view-legacy-description`, `contract:quote-sidebar-scroll`,
`contract:request-flow-rail-scroll`, `contract:package-family-request-flow`,
`npx tsc --noEmit`, `npm run build`, `npm run docs:check`.

PHP green: `notification-templates-family-quote-parity`,
`package-family-notification`, `request-schema-is-addon`,
`request-schema-family-quote-snapshot`, `request-durable-submission`,
`quote-view-access-boundary`, `quote-view-entrypoint`,
`tier-instance-public-projection`, `tier-edition-public-projection`,
`tier-pricing-parity`.

**Pre-existing baseline failures, each re-verified as failing on clean
`main` with my changes stashed — none caused by this work:**
`contract:package-builder-flow` (the documented `FullBuildDetail.tsx` ENOENT),
`contract:platform-identity-schema`, `php tests/tier-capability-invariants.php`,
`php tests/quote-view-http-boundary.php`, `php tests/quote-view-email-link.php`,
and **`regression:composable-quote-cart-loop`**.

### New finding — please advise
`regression:composable-quote-cart-loop` fails broadly on clean production
`main`, not just on this branch (`previewCalls=0`, no Add button found, the
committed line resolving to `null` — it appears to fail at mount rather than
at any one assertion). I have **not** investigated or touched it: it is
outside this work item's scope and unrelated to either defect here. Flagging
it because it is a currently-red composable cart regression that neither this
file nor the earlier work items list among the known baseline failures, so it
may have been red unnoticed for some time.

### Status
Set to **AWAITING CHATGPT REVIEW**. Source not pushed to `main`.
