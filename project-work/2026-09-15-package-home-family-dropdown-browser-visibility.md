# Package Home — Family Dropdown Browser Visibility

## Status
- **AWAITING LIVE VALIDATION**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Production `main`: `cd86c943163db65a42b9c6d4719f023f98527aa2`
- Deployment: GitHub Actions "Deploy to Hostinger" run #1035 — **Success**

## Defect
Package Home upper-deck **Package Family** native select renders inactive options with very poor contrast on Windows/some browsers.

## Required outcome
Keep the native selector legible and usable while preserving family selection, available/disabled states, labels, routing, IDs, keyboard/focus behavior, persistence, and Package authority.

## Independent reviewer audit — 2026-09-15
Reviewer independently compared production base to the pushed candidate. The topic is one commit ahead and changes only:
- `resources/css/modules/drawer-kit.css`
- rebuilt `dist/css/drawer-kit.css`
- `scripts/admin-station-css-contract.mjs`

The authoritative field-system source confirms the native select is retained. The candidate adds:
- `.cz-tf-select option` → opaque `--station-field-bg` background plus `--station-field-text` foreground;
- `.cz-tf-select option:disabled` → `--station-field-muted` foreground.

This is correctly owned by the shared drawer-kit field system. The locked field-system architecture makes drawer-kit responsible for control appearance, so putting the paint fix in Package feature CSS would violate the existing ownership boundary. Applying the invariant to all `cz-tf-select` controls is therefore acceptable and fixes the same latent cross-browser risk consistently.

No custom dropdown, markup, selection logic, routing, IDs, persistence, focus treatment, or keyboard behavior changed. The existing accent treatment of the closed selector remains intact.

The CSS contract was extended to require the option rule and opaque resolved tokens across themes. Builder reported TypeScript/build, Package workspace/shell, Connections, Settings, Station tabset, and docs checks passed. The Admin CSS contract still reports the same six pre-existing unrelated Rate Sheet findings present on `main`.

## Next action
Builder may move **only exact reviewed candidate `cd86c943163db65a42b9c6d4719f023f98527aa2`** to `main` and run the normal deployment pipeline. Any source change invalidates approval.

After deployment, record exact `main` SHA and deployment evidence here, set **AWAITING LIVE VALIDATION**, and stop.

Nath live validation must use the affected Windows/browser path: open the Package Home Family dropdown in dark theme and confirm KAIROS/APTOS/OMNIA option text is clearly readable, disabled options remain visibly distinct where present, selection still works, and the closed control/focus behavior remains unchanged.

## Production / deployment evidence
- Nath fast-forwarded `main` to `cd86c943163db65a42b9c6d4719f023f98527aa2` (the exact approved candidate) and pushed.
- GitHub Actions "Deploy to Hostinger" run [#1035](https://github.com/CodeByNath/compuzign-platform/actions/runs/34922704961) completed with conclusion **success** for that SHA.

## Live validation requested — Nath
On the affected Windows browser, in **dark theme**, on Package Home:

1. Open the upper-deck **Package Family** dropdown. KAIROS / APTOS / OMNIA should all be clearly readable — not just the selected one.
2. If a disabled option is present, it should still look visibly different from the selectable ones (muted, not identical).
3. Pick a different Family — selection should work exactly as before.
4. The closed control should look unchanged: same accent treatment, same focus ring when tabbed to.
5. Worth a glance in light theme too, since the option colours now apply in both.

This change also affects every other dropdown in the Admin Station (the field system owns control appearance, so the fix could not be scoped to this one selector). If you pass through a drawer with selects — Rate Sheet row Per/Group, the Settings filters — a quick look that they still read normally would cover the wider surface.

Note: a cached stylesheet could still serve the old CSS. If it looks unchanged, a hard reload first would separate a caching artifact from a real failure.

Reply pass/fail and I'll close this out.
