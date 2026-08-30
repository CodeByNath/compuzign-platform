# Quote receipt email billed-item separators

## Status
- **AWAITING CHATGPT REVIEW** — implemented on review branch, plus a collateral CRM-1A test-regression fix.
- Source push: **NOT APPROVED**
- Auditor verdict: **Proceed with safeguards**

## Objective
Add clear visual separation between each top-level billed item in the customer **Quote Request Received** email. This is an email presentation fix only; Claude remains the sole source editor.

## Live browser evidence — 2026-08-30
Read-only Gmail validation of email **“Your quote request has been received — CZ-9GPG3T”** at the deployed customer-email output.

Under **Your Selected Services**, these three top-level billed blocks visually run together:
1. **KAIROS — IaaS / Starter Cloud**
2. **OMNIA — Banking / Omnia Basic · OMNIA — Select**
3. **Backup & DR Shield add-on / Optional add-on · KAIROS — IaaS**

The inclusion rows inside each block are readable, but there is no consistent border/separator between the end of one billed item and the heading/price summary of the next. The transition from KAIROS inclusions to OMNIA and from OMNIA inclusions to the add-on is ambiguous.

## Required behavior
- Add one subtle, full-width horizontal divider between adjacent **top-level billed item blocks** in the quote receipt email.
- The divider must clearly belong to the boundary between items, with balanced vertical spacing above and below.
- Use email-client-safe markup/styles and the existing email palette; the border must remain visible in Gmail light mode without becoming visually heavy.
- Apply the same rule regardless of whether the item is a Package Tier, primary package, or add-on.
- Do not add a divider before the first item or after the last item.
- Do not place borders between an item’s own inclusion rows; Bundle children remain grouped under their parent billed item.
- Ensure the separator remains correct for one item, two items, and three-or-more items.

## Hard non-change boundary
Do not change email wording, headings, pricing, totals, quantities, item order, Bundle/inclusion grouping, CTA, notes, legal copy, width, typography, colours beyond the separator, or customer data. Do not change the live Quote View/Print page unless it shares the exact email-rendering primitive and the same boundary defect is proven there. No backend pricing/resolver, persistence, schema, or quote snapshot changes.

## Acceptance
- Add focused render/snapshot coverage for 1, 2, and 3 billed-item cases.
- Verify separators appear only between top-level items and never between child inclusions.
- Inspect the actual generated HTML for inline/email-safe styling.
- Validate a sent/rendered email in Gmail at minimum; report any known Outlook limitation.
- Report root cause, changed files, tests, review SHA, and before/after browser evidence here.
- Set **AWAITING CHATGPT REVIEW** when ready. Do not push source to `main` without Nath’s explicit approval.

---

## Claude Report — 2026-08-30

Review branch `review/quote-email-billed-item-separators`, from `main@08befad0`, pushed at `add030a7bcbb4942e214404f2fab3ccd2ec1bf52`. Not merged to `main`.

### Root cause
Each item's own header row already carried `border-bottom:1px solid #f0f0f0`, but a Family item's inclusion rows (`emailInclusionItemsList()`) have no border at all — so the existing line sat between a header and *its own* children, not between one item's end and the next item's start. Between two Family items (or a Family item followed by anything), there was genuinely no line at all, matching the reported evidence exactly.

### Fix
`src/Modules/Requests/Notifications/NotificationTemplates.php`: extracted `emailServiceRow()` as the single-item builder (reusing the already-existing `emailFamilyRow()`), and `buildQuoteSections()` now joins the full ordered block list — main → Family main → bundle → Tier add-on → Family add-on, unchanged order — with a new `emailItemDivider()`: a nested single-cell table (the standard "bulletproof" email HR, more reliable than a bare `<div>` border) using the existing `#e3e3e3`-family palette, `implode()`d between blocks only. `emailFamilyRows()` (now dead — its one caller was replaced) was removed.

### Tests
New `tests/quote-email-billed-item-separators.php`: divider counts for 1/2/3 items (0/1/2, both admin and customer emails); sequential-position proof each divider brackets exactly its two neighboring items; a Bundle's multi-row inclusion list stays grouped under its own parent with no divider interleaved. All existing `package-family-notification.php` and `notification-templates-family-quote-parity.php` pass unchanged (full string-content assertions, no adjacency assumptions broken).

### Generated HTML (structural evidence — not yet Gmail-rendered)
```html
</tr>
<tr><td colspan="2" style="padding:10px 14px;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
    <td style="border-top:1px solid #e3e3e3;font-size:0;line-height:0;">&nbsp;</td>
  </tr></table>
</td></tr>
<tr>
  <td style="padding:11px 14px;border-bottom:1px solid #f0f0f0;">
    <div style="font-size:13px;font-weight:600;color:#111;">OMNIA</div>
```
Verified programmatically (not visually): the divider sits after KAIROS's row and before OMNIA's, and never between OMNIA's header and its own Bundle inclusion rows. **I have not sent or viewed this in Gmail** — per the live-evidence rule, that visual confirmation is Nath's to do, the same as every other live-acceptance step this session.

### Collateral fix (found while running the Code Map's full Validation list)
Running the complete `quote-builder.md` Validation list (not just this task's own tests) surfaced that CRM-1A's `RequestsController` constructor change had silently broken two pre-existing tests (`quote-view-http-boundary.php`, `quote-view-email-link.php`) that predate this task and were never re-run before CRM-1A was closed. Fixed both on this same review branch (separate commit `bf727fc7`'s follow-up `add030a7`) — `quote-view-http-boundary.php` needed only real DI instances (it never touches identity/storage); `quote-view-email-link.php` needed the full post/option/`$wpdb` stub set already established in `request-durable-submission.php`, since it exercises the real `submitRequest()`. Flagging this so it isn't mistaken for scope creep — full run: `request-schema-*`, `request-durable-submission`, `package-family-notification`, `notification-templates-family-quote-parity`, all `quote-view-*`, the new separator test, `platform-identifier-station`, `platform-identifier-existing-assignment`, `category-inline-identity-race`, `category-pending-lifecycle`, every `contract:*` in the Code Map's list except the already-reported pre-existing unrelated `contract:platform-identity-schema` failure, `tsc --noEmit`, `build`, `docs:check` — all pass.

Set to **AWAITING CHATGPT REVIEW**. Source not pushed to `main`.
