# Single Occupant Focused State After Quote

## Status
- **READY FOR CLAUDE**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `22b1ff3619363fef80beadd8cb944d2560f4571f`.
- Current review branch: `review/single-occupant-quoted-focus` @ `e6f70ac65919aa5ff47edacb523ad35c23b96c99`, exactly 1 ahead / 0 behind.
- **SOURCE PUSH NOT APPROVED.**

## Nath's exact rule — authoritative
This supersedes every earlier interpretation in this file.

When a Family has exactly one normal Tier occupant and **nothing else** in that Family — no second normal Tier, no add-on, no eligible Upgrade Your Build catalogue — the focused shell remains the permanent Family presentation.

Before Add to Quote:
- focused shell visible;
- Cart hidden;
- no X.

After Add to Quote:
- focused shell **stays visible**;
- Cart **appears alongside it**;
- no X;
- no small Tier card / no View Plan route is needed because the plan is already open.

If the Family has another normal Tier, any add-on, or an eligible Upgrade catalogue, preserve the existing comparison/staged Recommendations behavior. This special Cart-with-focused-shell rule applies only to the genuinely lone occupant Family.

## Audit of current candidate
Claude correctly implemented the lone-Family focus/X part:
- `familyOffersNothingElse` uses single normal occupant + no add-ons + no eligible composable rows;
- quoted lone occupant stays in implicit focused shell;
- `isLockedSingleTierLanding` hides X.

But Nath's latest request is **not fully followed**. `PackageBuilderApp.tsx` still globally defines:

`hasVisibleQuote = items.length > 0 && !focusedShellActive`

and `FamilyTierAdapter` still reports the lone quoted shell as focused (`onFocusedShellActiveChange(effectiveFocusedTierId !== null || upgradeGateActive !== null)`). Therefore keeping the shell focused still hides the Cart. The candidate's regression mounts only `FamilyTierAdapter` and passes a no-op `onFocusedShellActiveChange`, so it cannot prove the required Cart visibility transition.

## Required correction
Do not undo the focused-shell behavior. Add the missing distinction so Cart visibility can coexist with the focused shell **only** for the quoted, genuinely-alone occupant case.

Claude must inspect the cleanest ownership boundary. Preferred shape: have `FamilyTierAdapter` report enough presentation state for `PackageBuilderApp` to know whether the active focused shell is a lone quoted occupant that permits Cart visibility, instead of duplicating Family eligibility logic in `PackageBuilderApp`.

Required behavior:
- lone unquoted occupant: shell yes, Cart hidden, X hidden;
- lone quoted occupant: shell yes, Cart visible, X hidden;
- remove quote: Cart hides again, shell remains;
- other normal Tier present: existing behavior unchanged;
- add-on present: existing staged Recommendations behavior unchanged;
- eligible Upgrade present: existing staged Recommendations behavior unchanged;
- composable browsing / ordinary explicit focused shells continue hiding Cart as before.

Add a regression at the `PackageBuilderApp`/real parent visibility boundary, not only `FamilyTierAdapter`, proving Cart hidden before Add to Quote and visible after Add to Quote while the same focused shell remains mounted.

## Must preserve
Focused shell for lone occupant before/after quote; no X; exact cart/quote mutation; add-ons/Upgrade/Recommendations; multi-Tier comparison; ordinary focused-shell Cart hiding; composable browsing Cart hiding.

## Must remove
The current false coupling where every focused shell necessarily hides Cart, including this lone quoted case.

## Must not substitute
No leaving the focused shell after quote; no small-card workaround; no fake View Plan route; no CSS-only Cart reveal; no duplicate Family eligibility logic in the parent if child-owned state can express it cleanly; no weakening other focused-shell hiding rules.

After correction, rebuild one clean candidate from current production `main`, single commit, 1 ahead / 0 behind, run focused regression/contracts + TypeScript/build/docs, record exact SHA/tree, set **AWAITING CHATGPT REVIEW**, stop. Do not push `main`.
