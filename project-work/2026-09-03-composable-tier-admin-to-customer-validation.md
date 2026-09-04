# Composable Tier — continuous work track

## Status
- **READY FOR CLAUDE — hide Request modal scrollbars without removing scroll behavior.**
- Auditor verdict: **Proceed with safeguards.**
- Production: `main@5112f5f5f57bad65adf84e26d829323a43b5eb7570`.
- Hostinger run `33833809714` succeeded on that exact SHA.

## Accepted deployed correction
The Request/Review right-rail clipping fix is accepted and must remain:
- `.cz-rf-right { max-height:96%; padding-bottom:0; overflow-y:auto; }`
- `.cz-os__help { padding-bottom:16px; }`
- `.cz-rf-left { overflow-y:auto; }` deliberately retained because `.cz-rf-body { overflow:hidden }` and long Contact/Review content needs a scroll owner.
- prior quote-list desktop single-scroll-owner simplification remains.
- no pricing, totals, composable identity, Request persistence/email, resolver, Rate Sheet, entity/identity, occurrence-month, or copy changes.

Claude live-validated the deployed right-rail fix at 1024/1067/1100/1180 widths × 900/700/650 heights: 12/12 Print/Submit/help reachable.

## New UI refinement — visible multiple scrollbars
Nath live-validated the current modal and wants both left and right panel scrollbar tracks hidden visually. Scroll capability must remain intact.

Implement exactly this presentation rule in the Request flow CSS:

```css
.cz-rf-left,
.cz-rf-right {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.cz-rf-left::-webkit-scrollbar,
.cz-rf-right::-webkit-scrollbar {
  display: none;
}
```

### Safeguards
1. **Do not remove `overflow-y:auto` from either panel.** This is visual scrollbar suppression only.
2. Preserve mouse wheel, trackpad, touch, keyboard, and focus-driven scrolling.
3. Do not apply this globally to unrelated scroll containers.
4. Keep the existing responsive/right-rail geometry unchanged.
5. No data/architecture/copy changes.

Add or extend a focused contract to lock: both panels remain scrollable while scrollbar chrome is hidden for Firefox/legacy Edge-WebKit/Chromium-compatible paths. Rebuild dist, run focused contracts/typecheck/build/docs, push only to a non-production review branch, record exact SHA/files/tests here, set **AWAITING CHATGPT REVIEW**, do not push `main`.

## Remaining live gate after this
Recheck hidden scrollbar appearance plus scrolling/reachability, then continue the still-open chain: Upgrades label; composable Quote Details; Admin Request stored detail; proposal/PDF/public quote exact-once rendering; totals once; no raw IDs. Fresh production Request/customer email remains separately gated.

## Final planned phase
After this chain passes, begin the dedicated customer UI/UX refinement pass across pricing, focused-plan/composable, quote/cart, Review & Finalise, and proposal/PDF responsive presentation. Visual/interaction refinement only; accepted architecture stays locked.