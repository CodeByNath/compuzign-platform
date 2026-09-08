# Tier Catalogue Admin UX Consolidation

## Status
- **READY FOR CLAUDE — LIVE REJECTED: focused ownership is right, CTA/gate presentation was wrongly removed/relabelled**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `a584ede09aeb65f242be26ce5317a5fc9825a05b`, deploy #977 Success, but Nath rejected the live UX.

## What was correct
Keep only this structural correction:
- Build Your Own/composable occupant uses the same focused-shell identity model as a normal Tier: one `focusedTierId`, one `focusedEditionId`, one `selectVariant()`;
- when the catalogue is actually opened, focused data comes from `family.pricing.composable_offer`, never the selected primary Tier;
- composable inclusion selection/server preview/quote identity remain authoritative.

## What we got wrong
The auditor incorrectly treated the old Upgrade presentation as the architectural problem. It was not.

Claude removed the existing Upgrade Your Build CTA/gate presentation and replaced it with a staged `Build Your Own` card/CTA (`family.pricing.composable_offer?.label`, Browse Catalogue/Manage build). Nath has now live-rejected that: the gates/design are wrong and customer wording started becoming **Build Your Own** where the established customer journey is **Upgrade Your Build**.

The required distinction is simple:
- **Upgrade Your Build** = customer journey / CTA / gate presentation after a primary Tier is quoted.
- **Build Your Own/composable occupant** = the internal occupant whose Default/Edition/content the focused shell reads once Browse Catalogue is opened.

Do not rename one into the other.

## Claude — correction
Restore the established Upgrade Your Build customer presentation/flow from the pre-`a584ede` behavior (the accepted CTA/gate design and wording), but keep the new correct focused ownership underneath it.

Required flow:
1. primary Tier is already quoted;
2. **Upgrade Your Build** CTA/gate appears using the established design/copy;
3. while that CTA/gate is active, selected primary Tier context stays visible, but **Add-ons + Cart are hidden**;
4. `Browse Catalogue` enters the SAME focused shell using `COMPOSABLE_QUOTE_TIER_ID` + the composable occupant's own Default/Edition;
5. closing/dismissing returns to the established continuation; do not invent a new Build Your Own card/gate.

### Must preserve
- customer-facing wording **Upgrade Your Build** for this journey;
- existing gate/CTA design that was present before `a584ede`;
- same focused-shell occupant model once catalogue opens;
- primary Tier untouched;
- composable server preview/quote authority;
- Manage build re-entry to the composable focused shell.

### Must remove / not substitute
- remove the new staged `Build Your Own` CTA/card introduced by `a584ede`;
- do not call the Upgrade journey Build Your Own;
- do not restore the old primary-bound focused selector;
- do not create another focused-shell implementation;
- do not redesign the gate.

Prepare one clean correction from current production `main`. Report exact files/SHA and set **AWAITING CHATGPT REVIEW**. Do not push to main.