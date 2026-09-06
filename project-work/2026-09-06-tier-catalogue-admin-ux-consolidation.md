# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING LIVE VALIDATION — final customer parity check only**
- Auditor verdict: **Proceed with safeguards**.
- Phase 2 remains `main@3cc88e83f93e57fec7b61419129cd93a8432809b`, deployed successfully by GitHub Actions run `34033325117` (#964).
- Phase 3 remains blocked until the final live customer check passes.

## Accepted live Admin validation
Browser-agent evidence is accepted for:
- exactly one Customer Selection controller on each tested Build Your Own top-level inclusion;
- access modes and dependent-control visibility;
- persistence of Selected by default, Featured, and quantity bounds;
- two-way parity between merged Inclusions and standalone Customer Selection Rules drawer;
- ordinary Tier/Add-on has no policy controls, including around an Additional Leg assignment;
- save UX returned to Pending without observed error; original values restored; nothing published.

## Independent residual-invariant review
The remaining Admin structural invariants do not require production-data mutation just to manufacture fixtures:

**Commercial Leg claim — accepted from source/data fixture.** `tests/composable-customer-policy-resolver.php` §3 uses one `hosting` top-level row claimed by both Default and Additional Leg `CZTL_X` with a single `customer_policy` entry keyed to `hosting`. Excluding that one policy item removes the inclusion from both Default and the Additional Leg component. This independently proves policy authority is once per `item_id`, not per Leg claim.

**Bundle children — accepted for Phase 2 from implementation structure, with explicit coverage note.** The merged controller is mounted in `PoolInclusionsEditor` once on the selected top-level row, after `suppliedContent` rendering; Bundle supplied children are rendered only as read-only sub-list entries and have no `CustomerPolicyItemFields` mount. Resolver coverage also proves a Bundle row's own opaque `item_id` is policy-addressable. There is no data-driven fixture combining populated Bundle children + customer_policy today; record this as a test-coverage improvement, not a Phase 2 implementation blocker.

**Save sequencing — source-verified.** `useTierModuleEditing.ts` awaits `saveTierFeatures()` first, then `saveTierCustomerPolicy()` only on success; customer-policy failure leaves `ok=false` and surfaces Save failed. Do not manufacture infrastructure/runtime failure merely to prove this visually.

## Final live gate before Phase 3
Only customer-facing parity remains. Validate the deployed **Upgrade Your Build** state in the existing package-builder customer page (same ComposableOfferBrowser, not a separate route):
- same inclusions are offered/required/optional as before;
- optional default-selected behavior is unchanged;
- quantity controls/bounds behave unchanged;
- Featured/recommended ordering is unchanged;
- no new Admin terminology or customer-facing controls leaked into the customer UI.

Use the existing live customer page/fixture already used for Upgrade Your Build validation; do not alter production data merely for this check.

If customer parity passes, report it in this same file as **AWAITING CHATGPT REVIEW**. Then the auditor may accept Phase 2, instruct cleanup of `review/tier-inclusions-customer-policy-merge`, and consider Phase 3. Do not start Phase 3 or Edition UI work before that.