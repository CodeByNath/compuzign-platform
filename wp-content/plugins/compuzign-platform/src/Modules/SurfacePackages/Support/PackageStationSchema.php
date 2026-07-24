<?php

/*
 * FILE INDEX
 *
 * SOURCE_RELATIONSHIPS  Package-owned supply relationship sanitisation
 * TIER_PRICING          Pure live-Tier pricing evaluator
 *
 * Search: SECTION: SOURCE_RELATIONSHIPS
 *         SECTION: TIER_PRICING
 */

namespace CompuZign\Platform\Modules\SurfacePackages\Support;

/**
 * Package-owned supply-relationship and Tier-pricing helpers.
 *
 * ARCHITECTURE LOCK: Service is the only canonical WordPress content entity.
 * Package source relationships and Tier pricing are provider-owned domain
 * models. This class makes no post type, postmeta, route, registration, or
 * storage-engine assumption.
 *
 * SCOPE: authoritative Package Station shape, Rate Sheet sanitisation/validation,
 * and commercial projection are owned by PackageManagerSchema, PackageSchema, and
 * PackageRepository — NOT here. This class holds only the two pure helpers those
 * modules consume: source-relationship sanitisation and the Tier pricing
 * evaluator. It performs no registration or I/O.
 */
final class PackageStationSchema
{
    // ===================================================================
    // SECTION: SOURCE_RELATIONSHIPS
    // ===================================================================

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

    /**
     * Pure live-Tier pricing evaluator. Rate Sheet items own unit prices; Tier
     * selections own quantity and options. Callers decide whether this result
     * is a provisional preview or an authoritative PHP result.
     *
     * @return array{mode:string,total:?float,resolved_subtotal:float,complete:bool,unresolved:array,lines:array}
     */
    // ===================================================================
    // SECTION: TIER_PRICING
    // ===================================================================
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

    private static function text(mixed $value): string
    {
        return trim(strip_tags((string) $value));
    }
}
