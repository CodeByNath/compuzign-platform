# Account Station → Settings → Tools → Profile — Active Work

## Status
**BUILDER ACTION REQUIRED — design corrections; SOURCE IMPLEMENTATION NOT APPROVED.**
Reviewer verdict: **Proceed with safeguards**. Builder Claude; Reviewer ChatGPT. No source edits, `main` push or deployment authorised.

## Accepted cleanup and approved scope
`main` `8d1f0185811e69214c0fd85c29819eef0c5d9226`; topic `global-profile-platform-settings` `125502d9ce1206548bfaa8d954746d7d4ac7dc74`. Verified equal Git tree `e0da141f44ca2304e5f02d2092afcd4650fcc2c8`, zero diff. Old candidate completely reverted.

**Account Station** is a new peer Station, distinct from coordinator `station-manager/` and presentation-only Admin Station. **Settings, Tools and Profile are Account-owned children, not Stations**. Approved permanent identity prefixes: Account `CZA`, Settings `CZAS`, Tools `CZAST`, Profile `CZASTP`, each followed by five canonical suffix characters. Previous `CZM`/`CZBM`/`CZAM`/`CZPS` families superseded. Account domain must not assume ownership of WordPress users, authentication, unrelated business records, or WEX.

## Reviewer findings — 2026-10-08
Claude's design mapped peer Station registration, four singleton identities, one non-autoloaded WP option, Platform Identifier binding, Brand editor and REST endpoints. **Good separation, but design not yet safe to implement.**

1. **Locked lifecycle:** `docs/architecture/StationDrawerLifecycleContract-v1.md` §1/§7 requires new Stations to conform or be marked pending migration; Claude's proposal to declare a permanent singleton *exempt* is an unapproved change to locked architecture. Propose a concrete compliant Home/Drawer/footer model, or identify exact conflicting clauses and request an explicit Owner decision. Do not quietly create a new status/lifecycle/footer system.
2. **Read/write boundary:** proposal bootstraps/mints four IDs on `GET /admin/account-station`. Reads should be read-only; propose controlled authenticated bootstrap/create path or install/init boundary, with idempotent retries and explicit access control. No unprivileged mutation.
3. **Consistency:** one WP option for four records may work, but registry ID binds and option creation are separate writes. Document failures between each step, orphan bindings, retries, corrupted/missing aggregate, and how an already-bound ID is recovered without re-minting. Preserve identity immutability; no registry manipulation or broad migration.
4. **Practical fit:** specify distinct durable native references and purpose of Settings/Tools/Profile nodes; keep one simple Account-owned aggregate unless a proven requirement justifies extra storage. Distinguish presentation navigation from record identity. Brand image reference/storage security and successful Save must remain safe; no heavy package/media/CAS framework.
5. **Frontend contracts:** verify actual register-before-finalize boot order and Admin-authored presentation bindings; `register.ts` alone is insufficient. Ensure Station's own hooks own API mutations, and public REST is gated by existing platform capability/nonce.

## Claude — bounded next action
Read [current handover](2026-10-08-global-profile-brand-handover.md), root `AGENTS.md`, `docs/ai-index.md`, Station Manager/Admin/Platform Identifier Code Maps, `StationDrawerLifecycleContract-v1.md`, actual peer registration/boot/source. **Revise design only**, addressing five findings with minimal implementation sequence, focused checks, identity recovery table and any precise Owner decision needed. Record a concise updated report **in this work file**, set `AWAITING REVIEWER REVIEW`, push only coordination branch and stop. No code, new dependencies, new Station frameworks, or production changes. Files ≤600 lines; Code Maps/work file ≤600 words.
