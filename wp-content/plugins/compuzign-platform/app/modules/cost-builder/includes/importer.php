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
    // If an xlsx file is provided, delegate to the XLSX importer
    $lower = strtolower($csv_path ?? '');
    if (substr($lower, -5) === '.xlsx') {
        return compuzign_cost_builder_import_service_catalog_from_xlsx($csv_path);
    }

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


/**
 * Import services from an Excel workbook (.xlsx) using the Service Catalog sheet.
 * Keeps the existing importer flow by producing rows compatible with
 * compuzign_cost_builder_import_service_row().
 *
 * @param string $xlsx_path
 * @return array
 */
function compuzign_cost_builder_import_service_catalog_from_xlsx(string $xlsx_path): array
{
    if (!file_exists($xlsx_path) || !is_readable($xlsx_path)) {
        return array(
            'success' => false,
            'message' => 'XLSX file does not exist or is not readable.',
            'inserted' => 0,
            'updated' => 0,
            'errors' => array(),
        );
    }

    $zip = new ZipArchive();
    if ($zip->open($xlsx_path) !== true) {
        return array(
            'success' => false,
            'message' => 'Unable to open XLSX file.',
            'inserted' => 0,
            'updated' => 0,
            'errors' => array(),
        );
    }

    // Load shared strings
    $shared = array();
    if (($idx = $zip->locateName('xl/sharedStrings.xml')) !== false) {
        $sxml = simplexml_load_string($zip->getFromIndex($idx));
        $sxml->registerXPathNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        foreach ($sxml->si as $si) {
            $texts = '';
            foreach ($si->xpath('.//x:t') as $t) {
                $texts .= (string) $t;
            }
            $shared[] = $texts;
        }
    }

    // Map workbook rels to sheet targets
    $rels = array();
    if (($ridx = $zip->locateName('xl/_rels/workbook.xml.rels')) !== false) {
        $relsxml = simplexml_load_string($zip->getFromIndex($ridx));
        $relsxml->registerXPathNamespace('p', 'http://schemas.openxmlformats.org/package/2006/relationships');
        foreach ($relsxml->Relationship as $rel) {
            $attrs = $rel->attributes();
            $id = (string) $attrs['Id'];
            $target = (string) $attrs['Target'];
            // normalize target
            $target = preg_replace('#^/+#', '', $target);
            $rels[$id] = $target;
        }
    }

    // Read workbook to list sheets and find the one named 'Service Catalog'
    $sheet_target = null;
    $selected_sheet_name = null;
    $sheets_info = array();
    if (($wbidx = $zip->locateName('xl/workbook.xml')) !== false) {
        $wbxml = simplexml_load_string($zip->getFromIndex($wbidx));
        $wbxml->registerXPathNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        foreach ($wbxml->sheets->sheet as $sheet) {
            $name = (string) $sheet['name'];
            // relationship id may be in the relationships namespace
            $rid = '';
            $attrs = $sheet->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships');
            if ($attrs && isset($attrs['id'])) {
                $rid = (string) $attrs['id'];
            } else {
                $attrs2 = $sheet->attributes();
                $rid = (string) $attrs2['r:id'] ?? (string) $attrs2['id'] ?? '';
            }
            $target = $rels[$rid] ?? '';
            // normalize target to xl/ path
            $path = $target;
            if ($path && strpos($path, 'xl/') !== 0) {
                $path = 'xl/' . ltrim($path, '/');
            }
            $sheets_info[] = array('name' => $name, 'rid' => $rid, 'target' => $path ?: $target);

            if (stripos($name, 'service catalog') !== false) {
                $sheet_target = $target;
                $selected_sheet_name = $name;
                break;
            }
            if ($sheet_target === null) {
                // fallback to first sheet target but continue searching for exact match
                $sheet_target = $target;
                $selected_sheet_name = $name;
            }
        }
    }

    if (!$sheet_target) {
        $zip->close();
        return array(
            'success' => false,
            'message' => 'Service Catalog sheet not found in workbook.',
            'inserted' => 0,
            'updated' => 0,
            'errors' => array(),
        );
    }

    $sheet_path = preg_match('#^xl/#', $sheet_target) ? $sheet_target : 'xl/' . ltrim($sheet_target, '/');
    if (($sidx = $zip->locateName($sheet_path)) === false) {
        $zip->close();
        return array(
            'success' => false,
            'message' => 'Sheet XML not found',
            'sheet_target' => $sheet_target,
            'sheets' => $sheets_info,
            'inserted' => 0,
            'updated' => 0,
            'errors' => array(),
        );
    }

    $sheetxml = simplexml_load_string($zip->getFromIndex($sidx));
    $sheetxml->registerXPathNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

    // Find header row by scanning the first 30 rows and matching known header names
    $header_map = array();
    $header_row_number = null;
    $diagnostics = array(
        'selected_sheet_name' => $selected_sheet_name,
        'selected_sheet_path' => $sheet_path,
        'sheets' => $sheets_info,
        'scanned_rows' => array(),
        'first_non_empty_rows' => array(),
    );

    $normalize = function ($s) {
        $s = trim((string) $s);
        $s = preg_replace('/\s+/u', ' ', $s);
        $s = trim($s);
        $s = strtolower($s);
        return $s;
    };

    // Known headers mapped to internal keys
    $known_headers = array(
        'service category' => 'category',
        'service category:' => 'category',
        'service name' => 'service_title',
        'service name:' => 'service_title',
        'description' => 'long_description',
        'basic' => 'basic_price',
        'standard' => 'standard_price',
        'premium' => 'premium_price',
        'enterprise' => 'enterprise_price',
        'billing cycle' => 'billing_cycle',
        'billing cycle:' => 'billing_cycle',
        'sla / uptime' => 'uptime',
        'sla' => 'uptime',
        'uptime' => 'uptime',
        'notes' => 'notes',
    );

    $row_count = 0;
    $first_non_empty = array();
    // Use XPath to reliably find row nodes with namespace
    $rows = $sheetxml->xpath('//x:sheetData/x:row');
    foreach ($rows as $row) {
        $row_count++;
        if ($row_count > 30) {
            break;
        }
        $rnum = (string) $row['r'];
        $cells = array();
        $cell_texts = array();
        $cells_nodes = $row->xpath('x:c');
        foreach ($cells_nodes as $c) {
            $r = (string) $c['r'];
            preg_match('/^([A-Z]+)\d+$/', $r, $m);
            $col = $m[1] ?? '';
            $t = (string) $c['t'];
            $v = '';
            $vnode = $c->xpath('x:v');
            if (!empty($vnode)) {
                $raw = (string) $vnode[0];
                if ($t === 's') {
                    $idx = (int) $raw;
                    $v = $shared[$idx] ?? '';
                } else {
                    $v = $raw;
                }
            } else {
                // inlineStr support
                $isnode = $c->xpath('x:is/x:t');
                if (!empty($isnode)) {
                    $parts = array();
                    foreach ($isnode as $ttext) { $parts[] = (string) $ttext; }
                    $v = implode('', $parts);
                }
            }
            $v_trim = trim((string) $v);
            $cells[$col] = $v_trim;
            $cell_texts[] = $v_trim;
        }

        // record scanned row diagnostics
        $diagnostics['scanned_rows'][] = array('r' => $rnum, 'cells' => $cell_texts);
        if (count($first_non_empty) < 10) {
            // consider non-empty if any cell has visible text
            $nonempty = array_filter($cell_texts, function ($x) { return strlen(trim($x)) > 0; });
            if (!empty($nonempty)) {
                $first_non_empty[] = array('r' => $rnum, 'cells' => $cell_texts);
            }
        }

        // Build normalized texts map for the row to search for headers
        $norms = array();
        foreach ($cell_texts as $ct) {
            $norms[] = $normalize($ct);
        }

        $diagnostics['scanned_rows'][count($diagnostics['scanned_rows'])-1]['normalized'] = $norms;

        // Try to detect header row by presence of both 'service category' and 'service name' in the row
        $has_service_category = false;
        $has_service_name = false;
        foreach ($norms as $n) {
            if (strpos($n, 'service category') !== false) {
                $has_service_category = true;
            }
            if (strpos($n, 'service name') !== false) {
                $has_service_name = true;
            }
        }

        if ($has_service_category || $has_service_name) {
            // Found candidate header row - build header_map dynamically using known headers
            $header_row_number = (int) $rnum;
            $header_map = array();
            foreach ($row->c as $c) {
                $r = (string) $c['r'];
                preg_match('/^([A-Z]+)\d+$/', $r, $m);
                $col = $m[1] ?? '';
                $t = (string) $c['t'];
                $v = '';
                if (isset($c->v)) {
                    $raw = (string) $c->v;
                    if ($t === 's') {
                        $idx = (int) $raw;
                        $v = $shared[$idx] ?? '';
                    } else {
                        $v = $raw;
                    }
                } else {
                    $v = '';
                    if (isset($c->is)) {
                        foreach ($c->is->t as $ttext) { $v .= (string) $ttext; }
                    }
                }
                $nv = $normalize($v);
                foreach ($known_headers as $k => $internal) {
                    if ($nv === $k || strpos($nv, $k) !== false) {
                        $header_map[$col] = $internal;
                        break;
                    }
                }
            }

            // Fallback: if header_map empty, still accept this row but default to A..J mapping
            if (empty($header_map)) {
                $header_map = array(
                    'A' => 'category', 'B' => 'service_title', 'C' => 'long_description',
                    'D' => 'basic_price', 'E' => 'standard_price', 'F' => 'premium_price',
                    'G' => 'enterprise_price', 'H' => 'billing_cycle', 'I' => 'uptime', 'J' => 'notes',
                );
            }

            $diagnostics['header_row'] = array('r' => $header_row_number, 'map' => $header_map, 'raw_cells' => $cell_texts, 'normalized' => $norms);
            break;
        }
    }

    $diagnostics['first_non_empty_rows'] = $first_non_empty;

    if ($header_row_number === null) {
        $zip->close();
        return array(
            'success' => false,
            'message' => 'Header row not found',
            'diagnostics' => $diagnostics,
            'inserted' => 0,
            'updated' => 0,
            'errors' => array(),
        );
    }

    // Process rows after header
    $inserted = 0; $updated = 0; $errors = array();
    foreach ($sheetxml->sheetData->row as $row) {
        $rnum = (int) $row['r'];
        if ($rnum <= $header_row_number) {
            continue;
        }

        $cells = array();
        foreach ($row->c as $c) {
            $r = (string) $c['r'];
            preg_match('/^([A-Z]+)\d+$/', $r, $m);
            $col = $m[1] ?? '';
            $t = (string) $c['t'];
            $v = '';
            if (isset($c->v)) {
                $raw = (string) $c->v;
                if ($t === 's') {
                    $idx = (int) $raw;
                    $v = $shared[$idx] ?? '';
                } else {
                    $v = $raw;
                }
            } else {
                $v = '';
                if (isset($c->is)) {
                    foreach ($c->is->t as $ttext) { $v .= (string) $ttext; }
                }
            }
            $cells[$col] = trim($v);
        }

        // Build normalized row data
        // Determine service title column by header_map
        // Find the column letter mapped to service_title
        $service_title = '';
        $category_val = '';
        foreach ($cells as $col => $val) {
            $mapped = $header_map[$col] ?? null;
            if ($mapped === 'service_title') { $service_title = $val; }
            if ($mapped === 'category') { $category_val = $val; }
        }
        // Fallback to B/A if detection failed
        if ($service_title === '') { $service_title = $cells['B'] ?? ''; }
        if ($category_val === '') { $category_val = $cells['A'] ?? ''; }
        if ($service_title === '') {
            // likely a section header row like '  MANAGED IT SERVICES' in column A
            continue;
        }

        $row_data = array(
            'category' => $category_val,
            'service_title' => $service_title,
            'service_slug' => '',
            'short_description' => '',
            'long_description' => $cells['C'] ?? '',
            'billing_cycle' => $cells['H'] ?? '',
            'sla' => '',
            'uptime' => $cells['I'] ?? '',
            'notes' => $cells['J'] ?? '',
            'popular_tier' => '',
            'sort_order' => 0,
            'is_active' => '1',
            'basic_price' => $cells['D'] ?? '',
            'standard_price' => $cells['E'] ?? '',
            'premium_price' => $cells['F'] ?? '',
            'enterprise_price' => $cells['G'] ?? '',
            'basic_features' => '',
            'standard_features' => '',
            'premium_features' => '',
            'enterprise_features' => '',
            'bundle_title' => '',
            'bundle_description' => '',
            'bundle_price' => '',
        );

        $result = compuzign_cost_builder_import_service_row($row_data);

        if (is_wp_error($result)) {
            $errors[] = $result->get_error_message();
        } elseif (isset($result['action'])) {
            if ($result['action'] === 'insert') { $inserted++; }
            elseif ($result['action'] === 'update') { $updated++; }
        }
    }

    $zip->close();

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
