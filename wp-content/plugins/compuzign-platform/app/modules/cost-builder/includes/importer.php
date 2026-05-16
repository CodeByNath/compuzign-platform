<?php

if (!defined('COMPUZIGN_PLUGIN_PATH')) {
    return;
}

if (!defined('COMPUZIGN_COST_BUILDER_PATH')) {
    define('COMPUZIGN_COST_BUILDER_PATH', COMPUZIGN_APP_PATH . 'modules/cost-builder/');
}

$cost_builder_includes = COMPUZIGN_COST_BUILDER_PATH . 'includes/';
$meta_fields_file = $cost_builder_includes . 'meta-fields.php';

if (file_exists($meta_fields_file)) {
    require_once $meta_fields_file;
}

function compuzign_cost_builder_import_service_catalog_from_csv(string $csv_path): array
{
    if (!file_exists($csv_path) || !is_readable($csv_path)) {
        return array(
            'success' => false,
            'message' => 'CSV file does not exist or is not readable.',
            'inserted' => 0,
            'updated' => 0,
            'errors' => array(),
        );
    }

    $handle = fopen($csv_path, 'r');
    if ($handle === false) {
        return array(
            'success' => false,
            'message' => 'Unable to open CSV file.',
            'inserted' => 0,
            'updated' => 0,
            'errors' => array(),
        );
    }

    $headers = array();
    $row_count = 0;
    $inserted = 0;
    $updated = 0;
    $errors = array();

    while (($row = fgetcsv($handle, 0, ',', '"')) !== false) {
        if ($row_count === 0) {
            $headers = array_map('compuzign_cost_builder_normalize_csv_header', $row);
            $row_count++;
            continue;
        }

        if (count(array_filter($row, 'strlen')) === 0) {
            $row_count++;
            continue;
        }

        $data = array();
        foreach ($headers as $index => $header) {
            $data[$header] = isset($row[$index]) ? trim($row[$index]) : '';
        }

        $result = compuzign_cost_builder_import_service_row($data);

        if (is_wp_error($result)) {
            $errors[] = $result->get_error_message();
        } elseif (isset($result['action'])) {
            if ($result['action'] === 'insert') {
                $inserted++;
            } elseif ($result['action'] === 'update') {
                $updated++;
            }
        }

        $row_count++;
    }

    fclose($handle);

    return array(
        'success' => empty($errors),
        'message' => empty($errors) ? 'Import completed.' : 'Import completed with errors.',
        'inserted' => $inserted,
        'updated' => $updated,
        'errors' => $errors,
    );
}

function compuzign_cost_builder_normalize_csv_header($header): string
{
    $header = trim($header);
    $header = preg_replace('/^\xEF\xBB\xBF/', '', $header);
    $header = strtolower($header);
    $header = preg_replace('/[^a-z0-9]+/', '_', $header);
    $header = trim($header, '_');

    $aliases = array(
        'name' => 'service_title',
        'service_name' => 'service_title',
        'title' => 'service_title',
        'slug' => 'service_slug',
        'service_slug' => 'service_slug',
        'category' => 'category',
        'category_name' => 'category',
        'category_slug' => 'category',
        'short_description' => 'short_description',
        'short_desc' => 'short_description',
        'long_description' => 'long_description',
        'long_desc' => 'long_description',
        'description' => 'long_description',
        'billing_cycle' => 'billing_cycle',
        'sla' => 'sla',
        'uptime' => 'uptime',
        'notes' => 'notes',
        'popular_tier' => 'popular_tier',
        'sort_order' => 'sort_order',
        'is_active' => 'is_active',
        'basic_price' => 'basic_price',
        'standard_price' => 'standard_price',
        'premium_price' => 'premium_price',
        'enterprise_price' => 'enterprise_price',
        'basic_features' => 'basic_features',
        'standard_features' => 'standard_features',
        'premium_features' => 'premium_features',
        'enterprise_features' => 'enterprise_features',
        'bundle_title' => 'bundle_title',
        'bundle_description' => 'bundle_description',
        'bundle_price' => 'bundle_price',
    );

    return $aliases[$header] ?? $header;
}

function compuzign_cost_builder_import_service_row(array $row)
{
    $title = trim($row['service_title'] ?? '');
    if ($title === '') {
        return new WP_Error('missing_title', 'Service title is required.');
    }

    $slug = trim($row['service_slug'] ?? '');
    if ($slug === '') {
        $slug = sanitize_title($title);
    } else {
        $slug = sanitize_title($slug);
    }

    if ($slug === '') {
        return new WP_Error('invalid_slug', 'Unable to generate a valid service slug.');
    }

    $existing = compuzign_cost_builder_get_service_by_slug($slug);

    $post_data = array(
        'post_title' => $title,
        'post_name' => $slug,
        'post_content' => trim($row['long_description'] ?? ''),
        'post_excerpt' => trim($row['short_description'] ?? ''),
        'post_status' => 'publish',
        'post_type' => 'cz_service',
    );

    if ($existing) {
        $post_data['ID'] = $existing->ID;
        $post_id = wp_update_post($post_data, true);
        $action = 'update';
    } else {
        $post_id = wp_insert_post($post_data, true);
        $action = 'insert';
    }

    if (is_wp_error($post_id)) {
        return $post_id;
    }

    $category_names = compuzign_cost_builder_parse_categories($row['category'] ?? '');
    $term_ids = compuzign_cost_builder_get_or_create_category_term_ids($category_names);

    if (!empty($term_ids)) {
        wp_set_post_terms((int) $post_id, $term_ids, 'cz_service_category', false);
    }

    $meta = compuzign_cost_builder_build_service_meta_from_row($row);
    update_post_meta((int) $post_id, 'cz_service_meta', $meta);

    $pricing = compuzign_cost_builder_build_service_pricing_from_row($row);
    update_post_meta((int) $post_id, 'cz_service_pricing', $pricing);

    return array(
        'action' => $action,
        'post_id' => (int) $post_id,
        'slug' => $slug,
    );
}

function compuzign_cost_builder_get_service_by_slug(string $slug)
{
    if ($slug === '') {
        return null;
    }

    return get_page_by_path($slug, OBJECT, 'cz_service');
}

function compuzign_cost_builder_parse_categories(string $value): array
{
    $value = trim($value);
    if ($value === '') {
        return array();
    }

    $parts = preg_split('/[\r\n;,|]+/', $value);
    $names = array();

    foreach ($parts as $part) {
        $part = trim($part);
        if ($part !== '') {
            $names[] = sanitize_text_field($part);
        }
    }

    return array_values(array_unique($names));
}

function compuzign_cost_builder_get_or_create_category_term_ids(array $category_names): array
{
    $term_ids = array();

    foreach ($category_names as $name) {
        $slug = sanitize_title($name);

        if ($slug === '') {
            continue;
        }

        $term = get_term_by('slug', $slug, 'cz_service_category');

        if (!$term || is_wp_error($term)) {
            $inserted = wp_insert_term($name, 'cz_service_category', array('slug' => $slug));
            if (!is_wp_error($inserted) && isset($inserted['term_id'])) {
                $term_ids[] = (int) $inserted['term_id'];
            }
        } else {
            $term_ids[] = (int) $term->term_id;
        }
    }

    return array_values(array_unique($term_ids));
}

function compuzign_cost_builder_build_service_meta_from_row(array $row): array
{
    $meta = array(
        'short_description' => trim($row['short_description'] ?? ''),
        'long_description' => trim($row['long_description'] ?? ''),
        'billing_cycle' => trim($row['billing_cycle'] ?? 'monthly'),
        'sla' => trim($row['sla'] ?? ''),
        'uptime' => trim($row['uptime'] ?? ''),
        'notes' => trim($row['notes'] ?? ''),
        'popular_tier' => compuzign_cost_builder_validate_popular_tier(trim($row['popular_tier'] ?? '')) ?? 'premium',
        'sort_order' => absint($row['sort_order'] ?? 0),
        'is_active' => compuzign_cost_builder_parse_bool($row['is_active'] ?? '1'),
    );

    return $meta;
}

function compuzign_cost_builder_build_service_pricing_from_row(array $row): array
{
    return array(
        'tiers' => array(
            'basic' => array(
                'price' => compuzign_cost_builder_parse_price($row['basic_price'] ?? ''),
                'features' => compuzign_cost_builder_parse_list_value($row['basic_features'] ?? ''),
            ),
            'standard' => array(
                'price' => compuzign_cost_builder_parse_price($row['standard_price'] ?? ''),
                'features' => compuzign_cost_builder_parse_list_value($row['standard_features'] ?? ''),
            ),
            'premium' => array(
                'price' => compuzign_cost_builder_parse_price($row['premium_price'] ?? ''),
                'features' => compuzign_cost_builder_parse_list_value($row['premium_features'] ?? ''),
            ),
            'enterprise' => array(
                'price' => compuzign_cost_builder_parse_price($row['enterprise_price'] ?? ''),
                'features' => compuzign_cost_builder_parse_list_value($row['enterprise_features'] ?? ''),
            ),
        ),
        'bundle' => array(
            'title' => trim($row['bundle_title'] ?? ''),
            'description' => trim($row['bundle_description'] ?? ''),
            'price' => compuzign_cost_builder_parse_price($row['bundle_price'] ?? ''),
        ),
    );
}

function compuzign_cost_builder_parse_bool($value): bool
{
    if (is_bool($value)) {
        return $value;
    }

    $value = trim(strtolower((string) $value));

    return in_array($value, array('1', 'true', 'yes', 'on'), true);
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

function compuzign_cost_builder_parse_list_value($value): array
{
    $value = trim((string) $value);
    if ($value === '') {
        return array();
    }

    $items = preg_split('/[\r\n;|]+/', $value);
    $clean = array();

    foreach ($items as $item) {
        $item = trim($item);
        if ($item !== '') {
            $clean[] = sanitize_text_field($item);
        }
    }

    return array_values(array_unique($clean));
}
