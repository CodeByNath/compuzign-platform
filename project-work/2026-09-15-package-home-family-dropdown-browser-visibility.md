# Package Home — Family Dropdown Browser Visibility

## Status
- **DEFERRED — follow after current logout work closes**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**

## Defect
Package Home upper deck, right-side **Package Family** dropdown does not render option text reliably across Windows/some browsers. Nath supplied a screenshot showing the native select popup where inactive options such as APTOS and OMNIA become extremely low-contrast/effectively hidden while the selected option remains visible.

## Required outcome
The Package Family selector must remain legible and usable across supported desktop browsers/Windows while preserving the existing family-selection behavior, available/disabled states, labels, routing, and Package authority.

## Scope / safeguards
- Package Home upper-deck Family selector only.
- Audit the actual select/option implementation and relevant Admin/Package CSS before changing anything.
- Determine whether the issue is native `<select>/<option>` styling, disabled-option styling, `color-scheme`, inherited foreground/background tokens, or browser-native popup behavior.
- Prefer the smallest durable cross-browser fix.
- Do not redesign the selector or replace it with a custom dropdown unless native controls cannot meet the requirement and that need is demonstrated first.
- Preserve keyboard access, focus treatment, selection state, disabled semantics, family IDs, navigation, persistence, and all unrelated upper-deck behavior.

## Next action
Do not start while `2026-09-15-admin-station-logout-redirect.md` is active. When logout work is closed, promote this file to `READY FOR BUILDER`, use one topic branch, implement, push for independent review, then request Nath live validation on at least the affected browser/Windows path.
