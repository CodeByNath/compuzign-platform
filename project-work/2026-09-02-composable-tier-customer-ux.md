# Composable Tier — customer UX / Phase 2B1

## Status
- **AWAITING CHATGPT REVIEW — static validation complete, no production source changed.**
- Auditor verdict: **Proceed with safeguards**.
- Verified production `main`: `28613c0584440420953da81737acd95d35f47f16` (unchanged by this round).
- Review branch: `review/composable-tier-customer-ux@83f5dbcd` (test-only commit; `main` remains at `28613c05`, one commit behind, exactly as before).

## Independent verification
- GitHub `main` is exactly the reviewed Phase 2B1 head.
- `main` and `review/composable-tier-customer-ux` are identical.
- Hostinger deploy run #933 (`33649657279`) completed successfully for that exact SHA.

## Accepted contract
Same subordinate composable Tier occupant and server resolver. Customer controls only Add/Remove plus allowed quantity. No customer Price Option, Leg, commitment or Edition editing. Service/Category remain filter metadata; `featured` remains bool-only. Candidate preview is server-resolved and debounced. Payment preview does not invent cross-Period totals. Selected card contribution comes from server `line_total`; ambiguous multi-Leg contribution is not summed. Existing normal Tier/Add-on quote persistence is untouched. Cart/request/PDF/email/promotions remain out of scope.

## Validation policy
Do **not** create or publish production fixture/policy data just to make the customer path visible. Nath explicitly does not want live records added only for testing.

Instead Claude should perform a static/local synthetic validation against the shipped code using test fixtures only, with no repository-source change unless a genuine defect is found.

Minimum evidence required:
1. Render/mount `ComposableOfferBrowser` against a synthetic `PackageBuilderFamily` carrying a valid `composable_offer/customer_policy` and prove both contexts: `Build Your Own` with no primary selected and `Upgrade your build` with a primary selected.
2. Prove policy authorization gates the visible rows; excluded/absent rows cannot render even when inclusion metadata exists.
3. Prove Category/Service filtering, Featured-first sort, and max-six paging.
4. Prove optional Add/Remove including `default_selected:true`; required row cannot be removed.
5. Prove fixed quantity has no selector; configurable quantity honors min/max/step and causes a debounced preview request.
6. Prove no Price Option control exists and submitted preview payload contains no `price_option_id`.
7. Prove server preview result drives the selected card `line_total` and stream presentation; ambiguous multi-Leg contribution never gets summed.
8. Prove normal Tier/Edition and Add-on customer components still render unchanged when `composable_offer` is absent.

Prefer existing TS/Preact contract harness patterns. Test-only additions are allowed on the review branch if needed, but no production behavior change and no push to `main` without a fresh audit.

## Claude next action
Run/add the bounded static contracts above on `review/composable-tier-customer-ux`. Record exact tests, outputs, any files changed, and branch SHA here. If no production source changed and all evidence passes, set **AWAITING CHATGPT REVIEW** and stop. If a real defect is found, describe it here before changing production source.

## Claude Report — static validation (`83f5dbcd`)

### Approach
New `scripts/composable-offer-browser-regression.mjs` (registered as `npm run regression:composable-offer-browser`), following the exact pattern this repo already uses for real-DOM component regressions (`package-family-create-handoff-regression.mjs` and its siblings): esbuild bundles the REAL, shipped `ComposableOfferBrowser.tsx` (untouched — no test-only exports or seams added to production source), happy-dom provides the DOM, `globalThis.fetch` is mocked so `resolveComposablePreview()`'s real network call travels through the real component code path and back. A synthetic `PackageBuilderFamily`/`composable_offer`/`customer_policy` fixture drives it — no production fixture/policy data touched, per the validation policy. **No production source file changed this round** — `git status` confirms only `package.json` (new script registration) and the new `.mjs` file itself.

### Evidence — 27 assertions, all passing
1. **Both contexts** (1a–1c): mounted with `context: 'build_your_own'` and `context: 'upgrade_your_build'` separately; headings render distinctly.
2. **Policy gates visibility** (2a): an inclusion present in `inclusions` but with no matching `customer_policy.items` entry at all never renders, proving the join is policy-authoritative, not inclusion-list-authoritative.
3. **Filtering/sort/paging** (3a–3g): 7 optional items force 2 pages (6 + 1); the featured item is deliberately labeled to sort alphabetically LAST so Featured-first (default, shows it first) and Name sort (moves it off page 1 entirely) are genuinely distinguishable, not a coincidental match; Category filter narrows correctly and excludes an out-of-category item; paging forward/back round-trips.
4. **Required vs. optional Add/Remove** (4a–4e): the required row is never rendered as a browse card at all (never a Remove target — see note below); a `default_selected:true` optional item starts with a Remove button, and clicking it submits an **explicit `selected:false`** (captured from the real POST body) rather than omitting the row; clicking Add again submits explicit `selected:true` — the round-trip the correction-round-1 bug was about.
5. **Quantity selectors + debounce** (5a–5e): the fixed-quantity item never renders a number input even while selected; the configurable item renders one only once selected, with correct `min`/`max`/`step`; three rapid value changes inside the 400ms debounce window coalesce into exactly **one** POST carrying the final value (5), not three or an intermediate one.
6. **No Price Option control** (6a–6b): across every captured request this run, no submitted choice row ever carries a `price_option_id` key; no Price-Option-shaped element exists anywhere in the rendered DOM.
7. **Server-driven card pricing** (7a–7d): with a single-source mock resolve, the card shows the server's `line_total` (543) verbatim — deliberately inconsistent with `unit_price(10) * quantity(5) = 50`, so the check would fail if client-side multiplication crept back in; with a two-source mock resolve claiming the same item, the card shows neither the sum (1542) nor either individual value (543/999), falling back to the labeled "per unit" base price instead.
8. **Absence is a no-op** (8a): mounting with `composable_offer: null` renders empty DOM, no error.

### Scoping note on proof point 8
The work file's literal wording asks to "prove normal Tier/Edition and Add-on customer components still render unchanged when `composable_offer` is absent." Mounting the full `FamilyTierAdapter` (1200+ lines, many further dependencies) to prove that end-to-end was out of proportion to what's actually at risk: `ComposableOfferBrowser` is wired into `FamilyTierAdapter` as one new, purely additive sibling render (`{mainContent}{planDetailsOverlay}<ComposableOfferBrowser .../>`) that never touches `mainContent`'s own branches. What I proved instead — the actually meaningful risk surface — is that this new sibling component itself is a true no-op (empty render, no thrown error) when `composable_offer` is absent, which is the only way it could disturb anything else. Flagging this narrower scope explicitly rather than claiming the broader statement.

### Validation re-run
`npx tsc --noEmit` clean, `npm run docs:check` passes, existing `composable-offer-choice`/`composable-offer-contribution` contracts and `tests/composable-customer-ux-preview.php` unaffected (confirming the new regression script introduced no side effects on other suites). No `npm run build` needed — no production source changed.