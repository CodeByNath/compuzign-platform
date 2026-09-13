# Admin UI Refinement

## Status
- **AWAITING LIVE VALIDATION**
- Builder: **Codex**
- Reviewer: **ChatGPT independent auditor**
- Verdict: **Proceed with safeguards**
- Production `main`: `35d48d4b931b7901374a182e12c6a3012a8281fd`
- Topic head: `35d48d4b931b7901374a182e12c6a3012a8281fd`

## Scope lock
Same Admin UI work item. Previously accepted items remain locked. No automatic backfill, migration-on-read, new maintenance mechanism, pricing/customer-flow change, or unrelated refactor.

## Accepted source state
Reviewer independently audited the full production candidate. Accepted behavior:
- occupant **Connections** tab restored with Package-owned relationships; obsolete Service Overview remains removed;
- Build Your Own label spacing scoped;
- Tier Grid 2-per-row above 767px, capped at 1440px;
- existing Admin Platform-ID repair action unchanged;
- lower-deck Platform ID projection preserves normalized `platform_id` and falls back to stored `cz_platform_id` without minting/backfill/write-on-read.

Regression coverage proves stored-only CZPRCI projects through PHP selection output and reaches `DeckInclusion.platformId` in the lower-deck model.

## Production / deployment verification
GitHub `main` now exactly equals the approved head `35d48d4b931b7901374a182e12c6a3012a8281fd`.

GitHub Actions **Deploy to Hostinger** run `34738286772` / #1022:
- head SHA: `35d48d4b931b7901374a182e12c6a3012a8281fd`
- event: `push`
- status: `completed`
- conclusion: **success**
- deploy job `103673505119`: Checkout, Node setup, dependency install, frontend build, source SSH deploy, and dist SCP deploy all succeeded.

## Targeted live validation only
Do not reopen the broader accepted checklist. Validate these current-round outcomes:
1. Focused Tier lower-deck inclusion rows show the existing CZPRCI Platform ID where present.
2. Default, Add-on, and Build Your Own occupant drawers retain the **Connections** tab and do not show the retired Service Overview content.
3. Connections content shows the intended Package-owned Family / Tier Group / Rate Sheet relationships.
4. Build Your Own label has the requested small gap above its shell.
5. Tier Grid is 2x2 on desktop with the 1440px cap and still collapses responsively.

No further source work unless live validation exposes a defect in these items. Keep `admin-ui-refinement` until final live acceptance.
