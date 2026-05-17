<?php

if (!defined('ABSPATH')) {
    exit;
}

function compuzign_cost_builder_get_allowed_tiers(): array
{
    return array('basic', 'standard', 'premium', 'enterprise');
}

function compuzign_cost_builder_get_default_meta(): array
{
    return array(
        'short_description' => '',
        'long_description' => '',
        'billing_cycle' => 'monthly',
        'sla' => '',
        'uptime' => '',
        'notes' => '',
        'popular_tier' => 'premium',
        'sort_order' => 0,
        'is_active' => true,
    );
}

function compuzign_cost_builder_get_default_pricing(): array
{
    return array(
        'tiers' => array(
            'basic' => array('price' => null, 'features' => array()),
            'standard' => array('price' => null, 'features' => array()),
            'premium' => array('price' => null, 'features' => array()),
            'enterprise' => array('price' => null, 'features' => array()),
        ),
        'bundle' => array(
            'title' => '',
            'description' => '',
            'price' => null,
        ),
    );
}

function compuzign_cost_builder_validate_popular_tier($tier)
{
    $allowed = compuzign_cost_builder_get_allowed_tiers();
    $tier = trim((string) $tier);

    if (in_array($tier, $allowed, true)) {
        return $tier;
    }

    return null;
}

function compuzign_cost_builder_normalize_service_meta($meta): array
{
    if (!is_array($meta)) {
        $meta = array();
    }

    $defaults = compuzign_cost_builder_get_default_meta();

    return array(
        'short_description' => isset($meta['short_description']) ? sanitize_text_field($meta['short_description']) : $defaults['short_description'],
        'long_description' => isset($meta['long_description']) ? sanitize_textarea_field($meta['long_description']) : $defaults['long_description'],
        'billing_cycle' => isset($meta['billing_cycle']) ? sanitize_text_field($meta['billing_cycle']) : $defaults['billing_cycle'],
        'sla' => isset($meta['sla']) ? sanitize_text_field($meta['sla']) : $defaults['sla'],
        'uptime' => isset($meta['uptime']) ? sanitize_text_field($meta['uptime']) : $defaults['uptime'],
        'notes' => isset($meta['notes']) ? sanitize_textarea_field($meta['notes']) : $defaults['notes'],
        'popular_tier' => compuzign_cost_builder_validate_popular_tier($meta['popular_tier'] ?? '') ?? $defaults['popular_tier'],
        'sort_order' => isset($meta['sort_order']) ? absint($meta['sort_order']) : $defaults['sort_order'],
        'is_active' => isset($meta['is_active']) ? (bool) $meta['is_active'] : $defaults['is_active'],
    );
}

function compuzign_cost_builder_normalize_service_pricing($pricing): array
{
    $default_tier = array('price' => null, 'features' => array());

    $tiers = array(
        'basic' => $default_tier,
        'standard' => $default_tier,
        'premium' => $default_tier,
        'enterprise' => $default_tier,
    );

    $bundle = array('title' => '', 'description' => '', 'price' => null);

    if (!is_array($pricing)) {
        return array('tiers' => $tiers, 'bundle' => $bundle);
    }

    $in_tiers = $pricing['tiers'] ?? $pricing;

    $out_tiers = array();
    foreach (array('basic', 'standard', 'premium', 'enterprise') as $k) {
        $src = $in_tiers[$k] ?? array();
        $price = isset($src['price']) ? compuzign_cost_builder_parse_price($src['price']) : null;
        $features = isset($src['features']) && is_array($src['features']) ? array_values($src['features']) : array();
        $out_tiers[$k] = array('price' => $price, 'features' => $features);
    }

    $bundle_src = $pricing['bundle'] ?? array();
    $out_bundle = array(
        'title' => $bundle_src['title'] ?? '',
        'description' => $bundle_src['description'] ?? '',
        'price' => isset($bundle_src['price']) ? compuzign_cost_builder_parse_price($bundle_src['price']) : null,
    );

    return array('tiers' => $out_tiers, 'bundle' => $out_bundle);
}

function compuzign_cost_builder_get_service_meta($post_id): array
{
    if (is_numeric($post_id)) {
        $post_id = (int) $post_id;
    }

    $meta = get_post_meta($post_id, 'cz_service_meta', true) ?: array();

    return compuzign_cost_builder_normalize_service_meta($meta);
}

function compuzign_cost_builder_get_service_pricing($post_id): array
{
    if (is_numeric($post_id)) {
        $post_id = (int) $post_id;
    }

    $pricing = get_post_meta($post_id, 'cz_service_pricing', true) ?: array();

    return compuzign_cost_builder_normalize_service_pricing($pricing);
}

function compuzign_cost_builder_sanitize_service_meta($meta): array
{
    return compuzign_cost_builder_normalize_service_meta($meta);
}

function compuzign_cost_builder_sanitize_service_pricing($pricing): array
{
    return compuzign_cost_builder_normalize_service_pricing($pricing);
}

function compuzign_cost_builder_parse_price($value)
{
    $value = trim((string) $value);
    if ($value === '') {
        return null;
    }

    $value = preg_replace('/[^0-9\.\-]/', '', $value);
    if ($value === '' || !is_numeric($value)) {
        return null;
    }

    return floatval($value);
}

function compuzign_cost_builder_register_service_meta()
{
    $defaults = compuzign_cost_builder_get_default_meta();
    $default_pricing = compuzign_cost_builder_get_default_pricing();

    register_post_meta(
        'cz_service',
        'cz_service_meta',
        array(
            'type' => 'object',
            'single' => true,
            'default' => $defaults,
            'show_in_rest' => array(
                'schema' => array(
                    'type' => 'object',
                    'properties' => array(
                        'short_description' => array('type' => 'string'),
                        'long_description' => array('type' => 'string'),
                        'billing_cycle' => array('type' => 'string'),
                        'sla' => array('type' => 'string'),
                        'uptime' => array('type' => 'string'),
                        'notes' => array('type' => 'string'),
                        'popular_tier' => array(
                            'type' => 'string',
                            'enum' => compuzign_cost_builder_get_allowed_tiers(),
                        ),
                        'sort_order' => array('type' => 'integer'),
                        'is_active' => array('type' => 'boolean'),
                    ),
                ),
            ),
            'sanitize_callback' => 'compuzign_cost_builder_sanitize_service_meta',
        )
    );

    register_post_meta(
        'cz_service',
        'cz_service_pricing',
        array(
            'type' => 'object',
            'single' => true,
            'default' => $default_pricing,
            'show_in_rest' => array(
                'schema' => array(
                    'type' => 'object',
                    'properties' => array(
                        'tiers' => array(
                            'type' => 'object',
                            'properties' => array(
                                'basic' => array(
                                    'type' => 'object',
                                    'properties' => array(
                                        'price' => array('type' => array('number', 'null')),
                                        'features' => array(
                                            'type' => 'array',
                                            'items' => array('type' => 'string'),
                                        ),
                                    ),
                                ),
                                'standard' => array(
                                    'type' => 'object',
                                    'properties' => array(
                                        'price' => array('type' => array('number', 'null')),
                                        'features' => array(
                                            'type' => 'array',
                                            'items' => array('type' => 'string'),
                                        ),
                                    ),
                                ),
                                'premium' => array(
                                    'type' => 'object',
                                    'properties' => array(
                                        'price' => array('type' => array('number', 'null')),
                                        'features' => array(
                                            'type' => 'array',
                                            'items' => array('type' => 'string'),
                                        ),
                                    ),
                                ),
                                'enterprise' => array(
                                    'type' => 'object',
                                    'properties' => array(
                                        'price' => array('type' => array('number', 'null')),
                                        'features' => array(
                                            'type' => 'array',
                                            'items' => array('type' => 'string'),
                                        ),
                                    ),
                                ),
                            ),
                        ),
                        'bundle' => array(
                            'type' => 'object',
                            'properties' => array(
                                'title' => array('type' => 'string'),
                                'description' => array('type' => 'string'),
                                'price' => array('type' => array('number', 'null')),
                            ),
                        ),
                    ),
                ),
            ),
            'sanitize_callback' => 'compuzign_cost_builder_sanitize_service_pricing',
        )
    );
}
add_action('init', 'compuzign_cost_builder_register_service_meta');
