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
                // Upgrade Journey Finalisation: a composed Build Your Own
                // result carries two authoritative peer children
                // (composedBase/composedUpgrade) — the ONLY canonical
                // source of truth for isComposedUpgrade items. The
                // inclusionItems/legPaymentSummaries/price/billingCycle/
                // minimumTermValue/minimumTermUnit/planDurationMonths set
                // above are NEVER trusted from the client for this item:
                // they are unconditionally overwritten below by
                // deriveComposedProjection(), rebuilt from the
                // already-sanitised children — mirroring utils/quote.ts's
                // own function of the same name, the same PHP-mirrors-TS
                // precedent resolveItemRole() already follows in
                // NotificationTemplates.php. A mismatched or malicious
                // client-submitted top-level projection can never reach
                // storage because it is never read here in the first
                // place — there is nothing to compare or reject, only one
                // code path that ever produces the persisted values.
                $item['isComposedUpgrade'] = $item['isComposable'] && !empty($raw['isComposedUpgrade']);
                if ($item['isComposedUpgrade']) {
                    $composedBase = self::sanitizeComposedBase($raw['composedBase'] ?? null);
                    $composedUpgrade = self::sanitizeComposedUpgrade($raw['composedUpgrade'] ?? null);
                    if ($composedBase === null || $composedUpgrade === null) {
                        // Fail closed: never persist a partially composed
                        // item — an isComposedUpgrade flag with a missing
                        // or invalid child is dropped entirely rather than
                        // stored with an empty/guessed projection.
                        continue;
                    }
                    $item['composedBase'] = $composedBase;
                    $item['composedUpgrade'] = $composedUpgrade;
                    $projection = self::deriveComposedProjection($composedBase, $composedUpgrade);
                    $item['inclusionItems'] = $projection['inclusionItems'];
                    $item['legPaymentSummaries'] = $projection['legPaymentSummaries'];
                    $item['price'] = $projection['price'];
                    $item['billingCycle'] = $projection['billingCycle'];
                    $item['minimumTermValue'] = $projection['minimumTermValue'];
                    $item['minimumTermUnit'] = $projection['minimumTermUnit'];
                    $item['planDurationMonths'] = $projection['planDurationMonths'];
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
     * Upgrade Journey Finalisation — sanitise a composed item's
     * `composedBase` child: the exact base Tier/Edition's own snapshot,
     * captured at the moment of finalisation. Explicit per-field allow-list,
     * reusing sanitizeInclusionItems()/sanitizeLegPaymentSummaries() for its
     * own nested arrays exactly as the top-level family_tier item already
     * does. Returns null (fail closed) when either required identity field
     * is missing — mirrors sanitizeItems()'s own required-field gate for a
     * normal family_tier item — so the caller drops the whole composed item
     * rather than persist a partial/untrustworthy one.
     *
     * @param  mixed $raw
     * @return array<string, mixed>|null
     */
    private static function sanitizeComposedBase($raw): ?array
    {
        if (!is_array($raw)) {
            return null;
        }

        $tierOccupantId = sanitize_text_field((string) ($raw['tierOccupantId'] ?? ''));
        $tierPlatformId = sanitize_text_field((string) ($raw['tierPlatformId'] ?? ''));
        if ($tierOccupantId === '' || $tierPlatformId === '') {
            return null;
        }

        return [
            'tierOccupantId'        => $tierOccupantId,
            'tierPlatformId'        => $tierPlatformId,
            'tierEditionPlatformId' => isset($raw['tierEditionPlatformId']) && $raw['tierEditionPlatformId'] !== null
                ? sanitize_text_field((string) $raw['tierEditionPlatformId'])
                : null,
            'tierId'                => sanitize_text_field((string) ($raw['tierId'] ?? '')),
            'tierTitle'             => sanitize_text_field((string) ($raw['tierTitle'] ?? '')),
            'tierEditionTitle'      => isset($raw['tierEditionTitle']) && $raw['tierEditionTitle'] !== null
                ? sanitize_text_field((string) $raw['tierEditionTitle'])
                : null,
            'inclusionItems'        => self::sanitizeInclusionItems($raw['inclusionItems'] ?? null) ?? [],
            'legPaymentSummaries'   => self::sanitizeLegPaymentSummaries($raw['legPaymentSummaries'] ?? null) ?? [],
            'price'                 => isset($raw['price']) && $raw['price'] !== null ? floatval($raw['price']) : null,
            'billingCycle'          => sanitize_text_field((string) ($raw['billingCycle'] ?? '')),
            'minimumTermValue'      => isset($raw['minimumTermValue']) && $raw['minimumTermValue'] !== null && $raw['minimumTermValue'] !== ''
                ? floatval($raw['minimumTermValue'])
                : null,
            'minimumTermUnit'       => !empty($raw['minimumTermUnit']) ? sanitize_text_field((string) $raw['minimumTermUnit']) : null,
            'planDurationMonths'    => isset($raw['planDurationMonths']) && $raw['planDurationMonths'] !== null && $raw['planDurationMonths'] !== ''
                ? intval($raw['planDurationMonths'])
                : null,
        ];
    }

    /**
     * Upgrade Journey Finalisation — sanitise a composed item's
     * `composedUpgrade` child: the composable occupant's own snapshot. Same
     * fail-closed shape as sanitizeComposedBase() above, trimmed to the
     * fields ComposedUpgradeExtras (types.ts) actually declares — no
     * tierEditionPlatformId/planDurationMonths, the composable occupant
     * never has either. `composableSelection` is deliberately never
     * persisted here, matching the existing established rule for that field
     * on a normal (non-composed) composable item: it is client-only
     * intent/history for re-seeding an interactive editing UI, never itself
     * a pricing source and never needed by any durable/audit surface.
     *
     * @param  mixed $raw
     * @return array<string, mixed>|null
     */
    private static function sanitizeComposedUpgrade($raw): ?array
    {
        if (!is_array($raw)) {
            return null;
        }

        $tierOccupantId = sanitize_text_field((string) ($raw['tierOccupantId'] ?? ''));
        $tierPlatformId = sanitize_text_field((string) ($raw['tierPlatformId'] ?? ''));
        if ($tierOccupantId === '' || $tierPlatformId === '') {
            return null;
        }

        return [
            'tierOccupantId'      => $tierOccupantId,
            'tierPlatformId'      => $tierPlatformId,
            'inclusionItems'      => self::sanitizeInclusionItems($raw['inclusionItems'] ?? null) ?? [],
            'legPaymentSummaries' => self::sanitizeLegPaymentSummaries($raw['legPaymentSummaries'] ?? null) ?? [],
            'price'               => isset($raw['price']) && $raw['price'] !== null ? floatval($raw['price']) : null,
            'billingCycle'        => sanitize_text_field((string) ($raw['billingCycle'] ?? '')),
            'minimumTermValue'    => isset($raw['minimumTermValue']) && $raw['minimumTermValue'] !== null && $raw['minimumTermValue'] !== ''
                ? floatval($raw['minimumTermValue'])
                : null,
            'minimumTermUnit'     => !empty($raw['minimumTermUnit']) ? sanitize_text_field((string) $raw['minimumTermUnit']) : null,
        ];
    }

    /**
     * PHP mirror of utils/quote.ts's deriveComposedProjection() of the same
     * name — the single deterministic derivation from a composed item's two
     * authoritative peer children to its top-level compatibility/display
     * projection, so a client-submitted top-level projection for a composed
     * item is never trusted (see sanitizeItems()'s own isComposedUpgrade
     * branch, the only caller). This is the only function that ever
     * produces the persisted projection, driven solely by the
     * already-sanitised $base/$upgrade — same PHP-ports-a-TS-function
     * precedent resolveItemRole() already follows for
     * resolveQuoteItemRole() in NotificationTemplates.php. Pure
     * concatenation, never a recomputation of either child's own
     * already-resolved commercial facts, and never a dedup across
     * base/upgrade — see ServiceInclusion.provenance's own docblock
     * (api/types/cost-builder.ts) for why a shared item_id across
     * provenances is two genuinely separate commercial facts.
     *
     * @param  array<string, mixed> $base
     * @param  array<string, mixed> $upgrade
     * @return array<string, mixed>
     */
    private static function deriveComposedProjection(array $base, array $upgrade): array
    {
        $tag = static function (array $entries, string $provenance): array {
            return array_map(
                static fn (array $entry): array => $entry + ['provenance' => $provenance],
                $entries
            );
        };

        return [
            'inclusionItems' => array_merge(
                $tag($base['inclusionItems'], 'base'),
                $tag($upgrade['inclusionItems'], 'upgrade')
            ),
            'legPaymentSummaries' => array_merge(
                $tag($base['legPaymentSummaries'], 'base'),
                $tag($upgrade['legPaymentSummaries'], 'upgrade')
            ),
            // Commitment/headline ownership: the base Tier/Edition is
            // always the customer-facing commitment source in this
            // platform (a real selected Edition carries "its own
            // commitment"; the composable occupant's own minimumTermValue
            // exists only to give a STANDALONE Build Your Own selection
            // some commitment when there is no base Edition at all). Once
            // a base exists, it governs unconditionally; $upgrade's own
            // term stays readable only via its own stored field for audit,
            // never compared or merged here.
            'price'              => $base['price'],
            'billingCycle'       => $base['billingCycle'],
            'minimumTermValue'   => $base['minimumTermValue'],
            'minimumTermUnit'    => $base['minimumTermUnit'],
            'planDurationMonths' => $base['planDurationMonths'],
        ];
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
                        // Upgrade Journey Finalisation — accepted here so
                        // WP's own REST arg validation does not strip these
                        // before sanitizeItems() ever runs; sanitizeItems()
                        // itself (via sanitizeComposedBase()/
                        // sanitizeComposedUpgrade()) is still the actual
                        // allow-list authority, this is only the outer
                        // shape gate. Client-submitted values inside these
                        // two objects are only ever used to build the
                        // composedBase/composedUpgrade children — never the
                        // top-level projection fields above, which are
                        // always server-derived (see
                        // deriveComposedProjection()).
                        'isComposedUpgrade' => ['type' => 'boolean'],
                        'composedBase' => [
                            'type'       => ['object', 'null'],
                            'properties' => [
                                'tierOccupantId'        => ['type' => 'string'],
                                'tierPlatformId'        => ['type' => 'string'],
                                'tierEditionPlatformId' => ['type' => ['string', 'null']],
                                'tierId'                => ['type' => 'string'],
                                'tierTitle'             => ['type' => 'string'],
                                'tierEditionTitle'      => ['type' => ['string', 'null']],
                                'inclusionItems'        => ['type' => 'array'],
                                'legPaymentSummaries'   => ['type' => 'array'],
                                'price'                 => ['type' => ['number', 'null']],
                                'billingCycle'          => ['type' => 'string'],
                                'minimumTermValue'      => ['type' => ['number', 'null']],
                                'minimumTermUnit'       => ['type' => ['string', 'null']],
                                'planDurationMonths'    => ['type' => ['integer', 'null']],
                            ],
                        ],
                        'composedUpgrade' => [
                            'type'       => ['object', 'null'],
                            'properties' => [
                                'tierOccupantId'      => ['type' => 'string'],
                                'tierPlatformId'      => ['type' => 'string'],
                                'inclusionItems'      => ['type' => 'array'],
                                'legPaymentSummaries' => ['type' => 'array'],
                                'price'               => ['type' => ['number', 'null']],
                                'billingCycle'        => ['type' => 'string'],
                                'minimumTermValue'    => ['type' => ['number', 'null']],
                                'minimumTermUnit'     => ['type' => ['string', 'null']],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}
