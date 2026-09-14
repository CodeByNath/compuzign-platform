# Admin Station — Logout Redirect

## Status
- **CLOSED — accepted 2026-09-15**
- Builder: **Claude**
- Reviewer: **ChatGPT independent auditor**
- Live validator: **Nath**
- Final verdict: **Proceed**
- Production `main`: `8011e03e5fd7fba5d1f84b0cac03f5a01d541410`
- Deployment: GitHub Actions "Deploy to Hostinger" run #1034 — **Success**

## Accepted result
Admin Station User-menu logout now completes directly and returns to the actual frontend Admin Station login gate.

Accepted behavior:
- no WordPress "Do you really want to log out?" confirmation;
- no standard WordPress login page;
- no `/wp-admin/` landing;
- logout still uses `wp_logout_url()` and WordPress nonce/session ownership;
- destination remains the canonical permalink of the page hosting the Admin Station shortcode, with no fixed `/studio/` dependency;
- HTML entity encoding from `wp_logout_url()` is decoded before the URL enters JavaScript runtime config.

## Evidence
Reviewer independently inspected the corrected candidate and focused regression. The regression proves no literal `&amp;` remains and that `_wpnonce` and `redirect_to` parse under their correct names.

`main` is the exact reviewed SHA `8011e03e5fd7fba5d1f84b0cac03f5a01d541410`; deploy run #1034 succeeded for that SHA.

Nath completed live validation on 2026-09-15 and reported the logout gate is working fine.

Work area closed. Do not reopen without hard evidence of regression.
