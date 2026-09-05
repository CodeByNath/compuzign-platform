<?php

namespace CompuZign\Platform\Modules\Requests\Support;

class RequestSchema
{
    /** The one client-or-minted quote reference shape — reused wherever a
     *  reference needs validating (e.g. QuoteViewAccess's read boundary)
     *  rather than a second/diverging pattern literal. */
    public const QUOTE_REF_PATTERN = '/^CZ-[A-Z0-9]{6}$/';

    /**
     * Validate and sanitise a quote-cart submission request.
     *
     * Returns ['ok' => true, 'data' => array] on success.
     * Returns ['ok' => false, 'message' => string, 'status' => int] on failure.
     *
     * @return array{ok: bool, data?: array, message?: string, status?: int}
     */
    public static function validate(\WP_REST_Request $request): array
    {
        $type = sanitize_text_field((string) $request->get_param('type'));

        if (!in_array($type, ['quote_cart', 'free_it_assessment'], true)) {
            return ['ok' => false, 'message' => 'Invalid request type.', 'status' => 400];
        }

        $contact  = sanitize_text_field((string) ($request->get_param('contact') ?? ''));
        $email    = sanitize_email((string) ($request->get_param('email') ?? ''));
        $company  = sanitize_text_field((string) ($request->get_param('company') ?? ''));
        $phone    = sanitize_text_field((string) ($request->get_param('phone') ?? ''));
        $notes    = sanitize_textarea_field((string) ($request->get_param('notes') ?? ''));
        $quoteRef = sanitize_text_field((string) ($request->get_param('quote_ref') ?? ''));
        $category = sanitize_text_field((string) ($request->get_param('category') ?? ''));

        if ($contact === '') {
            return ['ok' => false, 'message' => 'Contact name is required.', 'status' => 422];
        }

        if ($email === '' || !is_email($email)) {
            return ['ok' => false, 'message' => 'A valid email address is required.', 'status' => 422];
        }

        $quoteRef = self::resolveQuoteRef($quoteRef);

        if ($type === 'quote_cart') {
            $rawItems = $request->get_param('items');
            if (empty($rawItems) || !is_array($rawItems)) {
                return ['ok' => false, 'message' => 'At least one service item is required.', 'status' => 422];
            }
            $items = self::sanitizeItems($rawItems);
            if ($items === []) {
                return ['ok' => false, 'message' => 'At least one valid service or package item is required.', 'status' => 422];
            }
        } else {
            $items = [];
        }

        return [
            'ok'   => true,
            'data' => [
                'type'      => $type,
                'quote_ref' => $quoteRef,
                'contact'   => $contact,
                'company'   => $company,
                'email'     => $email,
                'phone'     => $phone,
                'notes'     => $notes,
                'category'  => $category,
                'items'     => $items,
                'submitted' => current_time('mysql'),
            ],
        ];
    }

    /**
     * Accept a well-formed client ref (CZ-XXXXXX) or mint a fresh one.
     */
    public static function resolveQuoteRef(string $raw): string
    {
        if (preg_match(self::QUOTE_REF_PATTERN, $raw)) {
            return $raw;
        }

        return 'CZ-' . strtoupper(substr(md5(uniqid('cz', true)), 0, 6));
    }

    /**
     * Sanitise the items array from the raw request param.
     *
     * @param  array<mixed> $rawItems
     * @return array<int, array<string, mixed>>
     */
    public static function sanitizeItems(array $rawItems): array
    {
        $items = [];

        foreach ($rawItems as $raw) {
            if (!is_array($raw)) {
                continue;
            }

            $price = null;
            if (isset($raw['price']) && $raw['price'] !== null) {
                $price = floatval($raw['price']);
            }

            $features = [];
            if (isset($raw['features']) && is_array($raw['features'])) {
                $features = array_values(array_map('sanitize_text_field', $raw['features']));
            }

            $item = [
                'serviceTitle' => sanitize_text_field((string) ($raw['serviceTitle'] ?? '')),
                'categoryName' => sanitize_text_field((string) ($raw['categoryName'] ?? '')),
                'tierTitle'    => sanitize_text_field((string) ($raw['tierTitle'] ?? '')),
                'tierId'       => sanitize_text_field((string) ($raw['tierId'] ?? '')),
                'price'        => $price,
                'billingCycle' => sanitize_text_field((string) ($raw['billingCycle'] ?? '')),
                'features'     => $features,
                // Promotion fields — optional; absent on all legacy Core Tier items.
                'offer_type'    => sanitize_text_field((string) ($raw['offer_type'] ?? '')),
                'promotion_id'  => sanitize_text_field((string) ($raw['promotion_id'] ?? '')),
                'billing_label' => sanitize_text_field((string) ($raw['billing_label'] ?? '')),
                // Whether this line is a Tier add-on (stackable, selected
                // alongside the normal Tier) rather than the one normal
                // selection for serviceId. Never inferred from serviceId's
                // sign — the legacy recommended bundle keeps using its own
                // negative serviceId and is not classified as an add-on here.
                'isAddon'       => !empty($raw['isAddon']),
                // Structured minimum commitment (Phase 8) — the resolved
                // Tier Edition's own minimum_term_value/unit at the moment
                // this line was added to the cart, or null for every line
                // that carries none. Structured data, not presentation
                // text — floatval/sanitize_text_field, not free-form.
                'minimumTermValue' => isset($raw['minimumTermValue']) && $raw['minimumTermValue'] !== null && $raw['minimumTermValue'] !== ''
                    ? floatval($raw['minimumTermValue'])
                    : null,
                'minimumTermUnit'  => !empty($raw['minimumTermUnit'])
                    ? sanitize_text_field((string) $raw['minimumTermUnit'])
                    : null,
            ];
            if ($item['offer_type'] === 'family_tier') {
                unset($item['serviceTitle'], $item['categoryName']);
                $item['familyId']       = sanitize_text_field((string) ($raw['familyId'] ?? ''));
                $item['familyPlatformId'] = sanitize_text_field((string) ($raw['familyPlatformId'] ?? ''));
                $item['familyTitle']    = sanitize_text_field((string) ($raw['familyTitle'] ?? ''));
                $item['tierInstanceId'] = sanitize_text_field((string) ($raw['tierInstanceId'] ?? ''));
                $item['tierInstancePlatformId'] = sanitize_text_field((string) ($raw['tierInstancePlatformId'] ?? ''));
                $item['tierOccupantId'] = sanitize_text_field((string) ($raw['tierOccupantId'] ?? ''));
                $item['tierPlatformId'] = sanitize_text_field((string) ($raw['tierPlatformId'] ?? ''));
                $item['tierEditionPlatformId'] = sanitize_text_field((string) ($raw['tierEditionPlatformId'] ?? ''));
                // Phase 8J-A: the already-snapshotted fields the accepted
                // customer cart/review/proposal/email surfaces read (see
                // FamilyTierAdapter.tsx's itemFor()) that this sanitiser was
                // previously dropping — never re-resolved from live catalog
                // data, only carried through from what the browser already
                // captured at Add to Quote time.
                $item['tierEditionTitle'] = isset($raw['tierEditionTitle']) && $raw['tierEditionTitle'] !== null
                    ? sanitize_text_field((string) $raw['tierEditionTitle'])
                    : null;
                $item['inclusionItems'] = self::sanitizeInclusionItems($raw['inclusionItems'] ?? null);
                $item['legPaymentSummaries'] = self::sanitizeLegPaymentSummaries($raw['legPaymentSummaries'] ?? null);
                // Live-gate correction (2026-09-05, "preserve period/leg
                // inclusion attribution in quote snapshots"): the additive
                // breakdown behind legPaymentSummaries above — see
                // FamilyTierQuoteItem.commercialBreakdown (cost-builder/
                // types.ts) and sanitizeCommercialBreakdown() below for the
                // full reasoning. Never re-derived from legPaymentSummaries
                // (that data is already discarded by the time it's built);
                // carried through exactly as captured, or null when absent.
                $item['commercialBreakdown'] = self::sanitizeCommercialBreakdown($raw['commercialBreakdown'] ?? null);
                // Request/PDF/email propagation phase: the composable ("Build
                // Your Own") occupant's own role discriminator — the one field
                // that was silently dropped by this sanitiser, causing every
                // downstream reader (requestLineToCartItem.ts, proposal/PDF,
                // email) to fall back to `primary`. Absent/falsy defaults to
                // false, identical to the isAddon pattern above, so every
                // pre-existing Request (none of which has ever been
                // composable) is unaffected. Write-boundary guard: composable
                // and Add-on are mutually exclusive roles (see
                // resolveQuoteItemRole() in utils/quote.ts) — a composable
                // line is forced isAddon: false here regardless of what the
                // raw payload claims, so the stored snapshot can never
                // represent the impossible state, rather than relying on
                // every reader to re-apply the same precedence rule.
                $item['isComposable'] = !empty($raw['isComposable']);
                if ($item['isComposable']) {
                    $item['isAddon'] = false;
                }
                if ($item['familyId'] === ''
                    || $item['familyPlatformId'] === ''
                    || $item['tierInstanceId'] === ''
                    || $item['tierInstancePlatformId'] === ''
                    || $item['tierOccupantId'] === ''
                    || $item['tierPlatformId'] === ''
                ) {
                    continue;
                }
            } else {
                $item['serviceId'] = intval($raw['serviceId'] ?? 0);
                // Phase 8J-C2 correction: the live catalog's own short
                // description / recommended-Bundle description, captured by
                // the browser at submission time (see QuoteCartFlow.tsx's
                // withSubmissionDescriptions()) — never re-resolved here or
                // by the secure quote-view reload page, which has no live
                // catalog access. Family items never carry these; their own
                // inclusionItems/features already fully describe them.
                $item['serviceDescription'] = !empty($raw['serviceDescription'])
                    ? sanitize_text_field((string) $raw['serviceDescription'])
                    : null;
                $item['bundleDescription'] = !empty($raw['bundleDescription'])
                    ? sanitize_text_field((string) $raw['bundleDescription'])
                    : null;
            }
            $items[] = $item;
        }

        return $items;
    }

    /**
     * Sanitise a snapshot `inclusionItems` list (Phase 8G structure) — the
     * exact resolved effective.inclusionItems the browser captured at Add to
     * Quote time (see FamilyTierAdapter.tsx's itemFor()), including a
     * Bundle parent's own `includes` children and each item's `quantity`.
     * Explicit per-field allow-list; unknown nested keys are never carried
     * through, and this same allow-list is applied recursively so a Bundle
     * child's `includes` (unused today, but the same shape) gets no looser
     * treatment than the top level.
     *
     * @param  mixed $raw
     * @return array<int, array<string, mixed>>|null
     */
    private static function sanitizeInclusionItems($raw): ?array
    {
        if (!is_array($raw) || $raw === []) {
            return null;
        }

        $items = [];
        foreach ($raw as $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $id = sanitize_text_field((string) ($entry['id'] ?? ''));
            if ($id === '') {
                continue;
            }

            $item = [
                'id'    => $id,
                'label' => sanitize_text_field((string) ($entry['label'] ?? '')),
            ];

            if (isset($entry['quantity']) && $entry['quantity'] !== null && $entry['quantity'] !== '') {
                $item['quantity'] = intval($entry['quantity']);
            }

            if (!empty($entry['bundle_id'])) {
                $item['bundle_id'] = sanitize_text_field((string) $entry['bundle_id']);
            }

            $children = self::sanitizeInclusionItems($entry['includes'] ?? null);
            if ($children !== null) {
                $item['includes'] = $children;
            }

            $items[] = $item;
        }

        return $items === [] ? null : $items;
    }

    /**
     * Sanitise a snapshot `legPaymentSummaries` list (Phase 5 structure) —
     * the quoted option's own resolved commercial payment streams the
     * browser captured once at Add to Quote time (see
     * FamilyTierAdapter.tsx's itemFor() / buildLegPaymentSummaries()).
     * Preserves every field the TS `LegPaymentSummary` type declares;
     * unknown nested keys are never carried through.
     *
     * @param  mixed $raw
     * @return array<int, array<string, mixed>>|null
     */
    private static function sanitizeLegPaymentSummaries($raw): ?array
    {
        if (!is_array($raw) || $raw === []) {
            return null;
        }

        $summaries = [];
        foreach ($raw as $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $source = sanitize_text_field((string) ($entry['source'] ?? ''));
            if ($source === '') {
                continue;
            }

            $occurrenceMonths = [];
            if (isset($entry['occurrenceMonths']) && is_array($entry['occurrenceMonths'])) {
                $occurrenceMonths = array_values(array_map('intval', $entry['occurrenceMonths']));
            }

            $summaries[] = [
                'source'           => $source,
                'billingCycle'     => isset($entry['billingCycle']) && $entry['billingCycle'] !== null
                    ? sanitize_text_field((string) $entry['billingCycle'])
                    : null,
                'price'            => isset($entry['price']) && $entry['price'] !== null
                    ? floatval($entry['price'])
                    : null,
                'startMonth'       => intval($entry['startMonth'] ?? 0),
                'endMonth'         => isset($entry['endMonth']) && $entry['endMonth'] !== null
                    ? intval($entry['endMonth'])
                    : null,
                'isOngoing'        => !empty($entry['isOngoing']),
                'occurrenceMonths' => $occurrenceMonths,
                'subtotal'         => isset($entry['subtotal']) && $entry['subtotal'] !== null
                    ? floatval($entry['subtotal'])
                    : null,
            ];
        }

        return $summaries === [] ? null : $summaries;
    }

    /**
     * Sanitise a snapshot `commercialBreakdown` list (Phase 2026-09-05
     * structure) — the additive, attribution-preserving breakdown behind
     * `legPaymentSummaries`: which specific inclusion, at what quantity/unit
     * price/line total, in which Period/component, the browser captured
     * once at Add to Quote time (see FamilyTierAdapter.tsx's itemFor(),
     * ComposableOfferBrowser.tsx's buildComposableFamilyTierQuoteItem(),
     * buildQuotedCommercialBreakdown() in cost-builder/PricingTiers.tsx).
     * Explicit per-field allow-list at every nesting level, applied
     * recursively for a Bundle child's own `includes` — same convention as
     * sanitizeInclusionItems() above. Preserves every Period/component
     * occurrence exactly once; never deduplicated by source.
     *
     * @param  mixed $raw
     * @return array<int, array<string, mixed>>|null
     */
    private static function sanitizeCommercialBreakdown($raw): ?array
    {
        if (!is_array($raw) || $raw === []) {
            return null;
        }

        $periods = [];
        foreach ($raw as $periodEntry) {
            if (!is_array($periodEntry) || !isset($periodEntry['components']) || !is_array($periodEntry['components'])) {
                continue;
            }

            $components = [];
            foreach ($periodEntry['components'] as $componentEntry) {
                if (!is_array($componentEntry)) {
                    continue;
                }

                $source = sanitize_text_field((string) ($componentEntry['source'] ?? ''));
                if ($source === '') {
                    continue;
                }

                $inclusions = self::sanitizeCommercialBreakdownInclusions($componentEntry['inclusions'] ?? null);
                if ($inclusions === null) {
                    continue;
                }

                $components[] = [
                    'source'       => $source,
                    'billingCycle' => isset($componentEntry['billingCycle']) && $componentEntry['billingCycle'] !== null
                        ? sanitize_text_field((string) $componentEntry['billingCycle'])
                        : null,
                    'price'        => isset($componentEntry['price']) && $componentEntry['price'] !== null
                        ? floatval($componentEntry['price'])
                        : null,
                    'inclusions'   => $inclusions,
                ];
            }

            if ($components === []) {
                continue;
            }

            $periods[] = [
                'fromMonth'  => intval($periodEntry['fromMonth'] ?? 0),
                'toMonth'    => isset($periodEntry['toMonth']) && $periodEntry['toMonth'] !== null
                    ? intval($periodEntry['toMonth'])
                    : null,
                'components' => $components,
            ];
        }

        return $periods === [] ? null : $periods;
    }

    /**
     * @param  mixed $raw
     * @return array<int, array<string, mixed>>|null
     */
    private static function sanitizeCommercialBreakdownInclusions($raw): ?array
    {
        if (!is_array($raw) || $raw === []) {
            return null;
        }

        $inclusions = [];
        foreach ($raw as $entry) {
            if (!is_array($entry)) {
                continue;
            }

            $id = sanitize_text_field((string) ($entry['id'] ?? ''));
            if ($id === '') {
                continue;
            }

            $inclusion = [
                'id'        => $id,
                'label'     => sanitize_text_field((string) ($entry['label'] ?? '')),
                'quantity'  => intval($entry['quantity'] ?? 0),
                'unitPrice' => isset($entry['unitPrice']) && $entry['unitPrice'] !== null
                    ? floatval($entry['unitPrice'])
                    : null,
                'lineTotal' => isset($entry['lineTotal']) && $entry['lineTotal'] !== null
                    ? floatval($entry['lineTotal'])
                    : null,
            ];

            $children = self::sanitizeCommercialBreakdownInclusions($entry['includes'] ?? null);
            if ($children !== null) {
                $inclusion['includes'] = $children;
            }

            $inclusions[] = $inclusion;
        }

        return $inclusions === [] ? null : $inclusions;
    }

    /**
     * REST args schema for the /requests/submit route.
     * Used by register_rest_route() 'args' key (Patch 6).
     *
     * @return array<string, array<string, mixed>>
     */
    public static function restArgs(): array
    {
        return [
            'type'      => [
                'type'              => 'string',
                'required'          => true,
                'enum'              => ['quote_cart', 'free_it_assessment'],
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'contact'   => [
                'type'              => 'string',
                'required'          => true,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'email'     => [
                'type'              => 'string',
                'required'          => true,
                'format'            => 'email',
                'sanitize_callback' => 'sanitize_email',
            ],
            'company'   => [
                'type'              => 'string',
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'phone'     => [
                'type'              => 'string',
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'notes'     => [
                'type'              => 'string',
                'required'          => false,
                'sanitize_callback' => 'sanitize_textarea_field',
            ],
            'quote_ref' => [
                'type'              => 'string',
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'category'  => [
                'type'              => 'string',
                'required'          => false,
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'items'     => [
                'type'     => 'array',
                'required' => false,
                'items'    => [
                    'type'       => 'object',
                    'properties' => [
                        'serviceId'    => ['type' => 'integer'],
                        'serviceTitle' => ['type' => 'string'],
                        'categoryName' => ['type' => 'string'],
                        'tierTitle'    => ['type' => 'string'],
                        'tierId'       => ['type' => 'string'],
                        'price'        => ['type' => ['number', 'null']],
                        'billingCycle' => ['type' => 'string'],
                        'features'     => ['type' => 'array', 'items' => ['type' => 'string']],
                        'isAddon'      => ['type' => 'boolean'],
                        'serviceDescription' => ['type' => ['string', 'null']],
                        'bundleDescription'  => ['type' => ['string', 'null']],
                        'minimumTermValue' => ['type' => ['number', 'null']],
                        'minimumTermUnit'  => ['type' => ['string', 'null']],
                        'offer_type'       => ['type' => 'string'],
                        'familyId'         => ['type' => 'string'],
                        'familyPlatformId' => ['type' => 'string'],
                        'familyTitle'      => ['type' => 'string'],
                        'tierInstanceId'   => ['type' => 'string'],
                        'tierInstancePlatformId' => ['type' => 'string'],
                        'tierOccupantId'   => ['type' => 'string'],
                        'tierPlatformId'   => ['type' => 'string'],
                        'tierEditionPlatformId' => ['type' => ['string', 'null']],
                        'tierEditionTitle' => ['type' => ['string', 'null']],
                        'isComposable'     => ['type' => 'boolean'],
                        'inclusionItems'   => [
                            'type'  => 'array',
                            'items' => [
                                'type'       => 'object',
                                'properties' => [
                                    'id'        => ['type' => 'string'],
                                    'label'     => ['type' => 'string'],
                                    'quantity'  => ['type' => 'integer'],
                                    'bundle_id' => ['type' => 'string'],
                                    'includes'  => ['type' => 'array'],
                                ],
                            ],
                        ],
                        'legPaymentSummaries' => [
                            'type'  => ['array', 'null'],
                            'items' => [
                                'type'       => 'object',
                                'properties' => [
                                    'source'           => ['type' => 'string'],
                                    'billingCycle'     => ['type' => ['string', 'null']],
                                    'price'            => ['type' => ['number', 'null']],
                                    'startMonth'       => ['type' => 'integer'],
                                    'endMonth'         => ['type' => ['integer', 'null']],
                                    'isOngoing'        => ['type' => 'boolean'],
                                    'occurrenceMonths' => ['type' => 'array', 'items' => ['type' => 'integer']],
                                    'subtotal'         => ['type' => ['number', 'null']],
                                ],
                            ],
                        ],
                        'commercialBreakdown' => [
                            'type'  => ['array', 'null'],
                            'items' => [
                                'type'       => 'object',
                                'properties' => [
                                    'fromMonth'  => ['type' => 'integer'],
                                    'toMonth'    => ['type' => ['integer', 'null']],
                                    'components' => [
                                        'type'  => 'array',
                                        'items' => [
                                            'type'       => 'object',
                                            'properties' => [
                                                'source'       => ['type' => 'string'],
                                                'billingCycle' => ['type' => ['string', 'null']],
                                                'price'        => ['type' => ['number', 'null']],
                                                'inclusions'   => ['type' => 'array'],
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}
