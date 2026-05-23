<?php

if (!defined('ABSPATH')) {
    exit;
}

error_log('[CZ Seed] seed-managed-endpoint-protection.php loaded');

/**
 * Returns true only when basic/standard/premium prices match canonical values.
 * A row that exists but has all-null prices is treated as incorrect.
 */
function compuzign_seed_mep_pricing_correct($raw): bool
{
    if (!is_array($raw)) {
        return false;
    }
    $tiers    = isset($raw['tiers']) && is_array($raw['tiers']) ? $raw['tiers'] : $raw;
    $expected = array('basic' => 15.0, 'standard' => 45.0, 'premium' => 89.0);
    foreach ($expected as $tier => $price) {
        $stored = isset($tiers[$tier]['price']) ? (float) $tiers[$tier]['price'] : null;
        if ($stored !== $price) {
            return false;
        }
    }
    return true;
}

/**
 * One-time seed for Managed Endpoint Protection relational ecosystem data.
 * Stores canonical pricing, inclusions (pool + tier assignment), and FAQs on the service post.
 * Idempotent and repairable: seeds only the meta keys that are missing or incorrect.
 * Priority 20 ensures cz_service post type is registered before we query.
 */
function compuzign_seed_managed_endpoint_protection(): void
{
    error_log('[CZ Seed] init hook fired');

    $post = get_page_by_path('managed-endpoint-protection', OBJECT, 'cz_service');
    if (!$post) {
        error_log('[CZ Seed] post not found by slug managed-endpoint-protection (cz_service) — will retry');
        return;
    }

    error_log('[CZ Seed] post found ID=' . $post->ID);

    $hasInclusions = !empty(get_post_meta($post->ID, 'cz_service_inclusions', true));
    $hasPricing    = compuzign_seed_mep_pricing_correct(get_post_meta($post->ID, 'cz_service_pricing', true));
    $hasFaqs       = !empty(get_post_meta($post->ID, 'cz_service_faqs', true));

    error_log('[CZ Seed] state — inclusions=' . ($hasInclusions ? 'ok' : 'missing') . ' pricing=' . ($hasPricing ? 'ok' : 'missing/incorrect') . ' faqs=' . ($hasFaqs ? 'ok' : 'missing'));

    if ($hasInclusions && $hasPricing && $hasFaqs) {
        if (!get_option('cz_seed_mep_done')) {
            update_option('cz_seed_mep_done', true);
        }
        error_log('[CZ Seed] all meta correct — skipping');
        return;
    }

    if (get_option('cz_seed_mep_done')) {
        error_log('[CZ Seed] option set but meta missing or incorrect — repairing');
    }

    // Seed pricing: basic $15/mo, standard $45/mo, premium $89/mo, enterprise contact
    if (!$hasPricing) {
        $pricing = array(
            'tiers' => array(
                'basic'      => array('price' => 15,   'features' => array()),
                'standard'   => array('price' => 45,   'features' => array()),
                'premium'    => array('price' => 89,   'features' => array()),
                'enterprise' => array('price' => null, 'features' => array()),
            ),
            'bundle' => array(),
        );
        $pricing_result = update_post_meta($post->ID, 'cz_service_pricing', $pricing);
        error_log('[CZ Seed] update_post_meta cz_service_pricing result=' . var_export($pricing_result, true));
    }

    // Canonical inclusions pool + per-tier assignment map
    if (!$hasInclusions) {
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
    }

    if (!$hasFaqs) {
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
    }

    update_option('cz_seed_mep_done', true);
    error_log('[CZ Seed] seed complete for post ID=' . $post->ID);
}
add_action('init', 'compuzign_seed_managed_endpoint_protection', 20);
