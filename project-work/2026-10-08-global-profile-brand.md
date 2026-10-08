# Global Settings → Profile / Brand

## Status
**READY FOR BUILDER — Phase 1A identity/storage/API design gate only.**
Builder: Claude; Reviewer: ChatGPT; Owner/live validator: Nath.
**Verdict: Proceed with safeguards** for Phase 0 architecture. No Phase 1 source implementation until Phase 1A review.
Base `main`: `8d1f0185811e69214c0fd85c29819eef0c5d9226`; previous topic branch cleaned. Current coordination only.

## Binding authority
Read `project-work/AGENTS.md`, [locked full handover](2026-10-08-global-profile-brand-handover.md), root `AGENTS.md`, `docs/ai-index.md`, source and focused Code Maps, **especially `docs/code-map/platform-identifier-station.md` and `src/PlatformIdentifier/PlatformIdentifierPolicy.php`**. CompuZign owns platform Profile, storage, media, permissions, validation, identity and API. Service Settings is only its temporary presentation entry. Never infer data ownership from runtime or host APIs.

## Owner decisions
- **Image Option A approved (2026-10-08):** accept image selection regardless of extension, securely decode/inspect; convert to browser-safe image when possible; otherwise clear error and no partial save. Square favicon verified on Pick and Save.
- **New explicit requirement:** Profile MUST have durable platform-owned storage, **Platform ID integrated with the existing Platform Identifier Station**, and documented working API routes. This supersedes Phase 0's suggestion that a singleton should have no Platform ID. Do NOT invent a prefix in consumer code. The Identifier Policy is a closed vocabulary and `profile` has no registered type today.

## Phase 1A — authorised design task (NO source changes)
Provide a concise contract proposal, with actual source evidence:
1. **Identity:** Profile's entity type, proposed prefix for Owner/Reviewer confirmation, unique permanent ID, stable singleton native reference, reservation/binding/lookup/immutability, retry/bootstrap/rollback and migration of an existing profile; use the shared Platform Identifier Station only. No ID minted anew on every Save. No separate ID generator or identity store.
2. **Storage:** stable global Profile record/schema/version/revision plus linked platform asset keys, durable adapter and atomic/consistent file + metadata lifecycle across upgrades/redeploy; conflict/crash recovery, permission and concurrency proof. Profile never uses Service or user records.
3. **APIs:** propose exact authenticated **GET + Save** Profile endpoints and a read-by-Platform-ID route consistent with existing identity lookups; specify payloads, `platform_id`, ETag/revision or equivalent, MIME/upload validation, platform permission gates, REST nonce, error/409 semantics, and whether any asset URL must be public. No routes that expose editable profile data to anonymous users.
4. Test matrix for initial create/reload, idempotent singleton identity, ID lookup, immutability, permission denial, missing image, clear, conversion error, conflicting Save, storage/registry mismatch, and recovery.
5. Mark minimal exact changed files/code maps, proposed identity prefix and any owner decision needed. Report **in this same work file** with `AWAITING REVIEWER REVIEW`; stop.

## Next gated phases
**1B:** only after Phase 1A approval, implement platform Profile identity, persistence, safe asset storage/conversion and APIs + backend tests on one topic branch; independent source review required.
**2:** Settings UI (four fields, one Save).
**3:** favicon 64×64 on main colour, code/name defaults, safe public read seam.
**4:** full tests, source/release verification and Nath live validation.

## Exclusions
No WEX implementation, new Station, general media framework, host profile/media ownership, Service-owned profile, pricing/Tier/Package/quote changes, autosave or unrelated redesign. Keep one work file; no phase advance without reviewer acceptance.
