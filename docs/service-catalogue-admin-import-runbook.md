# Service Catalogue Admin Import Runbook

Use this runbook for a reviewed, one-time batch of Services with exact titles,
descriptions, Categories, and Inclusions. The temporary runner must execute in
the authenticated Admin application and call the same API functions as the
Service drawer. It must never become a backend importer, WP-CLI command, direct
database write, or permanent Admin feature.

## Required API sequence

1. Before any mutation, call `GET /compuzign/v1/admin/services` and build a
   normalized-title index over every returned Service. Normalize comparison
   values only; never normalize written catalogue text.
2. Resolve each Category from the catalogue response. When absent, call
   `POST /compuzign/v1/admin/service-categories` with its exact name and an
   empty description. Reuse the returned native ID whether the response says
   the Category was existing or created.
3. For zero normalized Service matches, call
   `POST /compuzign/v1/admin/services` with the exact title and description,
   an empty excerpt, and the resolved Category ID.
4. For one match, inspect it through `GET /compuzign/v1/admin/services/{id}`.
   Prefer pending Overview and Inclusion drafts over settled values. Preserve
   meaningful existing content. A missing description or Category may be
   repaired through `POST /admin/services/{id}/overview`, carrying every
   existing effective field unchanged except the missing value.
5. Save a missing Inclusion through
   `POST /admin/services/{id}/inclusions`. Carry forward every effective
   Inclusion and append `{id,label}`, where `id` is a stable normalized key and
   `label` is the exact supplied label.

Multiple normalized Service or Inclusion matches are conflicts. Report and
skip them; never guess. A differing meaningful description or near-matching
Inclusion label is a proposed difference, not permission to overwrite.

## Lifecycle and identity guardrails

Do not call settle, publish, status, enable, disable, archive, trash, restore,
or delete routes. Normal Service creation must reserve and bind its Platform ID
through `ServiceController` and `PlatformIdentifierStation`. Overview and
Inclusion writes remain Pending exactly as they do in the drawer. Do not add
rollback deletion: report a partial API failure for review.

## Required report and rerun

For every requested Service report: action (`created`, `reused`, `repaired`,
`skipped`, or `conflicted`), native and Platform IDs, Category native and
Platform IDs, Category resolution action, exact Category and Inclusion,
Overview and Inclusions module states, and lifecycle state.

Run the same action a second time before removing it. The second report must
show zero created Categories, zero created Services, zero duplicate Inclusions,
and the same native and Platform IDs for every resolved record. After review,
remove the trigger, runner, runner-specific tests/styles, and generated bundle
code; rebuild the Admin bundle and retain only this runbook.
