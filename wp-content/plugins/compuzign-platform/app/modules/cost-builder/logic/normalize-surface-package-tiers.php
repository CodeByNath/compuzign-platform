<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * One-time normalization: re-saves all cz_surface_package records through the
 * PackageSchema sanitize_callback so that every tier has the canonical 8-field
 * structure produced by AdminSurfacePackagesController::saveTier().
 *
 * Seed-created packages (e.g. MEP) were written directly via update_post_meta
 * before the contact, label, faq_refs, and enabled fields existed. Those fields
 * now default to contact=false, label='', faq_refs=[], enabled=true when the
 * sanitize_callback fills them in.
 *
 * migration_complete is cleared on all packages — the field has no runtime
 * meaning and the frontend no longer gates any behaviour on it.
 *
 * Idempotent: guarded by cz_normalize_surface_package_tiers_done.
 * Priority 35: runs after the MEP surface seed (priority 30).
 */
function compuzign_normalize_surface_package_tiers(): void
{
    if (get_option('cz_normalize_surface_package_tiers_done')) {
        return;
    }

    if (!post_type_exists('cz_surface_package')) {
        return;
    }

    $posts = get_posts([
        'post_type'              => 'cz_surface_package',
        'post_status'            => ['publish', 'draft'],
        'numberposts'            => -1,
        'fields'                 => 'ids',
        'no_found_rows'          => true,
        'update_post_meta_cache' => false,
        'update_post_term_cache' => false,
    ]);

    if (empty($posts)) {
        update_option('cz_normalize_surface_package_tiers_done', true);
        return;
    }

    foreach ($posts as $postId) {
        $pkg = get_post_meta((int) $postId, 'cz_package', true);

        if (!is_array($pkg)) {
            continue;
        }

        // Clear the informational-only flag — no runtime logic branches on it.
        $pkg['migration_complete'] = false;

        // update_post_meta triggers the registered sanitize_callback (PackageSchema::sanitize),
        // which writes every tier to the full 8-field canonical structure, filling in:
        //   label         → ''
        //   contact       → false
        //   faq_refs      → []
        //   enabled       → true
        // All existing fields (price, billing_cycle, inclusions_override, features,
        // popular_tier, service_refs, etc.) are preserved exactly as stored.
        update_post_meta((int) $postId, 'cz_package', $pkg);
    }

    update_option('cz_normalize_surface_package_tiers_done', true);
}
add_action('init', 'compuzign_normalize_surface_package_tiers', 35);
