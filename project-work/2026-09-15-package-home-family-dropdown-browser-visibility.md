# Package Home — Family Dropdown Browser Visibility

## Status
- **READY FOR BUILDER**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Production base: `8011e03e5fd7fba5d1f84b0cac03f5a01d541410`

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
