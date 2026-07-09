<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Support;

/**
 * Tier Pricing Usage calculation preview — pure derive function implementing
 * the audited truth table for Package Pricing Board + Tier Pricing Usage.
 *
 * Backend-owned platform contract logic (Phase F): the truth table is
 * implemented once here so that future consumers (Cost Builder, n8n gateway,
 * Bundle/Subscription/Custom Plan usage) can reuse it without reimplementing
 * it differently. Today it is exposed through the admin read model only
 * (AdminServicesController::getPackageStation) — no public read path, no
 * write into tier.price, no Cost Builder wiring.
 *
 * Pure: array in, array out. No WP calls, no side effects, no persistence.
 */
class PricingPreview
{
    /**
     * @param  array{enabled: bool, items: array<int, array<string, mixed>>} $pricingBoard
     *         Reconciled pricing_board (PackageSchema::seedAndReconcilePricingBoard output).
     * @param  array{pricing_mode: string, usage: array<int, array<string, mixed>>} $tierPricing
     *         A tier's settled `pricing` record (or the draft-preferred equivalent).
     * @return array{
     *     total: float|null,
     *     complete: bool,
     *     incomplete_count: int,
     *     issues: array<int, array{inclusion_id: string, reason: string}>,
     *     status: string,
     *     pricing_mode: string
     * }
     */
    public static function derive(array $pricingBoard, array $tierPricing): array
    {
        $mode = (($tierPricing['pricing_mode'] ?? 'manual') === 'calculated') ? 'calculated' : 'manual';

        // board.enabled is the package-level master switch — when off, nothing
        // calculates, regardless of tier pricing_mode or item-level data.
        if (empty($pricingBoard['enabled'])) {
            return [
                'total'            => null,
                'complete'         => false,
                'incomplete_count' => 0,
                'issues'           => [],
                'status'           => 'board_disabled',
                'pricing_mode'     => $mode,
            ];
        }

        $boardById = [];
        foreach (($pricingBoard['items'] ?? []) as $item) {
            if (is_array($item) && !empty($item['inclusion_id'])) {
                $boardById[(string) $item['inclusion_id']] = $item;
            }
        }

        $total           = 0.0;
        $completeCount   = 0;
        $incompleteCount = 0;
        $issues          = [];

        foreach (($tierPricing['usage'] ?? []) as $row) {
            if (!is_array($row) || empty($row['inclusion_id'])) {
                continue;
            }
            $inclusionId = (string) $row['inclusion_id'];

            // usage item enabled = false → excluded, silently (an intentional
            // toggle-off is not an incompleteness problem).
            if (empty($row['enabled'])) {
                continue;
            }

            $board = $boardById[$inclusionId] ?? null;
            if ($board === null) {
                // Stale/missing inclusion ref — flagged, never silently dropped.
                $issues[] = ['inclusion_id' => $inclusionId, 'reason' => 'missing_inclusion'];
                $incompleteCount++;
                continue;
            }

            // Disabled board item = excluded, silently (same as usage-level disable).
            if (empty($board['enabled'])) {
                continue;
            }

            $basePrice = $board['base_price'] ?? null;
            if ($basePrice === null) {
                $issues[] = ['inclusion_id' => $inclusionId, 'reason' => 'missing_base_price'];
                $incompleteCount++;
                continue;
            }

            $quantityEnabled = !empty($board['quantity_enabled']);
            $quantity        = $row['quantity'] ?? null;
            if ($quantityEnabled && $quantity === null) {
                $issues[] = ['inclusion_id' => $inclusionId, 'reason' => 'missing_quantity'];
                $incompleteCount++;
                continue;
            }

            $lineQuantity = $quantityEnabled ? (float) $quantity : 1.0;
            $total        += (float) $basePrice * $lineQuantity;
            $completeCount++;
        }

        // No complete calculated items → total is null, never 0 (truth table).
        // 'no_items' is reserved for truly nothing to calculate (no considered
        // rows at all — empty usage, or every row silently excluded); a row
        // that WAS considered but incomplete is 'incomplete', not 'no_items',
        // even when zero rows ended up complete.
        $status = ($completeCount === 0 && $incompleteCount === 0)
            ? 'no_items'
            : ($incompleteCount > 0 ? 'incomplete' : 'ready');

        return [
            'total'            => $completeCount > 0 ? $total : null,
            'complete'         => $completeCount > 0 && $incompleteCount === 0,
            'incomplete_count' => $incompleteCount,
            'issues'           => $issues,
            'status'           => $status,
            'pricing_mode'     => $mode,
        ];
    }
}
