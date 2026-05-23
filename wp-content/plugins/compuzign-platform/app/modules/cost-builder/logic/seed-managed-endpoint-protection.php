<?php

if (!defined('ABSPATH')) {
    exit;
}

error_log('[CZ Seed] seed-managed-endpoint-protection.php loaded');

/**
 * One-time seed for Managed Endpoint Protection relational ecosystem data.
 * Stores canonical inclusions (pool + tier assignment) and FAQs on the service post.
 * Idempotent: skips if inclusions are already populated.
 * Priority 20 ensures cz_service post type is registered before we query.
 */
function compuzign_seed_managed_endpoint_protection(): void
{
    error_log('[CZ Seed] init hook fired');

    if (get_option('cz_seed_mep_done')) {
        error_log('[CZ Seed] skipped — cz_seed_mep_done option already set');
        return;
    }

    $post = get_page_by_path('managed-endpoint-protection', OBJECT, 'cz_service');
    if (!$post) {
        error_log('[CZ Seed] post not found by slug managed-endpoint-protection (cz_service) — will retry');
        return;
    }

    error_log('[CZ Seed] post found ID=' . $post->ID);

    $existing = get_post_meta($post->ID, 'cz_service_inclusions', true);
    if (!empty($existing)) {
        error_log('[CZ Seed] inclusions already present — marking done and skipping');
        update_option('cz_seed_mep_done', true);
        return;
    }

    // Canonical inclusions pool + per-tier assignment map
    $inclusions = array(
        'inclusions' => array(
            array('id' => 'real-time-threat-detection',  'label' => 'Real-time threat detection'),
            array('id' => 'endpoint-antivirus-edr',      'label' => 'Antivirus / EDR protection'),
            array('id' => 'patch-management',            'label' => 'Patch management'),
            array('id' => 'ransomware-protection',       'label' => 'Ransomware protection'),
            array('id' => 'web-dns-filtering',           'label' => 'Web & DNS filtering'),
            array('id' => 'monthly-security-reporting',  'label' => 'Monthly security reporting'),
            array('id' => 'endpoint-policy-hardening',   'label' => 'Endpoint policy hardening'),
            array('id' => 'priority-incident-response',  'label' => 'Priority incident response'),
        ),
        'tier_inclusions' => array(
            'basic' => array(
                'real-time-threat-detection',
                'endpoint-antivirus-edr',
            ),
            'standard' => array(
                'real-time-threat-detection',
                'endpoint-antivirus-edr',
                'patch-management',
                'ransomware-protection',
            ),
            'premium' => array(
                'real-time-threat-detection',
                'endpoint-antivirus-edr',
                'patch-management',
                'ransomware-protection',
                'web-dns-filtering',
                'monthly-security-reporting',
                'endpoint-policy-hardening',
            ),
            'enterprise' => array(
                'real-time-threat-detection',
                'endpoint-antivirus-edr',
                'patch-management',
                'ransomware-protection',
                'web-dns-filtering',
                'monthly-security-reporting',
                'endpoint-policy-hardening',
                'priority-incident-response',
            ),
        ),
    );

    $inc_result = update_post_meta($post->ID, 'cz_service_inclusions', $inclusions);
    error_log('[CZ Seed] update_post_meta cz_service_inclusions result=' . var_export($inc_result, true));

    $faqs = array(
        array(
            'id'       => 'what-devices-are-covered',
            'question' => 'What devices are covered?',
            'answer'   => 'Managed Endpoint Protection can cover supported workstations, laptops, and servers depending on the selected tier.',
        ),
        array(
            'id'       => 'is-ransomware-protection-included',
            'question' => 'Is ransomware protection included?',
            'answer'   => 'Ransomware protection is included from the Standard tier and above.',
        ),
        array(
            'id'       => 'do-you-provide-reporting',
            'question' => 'Do you provide reporting?',
            'answer'   => 'Monthly security reporting is included in Premium and Enterprise tiers.',
        ),
        array(
            'id'       => 'can-this-scale-to-enterprise',
            'question' => 'Can this scale to enterprise environments?',
            'answer'   => 'Yes. Enterprise tier support can include custom endpoint policies, priority incident response, and broader security alignment.',
        ),
    );

    $faq_result = update_post_meta($post->ID, 'cz_service_faqs', $faqs);
    error_log('[CZ Seed] update_post_meta cz_service_faqs result=' . var_export($faq_result, true));

    update_option('cz_seed_mep_done', true);
    error_log('[CZ Seed] seed complete for post ID=' . $post->ID);
}
add_action('init', 'compuzign_seed_managed_endpoint_protection', 20);
