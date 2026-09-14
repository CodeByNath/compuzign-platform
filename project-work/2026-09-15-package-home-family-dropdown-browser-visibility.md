# Package Home — Family Dropdown Browser Visibility

## Status
- **AWAITING REVIEWER REVIEW**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Production base: `8011e03e5fd7fba5d1f84b0cac03f5a01d541410`
- Topic branch: `package-home-family-dropdown-visibility` at `cd86c943163db65a42b9c6d4719f023f98527aa2` (one commit ahead of `main`)

## Defect
Package Home upper deck, right-side **Package Family** dropdown does not render option text reliably across Windows/some browsers. Nath supplied a screenshot where the native select popup makes inactive options such as APTOS and OMNIA extremely low-contrast/effectively hidden while the selected option remains visible.

## Required outcome
The Package Family selector must remain legible and usable across supported desktop browsers/Windows while preserving existing family-selection behavior, available/disabled states, labels, routing, and Package authority.

## Scope / safeguards
- Package Home upper-deck Family selector only.
- Audit the actual select/option implementation and relevant Admin/Package CSS before changing anything.
- Determine whether the issue is native `<select>/<option>` styling, disabled-option styling, `color-scheme`, inherited foreground/background tokens, or browser-native popup behavior.
- Prefer the smallest durable cross-browser fix.
- Do not redesign the selector or replace it with a custom dropdown unless native controls cannot meet the requirement and that need is demonstrated first.
- Preserve keyboard access, focus treatment, selection state, disabled semantics, family IDs, navigation, persistence, and all unrelated upper-deck behavior.

## Builder task
1. Start from current `main` after confirming the logout topic branch is fully contained and housekeeping is complete.
2. Locate the exact Family selector component and all CSS affecting the `<select>` and `<option>` elements.
3. Reproduce/audit why inactive options lose contrast in Windows/some browsers.
4. Implement the smallest cross-browser fix that keeps native select semantics if possible.
5. Add/update focused regression coverage where practical; otherwise document why browser-native popup rendering requires live validation.
6. Run relevant TypeScript/build/contracts/docs checks.
7. Push only the active topic branch, record exact SHA and evidence here, set **AWAITING REVIEWER REVIEW**, and stop.

## Reviewer safeguards
**Must preserve:** native semantics if viable, keyboard/focus behavior, disabled states, Family selection/routing/IDs.

**Must remove:** low-contrast/invisible Family option text on affected browsers.

**Must not substitute:** an unrelated selector redesign or custom dropdown without evidence native controls cannot satisfy the requirement.

## Builder result

### Housekeeping (done first)
Confirmed `admin-station-logout-redirect` was fully contained in `main`, deleted it local and remote, and branched this work from current `main`. Repo was back to `main` + `Project-work-instructions` before the new topic branch existed.

### Audit — what the selector actually is
`PackageFamilyScope.tsx` renders a native `<select class="cz-tf-control cz-tf-select cz-tf-control--accent cz-tier-workspace__scope-select">`. Nothing about the markup is unusual, and `admin-station.css`'s `.cz-tier-workspace__scope-select` rule correctly declares layout only (`min-width`/`width`/`max-width`/`text-overflow`) — no paint. All colour comes from the field system.

### Root cause — grounded in source, not guessed
Three facts, each verifiable in this repo:
1. `.cz-tf-control/.cz-tf-select` set `appearance: none`, `background: var(--station-field-bg)` and `color: var(--station-field-text)` (`drawer-kit.css`).
2. `.cz-tf-control--accent` — the deliberate "this control names the active scope" variant this selector uses — overrides the background with `--station-field-accent-bg`, which resolves to **`rgba(92, 110, 245, 0.12)`**: translucent.
3. The field system contained **no `option` rule at all** — nothing anywhere set an `<option>`'s colour or background.

An open select's option list is painted by the platform on its own surface, not on the page. An `<option>` with no colours of its own takes the select's author `color` and `background` — but that 12%-alpha accent then composites against the *system* popup surface rather than the station's, contributing almost nothing. What is left is `--station-field-text` on a system-default backdrop. In dark theme `--station-field-text` is `#e7e9ee`, i.e. near-white text on a light popup. The **selected** option stays readable because the closed control is painted on the page, where the same translucent accent composites correctly — which is exactly the asymmetry in Nath's screenshot.

I am not claiming to have reproduced the popup rendering itself; that part is platform behaviour I cannot exercise here. What is established from source is the missing `option` colours plus the translucent author background — which is sufficient to make the fix correct regardless of the precise Chromium internals.

### Change made
`drawer-kit.css` only:
```css
.cz-tf-select option          { background-color: var(--station-field-bg); color: var(--station-field-text); }
.cz-tf-select option:disabled { color: var(--station-field-muted); }
```
Options now carry their own **opaque** pair, so the popup never depends on what the platform paints behind it. The `:disabled` rule is required, not decorative: stating an explicit colour would otherwise override the UA's own greying and repaint the disabled placeholder as an ordinary option — the safeguard asks for disabled semantics to be preserved.

Native `<select>` kept entirely. No custom dropdown, no markup change, no change to keyboard access, focus treatment, selection state, family IDs, routing, or persistence.

**On scope:** the fix lives in `drawer-kit.css` because the locked field-system spec (`docs/architecture/admin-station-field-system-v1.md`) makes the drawer kit the owner of "control appearance, states, and sizes" and explicitly says `admin-station.css` "must stop owning ... select styling" — its rule 1 would fail the build if I painted a control from the feature sheet. That necessarily makes the fix apply to every `cz-tf-select`, not only this one. I judged that correct rather than over-broad: the same latent defect applied to all of them, and the alternative would have violated the documented boundary. Flagging it explicitly since it is wider than "Family selector only".

### Regression coverage
Extended the existing field-system guard (`scripts/admin-station-css-contract.mjs`) rather than adding a new script — it is already the contract for this exact concern and already reads `drawer-kit.css`. New **rule 5**: the `.cz-tf-select option` rule must exist, and both `background-color` and `color` must resolve to **opaque** tokens — following field-token aliasing (`--station-field-bg` → `--station-surface` → …) and checking **every** theme's value, not just the first.

Verified by deliberately breaking it three ways; the rule fires on each and is silent on correct source:
| Injected regression | Caught |
| --- | --- |
| `.cz-tf-select option` rule deleted | yes |
| `--station-field-bg` made translucent | yes |
| dark-theme-only `--station-surface` made translucent (via alias chain) | yes |

Also corrected the script's header, which said "deliberately four rules".

**Why this cannot be fully covered headlessly:** the actual defect is the platform's own popup compositing. No headless assertion can prove the rendered contrast — the contract locks the invariant that makes the rendering correct, but the visual outcome still needs Nath's live check on the affected Windows browser.

### Checks run
- `npx tsc --noEmit` — clean
- `npm run build` — success (drawer-kit.css rebuilt, dist included)
- `npm run contract:admin-station-css` — rule 5 passes; the run still reports the **same 6 pre-existing `cz-rate-sheet-tool__*` findings that are already failing on `main`** (unrelated dead CSS, unchanged by this work, previously flagged)
- `npm run contract:package-tier-workspace`, `...-shell`, `contract:tier-connections`, `contract:tier-settings`, `contract:station-tabset` — all passed
- `npm run docs:check` — passed
