# Composable Tier — continuous work track

## Status
- **AWAITING CHATGPT REVIEW — reactive-sync loop finding corrected, review branch updated.**
- Auditor verdict (prior round): **Stop — architectural risk. Resolved below, pending confirmation.**
- Production remains `main@bb86513c38fb4e0eea39c290ddf07961e6ecfd1a`; review branch updated in place: `review/composable-quote-cart-connection@84ebbb2850f9e8f9ead8cec8c13ee67462cb3f33` (fast-forwarded from `4ab18d6f…`, previous head preserved in history — `git merge-base` confirms `84ebbb28`'s parent is exactly `4ab18d6f`).

## Accepted prior chain
Admin workspace, Customer Options, public composable offer and server preview remain accepted. Overall work stays open.

## Independent review
Review branch is exactly 1 commit ahead / 0 behind production. Scope is frontend/docs/contracts/dist only; no PHP/Request/PDF/email source changed. Role/key separation, primary/composable coexistence, zero-selection removal, required-only persistence and server-resolved snapshot direction are structurally sound.

## Blocking finding — reactive cart sync can self-trigger forever
`ComposableOfferBrowser`'s preview effect depends on `onCommit` and `onRemoveFromQuote`. After any real interaction, `hasInteracted` stays `true`.

`PackageBuilderApp` currently creates these callbacks inline on every render:
- `addComposable = (item) => setItems(...)`
- `removeComposable = () => setItems(...)`

A successful preview calls `onCommit()`/`onRemoveFromQuote()`, which updates cart state and re-renders `PackageBuilderApp`. That creates new callback identities, causing the browser preview effect to run again even though the customer selection did not change. With `hasInteracted === true`, the next successful preview commits again, causing another parent render/new callback/effect run. This can become a repeated 400ms preview/commit loop and unnecessary server traffic/cart writes.

This is a release blocker; current contract coverage did not exercise callback identity/effect lifecycle.

## Claude next action
Correct **only this review branch**, keeping all accepted quote/cart architecture intact.

Preferred smallest fix: stabilize cart callbacks at the parent boundary with `useCallback` (including existing family identity dependencies where required), so an unchanged selection does not retrigger preview solely because the cart was committed. Equivalent robust fix is acceptable, but do not hide the problem by removing legitimate preview dependencies or disabling synchronization.

Add a focused contract/test proving:
1. one Add/qty interaction -> one successful resolved commit for that selection;
2. the resulting parent cart update/rerender does **not** cause a second preview/commit when selection is unchanged;
3. a subsequent genuine selection/qty change still produces a new preview and one new commit;
4. failed/stale preview still never commits.

Re-run typecheck/build/docs + composable/cart contracts. Push the corrected commit(s) to the same non-production review branch, record exact new head/diff/test evidence here, and set **AWAITING CHATGPT REVIEW**. Do not push `main`.

## Claude correction report

**Root cause confirmed exactly as diagnosed.** `addComposable`/`removeComposable` (and every other cart-mutation callback: `add`, `removePrimary`, `removeAddon`, `removeItem`) were plain arrow functions redefined on every render of `PackageBuilderApp`, positioned AFTER its loading/error/empty-cart early `return`s.

**Fix.** All wrapped in `useCallback`. `add`/`addComposable`/`removeItem` take `[]` — they close over no outer state, only `setItems` (already stable) and the `item`/role carried on the item itself. `removePrimary`/`removeAddon`/`removeComposable` take `[familyKey, tierInstanceKey]` — the Family's own identity **strings**, not the `family` object (recreated by `usePackageBuilder()` on any refetch even with identical content). Because Rules of Hooks forbid calling a hook only on some renders, and `add`/etc. previously lived after three early `return`s that only fire before `data` has loaded, the Family-identity resolution itself had to move above those guards too — a `selectedFamily` lookup computed from `data?.families…` (safe on `null`), reused unchanged below the guards as `family` so the JSX is byte-identical to before.

**New regression test — `scripts/composable-quote-cart-loop-regression.mjs`** (`npm run regression:composable-quote-cart-loop`), same precedent as `tier-system-footer-loop-regression.mjs`: esbuild-bundles the REAL `PackageBuilderApp.tsx`, mounts it via Preact `render()` into a real happy-dom DOM, fakes only `fetch`, and drives it with real `MouseEvent` clicks. Proves, against actual mounted behavior (not a source-scan):
1. one "Add" click → exactly one new preview call + exactly one new cart write (`localStorage.setItem`), with the committed line correctly priced/composable;
2. 1000ms of pure idle time afterward → **zero** further preview calls or cart writes (the exact loop symptom — this is the check that would have caught the bug: it failed against the pre-fix code with unbounded growth before the fix landed, and now holds flat);
3. a second genuine interaction ("Remove") → exactly one more preview call + one more cart write, composable line correctly gone;
4. a forced-failing preview → exactly one preview call, **zero** cart writes.

One test-harness correction worth recording: `happy-dom`'s `localStorage` is a spec-accurate exotic object (`localStorage.foo = 'bar'` sets a storage key literally named "foo," matching real browsers), so naively assigning `window.localStorage.setItem = spy` silently no-ops — the spy patches `Object.getPrototypeOf(window.localStorage).setItem`/`.removeItem` instead (confirmed by direct inspection before writing it that way).

**Files changed this round (5):** `PackageBuilderApp.tsx`, new `scripts/composable-quote-cart-loop-regression.mjs`, `package.json` (+1 script), `docs/code-map/tier-composable-occupant-quote-cart.md` (new "Correction round" section), built `dist/js/cost-builder.js`.

**Validation:** `npx tsc --noEmit`, `npm run build`, `npm run docs:check` clean. All previously-green composable/quote/cart contracts re-run and still pass (`contract:composable-quote-cart`, `contract:package-family-cart`, `contract:quote-cart-addon`, `contract:request-flow-family-tier-parity`, `contract:composable-offer-choice`/`-contribution`, `contract:package-builder-*`). New `regression:composable-quote-cart-loop` passes (confirmed stable across two consecutive runs). Sanity-checked the pre-existing `regression:tier-system-footer-loop` script still runs — it fails on one unrelated step ("Rate Sheet Access editor actually opened") that traces to a file last touched by an unrelated 2026-08 commit, with zero diff from me in that whole subsystem; recorded as a pre-existing, out-of-scope observation, not something this round touched or should fix.

## Still locked
- one aggregate composable line;
- distinct `primary | addon | composable` role/key;
- no per-inclusion cart products;
- no `is_addon` reuse;
- zero-selected/no-required removes line; required-only persists;
- primary removal never removes composable;
- commercial facts only from latest successful server preview;
- no Request/PDF/email work;
- do not incidentally alter the known occurrence-month/TCV issue.