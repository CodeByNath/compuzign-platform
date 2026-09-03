# Composable Tier — Admin → customer browser handoff

## Status
- **AWAITING CHATGPT REVIEW — no source defect found; likely a live-check methodology gap. No source changed.**
- Auditor verdict (prior round): **Proceed with safeguards.**
- Production `main@41884a41ab7f0e21c52dc8e9158c126aace1abf9`; Hostinger deploy #935 succeeded on exact SHA. Unchanged this round.

## Verified live evidence
Nath supplied current Studio screenshots of KAIROS Tier workspace. The subordinate **Package Build Your Own** occupant is Active, $48.50 monthly, 3 included features. Its card exposes only the normal **View** split-button. Opening it shows the standard Tier drawer with **Details / Options / Connections / Support**. The normal occupant editors correctly show the 3 selected inclusions: 2 vCPU, Block Storage, Backup Storage — BaaS.

The expected separate **Customer Options** action is not visible anywhere on the Build Your Own card in this live state. Therefore the previously recorded live-validation instruction “open Customer Options” is currently impossible through the normal Admin UI.

## Architecture remains locked
Customer policy stays an external controller over the otherwise normal full Tier occupant. Do not put `customer_policy` back into the shared Tier drawer. The intended action is a composable-card-only sibling action that opens the standalone `tier-customer-policy` drawer. Normal Tier/Add-on cards and their 4-module drawer must remain unchanged.

## Claude task — focused audit then smallest fix
Trace production source at `41884a41` from composable workspace card projection through action rendering/dispatch:
1. confirm `withComposableCustomerOptionsAction()` is still applied to the composable card and what exact eligibility value it receives;
2. trace whether `detail.enabled === true` is actually true for this live Active Build Your Own projection, and whether the card action is dropped later by shell/action normalization or split-button rendering;
3. verify `'customer-options'` intent and `tier-customer-policy` drawer registration still exist and are reachable;
4. identify why the live card shows only View despite Active status.

If the defect is source-side, implement the **smallest correction only** so an Active/published composable occupant shows `Customer Options` in its card action menu. Do not add it to the normal Tier drawer or normal/Add-on cards. Do not change customer `/pricing/`, policy semantics, cart/quote/PDF/email, Rate Sheets, Legs, Editions, or lifecycle.

Add/adjust a narrow contract proving:
- active composable card => View + Customer Options;
- draft/inactive composable card => no Customer Options;
- normal Tier/Add-on cards unchanged;
- Customer Options dispatches standalone `tier-customer-policy` drawer.

Report exact changed files, tests, branch/commit and diff in this same file, then set **AWAITING CHATGPT REVIEW**. Do not push to `main` without auditor approval.

## Claude audit response — 2026-09-03 (no source changed)

**Traced the full chain on production `41884a41`; the wiring is provably correct end-to-end, with no filtering step anywhere that could drop `customer-options`:**

1. `usePackageTierWorkspace.ts:318-327` — `withComposableCustomerOptionsAction(toTierOccupantCard({...view: composableView...}), composableView?.detail.enabled === true)`. Same `composableView` object feeds both the eligibility boolean here and the card's displayed status pill (below) — they cannot diverge.
2. Status pill: `toTierOccupantCard` sets `status: toTierCardStatus(view?.status ?? 'pending-dim')`, and `resolveTierStatus()` (`drawer-kit/utils/moduleStatus.tsx:151`) returns `'active'` **only** via `return tier.enabled ? 'active' : 'pending-full';` — the identical `enabled` field the eligibility check reads. A card showing "Active" cannot simultaneously have `eligible === false`.
3. `withComposableCustomerOptionsAction()` (`tierOccupantCard.ts:117-123`): `if (!eligible) return card; return {...card, actions: [...card.actions, {id:'customer-options', ...}]}` — unconditional append when eligible.
4. `projectComposableWorkspaceSlot()` (`projection.ts:73-85`) stores that card as `.item` **unmodified** — no filtering.
5. `TierDetailPanel.tsx:124-127` passes `item.actions` **unmodified** into `<StationSplitAction actions={item.actions} .../>`.
6. `StationSplitAction.tsx:138-142`: `primary = actions[0]` (always `'view'`, the card contract's own first entry — `tierOccupantCard.ts:98-101`), `menuActions = actions.slice(1)` (`'edit'`, then `'customer-options'` when eligible). The primary half's visible **label is always "View"** regardless of what else exists — Customer Options was never intended to be the primary label; it renders inside the same control's dropdown, behind its small **▾ chevron** (`cz-station-split__trigger`, only rendered `menuActions.length > 0`).

**Conclusion: given the card correctly shows Active, `customer-options` is unconditionally present in `item.actions` at every step traced above — no code path drops it.** The reported observation ("card exposes only the normal View split-button... Opening it shows the standard Tier drawer") is exactly what clicking the **primary half** ("View") produces regardless of whether Customer Options exists — and a static screenshot of the closed control cannot show the dropdown's contents at all (`{open && (<div class="cz-station-split__menu">...)}` only renders while open). Nothing in this session's actual source changes (the customer-policy-drawer controller fix and the `PackageSchema.php` persistence fix) touches this card/action/dispatch chain at all.

**Most likely explanation:** the chevron (▾) beside "View" was not clicked during the live check — only the primary "View" button was exercised (which correctly opens the standard drawer, by design). A second, less likely possibility: a hard-cached pre-`8ff4eff9` (deploy #934) admin bundle in the browser, from before Customer Options existed at all.

**Recommendation:** no source change. Re-check live: on the Build Your Own card, click the small **▾** immediately right of "View" (not "View" itself) and confirm "Customer Options" appears in that menu alongside "Edit"; hard-refresh first to rule out a stale cached bundle.

**Files changed:** none. **Tests run:** `contract:tier-customer-policy-drawer` (still passes, unaffected).

## Deferred live gate
After this action is restored, live validation resumes: exactly 3 policy rows, author one Required/Optional rule, Save, normal Publish/settle, reopen persistence, then `/pricing/` Build Your Own / Upgrade your build. Stale remove/re-add regression remains afterward.