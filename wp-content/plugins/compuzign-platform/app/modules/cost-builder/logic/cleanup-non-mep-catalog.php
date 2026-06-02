<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * One-time catalog cleanup: strips commercial metadata from all cz_service posts
 * except Managed Endpoint Protection.
 *
 * Per non-MEP service this clears:
 *   cz_service_pricing    — reset to null-price defaults (all four tiers)
 *   cz_service_meta       — billing_cycle reset to 'monthly', popular_tier removed
 *   cz_service_inclusions — deleted entirely
 *   cz_service_faqs       — deleted entirely
 *
 * Preserved per non-MEP service:
 *   post title, slug, category terms, post_status
 *   cz_service_meta: short_description, long_description, sla, uptime,
 *                    notes, sort_order, is_active
 *
 * Reversible: delete the WordPress option 'cz_catalog_cleanup_done' to re-run.
 * Priority 25 ensures it runs after the MEP seeder (priority 20) and before the
 * surface-package seeder (priority 30).
 */
function compuzign_cleanup_non_mep_catalog(): void
{
    if (get_option('cz_catalog_cleanup_done')) {
        return;
    }

    $mep = get_page_by_path('managed-endpoint-protection', OBJECT, 'cz_service');

    // Abort if MEP does not exist yet — avoid wiping data before it is seeded.
    if (!$mep) {
        return;
    }

    $post_ids = get_posts([
        'post_type'   => 'cz_service',
        'post_status' => ['publish', 'draft', 'private'],
        'numberposts' => -1,
        'fields'      => 'ids',
    ]);

    if (empty($post_ids)) {
        update_option('cz_catalog_cleanup_done', true);
        return;
    }

    $blank_pricing = [
        'tiers' => [
            'basic'      => ['price' => null, 'features' => []],
            'standard'   => ['price' => null, 'features' => []],
            'premium'    => ['price' => null, 'features' => []],
            'enterprise' => ['price' => null, 'features' => []],
        ],
        'bundle' => ['title' => '', 'description' => '', 'price' => null],
    ];

    foreach ($post_ids as $post_id) {
        $post_id = (int) $post_id;

        if ($post_id === (int) $mep->ID) {
            continue;
        }

        update_post_meta($post_id, 'cz_service_pricing', $blank_pricing);

        $existing_meta = get_post_meta($post_id, 'cz_service_meta', true);
        if (is_array($existing_meta) && !empty($existing_meta)) {
            $cleaned                  = $existing_meta;
            $cleaned['billing_cycle'] = 'monthly';
            unset($cleaned['popular_tier']);
            update_post_meta($post_id, 'cz_service_meta', $cleaned);
        }

        delete_post_meta($post_id, 'cz_service_inclusions');
        delete_post_meta($post_id, 'cz_service_faqs');
    }

    update_option('cz_catalog_cleanup_done', true);
}
add_action('init', 'compuzign_cleanup_non_mep_catalog', 25);
