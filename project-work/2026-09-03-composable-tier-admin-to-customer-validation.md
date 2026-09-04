# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — Request modal scrollbar chrome hidden on a review branch.**
- Auditor verdict: **Proceed with safeguards.**
- Production: `main@5112f5f5f57bad65adf84e26d829323a43b5eb7570` (unchanged — not pushed).
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

## Claude response — hidden scrollbar chrome

**Branch:** `review/request-flow-hidden-scrollbars`, single commit `aa820596`, based on `main@5112f5f5` (current `main` tip, includes both prior fixes). Not pushed to `main`.

**Change:** applied exactly the CSS given — `.cz-rf-left, .cz-rf-right { scrollbar-width: none; -ms-overflow-style: none; }` and `.cz-rf-left::-webkit-scrollbar, .cz-rf-right::-webkit-scrollbar { display: none; }` — added right after `.cz-rf-left`'s own rule. Both panels' `overflow-y: auto` (the actual scroll mechanism, and the fix for the earlier right-rail clipping bug) is untouched.

**Verification, static harness (real extracted modal markup + this CSS), 1100×650:**
- `getComputedStyle` confirmed both `.cz-rf-left` and `.cz-rf-right` keep `overflow-y: auto` and now report `scrollbar-width: none`.
- Real wheel input over each panel moved its `scrollTop` (right rail: 0→632, left panel: 0→344) — scroll capability is intact, only the chrome is hidden.
- Screenshot shows no scrollbar track on either panel while both Back/Continue (left) and Print/Submit (right) are fully visible after scrolling — matches the prior right-rail fix's reachable state, now without visible scrollbar chrome.

Not yet re-deployed/re-tested against the live site — that requires the push this file gates.

**Files changed:**
- `wp-content/plugins/compuzign-platform/resources/css/modules/cost-builder.css` (the scrollbar-hiding rules)
- `wp-content/plugins/compuzign-platform/dist/css/cost-builder.css` (rebuilt output)
- `wp-content/plugins/compuzign-platform/scripts/request-flow-rail-scroll-contract.ts` (extended, not replaced — also fixed its rule-lookup helper, which was matching the new combined selector rule instead of `.cz-rf-right`'s own dedicated rule until corrected with a negative-lookbehind guard against a preceding comma)

No code-map edit: this is presentation-only (no ownership/entry-point/boundary change), and `quote-builder.md` is already at its 600-word documentation-check ceiling.

**Tests/contracts run, all passing on this branch:** `npm run contract:request-flow-rail-scroll` (extended — now also asserts both panels keep `overflow-y:auto`, that a combined `.cz-rf-left, .cz-rf-right` rule sets `scrollbar-width:none`/`-ms-overflow-style:none`, and that a combined `::-webkit-scrollbar` rule sets `display:none`), `npm run contract:quote-sidebar-scroll`, `npm run contract:cost-builder-isolation`, `npx tsc --noEmit`, `npm run build`, `npm run docs:check` — all pass on `main` tip.

Data/architecture/copy: untouched — visual scrollbar suppression only.

## Remaining live gate after this
Recheck hidden scrollbar appearance plus scrolling/reachability, then continue the still-open chain: Upgrades label; composable Quote Details; Admin Request stored detail; proposal/PDF/public quote exact-once rendering; totals once; no raw IDs. Fresh production Request/customer email remains separately gated.

## Final planned phase
After this chain passes, begin the dedicated customer UI/UX refinement pass across pricing, focused-plan/composable, quote/cart, Review & Finalise, and proposal/PDF responsive presentation. Visual/interaction refinement only; accepted architecture stays locked.