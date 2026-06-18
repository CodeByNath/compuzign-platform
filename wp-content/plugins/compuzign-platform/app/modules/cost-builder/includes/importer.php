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


// ── XLSX row query helper ──────────────────────────────────────────────────

/**
 * Query sheetData rows from a parsed sheet XML with three-level fallback:
 * namespaced XPath → local-name XPath → DOM.
 */
function compuzign_cost_builder_xlsx_query_rows(SimpleXMLElement $sheetxml, string $sheet_raw): array
{
    $rows = $sheetxml->xpath('//x:sheetData/x:row');
    if (!empty($rows)) {
        return $rows;
    }

    $rows = $sheetxml->xpath('//*[local-name()="sheetData"]/*[local-name()="row"]');
    if (!empty($rows)) {
        return $rows;
    }

    libxml_use_internal_errors(true);
    $doc = new DOMDocument();
    $doc->loadXML($sheet_raw);
    $xpathdom = new DOMXPath($doc);
    $rows_dom = $xpathdom->query('//*[local-name()="sheetData"]/*[local-name()="row"]');
    $rows = array();
    foreach ($rows_dom as $rd) {
        $rows[] = $rd;
    }
    return $rows;
}

// ── PARSE STAGE ────────────────────────────────────────────────────────────

/**
 * Parse stage: open XLSX, find the Service Catalog sheet, detect the header row,
 * and extract all data rows as structured arrays compatible with
 * compuzign_cost_builder_import_service_row(). No posts are created or updated.
 *
 * Returns on error:
 *   ['success' => false, 'message' => string, ...diagnostic fields]
 *
 * Returns on success:
 *   ['success' => true, 'header_map' => array, 'header_row_number' => int,
 *    'rows' => array, 'skipped' => int, 'workbook_sheets' => array,
 *    'selected_sheet' => string|null, 'first_non_empty_rows' => array,
 *    'scanned_rows' => array, 'header_detected' => array]
 */
function compuzign_cost_builder_parse_xlsx_rows(string $xlsx_path): array
{
    if (!file_exists($xlsx_path) || !is_readable($xlsx_path)) {
        return array('success' => false, 'message' => 'XLSX file does not exist or is not readable.');
    }

    $zip = new ZipArchive();
    if ($zip->open($xlsx_path) !== true) {
        return array('success' => false, 'message' => 'Unable to open XLSX file.');
    }

    $XLSX_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

    // Shared strings
    $shared = array();
    if (($idx = $zip->locateName('xl/sharedStrings.xml')) !== false) {
        $sxml = simplexml_load_string($zip->getFromIndex($idx));
        $sxml->registerXPathNamespace('x', $XLSX_NS);
        $si_list = $sxml->xpath('//x:si');
        if (empty($si_list)) {
            $si_list = $sxml->xpath('//*[local-name()="si"]');
        }
        foreach ($si_list as $si) {
            $texts   = '';
            $t_nodes = $si->xpath('.//x:t');
            if (empty($t_nodes)) {
                $t_nodes = $si->xpath('.//*[local-name()="t"]');
            }
            foreach ($t_nodes as $t) {
                $texts .= (string) $t;
            }
            $shared[] = $texts;
        }
    }

    // Workbook rels
    $rels = array();
    if (($ridx = $zip->locateName('xl/_rels/workbook.xml.rels')) !== false) {
        $relsxml = simplexml_load_string($zip->getFromIndex($ridx));
        foreach ($relsxml->Relationship as $rel) {
            $attrs  = $rel->attributes();
            $id     = (string) $attrs['Id'];
            $target = preg_replace('#^/+#', '', (string) $attrs['Target']);
            $rels[$id] = $target;
        }
    }

    // Find Service Catalog sheet (fallback to first sheet)
    $sheet_target        = null;
    $selected_sheet_name = null;
    $sheets_info         = array();

    if (($wbidx = $zip->locateName('xl/workbook.xml')) !== false) {
        $wbxml = simplexml_load_string($zip->getFromIndex($wbidx));
        $wbxml->registerXPathNamespace('x', $XLSX_NS);
        foreach ($wbxml->sheets->sheet as $sheet) {
            $name  = (string) $sheet['name'];
            $rid   = '';
            $attrs = $sheet->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships');
            if ($attrs && isset($attrs['id'])) {
                $rid = (string) $attrs['id'];
            } else {
                $attrs2 = $sheet->attributes();
                $rid    = (string) $attrs2['r:id'] ?? (string) $attrs2['id'] ?? '';
            }
            $target = $rels[$rid] ?? '';
            $path   = ($target && strpos($target, 'xl/') !== 0) ? 'xl/' . ltrim($target, '/') : $target;
            $sheets_info[] = array('name' => $name, 'rid' => $rid, 'target' => $path ?: $target);

            if (stripos($name, 'service catalog') !== false) {
                $sheet_target        = $target;
                $selected_sheet_name = $name;
                break;
            }
            if ($sheet_target === null) {
                $sheet_target        = $target;
                $selected_sheet_name = $name;
            }
        }
    }

    if (!$sheet_target) {
        $zip->close();
        return array('success' => false, 'message' => 'Service Catalog sheet not found in workbook.', 'workbook_sheets' => $sheets_info);
    }

    $sheet_path = preg_match('#^xl/#', $sheet_target) ? $sheet_target : 'xl/' . ltrim($sheet_target, '/');
    if (($sidx = $zip->locateName($sheet_path)) === false) {
        $zip->close();
        return array('success' => false, 'message' => 'Sheet XML not found.', 'sheet_target' => $sheet_target, 'sheets' => $sheets_info);
    }

    $sheet_raw = $zip->getFromIndex($sidx);
    $sheetxml  = simplexml_load_string($sheet_raw);
    $sheetxml->registerXPathNamespace('x', $XLSX_NS);

    // Cell reader: handles both DOMElement and SimpleXMLElement rows
    $read_cells = function ($row) use ($shared, $XLSX_NS): array {
        $cells = array();
        $texts = array();

        if ($row instanceof DOMElement) {
            foreach ($row->childNodes as $cnode) {
                if (!($cnode instanceof DOMElement)) { continue; }
                if (strtolower($cnode->localName ?? $cnode->nodeName) !== 'c') { continue; }
                $r = $cnode->getAttribute('r');
                preg_match('/^([A-Z]+)\d+$/', $r, $m);
                $col = $m[1] ?? '';
                $t   = $cnode->getAttribute('t');
                $v   = '';
                foreach ($cnode->childNodes as $child) {
                    if (!($child instanceof DOMElement)) { continue; }
                    if (strtolower($child->localName ?? $child->nodeName) === 'v') { $v = $child->textContent; break; }
                }
                if ($v === '') {
                    foreach ($cnode->childNodes as $child) {
                        if (!($child instanceof DOMElement)) { continue; }
                        if (strtolower($child->localName ?? $child->nodeName) === 'is') {
                            $parts = array();
                            foreach ($child->childNodes as $tt) {
                                if ($tt instanceof DOMElement && strtolower($tt->localName) === 't') { $parts[] = $tt->textContent; }
                            }
                            $v = implode('', $parts);
                        }
                    }
                }
                if ($t === 's') { $v = $shared[(int) $v] ?? ''; }
                $v = trim((string) $v);
                $cells[$col] = $v;
                $texts[]     = $v;
            }
        } else {
            // SimpleXML — use children($NS) + attributes() (unnamespaced attrs)
            foreach ($row->children($XLSX_NS) as $c) {
                $c_attrs = $c->attributes();
                $r_attr  = (string) ($c_attrs['r'] ?? '');
                $t       = (string) ($c_attrs['t'] ?? '');
                preg_match('/^([A-Z]+)\d+$/', $r_attr, $m);
                $col  = $m[1] ?? '';
                $v    = '';
                $c_ch = $c->children($XLSX_NS);
                if (count($c_ch->v) > 0) {
                    $raw = (string) $c_ch->v;
                    $v   = $t === 's' ? ($shared[(int) $raw] ?? '') : $raw;
                } elseif (count($c_ch->is) > 0) {
                    $parts = array();
                    foreach ($c_ch->is->children($XLSX_NS) as $tnode) { $parts[] = (string) $tnode; }
                    $v = implode('', $parts);
                }
                $v           = trim($v);
                $cells[$col] = $v;
                $texts[]     = $v;
            }
        }

        return array('cells' => $cells, 'texts' => $texts);
    };

    $get_rnum = function ($row): string {
        return ($row instanceof DOMElement) ? $row->getAttribute('r') : (string) ($row->attributes()['r'] ?? '');
    };

    $normalize = function (string $s): string {
        $s = trim($s);
        $s = preg_replace('/\s+/u', ' ', $s);
        return strtolower(trim($s));
    };

    $known_headers = array(
        'service category' => 'category', 'service category:' => 'category',
        'service name'     => 'service_title', 'service name:' => 'service_title',
        'description'      => 'long_description',
        'basic'            => 'basic_price',    'standard'     => 'standard_price',
        'premium'          => 'premium_price',  'enterprise'   => 'enterprise_price',
        'billing cycle'    => 'billing_cycle',  'billing cycle:' => 'billing_cycle',
        'sla / uptime'     => 'uptime',         'sla'          => 'uptime',
        'uptime'           => 'uptime',         'notes'        => 'notes',
    );

    $all_rows          = compuzign_cost_builder_xlsx_query_rows($sheetxml, $sheet_raw);
    $header_map        = array();
    $header_row_number = null;
    $scanned_rows      = array();
    $first_non_empty   = array();

    // Scan first 30 rows to locate the header row
    foreach ($all_rows as $row) {
        $rnum_str = $get_rnum($row);
        if ((int) $rnum_str > 30) { break; }

        $parsed     = $read_cells($row);
        $cells      = $parsed['cells'];
        $cell_texts = $parsed['texts'];
        $norms      = array_map($normalize, $cell_texts);

        $scanned_rows[] = array('r' => $rnum_str, 'cells' => $cell_texts, 'normalized' => $norms);

        if (count($first_non_empty) < 10) {
            $nonempty = array_filter($cell_texts, fn($x) => strlen(trim($x)) > 0);
            if (!empty($nonempty)) {
                $first_non_empty[] = array('r' => $rnum_str, 'cells' => $cell_texts);
            }
        }

        $has_service_category = false;
        $has_service_name     = false;
        foreach ($norms as $n) {
            if (strpos($n, 'service category') !== false) { $has_service_category = true; }
            if (strpos($n, 'service name') !== false)     { $has_service_name = true; }
        }

        if ($has_service_category || $has_service_name) {
            $header_row_number = (int) $rnum_str;
            foreach ($cells as $col => $cellVal) {
                $nv = $normalize($cellVal);
                foreach ($known_headers as $k => $internal) {
                    if ($nv === $k || strpos($nv, $k) !== false) { $header_map[$col] = $internal; break; }
                }
            }
            if (empty($header_map)) {
                $header_map = array('A'=>'category','B'=>'service_title','C'=>'long_description','D'=>'basic_price','E'=>'standard_price','F'=>'premium_price','G'=>'enterprise_price','H'=>'billing_cycle','I'=>'uptime','J'=>'notes');
            }
            break;
        }
    }

    if ($header_row_number === null) {
        $zip->close();
        return array(
            'success'              => false,
            'message'              => 'Header row not found.',
            'workbook_sheets'      => $sheets_info,
            'selected_sheet'       => $selected_sheet_name,
            'first_non_empty_rows' => $first_non_empty,
            'scanned_rows'         => $scanned_rows,
        );
    }

    // Extract data rows into row_data arrays (PERSIST STAGE INPUT)
    $rows_out = array();
    $skipped  = 0;

    foreach ($all_rows as $row) {
        $rnum = (int) $get_rnum($row);
        if ($rnum <= $header_row_number) { continue; }

        $cells = $read_cells($row)['cells'];

        $service_title = '';
        $category_val  = '';
        foreach ($cells as $col => $val) {
            $mapped = $header_map[$col] ?? null;
            if ($mapped === 'service_title') { $service_title = $val; }
            if ($mapped === 'category')      { $category_val  = $val; }
        }
        if ($service_title === '') { $service_title = $cells['B'] ?? ''; }
        if ($category_val  === '') { $category_val  = $cells['A'] ?? ''; }

        if ($service_title === '') {
            $skipped++;
            continue;
        }

        $rows_out[] = array(
            'category'            => $category_val,
            'service_title'       => $service_title,
            'service_slug'        => '',
            'short_description'   => '',
            'long_description'    => $cells['C'] ?? '',
            'billing_cycle'       => $cells['H'] ?? '',
            'sla'                 => '',
            'uptime'              => $cells['I'] ?? '',
            'notes'               => $cells['J'] ?? '',
            'popular_tier'        => '',
            'sort_order'          => 0,
            'is_active'           => '1',
            'basic_price'         => $cells['D'] ?? '',
            'standard_price'      => $cells['E'] ?? '',
            'premium_price'       => $cells['F'] ?? '',
            'enterprise_price'    => $cells['G'] ?? '',
            'basic_features'      => '',
            'standard_features'   => '',
            'premium_features'    => '',
            'enterprise_features' => '',
            'bundle_title'        => '',
            'bundle_description'  => '',
            'bundle_price'        => '',
        );
    }

    $zip->close();

    return array(
        'success'              => true,
        'header_map'           => $header_map,
        'header_row_number'    => $header_row_number,
        'header_detected'      => array('r' => $header_row_number, 'map' => $header_map),
        'rows'                 => $rows_out,
        'skipped'              => $skipped,
        'workbook_sheets'      => $sheets_info,
        'selected_sheet'       => $selected_sheet_name,
        'first_non_empty_rows' => $first_non_empty,
        'scanned_rows'         => $scanned_rows,
    );
}

// ── PERSIST STAGE ──────────────────────────────────────────────────────────

/**
 * Import services from an Excel workbook (.xlsx) using the Service Catalog sheet.
 * Delegates parsing to compuzign_cost_builder_parse_xlsx_rows(), then persists
 * each row via compuzign_cost_builder_import_service_row().
 *
 * @param string $xlsx_path
 * @return array
 */
function compuzign_cost_builder_import_service_catalog_from_xlsx(string $xlsx_path): array
{
    $parsed = compuzign_cost_builder_parse_xlsx_rows($xlsx_path);

    if (!$parsed['success']) {
        return array(
            'success'  => false,
            'message'  => $parsed['message'],
            'inserted' => 0,
            'updated'  => 0,
            'skipped'  => 0,
            'invalid'  => 0,
            'errors'   => array(),
        );
    }

    $inserted = 0;
    $updated  = 0;
    $invalid  = 0;
    $errors   = array();

    foreach ($parsed['rows'] as $row_data) {
        $result = compuzign_cost_builder_import_service_row($row_data);
        if (is_wp_error($result)) {
            $invalid++;
            $errors[] = $result->get_error_message();
        } elseif (isset($result['action'])) {
            if ($result['action'] === 'insert') { $inserted++; }
            elseif ($result['action'] === 'update') { $updated++; }
        }
    }

    return array(
        'success'           => empty($errors),
        'message'           => empty($errors) ? 'Import completed.' : 'Import completed with errors.',
        'inserted'          => $inserted,
        'updated'           => $updated,
        'skipped'           => $parsed['skipped'],
        'invalid'           => $invalid,
        'workbook_sheets'   => $parsed['workbook_sheets'],
        'selected_sheet'    => $parsed['selected_sheet'],
        'first_parsed_rows' => $parsed['first_non_empty_rows'],
        'header_detected'   => $parsed['header_detected'],
        'errors'            => $errors,
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
    $title            = trim($row['service_title']    ?? '');
    $shortDescription = trim($row['short_description'] ?? '');
    $longDescription  = trim($row['long_description']  ?? '');
    $category         = trim($row['category']          ?? '');

    // Overview is complete when the service has a title, a category assignment,
    // and at least one description field. The XLSX parser does not populate
    // short_description, so long_description alone satisfies the content check.
    $overviewComplete = $title !== ''
        && $category !== ''
        && ($shortDescription !== '' || $longDescription !== '');

    return array(
        'platform_status'   => $overviewComplete ? 'active' : 'disabled',
        'module_status'     => array(
            'overview'   => $overviewComplete ? 'settled' : 'pending',
            'inclusions' => 'pending',
            'faqs'       => 'pending',
        ),
        'short_description' => $shortDescription,
        'long_description'  => $longDescription,
        'billing_cycle'     => trim($row['billing_cycle'] ?? 'monthly'),
        'sla'               => trim($row['sla']           ?? ''),
        'uptime'            => trim($row['uptime']         ?? ''),
        'notes'             => trim($row['notes']          ?? ''),
        'popular_tier'      => compuzign_cost_builder_validate_popular_tier(trim($row['popular_tier'] ?? '')) ?? 'premium',
        'sort_order'        => absint($row['sort_order']   ?? 0),
    );
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

function compuzign_cost_builder_import_service_catalog_dry_run(string $xlsx_path): array
{
    $parsed = compuzign_cost_builder_parse_xlsx_rows($xlsx_path);

    if (!$parsed['success']) {
        return array(
            'success'              => false,
            'message'              => $parsed['message'],
            'scanned_rows'         => $parsed['scanned_rows'] ?? array(),
            'workbook_sheets'      => $parsed['workbook_sheets'] ?? array(),
            'selected_sheet'       => $parsed['selected_sheet'] ?? null,
            'first_non_empty_rows' => $parsed['first_non_empty_rows'] ?? array(),
        );
    }

    return array(
        'success'           => true,
        'message'           => 'Dry-run parsing successful. No posts or metadata created.',
        'header_map'        => $parsed['header_map'],
        'header_row_number' => $parsed['header_row_number'],
        'sample_rows'       => array_slice($parsed['rows'], 0, 10),
        'sample_rows_count' => min(count($parsed['rows']), 10),
    );
}
