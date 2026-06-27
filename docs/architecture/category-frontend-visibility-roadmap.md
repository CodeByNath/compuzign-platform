# Roadmap — Category Frontend Visibility

> Status: **Future enhancement — not implemented.** This note records the intended
> direction. Do not build it until the next architecture phase is opened.

## Current behaviour (implemented)

`PricingBuilder::buildResponse()` exposes categories to the public Cost Builder as:

1. The four curated `ORDERED_CATEGORIES`, in their fixed order (including empty
   placeholders), then
2. **Appended** — any other `cz_service_category` term that contains **at least one
   active published service**. Curated terms are de-duplicated by `term_id`; empty
   categories are excluded.

So today a category becomes publicly visible **implicitly**, as a side effect of
containing an active service. There is no explicit visibility control.

## Why this is not the end state

The platform will eventually need **category lifecycle management**, similar to the
service lifecycle:

- We will create test, staging, and future categories during development.
- A category should **not** appear on the public Cost Builder simply because it
  happens to contain an active service.
- Frontend visibility should be an **explicit business decision**, not an implicit
  consequence of service state.

## Future direction

- Add a **category frontend-visibility switch** stored as term meta (e.g.
  `cz_category_frontend_visible`).
- Categories are **hidden by default** until explicitly enabled.
- `PricingBuilder` will eventually require **both** conditions before surfacing a
  category on the frontend:
  1. the category contains active published services, **and**
  2. the category is marked frontend-visible.

This keeps the **service lifecycle independent from category presentation**, giving
complete control over what the public Cost Builder exposes.

## Scope boundary

- The append-extra-terms fix in `PricingBuilder::buildResponse()` is the **current**
  limitation fix and is intentionally visibility-agnostic.
- The visibility system (term meta + admin toggle + the additional `PricingBuilder`
  gate) belongs to the **next architecture phase** and should not be implemented as
  part of the current change.
