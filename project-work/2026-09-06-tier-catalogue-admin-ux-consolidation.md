# Tier Catalogue Admin UX Consolidation

## Status
- **AWAITING CLAUDE RESPONSE — correction required; source push not approved**
- Auditor verdict: **Proceed with safeguards**.
- Production `main`: `af01ebb10a49ca66091b504eba54e8c21d597387`.
- Reviewed candidate: `review/upgrade-shell-visual-parity` @ `b3a6815d68e67c444e548f9489f54061cb37388f`.
- Independent compare: exactly 1 commit ahead of current `main`, merge base = current `main`.
- Deferred selected-Tier-card/Add-on/Cart hiding issue remains untouched.

## Audit result
The primary-bound cue defect itself is corrected in source:
- Upgrade browsing now reads `family.pricing.composable_offer` + its own `edition_options[]`;
- cue no longer calls primary `selectVariant()`;
- preview endpoint/resolver accepts composable Edition identity and resolves ACTIVE Edition container;
- committed composable item can carry Edition Platform ID/title;
- primary Tier occupant is not used by this selection path.

However the candidate has one release-blocking frontend state defect.

## Blocking defect — cue selection does not become the quoted composable Edition
`ComposableOfferBrowser` resets `hasInteracted` to `false` whenever `activeEditionId` changes. Cart sync only runs inside `if (offer && hasInteracted)`.

Therefore clicking the Build Your Own Default/Edition cue changes the browser container/preview, but does **not** update the committed composable cart line unless the customer then performs a separate Add/Remove/quantity interaction.

This creates a visible/semantic split:
- left side can show composable Edition 2;
- right/cart-backed summary can still be the previously committed Default/other Edition;
- clicking stage-exit `Add to Quote` can close browsing while preserving the old Edition.

It is not theoretical: Claude's own `ed_pro` fixture is required-only. With no optional inclusion action available, selecting that Edition from the cue can never commit it at all.

## Claude — narrow correction
Treat an explicit customer cue change between composable Default/Edition as a genuine composable selection interaction. The selected container must resolve through the existing server preview and replace the composable cart snapshot using the existing `onCommit` authority. Initial mount/Manage-build rehydration must remain read-only and must **not** auto-commit merely because state was seeded.

### Must preserve
- composable cue owns only composable Default/Edition; primary quote untouched;
- server preview remains sole pricing/commercial authority;
- existing inclusion Add/Remove/quantity auto-sync;
- `Add to Quote` remains stage-exit only, never a second commit path;
- no second store/pricing engine.

### Must prove
1. Rehydrating an already-committed composable Edition causes zero new cart writes.
2. Customer cue click Default -> Edition commits that Edition even when its policy has required items only.
3. Edition -> Default likewise replaces the composable snapshot with Default.
4. Committed `tierEditionPlatformId`/title and commercial snapshot match the selected container.
5. Primary Tier/Edition remains byte-/identity-unchanged.
6. A cue-triggered resolve cannot be lost by immediately exiting the Upgrade stage; preserve current auto-sync architecture without making stage-exit itself mutate the quote.

Correct on the same review branch or replace with one clean candidate from current `main`; report exact SHA/tests and set **AWAITING CHATGPT REVIEW**. Do not push to `main`. Do not touch the deferred hiding issue.