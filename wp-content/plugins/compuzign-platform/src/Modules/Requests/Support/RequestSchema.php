<?php

namespace CompuZign\Platform\Modules\Requests\Support;

class RequestSchema
{
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
        if ($type !== 'quote_cart') {
            return ['ok' => false, 'message' => 'Invalid request type.', 'status' => 400];
        }

        $contact  = sanitize_text_field((string) ($request->get_param('contact') ?? ''));
        $email    = sanitize_email((string) ($request->get_param('email') ?? ''));
        $company  = sanitize_text_field((string) ($request->get_param('company') ?? ''));
        $phone    = sanitize_text_field((string) ($request->get_param('phone') ?? ''));
        $notes    = sanitize_textarea_field((string) ($request->get_param('notes') ?? ''));
        $quoteRef = sanitize_text_field((string) ($request->get_param('quote_ref') ?? ''));
        $rawItems = $request->get_param('items');

        if ($contact === '') {
            return ['ok' => false, 'message' => 'Contact name is required.', 'status' => 422];
        }

        if ($email === '' || !is_email($email)) {
            return ['ok' => false, 'message' => 'A valid email address is required.', 'status' => 422];
        }

        if (empty($rawItems) || !is_array($rawItems)) {
            return ['ok' => false, 'message' => 'At least one service item is required.', 'status' => 422];
        }

        $quoteRef = self::resolveQuoteRef($quoteRef);
        $items    = self::sanitizeItems($rawItems);

        return [
            'ok'   => true,
            'data' => [
                'type'      => 'quote_cart',
                'quote_ref' => $quoteRef,
                'contact'   => $contact,
                'company'   => $company,
                'email'     => $email,
                'phone'     => $phone,
                'notes'     => $notes,
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
        if (preg_match('/^CZ-[A-Z0-9]{6}$/', $raw)) {
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

            $items[] = [
                'serviceId'    => intval($raw['serviceId'] ?? 0),
                'serviceTitle' => sanitize_text_field((string) ($raw['serviceTitle'] ?? '')),
                'categoryName' => sanitize_text_field((string) ($raw['categoryName'] ?? '')),
                'tierTitle'    => sanitize_text_field((string) ($raw['tierTitle'] ?? '')),
                'tierId'       => sanitize_text_field((string) ($raw['tierId'] ?? '')),
                'price'        => $price,
                'billingCycle' => sanitize_text_field((string) ($raw['billingCycle'] ?? '')),
                'features'     => $features,
            ];
        }

        return $items;
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
                'enum'              => ['quote_cart'],
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
            'items'     => [
                'type'     => 'array',
                'required' => true,
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
                    ],
                ],
            ],
        ];
    }
}
