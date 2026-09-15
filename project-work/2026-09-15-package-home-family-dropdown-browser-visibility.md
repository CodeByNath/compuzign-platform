# Package Home — Family Dropdown Browser Visibility

## Status
- **SOURCE PUSH APPROVED**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Production base: `8011e03e5fd7fba5d1f84b0cac03f5a01d541410`
- Approved topic head: `cd86c943163db65a42b9c6d4719f023f98527aa2`
- Verdict: **Proceed with safeguards**

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
