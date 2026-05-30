<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * One-time seed: creates a cz_surface_package post that represents the
 * Managed Endpoint Protection 4-tier configuration in the Surface layer.
 *
 * Architecture:
 *   - Service Core (cz_service) remains canonical Water — not mutated here.
 *   - This Surface Package owns: per-tier prices, billing cycles, inclusions,
 *     popular tier, FAQ selection, and display context.
 *   - PricingBuilder already overlays surface packages; no changes needed there.
 *
 * Idempotent: guarded by the cz_seed_mep_surface_done option.
 * Priority 30: runs after the MEP service seed (priority 20) so the service
 * post is guaranteed to exist when we look it up.
 */
function compuzign_seed_mep_surface_package(): void
{
    if (get_option('cz_seed_mep_surface_done')) {
        return;
    }

    // Wait for the MEP service seed to have completed first.
    if (!get_option('cz_seed_mep_done')) {
        return;
    }

    $service = get_page_by_path('managed-endpoint-protection', OBJECT, 'cz_service');
    if (!$service) {
        return;
    }

    $serviceId = (int) $service->ID;

    // Skip if a surface package already references this service.
    $existing = get_posts([
        'post_type'      => 'cz_surface_package',
        'post_status'    => 'publish',
        'numberposts'    => 1,
        'fields'         => 'ids',
        'no_found_rows'  => true,
        'meta_query'     => [
            [
                'key'     => 'cz_package',
                'compare' => 'EXISTS',
            ],
        ],
    ]);

    foreach ($existing as $postId) {
        $pkg  = get_post_meta((int) $postId, 'cz_package', true);
        $refs = is_array($pkg) ? array_map('intval', $pkg['service_refs'] ?? []) : [];
        if (in_array($serviceId, $refs, true)) {
            update_option('cz_seed_mep_surface_done', true);
            return;
        }
    }

    // ── Build the cz_package meta ─────────────────────────────────────────────

    $inclusions = [
        'basic' => [
            ['id' => 'real-time-threat-detection', 'label' => 'Real-time threat detection'],
            ['id' => 'endpoint-antivirus-edr',      'label' => 'Antivirus / EDR protection'],
        ],
        'standard' => [
            ['id' => 'real-time-threat-detection', 'label' => 'Real-time threat detection'],
            ['id' => 'endpoint-antivirus-edr',      'label' => 'Antivirus / EDR protection'],
            ['id' => 'patch-management',            'label' => 'Patch management'],
            ['id' => 'ransomware-protection',       'label' => 'Ransomware protection'],
        ],
        'premium' => [
            ['id' => 'real-time-threat-detection', 'label' => 'Real-time threat detection'],
            ['id' => 'endpoint-antivirus-edr',      'label' => 'Antivirus / EDR protection'],
            ['id' => 'patch-management',            'label' => 'Patch management'],
            ['id' => 'ransomware-protection',       'label' => 'Ransomware protection'],
            ['id' => 'web-dns-filtering',           'label' => 'Web & DNS filtering'],
            ['id' => 'monthly-security-reporting',  'label' => 'Monthly security reporting'],
            ['id' => 'endpoint-policy-hardening',   'label' => 'Endpoint policy hardening'],
        ],
        'enterprise' => [
            ['id' => 'real-time-threat-detection', 'label' => 'Real-time threat detection'],
            ['id' => 'endpoint-antivirus-edr',      'label' => 'Antivirus / EDR protection'],
            ['id' => 'patch-management',            'label' => 'Patch management'],
            ['id' => 'ransomware-protection',       'label' => 'Ransomware protection'],
            ['id' => 'web-dns-filtering',           'label' => 'Web & DNS filtering'],
            ['id' => 'monthly-security-reporting',  'label' => 'Monthly security reporting'],
            ['id' => 'endpoint-policy-hardening',   'label' => 'Endpoint policy hardening'],
            ['id' => 'priority-incident-response',  'label' => 'Priority incident response'],
        ],
    ];

    $packageMeta = [
        'package_type'     => 'tier_configuration',
        'service_refs'     => [$serviceId],
        'tiers'            => [
            'basic' => [
                'price'               => 15.0,
                'billing_cycle'       => 'monthly',
                'inclusions_override' => $inclusions['basic'],
                'features'            => [],
            ],
            'standard' => [
                'price'               => 45.0,
                'billing_cycle'       => 'monthly',
                'inclusions_override' => $inclusions['standard'],
                'features'            => [],
            ],
            'premium' => [
                'price'               => 89.0,
                'billing_cycle'       => 'monthly',
                'inclusions_override' => $inclusions['premium'],
                'features'            => [],
            ],
            'enterprise' => [
                'price'               => null,
                'billing_cycle'       => 'monthly',
                'inclusions_override' => $inclusions['enterprise'],
                'features'            => [],
            ],
        ],
        'popular_tier'     => 'premium',
        'faq_refs'         => [
            'what-devices-are-covered',
            'is-ransomware-protection-included',
            'do-you-provide-reporting',
            'can-this-scale-to-enterprise',
        ],
        'sort_position'    => 0,
        'display_contexts' => ['cost-builder'],
        'bundle'           => ['title' => '', 'description' => '', 'price' => null],
        'valid_from'       => null,
        'valid_until'      => null,
        'migration_complete' => true,
    ];

    // ── Create the post ───────────────────────────────────────────────────────

    $postId = wp_insert_post([
        'post_type'   => 'cz_surface_package',
        'post_status' => 'publish',
        'post_title'  => 'Managed Endpoint Protection — Tier Config',
    ], true);

    if (is_wp_error($postId)) {
        return;
    }

    update_post_meta($postId, 'cz_package', $packageMeta);
    update_option('cz_seed_mep_surface_done', true);
}
add_action('init', 'compuzign_seed_mep_surface_package', 30);
