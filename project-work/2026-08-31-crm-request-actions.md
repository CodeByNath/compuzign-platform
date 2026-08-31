# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **AWAITING CHATGPT REVIEW — real root cause found and fixed; workflow cleanup also done this round.**
- Production `main` (unchanged) = `bde634a9de0766149e21dcb041a509840c0e27ae`.
- Review head: `review/crm-1c-request-actions@f3ded9aa`, pushed, 1 commit over production.
- Source push: **NOT APPROVED / NOT DONE**.
- Auditor verdict on prior round: **Proceed** (token-alignment mechanism was right; see "what was actually still wrong" below).

## Locked CRM-1C behavior
- Durable Request lifecycle remains authoritative/CAS-protected.
- Pending drawer: header Print icon beside existing ×; footer Cancel Request left and Approve right.
- Terminal drawer: header Print + × only; no mutation footer.
- Print renders existing `QuoteProposalPreview` from stored Request snapshot only; no customer secret, transient lookup, live re-resolution/repricing, duplicate renderer, post/meta IDs, signed URLs, or security plumbing.
- Print-window handle and bounded stylesheet behavior remain as reviewed.

## Live validation already passed — 2026-08-31
Nath reports all functional/layout checks pass on the deployed CRM-1C behavior:
- Approve/Cancel lifecycle and Requests wall/count refresh;
- pending header/footer placement with no redundant footer Close/Print;
- corrected Admin Print and print/save flow;
- terminal-state action visibility;
- existing drawer/list/search/counts and customer quote behavior.

The only remaining issue found live was visual token alignment on the Print header icon interaction states.

## Auditor review of `bde634a9`
Independent compare confirms the review head is one scoped commit over production and changes only:
- `resources/ts/admin-station/styles/admin-station.css`;
- compiled `dist/css/admin-station.css`;
- focused Request Admin-surface contract.

The correction is token-only and within scope:
- `.cz-icon-btn:focus-visible` now uses existing `var(--station-focus-ring)` via the canonical Admin focus selector group;
- `.cz-icon-btn:active:not(:disabled)` uses existing `var(--station-active-bg)`;
- default/hover/disabled neutral behavior remains on existing Admin Station tokens;
- no raw/new colour, customer-facing token, size, placement, tooltip, print logic, lifecycle, footer layout, drawer body, or unrelated control change.

Claude reports passing `tsc`, build, Request PHP tests, extended Request Admin-surface contract, and docs check. The six `cz-rate-sheet-tool__*` CSS findings remain pre-existing/unrelated and are not part of this work.

## Claude report — pushed to `main`

`review/crm-1c-request-actions@bde634a9` pushed to `main` as a plain fast-forward (`git push origin review/crm-1c-request-actions:main`), `main@19c4c431` → `main@bde634a9`, no rewrite, nothing beyond the approved 1 commit.

GitHub Actions **Deploy to Hostinger** fired on that push: run #925, id `33386405519`, head SHA `bde634a9`, status `completed`, conclusion **success**.

## What was actually still wrong (found live, screenshot evidence from Nath)

The `bde634a9` token-alignment mechanism (`.cz-icon-btn:focus-visible`/`:active` resolving through `--station-focus-ring`/`--station-active-bg`) was correct, but the Print icon still rendered with a yellow/gold accent — including in its default/hover state, not just interaction states. Root cause, confirmed via Nath's own devtools screenshot: **`cz-icon-btn` is not an Admin-exclusive name.** `atomic-engine/css/04-buttons.css` — the CUSTOMER-facing stylesheet — already defines its own unrelated `.cz-icon-btn` with `:hover`/`:focus-visible` rules resolving through `--cz-color-accent` (the customer brand gold accent). That stylesheet is enqueued globally on every frontend page (`AssetLoader::enqueue()`, unconditional), including the page hosting the Admin Station shortcode, so the two identically-named classes collided and the customer rule won the cascade. This was a naming-collision defect I introduced by not checking `atomic-engine/css/` before naming a new Admin class — not a token-value defect, and not something the prior round's fix (correct in isolation) could have caught.

## Claude report — `f3ded9aa`

### Fix
Renamed `cz-icon-btn` / `cz-icon-btn-wrap` / `cz-icon-btn-tooltip` → `cz-station-drawer-iconbtn` / `-wrap` / `-tooltip`, under the same `cz-station-*` prefix every other Admin-only class already uses (`cz-station-iconbtn`, `cz-station-drawer__close`, `cz-station-pill`, …) specifically to make this collision structurally impossible. No token values changed — `--station-text-muted`/`--station-hover-bg`/`--station-focus-ring`/`--station-active-bg` were always the right tokens; only the name was wrong. `resources/ts/admin-station/CLAUDE.md` now documents the `cz-station-*`-only rule and the exact collision that motivated it, so it isn't repeated.

### Drawer audit against the Drawer Kit / Admin Station system (per this round's ask)
Reviewed the whole Request drawer against established conventions:
- `RequestDrawerFooter.tsx` — still composed from `cz-tf-footer`/`cz-admin-btn*` (the same primitives `InlineEditorShell.tsx` uses), already accepted in the prior live-validation round; unchanged.
- `RequestDrawerDialogs.tsx` — already reuses the exact `cz-publish-confirm*` dialog convention `CategoryDrawerDialogs.tsx` established; unchanged.
- `RequestDrawerHost.tsx` — already uses the shared `ReadBlock`/`setFooter`/`setHeaderAction` drawer-kit contract; unchanged.
- `.cz-requests-drawer*` (fact/item list presentation CSS) — already fully token-driven (`var(--station-*)` throughout), no raw colours, correctly scoped as feature-specific presentation per the shell-sheet ownership boundary; unchanged.
- Every other CRM-1C class name introduced this work item was swept directly against every file in `atomic-engine/css/` — zero collisions found beyond the one already fixed.

Conclusion: the `cz-icon-btn` naming collision was the one real defect. Nothing else in the Request drawer duplicates or diverges from the established Drawer Kit / Admin Station system.

### Contract coverage added
`requests-admin-station-surface-contract.ts` now scans every `atomic-engine/css/*.css` file and asserts none of them ever define `.cz-station-drawer-iconbtn` (the regression guard this exact bug needed), plus an assertion that the retired `cz-icon-btn` name is never reintroduced in markup or CSS.

### Evidence (from plugin root)
`npx tsc --noEmit`, `npm run build` — clean. `php tests/request-status-transition.php`, `php tests/admin-requests-durable-surface.php` — pass. `npm run contract:requests-admin-station-surface` (extended) — pass. `npm run contract:admin-station-css` — same 6 pre-existing `cz-rate-sheet-tool__*` failures, unrelated. `npm run docs:check` — pass. Built bundle verified directly (`grep -c cz-icon-btn dist/…` = 0 in both CSS and JS). Not run: live browser — no local WP/browser environment here; this needs the same live pass that caught the original defect.

## Workflow cleanup performed this round (per Nath's direct instruction, separate from the Print fix above)

**Branch audit and deletion.** Verified every `phase-*`/`review/*` branch's tip via `git merge-base --is-ancestor` against current `origin/main`. 15 branches confirmed fully merged (both local and remote tip reachable from `main`) and deleted, local and remote: `phase-8e-addon-cta-review`, `phase-8f-quote-review-pdf-parity`, `phase-8g-bundle-inclusion-parity`, `phase-8h-plan-details-value-states`, `phase-8i-final-quote-inclusion-quantity-parity`, `phase-8j-a-quote-snapshot-parity`, `phase-8j-b-quote-email-parity`, `phase-8j-c1-quote-view-boundary`, `review/crm-1a-durable-request-identity`, `review/crm-1b-admin-read-surface`, `review/crm-request-summary-cards`, `review/package-bundle-family-group-count-and-price-wording`, `review/package-bundle-inclusion-expansion-correction`, `review/package-bundle-service-inclusion-projection-parity`, `review/package-bundle-settings-pool-and-tier-card-count`. **Kept** `review/quote-email-billed-item-separators` — confirmed genuinely unmerged (not an ancestor of `main`). **Kept** `review/crm-1c-request-actions` — this work item's own still-open branch.

**`Project-work-instructions` corruption found and repair staged.** `git fetch --all --prune` revealed `origin/Project-work-instructions` had been force-updated to be byte-identical to `origin/main` — the entire `project-work/` coordination-doc history (13 files, ~210 commits) is gone from its current tip, and four recovery/backup branches (`Project-work-instructions-recovery`, `-recovery-2`, `-restored`, `-temp`) appeared on origin alongside it, apparently from a prior manual recovery attempt. Forensic check: `-recovery`/`-recovery-2`/`-restored` all sit at `93df8449`, one commit behind my own last known-good local tip, with zero unique content; `-temp` mirrors the corrupted `bde634a9` state. My local `Project-work-instructions` ref never lost anything (`63eac78a`, confirmed to still hold the full `project-work/` tree intact, and confirmed none of the 46 commits unique to the corrupted remote touch `project-work/` at all — they're pure product-source history, already safe on `main`). This local ref is the complete, correct, most up-to-date coordination history and is the one to restore from.

**Blocked on user action:** pushing the restore is a force-push, blocked by the Claude Code auto-mode classifier at the harness level (same as every `main` push this work item needed — cannot be pushed through by retrying). Nath needs to run, from the repo root:
```
git push --force-with-lease origin Project-work-instructions:Project-work-instructions
```
This restores `origin/Project-work-instructions` to my local `63eac78a` (soon to gain one more commit — this very report). Once confirmed restored, the four recovery/temp branches (`Project-work-instructions-recovery`, `-recovery-2`, `-restored`, `-temp`) should be deleted too — I did not delete them yet since they're currently the only remaining copies of the pre-corruption state on origin besides my local ref, kept as a safety net until the restore is confirmed.

**Going forward:** only `main` and `Project-work-instructions` remain as long-lived branches. No new branch will be created per audit/fix round — work continues through this same `project-work/*.md` file structure on `Project-work-instructions`, with a topic branch (like `review/crm-1c-request-actions`, which already exists) used only where the audit process needs to see a diff on GitHub, deleted once its work item closes and lands on `main`.

## Claude next action
1. Nath: run the `--force-with-lease` restore command above, confirm `origin/Project-work-instructions` shows the full `project-work/` history again, then say so.
2. Once confirmed, I'll delete the four recovery/temp branches and this report is complete.
3. Stopping here for ChatGPT audit of `f3ded9aa` before any further push to `main`. No architecture, lifecycle, pricing, identity, quote-snapshot, or customer-quote change in any of this round's work.
