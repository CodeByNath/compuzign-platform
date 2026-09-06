# Tier Catalogue Platform Identification — CZTC / CZTEC

## Status
- **READY FOR CLAUDE — replace U identity with the single Tier Catalogue C identity**
- Auditor verdict: **Proceed with safeguards**.
- Production remains `main@48cede2f00b7bd2ee202e94f82a61651ee694d3b`.
- The prior authoring-control candidate `review/composable-upgrade-authoring-control@335df721...` is superseded and must not be pushed to `main`.

## Architecture locked
Admin has one composable catalogue model, named **Tier Catalogue**. There are not separate Admin Upgrade and Custom declarations.

Tier Catalogue occupant:
- `CZT...` normal Tier identity
- `CZTC...` Tier Catalogue identity

Tier Catalogue Edition:
- `CZTE...` normal Edition identity
- `CZTEC...` Tier Catalogue Edition identity

Reuse the already-built U identity path by converting it. Do not build a parallel identity system.

Retire from the model:
- `CZTU` / `CZTEU`
- Upgrade-specific Platform Identifier type names
- `is_upgrade_offer` and its proposed Admin declaration control/gating

No second Custom/C identity family is to be introduced. Production code search currently shows no `CZTC`/`CZTEC` implementation, so this replacement becomes the single C=Catalogue path.

## Exact implementation instruction
On a clean review branch from current production:
1. Rename/reclassify the existing U Platform Identifier families to **Tier Catalogue** / **Tier Catalogue Edition**, prefixes `CZTC` / `CZTEC`.
2. Rename U-specific storage/projection/frontend fields to Catalogue terminology consistently. Do not keep U and C as two coexisting secondary identities.
3. Remove `is_upgrade_offer` from schema, drafts, API handling, frontend types, tests, and authoring-control work. Catalogue identity is inherent to the existing composable/Tier Catalogue record.
4. Every settled Tier Catalogue occupant automatically reserves/persists/binds CZTC alongside CZT through the same lifecycle choreography already implemented for U.
5. Every activated Tier Catalogue Edition automatically reserves/persists/binds CZTEC alongside CZTE through the same Edition choreography.
6. Rename/extend the existing one-time Platform-ID migration scope so existing Tier Catalogue occupants/Editions can receive missing CZTC/CZTEC through the same Admin assignment action. No second migration UI/path.
7. Overview shows **Tier Platform ID + Catalogue Platform ID**; Edition Overview shows **Edition Platform ID + Catalogue Platform ID** when assigned.
8. Update affected Platform-Identifier architecture/current Code Map terminology from Upgrade identity to Tier Catalogue identity.
9. **Customer-facing Upgrade Your Build is frozen.** Do not change customer Upgrade/Build Your Own UX, composable selection, Edition behaviour, pricing, Commercial Legs, quote/cart, Request, PDF/email/order, billing, CRM, or resolver behaviour.
10. No customer/CRM purchased-build identity in this phase; that is future CRM work.

## Safeguard
The live validation did not produce a U identifier. Do not create an old-U compatibility family. If the implementation audit finds actual persisted/bound CZTU/CZTEU data or a migration case that would make this replacement destructive, stop and report before changing permanent identifiers.

Return one clean replacement review commit from `main@48cede2f...`, report exact files/tests/SHA, and set **AWAITING CHATGPT REVIEW**. Do not push `main` before review.