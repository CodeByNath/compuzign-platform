# CRM Request actions — Approve / Cancel / Admin Print

## Status
- **READY FOR CLAUDE**
- Production `main` = `19c4c431d52d703e2a81e9af8dfddd8b260f439d`.
- Deploy run `33383746980` / #924 = `completed/success`, exact `head_sha=19c4c431d52d703e2a81e9af8dfddd8b260f439d`.
- Source push: **NOT APPROVED**
- Auditor verdict: **Proceed with safeguards — one token-only visual correction remains**.

## Locked CRM-1C behavior
- Durable Request lifecycle remains authoritative/CAS-protected.
- Pending drawer: header Print icon beside existing ×; footer Cancel Request left and Approve right.
- Terminal drawer: header Print + × only; no mutation footer.
- Print renders existing `QuoteProposalPreview` from stored Request snapshot only; no customer secret, transient lookup, live re-resolution/repricing, duplicate renderer, post/meta IDs, signed URLs, or security plumbing.
- Print-window handle and bounded stylesheet behavior remain as reviewed.

## Live validation — 2026-08-31
Nath reports all functional and layout checks pass:
- Approve/Cancel lifecycle and Requests wall/count refresh;
- Pending header/footer placement with no redundant footer Close/Print;
- corrected Admin Print and print/save flow;
- terminal-state action visibility;
- existing drawer/list/search/counts and customer quote behavior.

Browser inspection confirms Print and Close currently share the neutral base values in normal state. Nath’s marked review identifies the Print icon’s interaction/accent treatment as borrowing a new/non-Admin accent colour.

## Only remaining correction
Make the header **Print / Save PDF** icon button use the established **Admin Station design tokens** for every visual state:
- default;
- hover;
- keyboard focus/focus-visible;
- active/pressed;
- disabled/busy.

Reuse the same Admin icon-button token family and interaction treatment already used by adjacent drawer-header controls (including ×) or the canonical Admin Station header icon pattern. Do not introduce or hard-code a new blue/accent colour, raw hex/RGB value, or customer-facing token. The tooltip and accessible label remain **Print / Save PDF**.

This is token alignment only. Do not change icon placement, dimensions, click target, tooltip timing/copy, print logic, window behavior, lifecycle actions, footer layout, drawer body, or other Station controls.

## Acceptance
- Print icon has no new/borrowed accent in any state and resolves through existing Admin tokens.
- Adjacent Print and × controls look intentionally part of one Admin header-action system while retaining their distinct icons.
- Focus-visible remains accessible and is not removed; it must use the canonical Admin focus token.
- Add/update focused style/contract coverage preventing raw/new colour usage for this control.
- Report changed files, tests, review SHA, and before/after browser evidence here; set **AWAITING CHATGPT REVIEW**. Do not push source to `main` without Nath’s explicit approval.
