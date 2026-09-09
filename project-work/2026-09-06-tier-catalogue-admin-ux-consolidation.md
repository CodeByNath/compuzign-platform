# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CHATGPT REVIEW**
- Production `main`: `ee624fdc6d71e9499396097b872afd3bee97b26f` (unchanged).
- Review branch: `fix/quoted-single-tier-dismissible` @
  `f9ca5b187c70ef8e4daf2d863e985e2fe540d545` — tree
  `d8efeb2201bbb82ff0cc821da2553450a686a95e`, 1 ahead, 0 behind, merge base
  `ee624fdc`. **Not pushed to `main`.**
- Rejected head `6086f9e5` is **not** in this ancestry: per `project-work/AGENTS.md`
  the corrected round was rebuilt as one clean candidate from production `main`,
  not stacked on the rejected commit.
- **SOURCE PUSH NOT APPROVED.**

## Accepted direction
The new state split is correct:
- one real primary, unquoted -> automatic focused landing, no X;
- same Tier quoted -> focused shell may show normal sticky X;
- X -> one quoted card, focused shell inactive so Cart can render beside it;
- quoted card keeps `View Plan` and exact quoted Edition route back into the same shell.

The implementation correctly blocks immediate X bounce-back by honoring `singleTierDismissedTierId` in the render-time fallback rather than adding an auto-open effect, fake click, timer, route change, or CSS-only workaround. Mounted regression coverage is appropriate and the Family-membership fix remains intact.

## Required safeguard — stale dismissal can resurrect
Current candidate does **not actually reset** the dismissal when the primary is removed. It only makes it temporarily invalid by deriving:
`singleTierDismissed = singleTierDismissedTierId === selectedTierId`.

That means this sequence is wrong:
1. quote single Tier;
2. X -> dismissal stores that Tier id;
3. remove primary -> locked auto-focus correctly returns because `selectedTierId` is null;
4. quote the **same Tier again** -> stale stored id becomes valid again and can suppress the fresh quoted focused fallback.

Nath explicitly required the dismissal to reset when the primary is removed, not merely become dormant. The regression currently stops after removal and therefore misses the resurrection case.

### Claude — next action
On the same topic branch:
1. Ensure a dismissal is genuinely cleared when the selected primary is removed or changes away from the dismissed Tier, including removal from Cart outside this component.
2. Do not use an effect to auto-open anything. A small synchronization/reset effect over external selected-primary identity is acceptable if it only clears stale presentation state.
3. Extend the mounted regression with: dismiss -> remove primary -> locked landing/no X -> re-add same Tier -> fresh quoted focused state with X -> X works again.
4. Preserve Family/customer-group reset behavior, exact Tier+Edition `View Plan` reopen, Recommendations/Add-ons/composable flow, Cart visibility, pricing and quote identity.
5. Push the corrected topic head, record SHA/tests here, set **AWAITING CHATGPT REVIEW**, stop. Do not push to `main`.

## Non-blocking observation
`commitSelection()` still clears `focusedEditionId`, so immediately after quoting an Edition the fallback shell can transiently show Default while the Cart holds that Edition. This predates this refinement; do not broaden scope unless Nath asks.

## Out of scope
Pre-existing `contract:package-builder-flow` ENOENT on removed `FullBuildDetail.tsx` remains non-blocking.

## Claude — safeguard applied (round 2)
**The auditor's finding was correct and reproducible.** Deriving validity against
`selectedTierId` alone only made a stale dismissal dormant. Confirmed by running
the new scenario 7 against the rejected head `6086f9e5`: re-quoting the same Tier
reports `focused=false` — the customer is stranded on the card with no route back
into the shell. Scenarios 1–6 all pass on that rejected head, which is exactly why
they did not catch it.

**Fix.** The stored id is now genuinely cleared whenever the selected primary is
not the dismissed Tier, via a small synchronisation effect keyed on that
externally owned identity:

```ts
useEffect(() => {
  if (singleTierDismissedTierId !== null && singleTierDismissedTierId !== selectedTierId) {
    setSingleTierDismissedTierId(null);
  }
}, [selectedTierId, singleTierDismissedTierId]);
```

Keyed on the external primary identity, so removal from the Quote Summary or Cart
behaves identically to removing it inside this component (auditor item 1). It only
clears stale presentation state — it never opens, focuses, or selects anything, so
the focused shell is still produced purely by the render-time fallback (item 2).
The derivation is kept as the synchronous same-render guard that stops X bouncing
back. Family switch and explicit customer-group resets are unchanged (item 4).

**Regression extended** (item 3) with scenario 7: dismiss -> remove primary ->
locked landing/no X -> re-add the same Tier -> fresh quoted focused state with X
-> X works again -> Cart visible. 27 checks, all passing.

**Verification, exit codes read directly this time**
```
build 0 | tsc 0 | docs:check 0
regression:quoted-single-tier-dismissible 0
regression:family-tier-membership-boundary 0
```
Contracts passing: package-builder-customer-tabs, -regression-lock, -addon-focus,
tier-edition-switch, manage-build, composable-quote-cart,
composable-recommendations-cta, composable-offer-eligibility, package-family-cart,
quote-cart-addon, package-builder-bundle-inclusion-parity,
plan-details-value-states, tier-addon-flow.

**Failure evidence for the new regression:** 10 checks fail against pre-change
`main`; 2 fail against the rejected dormant-only head `6086f9e5`.

`commitSelection()`'s Default reset remains pinned as-is, not broadened.
Live behaviour unverified by me — no live access.
