# Composable Tier — continuous work track

## Status
- **AWAITING LIVE VALIDATION — pushed to `main` and deployed successfully.**
- Auditor verdict: **Proceed with safeguards.**
- Production: `main@84ebbb2850f9e8f9ead8cec8c13ee67462cb3f33`.
- Deploy to Hostinger #937, run `33754346845`, head SHA `84ebbb28...`, status **completed / success**.

## Accepted architecture
- one aggregate composable `FamilyTierQuoteItem`;
- distinct centralized `primary | addon | composable` role/key;
- composable key is Family+Tier System scoped and independent from primary/Add-ons;
- zero selected + no required removes the line; required-only persists;
- removing/changing primary never removes composable;
- commercial facts come only from latest successful server preview;
- no per-inclusion products, no `is_addon` reuse, no new backend entity;
- Request/PDF/email remains out of scope this phase.

## Independent correction review
Reactive-loop blocker is resolved. The correction commit `84ebbb28...` is a direct child of prior review head `4ab18d6f...` and changes only `PackageBuilderApp.tsx`, focused regression test/package script, Code Map, and built `cost-builder.js`.

`PackageBuilderApp` now stabilizes cart mutation callbacks with `useCallback`. Composable add/remove callbacks no longer change identity when only cart state changes, while Family-scoped removals depend on stable Family/instance identity strings. This removes the self-trigger path where a successful preview commit caused a parent render, new callback identity, another preview effect, and another commit.

New mounted happy-dom regression reportedly proves:
- one Add interaction -> one preview + one cart write;
- 1000ms idle after parent rerender -> no further preview/cart writes;
- genuine second Remove -> one new preview + one new cart write;
- failed preview -> no cart write.

Overall diff from production is frontend/docs/contracts/dist only. No PHP, `RequestSchema.php`, Request mapping, PDF or email source changed.

## Claude next action (done)
Pushed the exact reviewed branch history/head to `main` — a clean fast-forward, no amend/squash/unrelated changes.

## Production Push Record
- New `main` SHA: `84ebbb2850f9e8f9ead8cec8c13ee67462cb3f33` — `git fetch origin main && git rev-parse origin/main` confirms this exactly.
- Identity proof: matches the reviewed `review/composable-quote-cart-connection` head byte-for-byte (same SHA); `git log --oneline -3 origin/main` shows `84ebbb28` -> `4ab18d6f` -> `bb86513c`, the exact two-commit fast-forward, no rewrite.
- GitHub Actions: **Deploy to Hostinger #937**, run id `33754346845`, head SHA `84ebbb2850f9e8f9ead8cec8c13ee67462cb3f33`, status `completed`, conclusion **`success`** — confirmed via direct GitHub API read (`GET /repos/.../actions/runs/33754346845`), not just the UI listing.

Do not start Request/PDF/email work yet. Next gate is the live validation checklist below.

## Live validation after deploy
Customer `/pricing/` must prove both contexts:
1. **Build Your Own** with no primary Tier selected: Add an optional inclusion -> exactly one composable cart line appears; remove it -> line disappears.
2. **Upgrade your build** with a normal primary selected: composable line appears alongside primary (and existing Add-ons if present), never replacing them.
3. Quote count, per-line payment streams and TCV include composable once only.
4. Wait at least ~2 seconds after an Add/qty change; cart/preview must remain stable with no repeated writes/spinner/network-like refresh symptoms.
5. Change quantity/selection again -> exactly one updated composable line, not duplicate lines.
6. Removing/changing primary leaves composable intact; removing composable leaves primary/Add-ons intact.
7. Reload page -> persisted composable choice re-seeds the browser correctly and does not auto-mutate cart merely from viewing.

Browser agent should capture screenshots for standalone Build Your Own cart, coexistence with primary/Add-on, removal, and reload/reseed state.