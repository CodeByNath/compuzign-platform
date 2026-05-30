<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * One-time seed: adds a Black Friday 2026 promotion tier to the MEP surface package.
 *
 * Architecture:
 *   - Stored inside promotion_tiers[] of the existing cz_package meta on the MEP
 *     surface package post. No new CPT, no new controller, no frontend output.
 *   - based_on = 'premium' is authoring metadata only. It carries no runtime
 *     inheritance from the Premium core tier — see PackageSchema::ALLOWED_BASED_ON.
 *   - Data is written through update_post_meta, which triggers PackageSchema::sanitize()
 *     via the registered sanitize_callback, ensuring the stored record is fully normalised.
 *
 * Idempotent: guarded by the cz_seed_mep_promotion_bf2026_done option.
 * Priority 40: runs after the MEP surface package seed (priority 30) so the package
 * post is guaranteed to exist.
 */
function compuzign_seed_mep_promotion_black_friday(): void
{
    if (get_option('cz_seed_mep_promotion_bf2026_done')) {
        return;
    }

    // Surface package must exist before we can add a promotion tier to it.
    if (!get_option('cz_seed_mep_surface_done')) {
        return;
    }

    $service = get_page_by_path('managed-endpoint-protection', OBJECT, 'cz_service');
    if (!$service) {
        return;
    }

    $serviceId = (int) $service->ID;

    // Locate the surface package that references the MEP service.
    $packagePosts = get_posts([
        'post_type'      => 'cz_surface_package',
        'post_status'    => ['publish', 'draft'],
        'numberposts'    => 20,
        'fields'         => 'ids',
        'no_found_rows'  => true,
        'meta_query'     => [[
            'key'     => 'cz_package',
            'compare' => 'EXISTS',
        ]],
    ]);

    $packageId = 0;
    foreach ($packagePosts as $postId) {
        $meta = get_post_meta((int) $postId, 'cz_package', true);
        $refs = is_array($meta) ? array_map('intval', $meta['service_refs'] ?? []) : [];
        if (in_array($serviceId, $refs, true)) {
            $packageId = (int) $postId;
            break;
        }
    }

    if ($packageId === 0) {
        return;
    }

    $pkg = get_post_meta($packageId, 'cz_package', true);
    if (!is_array($pkg)) {
        return;
    }

    // Secondary guard: skip if this slug already lives in promotion_tiers.
    $existing = is_array($pkg['promotion_tiers'] ?? null) ? $pkg['promotion_tiers'] : [];
    foreach ($existing as $tier) {
        if (is_array($tier) && ($tier['slug'] ?? '') === 'black-friday-special') {
            update_option('cz_seed_mep_promotion_bf2026_done', true);
            return;
        }
    }

    // ── Build the promotion tier ──────────────────────────────────────────────

    $promotionTier = [
        'id'             => 'promo_bf2026',
        'name'           => 'Black Friday Special',
        'slug'           => 'black-friday-special',
        'status'         => 'active',
        'based_on'       => 'premium',
        'headline'       => 'Black Friday Endpoint Protection Offer',
        'description'    => 'Protect all managed endpoints with advanced monitoring, threat detection and remediation at a reduced promotional rate.',
        'price'          => 99.0,
        'billing_label'  => 'per endpoint / month',
        'features'       => [
            'Advanced endpoint monitoring',
            'Threat detection and response',
            'Security policy enforcement',
            'Device health reporting',
            'Monthly security review',
        ],
        'inclusions'     => [
            ['id' => 'endpoint-onboarding',        'label' => 'Endpoint onboarding'],
            ['id' => 'security-agent-deployment',  'label' => 'Security agent deployment'],
            ['id' => 'threat-response-management', 'label' => 'Threat response management'],
            ['id' => 'reporting-dashboard-access', 'label' => 'Reporting dashboard access'],
            ['id' => 'monthly-compliance-summary', 'label' => 'Monthly compliance summary'],
        ],
        'exclusions'     => [
            'Hardware procurement',
            'Incident forensics',
            'Third-party software licensing',
        ],
        'badge'          => 'Black Friday',
        'campaign_label' => 'Black Friday 2026',
        'starts_at'      => '2026-11-01 00:00:00',
        'ends_at'        => '2026-11-30 23:59:59',
        'priority'       => 1,
        'is_featured'    => true,
        'metadata'       => [],
    ];

    // ── Write back ────────────────────────────────────────────────────────────

    $pkg['promotion_tiers']   = $existing;
    $pkg['promotion_tiers'][] = $promotionTier;

    // update_post_meta triggers PackageSchema::sanitize() via sanitize_callback,
    // normalising every field in the stored record.
    update_post_meta($packageId, 'cz_package', $pkg);
    update_option('cz_seed_mep_promotion_bf2026_done', true);
}
add_action('init', 'compuzign_seed_mep_promotion_black_friday', 40);
