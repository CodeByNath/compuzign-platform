# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW — Phase 2 implemented on a review branch**
- Auditor verdict: **Proceed with safeguards**.
- Phase 1 is accepted/closed within this work item: `main@bfb203c776b3d4927ee7c34c54db31d80dc13bb9`, deployment run `34030530788` attempt 2 succeeded, landed review branch removed.
- Customer-frontend trace remains the compatibility contract.

## Phase 1 verification
Independent checks confirm:
- exact approved source is on `main`;
- deployment retry completed successfully for exact `bfb203c7...` with no source change;
- landed Phase 1 review branch is gone from origin;
- `review/composable-tier-customer-ux` is also gone;
- `review/quote-email-billed-item-separators` remains because that separate work is still active.
No browser gate is required for the Phase 1 backend-only hygiene fix.

## Locked architecture for Phase 2
Merge the existing Customer Selection Rules **authoring controls** into the existing Build Your Own / Tier Catalogue occupant Inclusions editor. This is a controller/capability merge, not a new module.

Must remain true:
- one Inclusions module and existing inclusion rows/cards;
- customer-policy controls appear once per selected inclusion `item_id`, never once per Default/Additional Commercial Leg assignment;
- commercial inclusion state remains `rate_sheet_items[]`; customer selection state remains `customer_policy.items[]`;
- preserve separate draft/module semantics and existing REST authorities — one Admin Save interaction may coordinate them, but do not collapse backend storage or lifecycle contracts;
- preserve published-occupant eligibility: do not enable customer-policy authoring earlier than the current standalone controller allows;
- "Not offered" must preserve the current write convention by removing that policy item, not storing a new explicit excluded entry;
- Bundle-backed Rate Sheet row may have one policy controller for the Bundle row `item_id`; never create controls for Bundle children;
- no Price Option policy expansion;
- do not change Edition UI in this phase;
- do not retire/delete the standalone Customer Selection Rules drawer/action/route in this phase — keep it as rollback/parity surface until the merged UI is live-validated;
- no customer frontend/resolver/projection/pricing/Commercial Legs/quote/cart/Request/PDF/email/order/routing changes.

## Claude — Phase 2 implementation report

Done. Not pushed to `main`.

- **Branch**: `review/tier-inclusions-customer-policy-merge`, created from production `main@bfb203c776b3d4927ee7c34c54db31d80dc13bb9`.
- **Commit**: `3cc88e83` — "Merge Customer Selection Rules controls into the composable occupant's Tier Inclusions row".
- **Files changed** (12): new `resources/ts/package-station/drawer/editors/customerPolicyFields.tsx` (the ONE shared `patchCustomerPolicyItem`/`findCustomerPolicyItem`/`CustomerPolicyItemFields` authority — item 1's "do not duplicate" requirement); `CustomerPolicyEditor.tsx` refactored to import it (behavior unchanged — same tri-state, same "Not offered" = remove-entry convention, item 5); `PoolInclusionsEditor.tsx` gained optional `customerPolicy`/`onCustomerPolicyChange` props, rendering the merged controls once per selected inclusion `item_id` (item 3) only when the prop is a real value; `useTierModuleEditing.ts` gained a second `customerPolicyDraft` state seeded only when `isComposableOccupant(editingTierId) && d.enabled` (item 2's "ordinary Tier unchanged" + eligibility from the locked architecture), coordinating its own `saveTierCustomerPolicy` call under the same Save after a successful features save, with failure propagating (item 4); `useTierDrawerController.ts`/`TierDrawerContent.tsx`/`bindings/tier.tsx` thread the new extras through; `scripts/tier-customer-policy-drawer-contract.ts` had its one check that literally forbade any `customerPolicy` reference in `TierDrawerContent.tsx` narrowed to the actual still-true invariant (no fifth module/second save path) — that blanket assertion is exactly what this merge legitimately supersedes; new `scripts/tier-inclusions-customer-policy-merge-contract.ts` (item 6, real payload-semantics tests against the shared pure functions plus source proofs for no-duplication/once-per-item_id/no-Bundle-children/ordinary-Tier-and-Edition-exclusion/failure-propagation); `docs/code-map/tier-composable-occupant-admin-ui.md` updated (item 8); `dist/js/admin-station.js` rebuilt; `package.json` gained the new contract's script entry.
- **Validation run** (item 7, all green except one pre-existing unrelated failure — see below): `npx tsc --noEmit`; `npm run build`; `npm run docs:check`; `npm run contract:tier-customer-policy-draft`, `contract:tier-customer-policy-drawer`, `contract:tier-inclusions-customer-policy-merge`, `contract:tier-edition-admin`, `contract:tier-edition-switch`, `contract:tier-edition-move-to-bin`, `contract:tier-occupant-inclusions-bundle`, `contract:tier-rate-sheet-catalogue-bundle`, `contract:tier-instance-scope`, `contract:tier-overview-is-addon`, `contract:tier-catalogue-overview-presentation`, `contract:package-family-capability`, `contract:tier-system-drawer`, `contract:tier-lifecycle-menu`, `contract:composable-offer-choice`, `contract:composable-offer-contribution`, `contract:composable-quote-cart`, `contract:composable-request-line`, `contract:composable-live-correction`; `php tests/composable-customer-policy-resolver.php`, `tests/composable-customer-ux-preview.php`, `tests/request-schema-composable.php`.
- **Pre-existing, unrelated failure found during validation**: `php tests/notification-templates-composable-quote-parity.php` fails on THIS branch — and, verified separately, fails **identically on plain production `main@bfb203c7` with zero Phase 2 changes applied**. Phase 2 touches zero PHP files, so this cannot be caused by this work; it is a pre-existing defect (admin email not showing the "Build Your Own" badge/label for the composable row) discovered incidentally. Per the locked non-change boundary (no Request/PDF/email/order changes in this phase), left untouched — flagging for a separate work item rather than fixing here.
- **Unresolved risks**: none beyond the pre-existing email defect above. No browser/live validation performed (Admin UI change) — required before Phase 3 (retiring the standalone drawer) per the locked direction, not before this review.