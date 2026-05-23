<?php

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Build a service payload from a `cz_service` post.
 *
 * @param WP_Post|int $post
 * @return array
 */
function compuzign_cost_builder_get_service_payload($post): array
{
    if (is_numeric($post)) {
        $post = get_post((int) $post);
    }

    if (!$post instanceof WP_Post) {
        return array();
    }

    $meta = get_post_meta($post->ID, 'cz_service_meta', true) ?: array();
    // Prefer an explicit getter if available, otherwise read post meta
    if (function_exists('compuzign_cost_builder_get_service_pricing')) {
        $pricing = compuzign_cost_builder_get_service_pricing($post);
    } else {
        $pricing = get_post_meta($post->ID, 'cz_service_pricing', true) ?: array();
    }

    $billing_cycle = $meta['billing_cycle'] ?? 'monthly';

    // Normalize pricing to ensure expected shape (never return empty array)
    $pricing = compuzign_cost_builder_normalize_pricing($pricing, $billing_cycle);

    $terms = wp_get_post_terms($post->ID, 'cz_service_category', array('fields' => 'all')) ?: array();
    $categories = array();
    foreach ($terms as $t) {
        $categories[] = array(
            'id' => (int) $t->term_id,
            'name' => $t->name,
            'slug' => $t->slug,
        );
    }

    // Resolve inclusions: prefer explicit cz_service_inclusions meta, fall back to tier derivation
    $raw_explicit   = get_post_meta($post->ID, 'cz_service_inclusions', true) ?: array();
    $inclusions     = array();
    $tier_overrides = array('basic' => array(), 'standard' => array(), 'premium' => array(), 'enterprise' => array());

    if (!empty($raw_explicit) && is_array($raw_explicit)) {
        // Normalized format: {inclusions: [{id, label}], tier_inclusions: {tierId: [id,...]}}
        if (isset($raw_explicit['inclusions']) && is_array($raw_explicit['inclusions'])) {
            $lookup = array();
            foreach ($raw_explicit['inclusions'] as $item) {
                if (!is_array($item)) continue;
                $inc_id    = trim($item['id'] ?? '');
                $inc_label = trim($item['label'] ?? '');
                if ($inc_id === '' || $inc_label === '') continue;
                $inc             = array('id' => $inc_id, 'label' => $inc_label);
                $lookup[$inc_id] = $inc;
                $inclusions[]    = $inc;
            }
            $tier_map = isset($raw_explicit['tier_inclusions']) && is_array($raw_explicit['tier_inclusions'])
                ? $raw_explicit['tier_inclusions']
                : array();
            foreach (array_keys($tier_overrides) as $t) {
                foreach ($tier_map[$t] ?? array() as $id) {
                    if (isset($lookup[$id])) {
                        $tier_overrides[$t][] = $lookup[$id];
                    }
                }
            }
        } else {
            // Legacy format: [{id, label, tiers?: [...]}, ...]
            foreach ($raw_explicit as $item) {
                if (!is_array($item)) continue;
                $inc_id    = trim($item['id'] ?? '');
                $inc_label = trim($item['label'] ?? '');
                if ($inc_id === '' || $inc_label === '') continue;
                $inc          = array('id' => $inc_id, 'label' => $inc_label);
                $inclusions[] = $inc;
                $inc_tiers    = isset($item['tiers']) && is_array($item['tiers'])
                    ? $item['tiers']
                    : array_keys($tier_overrides);
                foreach ($inc_tiers as $t) {
                    if (isset($tier_overrides[$t])) {
                        $tier_overrides[$t][] = $inc;
                    }
                }
            }
        }

        foreach ($tier_overrides as $tier_id => $tier_incs) {
            if (isset($pricing['tiers'][$tier_id])) {
                $pricing['tiers'][$tier_id]['inclusions'] = $tier_incs;
            }
        }
    } else {
        // Derive from normalized tier inclusions (fallback)
        $seen_ids = array();
        foreach (array('basic', 'standard', 'premium', 'enterprise') as $k) {
            foreach ($pricing['tiers'][$k]['inclusions'] as $inc) {
                if ($inc['label'] !== '' && !in_array($inc['id'], $seen_ids, true)) {
                    $seen_ids[]   = $inc['id'];
                    $inclusions[] = $inc;
                }
            }
        }
    }

    // Resolve FAQs from cz_service_faqs meta
    $raw_faqs = get_post_meta($post->ID, 'cz_service_faqs', true) ?: array();
    $faqs     = array();
    if (is_array($raw_faqs)) {
        foreach ($raw_faqs as $item) {
            if (!is_array($item)) continue;
            $question = trim($item['question'] ?? '');
            $answer   = trim($item['answer'] ?? '');
            if ($question === '') continue;
            $faqs[] = array(
                'id'       => (isset($item['id']) && $item['id'] !== '') ? (string) $item['id'] : sanitize_title($question),
                'question' => $question,
                'answer'   => $answer,
            );
        }
    }

    return array(
        'id'         => (int) $post->ID,
        'title'      => $post->post_title,
        'slug'       => $post->post_name,
        'excerpt'    => $post->post_excerpt,
        'content'    => $post->post_content,
        'categories' => $categories,
        'inclusions' => $inclusions,
        'faqs'       => $faqs,
        'meta'       => array(
            'short_description' => $meta['short_description'] ?? '',
            'long_description'  => $meta['long_description'] ?? '',
            'billing_cycle'     => $meta['billing_cycle'] ?? 'monthly',
            'sla'               => $meta['sla'] ?? '',
            'uptime'            => $meta['uptime'] ?? '',
            'notes'             => $meta['notes'] ?? '',
            'popular_tier'      => $meta['popular_tier'] ?? null,
            'sort_order'        => isset($meta['sort_order']) ? (int) $meta['sort_order'] : 0,
            'is_active'         => isset($meta['is_active']) ? (bool) $meta['is_active'] : true,
        ),
        'pricing' => $pricing,
    );
}

/**
 * Normalize a pricing structure to ensure the frontend shape is always present.
 *
 * @param mixed $pricing
 * @return array
 */
function compuzign_cost_builder_normalize_pricing($pricing, string $billing_cycle = 'monthly'): array
{
    $default_tier = array('price' => null, 'billing_cycle' => $billing_cycle, 'inclusions' => array(), 'features' => array());

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

    // Allow older data where tiers might be nested differently
    $in_tiers = $pricing['tiers'] ?? $pricing;

    $out_tiers = array();
    foreach (array('basic', 'standard', 'premium', 'enterprise') as $k) {
        $src      = $in_tiers[$k] ?? array();
        $price    = isset($src['price']) ? compuzign_cost_builder_parse_price($src['price']) : null;

        // Filter empty/whitespace strings before deriving inclusions
        $raw_features = isset($src['features']) && is_array($src['features']) ? $src['features'] : array();
        $features     = array_values(array_filter(array_map('trim', $raw_features), function ($f) { return $f !== ''; }));

        $inclusions = array();
        foreach ($features as $f) {
            $inclusions[] = array('id' => sanitize_title($f), 'label' => $f);
        }

        $out_tiers[$k] = array(
            'price'         => $price,
            'billing_cycle' => $billing_cycle,
            'inclusions'    => $inclusions,
            'features'      => $features,
        );
    }

    $bundle_src = $pricing['bundle'] ?? array();
    $out_bundle = array(
        'title' => $bundle_src['title'] ?? '',
        'description' => $bundle_src['description'] ?? '',
        'price' => isset($bundle_src['price']) ? compuzign_cost_builder_parse_price($bundle_src['price']) : null,
    );

    return array('tiers' => $out_tiers, 'bundle' => $out_bundle);
}

/**
 * Build the full cost-builder response payload.
 * Returns array with keys: categories, tiers, services_by_category
 * `services_by_category` is an ordered array of category groups:
 * [ { category_id, category_name, category_slug, services: [] }, ... ]
 *
 * @return array
 */
function compuzign_cost_builder_get_cost_builder_service_response(): array
{
    // Desired category ordering
    $ordered_names = array(
        'Managed IT Services',
        'Cloud Solutions',
        'Cybersecurity',
        'Support & Consulting',
    );

    $categories = array();
    $services_by_category = array();

    foreach ($ordered_names as $name) {
        $slug = sanitize_title($name);
        $term = get_term_by('slug', $slug, 'cz_service_category');

        if (!$term || is_wp_error($term)) {
            // If a term doesn't exist, still include a placeholder entry
            $categories[] = array(
                'id' => null,
                'name' => $name,
                'slug' => $slug,
            );

            $services_by_category[] = array(
                'category_id' => null,
                'category_name' => $name,
                'category_slug' => $slug,
                'services' => array(),
            );

            continue;
        }

        $categories[] = array(
            'id' => (int) $term->term_id,
            'name' => $term->name,
            'slug' => $term->slug,
        );

        $posts = get_posts(array(
            'post_type' => 'cz_service',
            'post_status' => 'publish',
            'numberposts' => -1,
            'tax_query' => array(
                array(
                    'taxonomy' => 'cz_service_category',
                    'field' => 'term_id',
                    'terms' => (int) $term->term_id,
                ),
            ),
        ));

        $payloads = array();

        foreach ($posts as $p) {
            $meta = get_post_meta($p->ID, 'cz_service_meta', true) ?: array();
            if (isset($meta['is_active']) && $meta['is_active'] === false) {
                continue; // filter inactive
            }

            $payloads[] = compuzign_cost_builder_get_service_payload($p);
        }

        // Sort by meta.sort_order (ascending)
        usort($payloads, function ($a, $b) {
            $sa = $a['meta']['sort_order'] ?? 0;
            $sb = $b['meta']['sort_order'] ?? 0;
            if ($sa === $sb) {
                return strcmp($a['title'], $b['title']);
            }
            return $sa <=> $sb;
        });

        $services_by_category[] = array(
            'category_id' => (int) $term->term_id,
            'category_name' => $term->name,
            'category_slug' => $term->slug,
            'services' => $payloads,
        );
    }

    // Define tiers (preserve ordering)
    $tiers = array(
        array('id' => 'basic', 'title' => 'Basic'),
        array('id' => 'standard', 'title' => 'Standard'),
        array('id' => 'premium', 'title' => 'Premium'),
        array('id' => 'enterprise', 'title' => 'Enterprise'),
    );

    return array(
        'categories' => $categories,
        'tiers' => $tiers,
        'services_by_category' => $services_by_category,
    );
}
