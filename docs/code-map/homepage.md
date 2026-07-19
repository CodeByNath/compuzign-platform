# Homepage

## Purpose

Registers the public homepage sections and provides a compact Cost Builder configurator backed by the live public catalogue projection.

## Ownership

The homepage runtime owns component registration and presentation. `HomeConfigurator` owns transient category, Service preview, and quote-selection state, then writes the shared browser cart before linking to the full Cost Builder. It must not own catalogue pricing or submit requests directly.

## Main Entry Points

- [homepage.ts](../../wp-content/plugins/compuzign-platform/resources/ts/modules/homepage.ts) registers every homepage component and shortcode mount condition with the runtime registry. Use it when adding, removing, or remapping a homepage section.
- [HomeConfigurator.tsx](../../wp-content/plugins/compuzign-platform/resources/ts/components/homepage/HomeConfigurator.tsx) contains category navigation, Service/Tier preview cards, Add/Remove actions, quote summary and total, cart save, and Cost Builder handoff. Use it for interactive homepage configurator state or UI.
- [HomepageModule.php](../../wp-content/plugins/compuzign-platform/src/Modules/Homepage/HomepageModule.php) registers homepage shortcodes/templates on the server. Use it for WordPress-side section availability.

## UI and State

- [useCostBuilder.ts](../../wp-content/plugins/compuzign-platform/resources/ts/hooks/useCostBuilder.ts) loads the shared public catalogue projection. Use it for homepage fetch state.
- [cartStorage.ts](../../wp-content/plugins/compuzign-platform/resources/ts/utils/cartStorage.ts) persists quote selections shared with the full builder. Use it for transfer-state format.
- [config.ts](../../wp-content/plugins/compuzign-platform/resources/ts/runtime/config.ts) reads localized runtime URLs and API configuration. Use it for Cost Builder destination configuration.
- [configurator.php](../../wp-content/plugins/compuzign-platform/app/modules/homepage/templates/configurator.php) emits the configurator shortcode mount. Use it for server markup placement.

## Internal File Navigation

| Concern | Marker | Contains | Read when... |
| --- | --- | --- | --- |
| Service preview | `SECTION: SERVICE_PREVIEW` | Popular-Tier preview and Add | Changing preview cards |
| Dashboard | `SECTION: CONFIGURATOR_DASHBOARD` | Category/Service and quote state | Changing configurator interaction |
| Quote handoff | `SECTION: QUOTE_HANDOFF` | Cart updates and transfer | Changing Cost Builder handoff |
| Root | `SECTION: CONFIGURATOR_ROOT` | Fetch and root composition | Changing mount behavior |

## Runtime Flow

The runtime registry mounts each homepage section independently. `HomeConfigurator` fetches the same projection as the Cost Builder, defaults to the first category, resets Service preview when category data changes, previews the popular or standard tier, builds quote items, computes a display total, saves the shared cart, and transfers the user to the configured pricing URL. It is a legitimate feature composition component, though its internal preview and dashboard components could be separated if it grows.

## Validation

From the plugin root: `npx tsc --noEmit`, `npm run build`, `npm run docs:check`, and browser inspection when a WordPress runtime is available.

## Related Code Maps

[Cost Builder](cost-builder.md) and [Quote Builder](quote-builder.md).
