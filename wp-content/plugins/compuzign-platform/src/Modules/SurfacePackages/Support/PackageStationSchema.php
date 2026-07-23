<?php

/*
 * FILE INDEX
 *
 * PACKAGE_STATION_SHAPE    Defaults and source relationship sanitization
 * RATE_SHEET_SCHEMA        Rate Sheet identity, sanitization, and validation
 * TIER_PRICING             Tier selections, totals, and activation readiness
 * COMMERCIAL_PROJECTION    Active public Package projection
 *
 * Search: SECTION: PACKAGE_STATION_SHAPE
 *         SECTION: RATE_SHEET_SCHEMA
 *         SECTION: TIER_PRICING
 *         SECTION: COMMERCIAL_PROJECTION
 */

namespace CompuZign\Platform\Modules\SurfacePackages\Support;

/**
 * Pure schema boundary for the independent active Package aggregate.
 *
 * ARCHITECTURE LOCK: Service is the only canonical WordPress content entity.
 * Package, Manager, Rate Sheet, Tier, and commercial projections are
 * provider-owned domain models. This contract makes no post type, postmeta,
 * route, registration, or future storage-engine assumption.
 *
 * This class deliberately performs no registration or I/O. In particular,
 * source provenance is Package-internal persistence and must not be emitted in
 * commercial projections, quote payloads, or shared surface contracts.
 */
final class PackageStationSchema
{
    // ===================================================================
    // SECTION: PACKAGE_STATION_SHAPE
    // ===================================================================
    public const FIXED_TIERS = ['basic', 'standard', 'premium', 'enterprise', 'ultimate'];
    public const ALLOWED_UNITS = ['Per VM', 'Per GB', 'Per TB', 'Per vCPU', 'Per user', 'Per month', 'Per item'];

    /** @return array<string, mixed> */
    public static function defaultStation(): array
    {
        return [
            'schema_version' => 1,
            'identity' => ['title' => '', 'slug' => ''],
            'lifecycle' => ['status' => 'disabled'],
            'manager' => ['sources' => [], 'groups' => [], 'decisions' => []],
            'rate_sheet' => null,
            'tiers' => array_fill_keys(self::FIXED_TIERS, self::emptyTier()),
            'popular_tier' => null,
            'bin' => [],
            'migration' => null,
        ];
    }

    /**
     * Package-owned supply identity. Providers resolve presentation and
     * exposed content; Package persists only the durable generic relationship.
     * category_group_id is the Package-owned commercial bucket assignment
     * (Package Family, e.g. KAIROS) — existence against the group
     * registry is normalised by the Manager layer, not here.
     *
     * @return array<int, array{relationship_id:string,provider_key:string,entity_type:string,entity_id:string|int,sort_order:int,category_group_id:string|null}>
     */
    public static function sanitizeSourceRelationships(mixed $value): array
    {
        if (!is_array($value)) { return []; }
        $out = [];
        $seen = [];
        foreach ($value as $source) {
            if (!is_array($source)) { continue; }
            $providerKey = self::text($source['provider_key'] ?? '');
            $entityType = self::text($source['entity_type'] ?? '');
            $entityId = $source['entity_id'] ?? '';
            if (is_int($entityId)) {
                if ($entityId < 1) { continue; }
            } else {
                $entityId = self::text($entityId);
                if ($entityId === '') { continue; }
            }
            if ($providerKey === '' || $entityType === '') { continue; }
            $identity = $providerKey . ':' . $entityType . ':' . (string) $entityId;
            if (isset($seen[$identity])) { continue; }
            $seen[$identity] = true;
            $relationshipId = self::text($source['relationship_id'] ?? '');
            if ($relationshipId === '') {
                $relationshipId = 'source_' . substr(hash('sha256', $identity), 0, 16);
            }
            $categoryGroupId = self::text($source['category_group_id'] ?? '');
            $out[] = [
                'relationship_id' => $relationshipId,
                'provider_key' => $providerKey,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'sort_order' => count($out),
                'category_group_id' => $categoryGroupId !== '' ? $categoryGroupId : null,
            ];
        }
        return $out;
    }

    /** @return array{selections: array, enabled: bool, contact: bool} */
    public static function emptyTier(): array
    {
        return ['selections' => [], 'enabled' => true, 'contact' => false];
    }

    /**
     * Package-internal source provenance. The shared core never interprets it.
     *
     * @return array{provider_key:string,entity_type:string,entity_id:string|int,item_type:string,item_id:string}|null
     */
    public static function sanitizeSourceRef(mixed $value): ?array
    {
        if (!is_array($value)) {
            return null;
        }
        $providerKey = self::text($value['provider_key'] ?? '');
        $entityType = self::text($value['entity_type'] ?? '');
        $itemType = self::text($value['item_type'] ?? '');
        $itemId = self::text($value['item_id'] ?? '');
        $entityId = $value['entity_id'] ?? '';
        if (is_int($entityId)) {
            if ($entityId < 1) {
                return null;
            }
        } else {
            $entityId = self::text($entityId);
            if ($entityId === '') {
                return null;
            }
        }
        if ($providerKey === '' || $entityType === '' || $itemType === '' || $itemId === '') {
            return null;
        }
        return [
            'provider_key' => $providerKey,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'item_type' => $itemType,
            'item_id' => $itemId,
        ];
    }

    /** Stable Package Rate Sheet identity; provenance never leaves the provider. */
    // ===================================================================
    // SECTION: RATE_SHEET_SCHEMA
    // ===================================================================
    public static function deriveRateSheetItemId(array $source): string
    {
        $source = self::sanitizeSourceRef($source);
        if ($source === null) {
            return '';
        }
        $identity = implode(':', array_map('strval', [
            $source['provider_key'], $source['entity_type'], $source['entity_id'],
            $source['item_type'], $source['item_id'],
        ]));
        return 'rate_' . substr(hash('sha256', $identity), 0, 16);
    }

    /** @return array{title:string,groups:array,items:array}|null */
    public static function sanitizeRateSheet(mixed $value): ?array
    {
        if (!is_array($value)) {
            return null;
        }
        $groups = [];
        $groupIds = [];
        foreach (is_array($value['groups'] ?? null) ? $value['groups'] : [] as $group) {
            if (!is_array($group)) { continue; }
            $id = self::text($group['group_id'] ?? '');
            if ($id === '' || isset($groupIds[$id])) { continue; }
            $groupIds[$id] = true;
            $groups[] = ['group_id' => $id, 'label' => self::text($group['label'] ?? ''), 'sort_order' => count($groups)];
        }
        $items = [];
        $itemIds = [];
        foreach (is_array($value['items'] ?? null) ? $value['items'] : [] as $item) {
            if (!is_array($item)) { continue; }
            $source = self::sanitizeSourceRef($item['source'] ?? null);
            $id = self::text($item['item_id'] ?? '');
            if ($id === '' && $source !== null) { $id = self::deriveRateSheetItemId($source); }
            if ($id === '' || isset($itemIds[$id])) { continue; }
            $itemIds[$id] = true;
            $groupId = self::text($item['group_id'] ?? '');
            $unit = self::text($item['unit'] ?? '');
            $options = [];
            foreach (is_array($item['options'] ?? null) ? $item['options'] : [] as $option) {
                $option = self::text($option);
                if ($option !== '' && !in_array($option, $options, true)) { $options[] = $option; }
            }
            $items[] = [
                'item_id' => $id,
                // Null is retained deliberately: unresolved provenance remains visible.
                'source' => $source,
                'group_id' => $groupId !== '' ? $groupId : null,
                'unit' => $unit,
                'unit_price' => max(0, (float) ($item['unit_price'] ?? 0)),
                'suggested_quantity' => max(1, (int) ($item['suggested_quantity'] ?? 1)),
                'available' => array_key_exists('available', $item) ? (bool) $item['available'] : true,
                'sort_order' => count($items),
                'options' => $options,
            ];
        }
        $title = self::text($value['title'] ?? '');
        return ($title === '' && $groups === [] && $items === []) ? null : compact('title', 'groups', 'items');
    }

    /** @return array<int, array{path:string,message:string}> */
    public static function validateRateSheet(?array $rateSheet): array
    {
        if ($rateSheet === null) { return []; }
        $issues = [];
        if (self::text($rateSheet['title'] ?? '') === '') { $issues[] = ['path' => 'rate_sheet.title', 'message' => 'Rate Sheet title is required.']; }
        $groups = [];
        foreach ($rateSheet['groups'] ?? [] as $index => $group) {
            $id = self::text($group['group_id'] ?? '');
            if ($id === '' || isset($groups[$id])) { $issues[] = ['path' => "rate_sheet.groups.{$index}.group_id", 'message' => 'Group identity must be unique.']; }
            $groups[$id] = true;
            if (self::text($group['label'] ?? '') === '') { $issues[] = ['path' => "rate_sheet.groups.{$index}.label", 'message' => 'Group label is required.']; }
        }
        $items = [];
        foreach ($rateSheet['items'] ?? [] as $index => $item) {
            $id = self::text($item['item_id'] ?? '');
            if ($id === '' || isset($items[$id])) { $issues[] = ['path' => "rate_sheet.items.{$index}.item_id", 'message' => 'Item identity must be unique.']; }
            $items[$id] = true;
            if (($item['source'] ?? null) === null) { $issues[] = ['path' => "rate_sheet.items.{$index}.source", 'message' => 'Canonical source is unresolved.']; }
            if (($item['group_id'] ?? null) !== null && !isset($groups[$item['group_id']])) { $issues[] = ['path' => "rate_sheet.items.{$index}.group_id", 'message' => 'Item group is unresolved.']; }
            if (!in_array($item['unit'] ?? '', self::ALLOWED_UNITS, true)) { $issues[] = ['path' => "rate_sheet.items.{$index}.unit", 'message' => 'Item unit is invalid.']; }
            if (!is_numeric($item['unit_price'] ?? null) || $item['unit_price'] < 0) { $issues[] = ['path' => "rate_sheet.items.{$index}.unit_price", 'message' => 'Unit price must be zero or greater.']; }
            if (!is_int($item['suggested_quantity'] ?? null) || $item['suggested_quantity'] < 1) { $issues[] = ['path' => "rate_sheet.items.{$index}.suggested_quantity", 'message' => 'Suggested quantity must be at least one.']; }
        }
        return $issues;
    }

    /** @return array<int, array{item_id:string,quantity:int,option_selections:array<int,string>}> */
    // ===================================================================
    // SECTION: TIER_PRICING
    // ===================================================================
    public static function sanitizeTierSelections(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }
        $out = [];
        $seen = [];
        foreach ($value as $selection) {
            if (!is_array($selection)) {
                continue;
            }
            $itemId = self::text($selection['item_id'] ?? '');
            if ($itemId === '' || isset($seen[$itemId])) {
                continue;
            }
            $seen[$itemId] = true;
            $options = [];
            foreach (is_array($selection['option_selections'] ?? null) ? $selection['option_selections'] : [] as $option) {
                $option = self::text($option);
                if ($option !== '' && !in_array($option, $options, true)) {
                    $options[] = $option;
                }
            }
            $out[] = [
                'item_id' => $itemId,
                'quantity' => max(1, (int) ($selection['quantity'] ?? 1)),
                'option_selections' => $options,
            ];
        }
        return $out;
    }

    /** @return array<int, array{path:string,message:string}> */
    public static function validateTierSelections(array $rateSheetItems, array $selections): array
    {
        $items = [];
        foreach ($rateSheetItems as $item) { if (is_array($item) && isset($item['item_id'])) { $items[$item['item_id']] = $item; } }
        $issues = [];
        foreach (self::sanitizeTierSelections($selections) as $index => $selection) {
            $item = $items[$selection['item_id']] ?? null;
            if ($item === null) {
                $issues[] = ['path' => "selections.{$index}.item_id", 'message' => 'Rate Sheet item is unresolved.'];
                continue;
            }
            $allowed = $item['options'] ?? [];
            foreach ($selection['option_selections'] as $option) {
                if (!in_array($option, $allowed, true)) { $issues[] = ['path' => "selections.{$index}.option_selections", 'message' => 'Option selection is unresolved.']; }
            }
        }
        return $issues;
    }
    /**
     * Derive a Tier catalogue total while retaining unresolved selections.
     *
     * A resolved subtotal is diagnostic only. Any unresolved selection makes
     * the authoritative catalogue total null rather than silently partial.
     *
     * @return array{total:?float,resolved_subtotal:float,complete:bool,lines:array<int,array>,unresolved:array<int,string>}
     */
    public static function deriveTierTotal(array $rateSheetItems, array $selections): array
    {
        $items = [];
        foreach ($rateSheetItems as $item) {
            if (is_array($item) && self::text($item['item_id'] ?? '') !== '') {
                $items[(string) $item['item_id']] = $item;
            }
        }
        $total = 0.0;
        $lines = [];
        $unresolved = [];
        foreach (self::sanitizeTierSelections($selections) as $selection) {
            $item = $items[$selection['item_id']] ?? null;
            if ($item === null) {
                $unresolved[] = $selection['item_id'];
                $lines[] = ['selection' => $selection, 'resolved' => false, 'line_total' => null];
                continue;
            }
            $lineTotal = (float) ($item['unit_price'] ?? 0) * $selection['quantity'];
            $total += $lineTotal;
            $lines[] = ['selection' => $selection, 'resolved' => true, 'line_total' => $lineTotal];
        }
        $complete = $unresolved === [];
        return [
            'total' => $complete ? $total : null, 'resolved_subtotal' => $total,
            'complete' => $complete, 'lines' => $lines, 'unresolved' => $unresolved,
        ];
    }

    /**
     * Pure live-Tier pricing evaluator. Rate Sheet items own unit prices; Tier
     * selections own quantity and options. Callers decide whether this result
     * is a provisional preview or an authoritative PHP result.
     *
     * @return array{mode:string,total:?float,resolved_subtotal:float,complete:bool,unresolved:array,lines:array}
     */
    public static function evaluateTierPricing(array $rateSheetItems, array $selections, bool $contact = false): array
    {
        $items = [];
        foreach ($rateSheetItems as $index => $item) {
            if (!is_array($item)) { continue; }
            $itemId = self::text($item['item_id'] ?? '');
            if ($itemId !== '' && !isset($items[$itemId])) {
                $items[$itemId] = ['index' => $index, 'item' => $item];
            }
        }

        $lines = [];
        $issues = [];
        $subtotal = 0.0;
        foreach ($selections as $selectionIndex => $selection) {
            if (!is_array($selection)) { continue; }
            $itemId = self::text($selection['item_id'] ?? '');
            $quantity = $selection['quantity'] ?? null;
            $selectedOptions = [];
            foreach (is_array($selection['option_selections'] ?? null) ? $selection['option_selections'] : [] as $option) {
                $selectedOptions[] = self::text($option);
            }

            $entry = $items[$itemId] ?? null;
            $resolved = $entry !== null;
            $available = $resolved && (bool) ($entry['item']['available'] ?? true);
            $allowedOptions = $resolved && is_array($entry['item']['options'] ?? null) ? $entry['item']['options'] : [];
            $optionsValid = $resolved;
            if ($resolved) {
                foreach ($selectedOptions as $option) {
                    if (!in_array($option, $allowedOptions, true)) { $optionsValid = false; break; }
                }
            }
            $quantityValid = is_int($quantity) && $quantity >= 1;
            $rawPrice = $resolved && array_key_exists('unit_price', $entry['item']) ? $entry['item']['unit_price'] : null;
            $pricePresent = $resolved && (is_int($rawPrice) || is_float($rawPrice))
                && is_finite((float) $rawPrice) && $rawPrice >= 0;
            $unitPrice = $pricePresent ? (float) $rawPrice : null;

            $lineIssues = [];
            if (!$resolved) {
                $lineIssues[] = ['code' => 'unresolved_item', 'item_id' => $itemId, 'path' => "selections.{$selectionIndex}.item_id"];
            } else {
                if (!$available) {
                    $lineIssues[] = ['code' => 'unavailable_item', 'item_id' => $itemId, 'path' => "rate_sheet.items.{$entry['index']}.available"];
                }
                if (!$optionsValid) {
                    $lineIssues[] = ['code' => 'invalid_option', 'item_id' => $itemId, 'path' => "selections.{$selectionIndex}.option_selections"];
                }
            }
            if (!$quantityValid) {
                $lineIssues[] = ['code' => 'invalid_quantity', 'item_id' => $itemId, 'path' => "selections.{$selectionIndex}.quantity"];
            }
            if ($resolved && !$pricePresent) {
                $lineIssues[] = ['code' => 'missing_price', 'item_id' => $itemId, 'path' => "rate_sheet.items.{$entry['index']}.unit_price"];
            }

            $valid = $resolved && $available && $optionsValid && $quantityValid && $pricePresent;
            $lineTotal = $valid ? $unitPrice * $quantity : null;
            if ($lineTotal !== null) { $subtotal += $lineTotal; }
            array_push($issues, ...$lineIssues);
            $lines[] = [
                'item_id' => $itemId, 'quantity' => $quantity, 'option_selections' => $selectedOptions,
                'resolved' => $resolved, 'available' => $available, 'options_valid' => $optionsValid,
                'quantity_valid' => $quantityValid, 'price_present' => $pricePresent,
                'unit_price' => $unitPrice, 'line_total' => $lineTotal, 'issues' => $lineIssues,
            ];
        }

        $complete = $issues === [];
        return [
            'mode' => $contact ? 'contact' : 'catalogue',
            'total' => !$contact && $complete ? $subtotal : null,
            'resolved_subtotal' => $subtotal,
            'complete' => $complete,
            'unresolved' => $issues,
            'lines' => $lines,
        ];
    }

    /**
     * Decide whether a Tier may enter an active commercial projection.
     *
     * Contact-only is an explicit pricing mode, not incomplete pricing. It may
     * therefore project a null total, but it cannot conceal broken catalogue
     * references, unavailable items, or invalid option selections.
     *
     * @return array{ready:bool,blockers:array<int,array{code:string,path:string,item_id:?string}>,pricing:array}
     */
    public static function tierActivationReadiness(array $rateSheetItems, array $tier): array
    {
        $selections = self::sanitizeTierSelections($tier['selections'] ?? []);
        $items = [];
        foreach ($rateSheetItems as $item) {
            if (is_array($item) && self::text($item['item_id'] ?? '') !== '') {
                $items[(string) $item['item_id']] = $item;
            }
        }
        $blockers = [];
        if (!($tier['enabled'] ?? false)) {
            $blockers[] = ['code' => 'tier_disabled', 'path' => 'enabled', 'item_id' => null];
        }
        foreach ($selections as $index => $selection) {
            $itemId = $selection['item_id'];
            $item = $items[$itemId] ?? null;
            if ($item === null) {
                $blockers[] = ['code' => 'unresolved_item', 'path' => "selections.{$index}.item_id", 'item_id' => $itemId];
                continue;
            }
            if (!($item['available'] ?? true)) {
                $blockers[] = ['code' => 'unavailable_item', 'path' => "selections.{$index}.item_id", 'item_id' => $itemId];
            }
            foreach ($selection['option_selections'] as $option) {
                if (!in_array($option, $item['options'] ?? [], true)) {
                    $blockers[] = ['code' => 'invalid_option', 'path' => "selections.{$index}.option_selections", 'item_id' => $itemId];
                    break;
                }
            }
        }
        $pricing = self::deriveTierTotal($rateSheetItems, $selections);
        $contact = (bool) ($tier['contact'] ?? false);
        if (!$contact && !$pricing['complete']) {
            $blockers[] = ['code' => 'incomplete_pricing', 'path' => 'pricing.total', 'item_id' => null];
        }
        return ['ready' => $blockers === [], 'blockers' => $blockers, 'pricing' => $pricing];
    }

    /**
     * Pure commercial projection. Internal source provenance and diagnostic
     * partial subtotals never cross this boundary.
     *
     * @return array{active:bool,blockers:array,projection:?array}
     */
    // ===================================================================
    // SECTION: COMMERCIAL_PROJECTION
    // ===================================================================
    public static function projectActiveCommercialPackage(array $station): array
    {
        $packageActive = ($station['lifecycle']['status'] ?? 'disabled') === 'active';
        $items = is_array($station['rate_sheet']['items'] ?? null) ? $station['rate_sheet']['items'] : [];
        $tiers = [];
        $blockers = [];
        foreach (self::FIXED_TIERS as $tierId) {
            $tier = is_array($station['tiers'][$tierId] ?? null) ? $station['tiers'][$tierId] : self::emptyTier();
            $readiness = self::tierActivationReadiness($items, $tier);
            if (!$readiness['ready']) {
                $blockers[$tierId] = $readiness['blockers'];
                continue;
            }
            $contact = (bool) ($tier['contact'] ?? false);
            $tiers[$tierId] = [
                'tier_id' => $tierId,
                'selections' => self::sanitizeTierSelections($tier['selections'] ?? []),
                'pricing' => ['mode' => $contact ? 'contact' : 'catalogue', 'total' => $contact ? null : $readiness['pricing']['total']],
            ];
        }
        if (!$packageActive) {
            $blockers['package'][] = ['code' => 'package_inactive', 'path' => 'lifecycle.status', 'item_id' => null];
        }
        if ($tiers === []) {
            $blockers['package'][] = ['code' => 'no_ready_tiers', 'path' => 'tiers', 'item_id' => null];
        }
        $active = $packageActive && $tiers !== [];
        return [
            'active' => $active,
            'blockers' => $blockers,
            'projection' => $active ? ['tiers' => $tiers, 'popular_tier' => isset($tiers[$station['popular_tier'] ?? '']) ? $station['popular_tier'] : null] : null,
        ];
    }
    private static function text(mixed $value): string
    {
        return trim(strip_tags((string) $value));
    }
}
