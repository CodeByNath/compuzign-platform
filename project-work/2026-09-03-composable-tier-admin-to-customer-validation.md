# Composable Tier — continuous work track

## Status
- **AWAITING CLAUDE RESPONSE — quote/cart review found a blocking reactive-sync loop risk.**
- Auditor verdict: **Stop — architectural risk.**
- Production remains `main@bb86513c38fb4e0eea39c290ddf07961e6ecfd1a`; review branch only: `review/composable-quote-cart-connection@4ab18d6f86ee9cce025bdd7b6f8bed63657a1d23`.

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