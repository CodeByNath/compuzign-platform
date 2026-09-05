<?php

namespace CompuZign\Platform\Modules\Requests\Notifications;

class NotificationTemplates
{
    /**
     * Groups item prices by billing cycle; counts unpriced items.
     *
     * @param  array<int, array<string, mixed>> $items
     * @return array{cycleGroups: array<string, float>, unpricedCount: int}
     */
    public static function calcTotals(array $items): array
    {
        $cycleGroups   = [];
        $unpricedCount = 0;

        foreach ($items as $item) {
            if ($item['price'] === null) {
                $unpricedCount++;
                continue;
            }
            $cycle               = $item['billingCycle'] ?: 'one-time';
            $cycleGroups[$cycle] = ($cycleGroups[$cycle] ?? 0.0) + (float) $item['price'];
        }

        return ['cycleGroups' => $cycleGroups, 'unpricedCount' => $unpricedCount];
    }

    /**
     * Builds the <tr> rows for the service table used in both email
     * templates — legacy/non-Family lines only (normal Tier/promotion,
     * legacy recommended bundle, Tier add-on). Family lines have their own
     * dedicated renderer (see emailFamilyRows()) since Phase 8J-B, so this
     * never receives an item with offer_type === 'family_tier'.
     *
     * @param array<int, array<string, mixed>> $items
     */
    public static function emailServiceRows(array $items): string
    {
        $html = '';

        foreach ($items as $item) {
            $price   = $item['price'] !== null
                ? '$' . number_format((float) $item['price'], 2)
                : 'Custom pricing';
            $cycle   = $item['billingCycle'] !== '' ? ' / ' . ucfirst((string) $item['billingCycle']) : '';
            $isAddon = !empty($item['isAddon']) || (int) ($item['serviceId'] ?? 0) < 0;
            $isPromo = ($item['offer_type'] ?? '') === 'promotion_tier';
            $badge   = $isAddon
                ? ' <span style="font-size:10px;background:#f0f0f0;padding:1px 6px;border-radius:8px;color:#888;">add-on</span>'
                : '';
            $title   = esc_html((string) ($item['serviceTitle'] ?? ''));
            $tier    = esc_html((string) $item['tierTitle']);

            if ($isPromo) {
                $billingLabel = esc_html((string) ($item['billing_label'] ?? $item['billingCycle'] ?? ''));
                $tierLine     = $billingLabel !== '' ? "{$tier} &nbsp;·&nbsp; {$billingLabel}" : $tier;
                $promoBadge   = ' <span style="font-size:10px;background:#fff8d6;padding:1px 6px;border-radius:8px;color:#7a5d00;">promo</span>';
            } else {
                $billing  = $item['billingCycle'] !== '' ? 'Billed ' . esc_html(ucfirst((string) $item['billingCycle'])) : '';
                $tierLine = $tier !== '' ? "{$tier} tier &nbsp;·&nbsp; {$billing}" : $billing;
                $promoBadge = '';
            }

            $html .= "
              <tr>
                <td style=\"padding:11px 14px;border-bottom:1px solid #f0f0f0;\">
                  <div style=\"font-size:13px;font-weight:600;color:#111;\">{$title}{$badge}{$promoBadge}</div>
                  <div style=\"font-size:11px;color:#999;margin-top:2px;\">{$tierLine}</div>
                </td>
                <td style=\"padding:11px 14px;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap;\">
                  <span style=\"font-size:14px;font-weight:700;color:#111;\">{$price}</span>
                  <span style=\"font-size:11px;color:#999;\">{$cycle}</span>
                </td>
              </tr>";
        }

        return $html;
    }

    /**
     * Builds the totals block (border-top + one row per billing cycle).
     *
     * @param array{cycleGroups: array<string, float>, unpricedCount: int} $totals
     */
    public static function emailTotalsBlock(array $totals): string
    {
        if (empty($totals['cycleGroups'])) {
            return '
              <tr>
                <td style="padding:0 28px 24px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                         style="border-top:2px solid #111;padding-top:12px;">
                    <tr>
                      <td style="font-size:13px;color:#666;">Pricing on request</td>
                      <td style="text-align:right;font-size:16px;font-weight:700;color:#111;">Contact Us</td>
                    </tr>
                  </table>
                </td>
              </tr>';
        }

        $rows = '';

        foreach ($totals['cycleGroups'] as $cycle => $amount) {
            $label  = esc_html(ucfirst((string) $cycle));
            $suffix = $cycle !== 'one-time' ? ' / ' . esc_html(ucfirst((string) $cycle)) : '';
            $rows  .= "
                <tr>
                  <td style=\"padding:10px 0;\">
                    <span style=\"font-size:13px;color:#666;\">Estimated {$label} total</span>
                  </td>
                  <td style=\"text-align:right;padding:10px 0;\">
                    <span style=\"font-size:22px;font-weight:800;color:#111;\">\$" . number_format($amount, 2) . "</span>
                    <span style=\"font-size:12px;color:#999;\">{$suffix}</span>
                  </td>
                </tr>";
        }

        if ($totals['unpricedCount'] > 0) {
            $n     = (int) $totals['unpricedCount'];
            $rows .= "
                <tr>
                  <td colspan=\"2\" style=\"padding:4px 0;\">
                    <span style=\"font-size:11px;color:#999;font-style:italic;\">
                      + {$n} item(s) at custom pricing — included in our proposal response.
                    </span>
                  </td>
                </tr>";
        }

        return "
          <tr>
            <td style=\"padding:0 28px 24px;\">
              <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\"
                     style=\"border-top:2px solid #111;padding-top:8px;\">
                {$rows}
              </table>
            </td>
          </tr>";
    }

    /**
     * True for a Package Family quote line — no serviceId, keyed instead by
     * Family/Tier Instance/occupant Platform IDs (see RequestSchema).
     *
     * @param array<string, mixed> $item
     */
    private static function isFamilyItem(array $item): bool
    {
        return ($item['offer_type'] ?? '') === 'family_tier';
    }

    /**
     * The one place that resolves primary/addon/composable for a stored
     * Family item — mirrors resolveQuoteItemRole() in utils/quote.ts (the TS
     * side's own single source of truth) so this PHP port never scatters a
     * raw `!isAddon` assumption anywhere else. Composable is checked first:
     * RequestSchema::sanitizeItems() already guarantees the two flags are
     * never both true on a stored line, but a role reader still resolves
     * deterministically rather than assuming that invariant holds.
     *
     * @param array<string, mixed> $item
     */
    private static function resolveItemRole(array $item): string
    {
        if (!empty($item['isComposable'])) {
            return 'composable';
        }

        return !empty($item['isAddon']) ? 'addon' : 'primary';
    }

    /**
     * PHP port of familyTierSystemKey() in utils/quote.ts.
     *
     * @param array<string, mixed> $item
     */
    private static function familyTierSystemKey(array $item): string
    {
        return 'family:' . ($item['familyPlatformId'] ?? '') . ':instance:' . ($item['tierInstancePlatformId'] ?? '');
    }

    /**
     * PHP port of composableCoexistsWithPrimary() in utils/quote.ts — deployed
     * live-gate correction (2026-09-05): the customer confirmation email had
     * no equivalent of the TS resolver at all, so a composable ("Build Your
     * Own") item reached via the "upgrade your build" entry point still
     * rendered its standalone identity/badge here even when the same email's
     * cart/PDF surfaces had already been corrected to show "Upgrades". True
     * when $item has a sibling primary Family item for the same
     * Family+Tier-Instance among $familyMainItems.
     *
     * @param array<string, mixed> $item
     * @param array<int, array<string, mixed>> $familyMainItems
     */
    private static function composableCoexistsWithPrimary(array $item, array $familyMainItems): bool
    {
        $systemKey = self::familyTierSystemKey($item);

        foreach ($familyMainItems as $primary) {
            if (self::familyTierSystemKey($primary) === $systemKey) {
                return true;
            }
        }

        return false;
    }

    /**
     * The same six never-merged cart-line classifications
     * quote.ts's classifyQuoteItems() defines for the browser (customer's
     * one normal Tier/promotion per Service, the legacy recommended bundle,
     * real Tier add-ons, and Family main/add-on/composable lines) — reused
     * here so the email groups and orders its sections identically to
     * OrderSummary.tsx / QuoteProposalPreview.tsx, never a second/diverging
     * classification.
     *
     * @param  array<int, array<string, mixed>> $items
     * @return array{mainItems: array<int, array<string, mixed>>, bundleItems: array<int, array<string, mixed>>, tierAddonItems: array<int, array<string, mixed>>, familyMainItems: array<int, array<string, mixed>>, familyAddonItems: array<int, array<string, mixed>>, familyComposableItems: array<int, array<string, mixed>>}
     */
    private static function classifyQuoteItems(array $items): array
    {
        $serviceItems = array_values(array_filter($items, fn (array $item) => !self::isFamilyItem($item)));
        $familyItems  = array_values(array_filter($items, fn (array $item) => self::isFamilyItem($item)));

        return [
            'mainItems'             => array_values(array_filter($serviceItems, fn (array $item) => (int) ($item['serviceId'] ?? 0) > 0 && empty($item['isAddon']))),
            'bundleItems'           => array_values(array_filter($serviceItems, fn (array $item) => (int) ($item['serviceId'] ?? 0) < 0)),
            'tierAddonItems'        => array_values(array_filter($serviceItems, fn (array $item) => !empty($item['isAddon']))),
            'familyMainItems'       => array_values(array_filter($familyItems, fn (array $item) => self::resolveItemRole($item) === 'primary')),
            'familyAddonItems'      => array_values(array_filter($familyItems, fn (array $item) => self::resolveItemRole($item) === 'addon')),
            'familyComposableItems' => array_values(array_filter($familyItems, fn (array $item) => self::resolveItemRole($item) === 'composable')),
        ];
    }

    /**
     * PricingTiers.tsx's chargeTypeLabel() — the accepted human label for one
     * Leg payment stream's billing cycle, reused verbatim rather than a
     * second/diverging label map.
     */
    private static function chargeTypeLabel(?string $cycle): string
    {
        if ($cycle === null) {
            return 'Payment';
        }

        $labels = [
            'monthly'   => 'Monthly',
            'annual'    => 'Yearly',
            'annually'  => 'Yearly',
            'quarterly' => 'Quarterly',
            'upfront'   => 'Upfront',
            'one-time'  => 'One-time',
        ];

        return $labels[$cycle] ?? 'Payment';
    }

    /**
     * PricingTiers.tsx's computeTotalContractValue() — null the instant any
     * stream's own subtotal is null (a genuinely open-ended stream), never
     * approximated as a finite figure.
     *
     * @param array<int, array<string, mixed>> $summaries
     */
    private static function computeTotalContractValue(array $summaries): ?float
    {
        $total = 0.0;
        foreach ($summaries as $summary) {
            if ($summary['subtotal'] === null) {
                return null;
            }
            $total += (float) $summary['subtotal'];
        }

        return $total;
    }

    /**
     * PricingTiers.tsx's startingPaymentsByCycle() — each item's own earliest
     * resolved startMonth, summed same-cycle across items, kept strictly
     * separate across different cycles (never a cross-cycle sum).
     *
     * @param  array<int, array<int, array<string, mixed>>> $itemStreams
     * @return array<int, array{0: string, 1: float}>
     */
    private static function startingPaymentsByCycle(array $itemStreams): array
    {
        $order  = [];
        $totals = [];

        foreach ($itemStreams as $streams) {
            if ($streams === []) {
                continue;
            }
            $earliestStart = min(array_map(fn (array $s) => (int) $s['startMonth'], $streams));
            foreach ($streams as $stream) {
                if ((int) $stream['startMonth'] !== $earliestStart || $stream['price'] === null || $stream['billingCycle'] === null) {
                    continue;
                }
                $cycle = $stream['billingCycle'];
                if (!isset($totals[$cycle])) {
                    $order[]        = $cycle;
                    $totals[$cycle] = 0.0;
                }
                $totals[$cycle] += (float) $stream['price'];
            }
        }

        return array_map(fn (string $cycle) => [$cycle, $totals[$cycle]], $order);
    }

    /**
     * OrderSummary.tsx's/QuoteProposalPreview.tsx's FamilyInclusionsList —
     * the item's own snapshotted inclusionItems (Bundle parents with their
     * `includes` children) when present, or a plain-label fallback built
     * from `features` for a pre-Phase-8G Family snapshot that predates
     * inclusionItems entirely. Never re-resolved from live catalog data.
     *
     * @param  array<string, mixed> $item
     * @return array<int, array<string, mixed>>
     */
    private static function familyDisplayInclusions(array $item): array
    {
        $inclusionItems = $item['inclusionItems'] ?? null;
        if (is_array($inclusionItems) && $inclusionItems !== []) {
            return $inclusionItems;
        }

        $features = $item['features'] ?? [];
        if (!is_array($features) || $features === []) {
            return [];
        }

        return array_map(fn ($label) => ['id' => '', 'label' => (string) $label], $features);
    }

    /**
     * The inclusion list rows beneath a Family service row — a Bundle parent
     * stays a quantity-less section label (matches the accepted card/proposal
     * treatment), an ordinary inclusion shows its snapshot quantity, and
     * Bundle children render indented beneath their parent.
     *
     * @param array<int, array<string, mixed>> $inclusionItems
     */
    private static function emailInclusionItemsList(array $inclusionItems): string
    {
        if ($inclusionItems === []) {
            return '';
        }

        $rows = '';
        foreach ($inclusionItems as $inclusion) {
            $label = esc_html((string) ($inclusion['label'] ?? ''));
            if (!empty($inclusion['bundle_id'])) {
                $rows .= "
                    <tr><td colspan=\"2\" style=\"padding:4px 0 4px 14px;font-size:11px;font-weight:700;color:#666;\">{$label}</td></tr>";
            } else {
                $qty = isset($inclusion['quantity']) ? esc_html((string) $inclusion['quantity']) : '';
                $rows .= "
                    <tr>
                      <td style=\"padding:3px 0 3px 14px;font-size:11px;color:#777;\">{$label}</td>
                      <td style=\"padding:3px 0;font-size:11px;color:#777;text-align:right;\">{$qty}</td>
                    </tr>";
            }
            foreach ($inclusion['includes'] ?? [] as $child) {
                $childLabel = esc_html((string) ($child['label'] ?? ''));
                $childQty   = isset($child['quantity']) ? esc_html((string) $child['quantity']) : '';
                $rows .= "
                    <tr>
                      <td style=\"padding:3px 0 3px 28px;font-size:11px;color:#999;\">{$childLabel}</td>
                      <td style=\"padding:3px 0;font-size:11px;color:#999;text-align:right;\">{$childQty}</td>
                    </tr>";
            }
        }

        // Live-gate correction (2026-09-05, "Customer email structure"): this
        // wrapper <td> is always the LAST visible row of its own Family
        // item's block (header row above it, then this) — the boundary line
        // between one quoted item and the next belongs here, not on the
        // header row above (see emailFamilyRow()'s own correction comment).
        return "
          <tr><td colspan=\"2\" style=\"padding:0 14px 10px;border-bottom:1px solid #f0f0f0;\">
            <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">{$rows}</table>
          </td></tr>";
    }

    /**
     * @param array<int, array<string, mixed>> $inclusions
     */
    private static function emailBreakdownInclusionRows(array $inclusions, int $depth = 0): string
    {
        $indent = 14 + ($depth * 14);
        $color  = $depth === 0 ? '#777' : '#999';
        $rows   = '';
        foreach ($inclusions as $inclusion) {
            $label = esc_html((string) ($inclusion['label'] ?? ''));

            // Live-gate correction (2026-09-05, "leg-level breakdown
            // presentation"): unit price is a distinct fact from line
            // total (quantity * unit) — e.g. Static IP Block qty 2 reads
            // "Qty 2 · $40.00 ea. · $80.00", never collapsed into one
            // figure, matching disclosureRowsForFamilyTierItem()'s
            // Unit price/Line total columns.
            $parts = [];
            if (isset($inclusion['quantity'])) {
                $parts[] = 'Qty ' . esc_html((string) $inclusion['quantity']);
            }
            if (isset($inclusion['unitPrice']) && $inclusion['unitPrice'] !== null) {
                $parts[] = '$' . number_format((float) $inclusion['unitPrice'], 2) . ' ea.';
            }
            if (isset($inclusion['lineTotal']) && $inclusion['lineTotal'] !== null) {
                $parts[] = '<strong style="color:#111;">$' . number_format((float) $inclusion['lineTotal'], 2) . '</strong>';
            }
            $qtyPrice = implode(' &middot; ', $parts);

            $rows .= "
                <tr>
                  <td style=\"padding:3px 0 3px {$indent}px;font-size:11px;color:{$color};\">{$label}</td>
                  <td style=\"padding:3px 0;font-size:11px;color:{$color};text-align:right;\">{$qtyPrice}</td>
                </tr>";
            $children = (array) ($inclusion['includes'] ?? []);
            if ($children !== []) {
                $rows .= self::emailBreakdownInclusionRows($children, $depth + 1);
            }
        }

        return $rows;
    }

    /**
     * PlanDetailsModal.tsx's/@/utils/commercialLegPresentation's own
     * PLAN_BILLING_CYCLE_LABELS — a deliberately separate word map from
     * chargeTypeLabel() above ("Annual", not "Yearly"; chargeTypeLabel()
     * stays reserved for the legPaymentSummaries stream block, an unrelated
     * surface this correction doesn't touch). Only the Billing Breakdown by
     * Period section (emailPeriodBreakdownRows() below) uses this wording,
     * matching PlanDetailsModal.tsx's own Frequency labels exactly.
     */
    private static function frequencyLabel(?string $cycle): string
    {
        if ($cycle === null) {
            return 'Payment';
        }

        $labels = [
            'monthly'   => 'Monthly',
            'annual'    => 'Annual',
            'annually'  => 'Annual',
            'quarterly' => 'Quarterly',
            'one-time'  => 'One-time',
            'upfront'   => 'Upfront',
        ];

        return $labels[$cycle] ?? 'Payment';
    }

    /**
     * PlanDetailsModal.tsx's/@/utils/commercialLegPresentation's own
     * paymentCategoryLabel() — billing_cycle-derived Fixed/Recurring
     * synthesis, reused verbatim rather than a second/diverging rule.
     */
    private static function paymentCategoryLabel(?string $cycle): string
    {
        if ($cycle === null) {
            return 'Payment';
        }

        return ($cycle === 'one-time' || $cycle === 'upfront') ? 'Fixed payment' : 'Recurring payment';
    }

    /**
     * PlanDetailsModal.tsx's/@/utils/commercialLegPresentation's own
     * billingSuffixLong() — the long-form cadence suffix ("/ month", "/
     * year") this section's wording needs, distinct from chargeTypeLabel()'s
     * word-first convention used elsewhere in this file.
     */
    private static function billingSuffixLong(?string $cycle): string
    {
        if ($cycle === null) {
            return '';
        }

        $suffixes = [
            'monthly'   => '/ month',
            'annual'    => '/ year',
            'annually'  => '/ year',
            'quarterly' => '/ quarter',
            'upfront'   => '/ upfront',
            'one-time'  => '/ once',
        ];

        return $suffixes[$cycle] ?? '';
    }

    /**
     * PlanDetailsModal.tsx's/@/utils/commercialLegPresentation's own
     * priceWithCadence() — cents-precise price plus the long-form cadence
     * suffix, e.g. "$156.50 / month".
     */
    private static function priceWithCadence(?float $price, ?string $cycle): string
    {
        $suffix = self::billingSuffixLong($cycle);
        $formatted = $price !== null ? '$' . number_format($price, 2) : '—';

        return $suffix !== '' ? $formatted . ' ' . $suffix : $formatted;
    }

    /**
     * PlanDetailsModal.tsx's/@/utils/commercialLegPresentation's own
     * customerFacingRange() — "Plan start" replaces a raw Month 0 (which
     * otherwise reads as an extra month inside the range), the end side
     * stays a real month number or "Ongoing" for a still-open range.
     */
    private static function customerFacingRange(int $from, ?int $to): string
    {
        $startsAtPlanStart = $from === 0;
        $startLabel = $startsAtPlanStart ? 'Plan start' : ('Month ' . $from);
        $endLabel = $to === null ? 'Ongoing' : ($startsAtPlanStart ? ('Month ' . $to) : (string) $to);

        return $startLabel . '–' . $endLabel;
    }

    /**
     * @/utils/commercialLegPresentation's own componentTotalValue() —
     * a null lineTotal on any inclusion (including Bundle children) means
     * that component's own total is genuinely unresolved — never silently
     * skipped into a partial sum that reads as the real total.
     *
     * @param array<int, array<string, mixed>> $inclusions
     */
    private static function emailComponentTotal(array $inclusions): string
    {
        foreach ($inclusions as $item) {
            if (!isset($item['lineTotal']) || $item['lineTotal'] === null) {
                return 'To be confirmed';
            }
        }
        $total = array_sum(array_map(fn (array $item) => (float) $item['lineTotal'], $inclusions));

        return '$' . number_format($total, 2);
    }

    /**
     * Auditor correction (2026-09-05, "leg-level breakdown presentation
     * customer view"): renders the commercialBreakdown snapshot as
     * PlanDetailsModal.tsx's own Billing Breakdown by Period — a Period
     * heading, a payment-timing note per component when it's continuing
     * unchanged or sharing the Period with another active component, and
     * the component's own inclusion table SUPPRESSED when it's continuing
     * unchanged from the immediately preceding Period (continuesFromPrevious,
     * computed once by the browser at capture time — see
     * RequestSchema::sanitizeCommercialBreakdown()'s own docblock). Replaces
     * the earlier Period/cadence-collision-disambiguated section model,
     * which the auditor rejected as a raw pricing dump rather than the
     * established customer "View Details" experience. emailFamilyRow()
     * falls back to emailInclusionItemsList()/familyDisplayInclusions()
     * (both unchanged) when this returns '' — a pre-existing Request, or
     * one with no resolved commercial_legs at all.
     *
     * @param array<int, array<string, mixed>> $breakdown sanitized commercialBreakdown — RequestSchema::sanitizeCommercialBreakdown()
     */
    private static function emailPeriodBreakdownRows(array $breakdown): string
    {
        if ($breakdown === []) {
            return '';
        }

        $rows = '';
        foreach ($breakdown as $period) {
            $components = (array) ($period['components'] ?? []);
            if ($components === []) {
                continue;
            }
            $fromMonth = (int) ($period['fromMonth'] ?? 0);
            $toMonth   = $period['toMonth'] ?? null;
            $rangeLabel = esc_html(self::customerFacingRange($fromMonth, $toMonth === null ? null : (int) $toMonth));
            $rows .= "
                <tr><td colspan=\"2\" style=\"padding:8px 0 2px 14px;font-size:12px;font-weight:700;color:#333;\">{$rangeLabel}</td></tr>";

            $collision = count($components) > 1;
            $recurringCostLine = esc_html(implode(' + ', array_map(
                fn (array $c) => self::priceWithCadence(
                    isset($c['price']) && $c['price'] !== null ? (float) $c['price'] : null,
                    $c['billingCycle'] ?? null
                ),
                $components
            )));
            $factLabel = $collision ? 'Active payments' : self::paymentCategoryLabel($components[0]['billingCycle'] ?? null);
            $rows .= "
                <tr><td colspan=\"2\" style=\"padding:2px 0 2px 14px;font-size:11px;color:#777;\"><strong>{$factLabel}:</strong> {$recurringCostLine}</td></tr>";

            foreach ($components as $component) {
                $continuing = !empty($component['continuesFromPrevious']);
                if (!$collision && !$continuing) {
                    continue;
                }
                $cadenceLabel = esc_html(self::frequencyLabel($component['billingCycle'] ?? null) . ' payment');
                $priceLabel = self::priceWithCadence(
                    isset($component['price']) && $component['price'] !== null ? (float) $component['price'] : null,
                    $component['billingCycle'] ?? null
                );
                $statusText = $continuing
                    ? ('Continues unchanged at ' . $priceLabel)
                    : ('Begins in Month ' . $fromMonth . ' at ' . $priceLabel);
                $statusText = esc_html($statusText);
                $rows .= "
                    <tr><td colspan=\"2\" style=\"padding:2px 0 2px 14px;font-size:11px;color:#999;\"><strong>{$cadenceLabel}:</strong> {$statusText}</td></tr>";
            }

            foreach ($components as $component) {
                if (!empty($component['continuesFromPrevious'])) {
                    continue; // already shown, unchanged, last Period — no repeated table
                }
                $inclusions = (array) ($component['inclusions'] ?? []);
                if ($inclusions === []) {
                    continue;
                }
                if ($collision) {
                    $tableLabel = esc_html(self::frequencyLabel($component['billingCycle'] ?? null) . ' payment breakdown:');
                    $rows .= "
                        <tr><td colspan=\"2\" style=\"padding:4px 0 2px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:#888;\">{$tableLabel}</td></tr>";
                }
                $rows .= self::emailBreakdownInclusionRows($inclusions);
                $totalLabel = esc_html(self::frequencyLabel($component['billingCycle'] ?? null) . ' total');
                $totalValue = self::emailComponentTotal($inclusions);
                $rows .= "
                    <tr><td colspan=\"2\" style=\"padding:2px 0 4px 14px;font-size:11px;font-weight:700;color:#333;\">{$totalLabel}: {$totalValue}</td></tr>";
            }
        }

        if ($rows === '') {
            return '';
        }

        return "
          <tr><td colspan=\"2\" style=\"padding:0 14px 10px;border-bottom:1px solid #f0f0f0;\">
            <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\">{$rows}</table>
          </td></tr>";
    }

    /**
     * A Family item's own price cell — its snapshotted legPaymentSummaries
     * rendered as separate payment streams plus a finite Total when every
     * stream resolves one (OrderSummary.tsx's/QuoteProposalPreview.tsx's
     * per-item stream block), or the plain headline price/billingCycle for
     * an item with no streams at all (a pre-Phase-5 Family snapshot, or a
     * quoted option with no resolved commercial_legs).
     *
     * @param array<string, mixed> $item
     */
    private static function emailFamilyStreamsBlock(array $item): string
    {
        $streams = $item['legPaymentSummaries'] ?? null;
        if (!is_array($streams) || $streams === []) {
            $price = $item['price'] !== null ? '$' . number_format((float) $item['price'], 2) : 'Custom pricing';
            $cycle = $item['billingCycle'] !== '' ? ' / ' . ucfirst((string) $item['billingCycle']) : '';

            return "<span style=\"font-size:14px;font-weight:700;color:#111;\">{$price}</span>"
                . "<span style=\"font-size:11px;color:#999;\">{$cycle}</span>";
        }

        $rows = '';
        foreach ($streams as $stream) {
            $label = esc_html(self::chargeTypeLabel($stream['billingCycle']));
            $value = $stream['price'] !== null ? '$' . number_format((float) $stream['price'], 2) : 'Custom pricing';
            $rows .= "
                <tr>
                  <td style=\"padding:2px 0;font-size:11px;color:#999;text-align:right;\">{$label}</td>
                  <td style=\"padding:2px 0 2px 8px;font-size:12px;font-weight:600;color:#111;text-align:right;\">{$value}</td>
                </tr>";
        }

        $total = self::computeTotalContractValue($streams);
        if ($total !== null) {
            $rows .= "
                <tr>
                  <td style=\"padding:4px 0 0;font-size:11px;font-weight:700;color:#666;border-top:1px solid #eee;text-align:right;\">Total</td>
                  <td style=\"padding:4px 0 0 8px;font-size:13px;font-weight:800;color:#111;border-top:1px solid #eee;text-align:right;\">\$" . number_format($total, 2) . "</td>
                </tr>";
        }

        return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-left:auto;\">{$rows}</table>";
    }

    /**
     * One Family line's full <tr> (+ inclusion rows) — human Family/Tier/
     * Edition labels always; snapshotted payment streams and structured
     * inclusions when present; raw CZ Platform IDs only when
     * $includeInternalIds is true (admin email — see buildAdminHtmlEmail()
     * vs buildCustomerHtmlEmail()). A legacy Family snapshot missing
     * tierEditionTitle/inclusionItems/legPaymentSummaries falls back to the
     * same headline price/features rendering it always had.
     *
     * @param array<string, mixed> $item
     * @param string $role 'primary' | 'addon' | 'composable' — see resolveItemRole().
     * @param array<int, array<string, mixed>> $familyMainItems sibling primary Family items in the same quote — only consulted when $role === 'composable' (composableCoexistsWithPrimary()).
     */
    private static function emailFamilyRow(array $item, string $role, bool $includeInternalIds, array $familyMainItems = []): string
    {
        $familyTitle  = esc_html((string) ($item['familyTitle'] ?? ''));
        $tierTitle    = esc_html((string) ($item['tierTitle'] ?? ''));
        $editionTitle = !empty($item['tierEditionTitle']) ? esc_html((string) $item['tierEditionTitle']) : '';

        // A composable item reached via "upgrade your build" (a sibling
        // primary exists for the same Family+Tier-Instance) reads "Upgrades"
        // here too, matching QuoteSummary.tsx/QuoteProposalPreview.tsx — never
        // the standalone "Build Your Own" badge/title for that case.
        $isUpgrade = $role === 'composable' && self::composableCoexistsWithPrimary($item, $familyMainItems);

        $badges = [
            'addon'      => ' <span style="font-size:10px;background:#f0f0f0;padding:1px 6px;border-radius:8px;color:#888;">add-on</span>',
            'composable' => ' <span style="font-size:10px;background:#eef4ff;padding:1px 6px;border-radius:8px;color:#3157c9;">Build Your Own</span>',
        ];
        $badge = $isUpgrade ? '' : ($badges[$role] ?? '');

        if ($role === 'addon') {
            $title         = $tierTitle;
            $subtitleParts = array_filter(['Optional add-on', $familyTitle, $editionTitle], fn ($v) => $v !== '');
        } else {
            // 'primary' and 'composable' both lead with the Family name —
            // the composable row's own tierTitle already carries "Build
            // Your Own"/the offer's own label, distinguished further by the
            // badge above, never by a raw "primary"/"composable" string —
            // unless $isUpgrade, in which case both the badge and this
            // tierTitle slot are replaced with "Upgrades".
            $title              = $familyTitle;
            $effectiveTierTitle = $isUpgrade ? 'Upgrades' : $tierTitle;
            $subtitleParts      = array_filter([$effectiveTierTitle, $editionTitle], fn ($v) => $v !== '');
        }
        $subtitle = implode(' &nbsp;·&nbsp; ', $subtitleParts);

        if ($includeInternalIds) {
            $familyRef   = esc_html((string) ($item['familyPlatformId'] ?? ''));
            $instanceRef = esc_html((string) ($item['tierInstancePlatformId'] ?? ''));
            $tierRef     = esc_html((string) ($item['tierPlatformId'] ?? ''));
            $editionRef  = esc_html((string) ($item['tierEditionPlatformId'] ?? ''));
            $refs        = trim($familyRef . ' · ' . $instanceRef . ' · ' . $tierRef, ' ·');
            if ($editionRef !== '') {
                $refs .= ' · Edition ' . $editionRef;
            }
            if ($refs !== '') {
                $subtitle .= '<br><span style="font-family:monospace;">' . $refs . '</span>';
            }
        }

        $priceBlock = self::emailFamilyStreamsBlock($item);
        // Live-gate correction (2026-09-05, "preserve period/leg inclusion
        // attribution"): the richer per-Period breakdown takes priority over
        // the flat inclusionItems/features fallback — same "captured once
        // at Add-to-Quote time" rule as every other snapshot field. Falls
        // through to the existing flat rendering for a pre-existing Request
        // or one with no resolved commercial_legs at all.
        $commercialBreakdown = (array) ($item['commercialBreakdown'] ?? []);
        $inclusionRows = $commercialBreakdown !== []
            ? self::emailPeriodBreakdownRows($commercialBreakdown)
            : '';
        if ($inclusionRows === '') {
            $inclusionRows = self::emailInclusionItemsList(self::familyDisplayInclusions($item));
        }

        // Live-gate correction (2026-09-05, "Customer email structure"): root
        // cause of the reported missing item-to-item separation — this
        // header row's own border-bottom used to be unconditional, so for
        // any item WITH an inclusion list it drew a divider line THROUGH the
        // middle of that one item's own block (between its header and its
        // own inclusions), while the true boundary — after this item's
        // inclusions, before the NEXT item's header — carried no line at
        // all. The header row now only carries the boundary line when there
        // are no inclusion rows to trail it (emailInclusionItemsList()
        // itself carries the line in the other case), so every item ends
        // with exactly one visible divider before the next one starts.
        $headerBorder = $inclusionRows === '' ? 'border-bottom:1px solid #f0f0f0;' : '';

        return "
          <tr>
            <td style=\"padding:11px 14px;{$headerBorder}\">
              <div style=\"font-size:13px;font-weight:600;color:#111;\">{$title}{$badge}</div>
              <div style=\"font-size:11px;color:#999;margin-top:2px;\">{$subtitle}</div>
            </td>
            <td style=\"padding:11px 14px;{$headerBorder}text-align:right;white-space:nowrap;vertical-align:top;\">
              {$priceBlock}
            </td>
          </tr>{$inclusionRows}";
    }

    /**
     * @param array<int, array<string, mixed>> $items
     * @param string $role 'primary' | 'addon' | 'composable' — see resolveItemRole().
     * @param array<int, array<string, mixed>> $familyMainItems see emailFamilyRow().
     */
    private static function emailFamilyRows(array $items, string $role, bool $includeInternalIds, array $familyMainItems = []): string
    {
        $html = '';
        foreach ($items as $item) {
            $html .= self::emailFamilyRow($item, $role, $includeInternalIds, $familyMainItems);
        }

        return $html;
    }

    /**
     * The combined "Total Contract Value" (every primary/composable Family
     * item's own Leg-stream total resolves finitely) or "Contract Value:
     * Ongoing" block — OrderSummary.tsx's/QuoteProposalPreview.tsx's Phase 8F
     * semantics; add-ons never enter this combined sum.
     *
     * @param array<int, array<string, mixed>> $familyCommercialItems primary + composable Family items (see buildQuoteSections())
     */
    private static function familyContractValueBlock(array $familyCommercialItems): string
    {
        $values = array_map(function (array $item) {
            $streams = $item['legPaymentSummaries'] ?? null;

            return is_array($streams) && $streams !== [] ? self::computeTotalContractValue($streams) : null;
        }, $familyCommercialItems);

        $allFinite = $familyCommercialItems !== [] && !in_array(null, $values, true);

        if ($allFinite) {
            $combined = array_sum($values);

            return "
              <tr>
                <td style=\"padding:0 28px 12px;\">
                  <table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\"
                         style=\"border-top:2px solid #111;padding-top:12px;\">
                    <tr>
                      <td style=\"font-size:13px;color:#666;\">Total Contract Value</td>
                      <td style=\"text-align:right;font-size:22px;font-weight:800;color:#111;\">\$" . number_format($combined, 2) . "</td>
                    </tr>
                  </table>
                </td>
              </tr>";
        }

        return '
          <tr>
            <td style="padding:0 28px 12px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                     style="border-top:2px solid #111;padding-top:12px;">
                <tr>
                  <td style="font-size:13px;color:#666;">Contract Value</td>
                  <td style="text-align:right;font-size:16px;font-weight:700;color:#111;">Ongoing</td>
                </tr>
              </table>
              <p style="margin:6px 0 0;font-size:11px;color:#999;">Includes charges without a fixed end date.</p>
            </td>
          </tr>';
    }

    /**
     * The combined "Initial Payment" row — every primary/composable Family
     * item's own earliest same-cycle streams, summed per cycle then across
     * cycles (startingPaymentsByCycle() above); omitted entirely when none
     * has a priced stream to start from.
     *
     * @param array<int, array<string, mixed>> $familyCommercialItems primary + composable Family items (see buildQuoteSections())
     */
    private static function familyInitialPaymentRow(array $familyCommercialItems): string
    {
        $itemStreams = array_map(
            fn (array $item) => is_array($item['legPaymentSummaries'] ?? null) ? $item['legPaymentSummaries'] : [],
            $familyCommercialItems
        );
        $startingPayments = self::startingPaymentsByCycle($itemStreams);
        if ($startingPayments === []) {
            return '';
        }

        $total = array_sum(array_map(fn (array $pair) => $pair[1], $startingPayments));

        return '
          <tr>
            <td style="padding:0 28px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:13px;color:#666;">Initial Payment</td>
                  <td style="text-align:right;font-size:16px;font-weight:700;color:#111;">$' . number_format($total, 2) . '</td>
                </tr>
              </table>
            </td>
          </tr>';
    }

    /**
     * Assembles the Selected Services rows (main -> Family main -> bundle ->
     * Tier add-on -> Family add-on, matching OrderSummary.tsx's own section
     * order) and the combined totals block, shared by both admin and
     * customer templates — the only difference between them is
     * $includeInternalIds (raw CZ Platform IDs never reach the customer
     * email; see buildCustomerHtmlEmail()).
     *
     * @param  array<int, array<string, mixed>> $items
     * @return array{rows: string, totals: string}
     */
    private static function buildQuoteSections(array $items, bool $includeInternalIds): array
    {
        $classified = self::classifyQuoteItems($items);

        // The composable ("Build Your Own") occupant's own aggregate line is
        // a real commercial line, same as the primary — it joins the
        // combined Family Contract Value/Initial Payment sum below, matching
        // OrderSummary.tsx's/QuoteProposalPreview.tsx's own
        // familyCommercialItems precedent — but stays its own row and its
        // own classifyQuoteItems() bucket for every other purpose.
        $familyCommercialItems = array_merge($classified['familyMainItems'], $classified['familyComposableItems']);

        $rows = self::emailServiceRows($classified['mainItems'])
            . self::emailFamilyRows($classified['familyMainItems'], 'primary', $includeInternalIds)
            . self::emailFamilyRows($classified['familyComposableItems'], 'composable', $includeInternalIds, $classified['familyMainItems'])
            . self::emailServiceRows($classified['bundleItems'])
            . self::emailServiceRows($classified['tierAddonItems'])
            . self::emailFamilyRows($classified['familyAddonItems'], 'addon', $includeInternalIds);

        $hasMultiStreamItem = false;
        foreach (array_merge($familyCommercialItems, $classified['familyAddonItems']) as $familyItem) {
            $streams = $familyItem['legPaymentSummaries'] ?? null;
            if (is_array($streams) && count($streams) > 1) {
                $hasMultiStreamItem = true;
                break;
            }
        }

        // Once any Family item is multi-stream, every Family item (primary,
        // add-on, or composable) is already represented either in the
        // combined block below or on its own per-item row above — never both
        // there and inside the general cycle totals too (see
        // familyContractValueBlock()'s docblock).
        $itemsForGeneralTotals = $hasMultiStreamItem
            ? array_values(array_filter($items, fn (array $item) => !self::isFamilyItem($item)))
            : $items;

        $totals = '';
        if ($hasMultiStreamItem) {
            $totals .= self::familyContractValueBlock($familyCommercialItems);
        }
        if ($itemsForGeneralTotals !== []) {
            $totals .= self::emailTotalsBlock(self::calcTotals($itemsForGeneralTotals));
        }
        if ($hasMultiStreamItem) {
            $totals .= self::familyInitialPaymentRow($familyCommercialItems);
        }

        return ['rows' => $rows, 'totals' => $totals];
    }

    /** @param array<string, mixed> $data */
    public static function buildAdminHtmlEmail(array $data): string
    {
        if (($data['type'] ?? '') === 'free_it_assessment') {
            return self::buildAssessmentAdminEmail($data);
        }

        // Admin retains raw CZ Platform IDs for operational identity — see
        // buildQuoteSections()'s docblock.
        $sections    = self::buildQuoteSections($data['items'] ?? [], true);
        $serviceRows = $sections['rows'];
        $totalsBlock = $sections['totals'];

        $contact   = esc_html((string) $data['contact']);
        $company   = esc_html($data['company'] !== '' ? (string) $data['company'] : '—');
        $email     = esc_html((string) $data['email']);
        $phone     = esc_html($data['phone'] !== '' ? (string) $data['phone'] : '—');
        $quoteRef  = esc_html((string) $data['quote_ref']);
        $submitted = esc_html((string) $data['submitted']);

        $notesRow = $data['notes'] !== ''
            ? '<tr><td colspan="2" style="padding:10px 14px;font-size:13px;color:#555;border-top:1px solid #ebebeb;line-height:1.5;">'
              . nl2br(esc_html((string) $data['notes']))
              . '</td></tr>'
            : '';

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
       style="background:#f4f4f4;padding:24px 16px;">
  <tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" width="600"
         style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;
                overflow:hidden;border:1px solid #e0e0e0;">

    <!-- HEADER -->
    <tr><td style="background:#0f0f0f;padding:20px 28px;">
      <span style="color:#FFDA17;font-size:18px;font-weight:800;letter-spacing:-0.5px;">CompuZign</span>
      <span style="color:#555;font-size:10px;margin-left:12px;text-transform:uppercase;
                   letter-spacing:1.5px;">Admin Notification</span>
    </td></tr>

    <!-- TITLE ROW -->
    <tr><td style="padding:24px 28px 16px;">
      <h1 style="margin:0;font-size:20px;color:#111;font-weight:700;">New Quote Request</h1>
      <p style="margin:6px 0 0;font-size:12px;color:#999;">
        Ref: <strong style="color:#111;font-family:monospace;">{$quoteRef}</strong>
        &nbsp;·&nbsp; {$submitted}
      </p>
    </td></tr>

    <!-- CONTACT TABLE -->
    <tr><td style="padding:0 28px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="border:1px solid #ebebeb;border-radius:6px;overflow:hidden;font-size:13px;">
        <tr><td colspan="2"
                style="padding:9px 14px;background:#f4f4f4;border-bottom:1px solid #ebebeb;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;
                       letter-spacing:1px;color:#888;">Contact Details</span>
        </td></tr>
        <tr>
          <td style="padding:9px 14px;color:#999;border-bottom:1px solid #ebebeb;width:26%;">Name</td>
          <td style="padding:9px 14px;color:#111;font-weight:600;border-bottom:1px solid #ebebeb;">{$contact}</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;color:#999;border-bottom:1px solid #ebebeb;">Company</td>
          <td style="padding:9px 14px;color:#111;border-bottom:1px solid #ebebeb;">{$company}</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;color:#999;border-bottom:1px solid #ebebeb;">Email</td>
          <td style="padding:9px 14px;color:#111;border-bottom:1px solid #ebebeb;">{$email}</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;color:#999;">Phone</td>
          <td style="padding:9px 14px;color:#111;">{$phone}</td>
        </tr>
        {$notesRow}
      </table>
    </td></tr>

    <!-- SERVICES TABLE -->
    <tr><td style="padding:0 28px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="border:1px solid #ebebeb;border-radius:6px;overflow:hidden;font-size:13px;">
        <tr><td colspan="2"
                style="padding:9px 14px;background:#f4f4f4;border-bottom:1px solid #ebebeb;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;
                       letter-spacing:1px;color:#888;">Selected Services</span>
        </td></tr>
        {$serviceRows}
      </table>
    </td></tr>

    <!-- TOTALS -->
    {$totalsBlock}

    <!-- FOOTER -->
    <tr><td style="background:#f9f9f9;padding:16px 28px;border-top:1px solid #ebebeb;">
      <p style="margin:0;font-size:11px;color:#bbb;line-height:1.5;">
        Transient key:
        <code style="font-family:monospace;background:#eee;padding:1px 5px;
                     border-radius:3px;color:#777;">cz_quote_{$quoteRef}</code>
        (expires in 7 days).
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>
HTML;
    }

    /** @param array<string, mixed> $data */
    /**
     * @param string $quoteViewLink Phase 8J-C3: the secure quote-reload link
     *   (RequestsModule::quoteViewUrl() plus the raw view secret as a URL
     *   fragment — see RequestsController::submitRequest()'s docblock).
     *   Rendered only for a quote_cart email; a free_it_assessment
     *   submission has no reloadable quote, so this parameter is accepted
     *   uniformly but ignored on that branch.
     */
    public static function buildCustomerHtmlEmail(array $data, string $siteTitle, string $quoteViewLink = ''): string
    {
        if (($data['type'] ?? '') === 'free_it_assessment') {
            return self::buildAssessmentCustomerEmail($data, $siteTitle);
        }

        // Customer email hides raw CZ Platform IDs — see
        // buildQuoteSections()'s docblock.
        $sections    = self::buildQuoteSections($data['items'] ?? [], false);
        $serviceRows = $sections['rows'];
        $totalsBlock = $sections['totals'];

        $contact   = esc_html((string) $data['contact']);
        $quoteRef  = esc_html((string) $data['quote_ref']);
        $siteLabel = esc_html($siteTitle);

        // Phase 8J-C3: both the href attribute and, defensively, the link
        // text are escaped — esc_url() also strips anything that isn't a
        // well-formed URL, so a malformed/empty $quoteViewLink degrades to
        // an inert '#' rather than a broken or unsafe attribute.
        $viewQuoteBlock = $quoteViewLink !== ''
            ? '<tr><td style="padding:0 28px 24px;text-align:center;">
                <a href="' . esc_url($quoteViewLink) . '"
                   style="display:inline-block;background:#0f0f0f;color:#FFDA17;font-size:14px;
                          font-weight:700;text-decoration:none;padding:14px 32px;border-radius:6px;">'
              . esc_html('View / Print Quote') . '</a>
              </td></tr>'
            : '';

        $notesBlock = $data['notes'] !== ''
            ? '<tr><td style="padding:0 28px 20px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;
                           letter-spacing:1px;color:#999;">Your Notes</p>
                <p style="margin:0;font-size:13px;color:#555;background:#f9f9f9;padding:12px 14px;
                           border-radius:6px;border-left:3px solid #ddd;line-height:1.6;">'
              . nl2br(esc_html((string) $data['notes']))
              . '</p></td></tr>'
            : '';

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"
       style="background:#f4f4f4;padding:24px 16px;">
  <tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" width="600"
         style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;
                overflow:hidden;border:1px solid #e0e0e0;">

    <!-- HEADER -->
    <tr><td style="background:#0f0f0f;padding:20px 28px;">
      <span style="color:#FFDA17;font-size:18px;font-weight:800;letter-spacing:-0.5px;">CompuZign</span>
      <span style="color:#555;font-size:10px;margin-left:12px;text-transform:uppercase;
                   letter-spacing:1.5px;">Managed IT Services</span>
    </td></tr>

    <!-- GREETING -->
    <tr><td style="padding:28px 28px 16px;">
      <h1 style="margin:0 0 10px;font-size:20px;color:#111;font-weight:700;">
        Quote Request Received
      </h1>
      <p style="margin:0;font-size:15px;color:#444;line-height:1.65;">
        Hi <strong>{$contact}</strong>,<br><br>
        Thank you for your quote request. We&#39;ve received it and will be in touch
        within one business day with a tailored proposal.
      </p>
    </td></tr>

    <!-- REFERENCE BADGE -->
    <tr><td style="padding:0 28px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="background:#f9f9f9;border-radius:6px;border:1px solid #ebebeb;">
        <tr><td style="padding:14px 18px;">
          <span style="font-size:11px;color:#999;text-transform:uppercase;
                       letter-spacing:1px;">Quote Reference</span><br>
          <span style="font-size:20px;font-weight:800;color:#111;
                       font-family:monospace;letter-spacing:1px;">{$quoteRef}</span>
        </td></tr>
      </table>
    </td></tr>

    <!-- SERVICES TABLE -->
    <tr><td style="padding:0 28px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="border:1px solid #ebebeb;border-radius:6px;overflow:hidden;font-size:13px;">
        <tr><td colspan="2"
                style="padding:9px 14px;background:#f4f4f4;border-bottom:1px solid #ebebeb;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;
                       letter-spacing:1px;color:#888;">Your Selected Services</span>
        </td></tr>
        {$serviceRows}
      </table>
    </td></tr>

    <!-- TOTALS -->
    {$totalsBlock}

    <!-- VIEW / PRINT QUOTE (conditional — quote_cart only) -->
    {$viewQuoteBlock}

    <!-- NOTES (conditional) -->
    {$notesBlock}

    <!-- RECOMMENDED NEXT STEPS -->
    <tr><td style="padding:0 28px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="background:#f9f9f9;border-radius:6px;border:1px solid #ebebeb;overflow:hidden;">
        <tr><td style="padding:9px 14px;background:#f4f4f4;border-bottom:1px solid #ebebeb;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;
                       letter-spacing:1px;color:#888;">Recommended Next Steps</span>
        </td></tr>
        <tr><td style="padding:14px 16px;font-size:13px;color:#555;line-height:1.65;">
          Our team will review your service selection and reach out with a detailed proposal.
          In the meantime, feel free to reply to this email with any questions or additional context.
        </td></tr>
      </table>
    </td></tr>

    <!-- CTA -->
    <tr><td style="padding:0 28px 28px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
        Questions? Reply to this email or reach us at
        <a href="mailto:hello@compuzign.com"
           style="color:#111;font-weight:600;text-decoration:none;">hello@compuzign.com</a>
      </p>
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="background:#f4f4f4;padding:18px 28px;border-top:1px solid #e8e8e8;">
      <p style="margin:0 0 4px;font-size:11px;color:#bbb;line-height:1.5;">
        This is a preliminary, non-binding quote. All prices are in USD and exclude applicable taxes.
        Pricing is valid for 30 days and is subject to scope confirmation.
      </p>
      <p style="margin:4px 0 0;font-size:11px;color:#bbb;">
        &copy; {$siteLabel} &mdash; Managed IT Services
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>
HTML;
    }

    // ── Assessment email templates ────────────────────────────────────────────

    /** @param array<string, mixed> $data */
    private static function buildAssessmentAdminEmail(array $data): string
    {
        $contact   = esc_html((string) ($data['contact']   ?? ''));
        $company   = esc_html((string) ($data['company']   !== '' ? $data['company']   : '—'));
        $email     = esc_html((string) ($data['email']     ?? ''));
        $phone     = esc_html((string) ($data['phone']     !== '' ? $data['phone']     : '—'));
        $quoteRef  = esc_html((string) ($data['quote_ref'] ?? ''));
        $submitted = esc_html((string) ($data['submitted'] ?? ''));
        $category  = esc_html((string) ($data['category'] !== '' ? $data['category']  : '—'));

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f4;padding:24px 16px;">
  <tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" width="600"
         style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">
    <tr><td style="background:#0f0f0f;padding:20px 28px;">
      <span style="color:#FFDA17;font-size:18px;font-weight:800;letter-spacing:-0.5px;">CompuZign</span>
      <span style="color:#555;font-size:10px;margin-left:12px;text-transform:uppercase;letter-spacing:1.5px;">Admin Notification</span>
    </td></tr>
    <tr><td style="padding:24px 28px 16px;">
      <h1 style="margin:0;font-size:20px;color:#111;font-weight:700;">Free IT Assessment Request</h1>
      <p style="margin:6px 0 0;font-size:12px;color:#999;">
        Ref: <strong style="color:#111;font-family:monospace;">{$quoteRef}</strong> &nbsp;·&nbsp; {$submitted}
      </p>
    </td></tr>
    <tr><td style="padding:0 28px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="border:1px solid #ebebeb;border-radius:6px;overflow:hidden;font-size:13px;">
        <tr><td colspan="2" style="padding:9px 14px;background:#f4f4f4;border-bottom:1px solid #ebebeb;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;">Contact Details</span>
        </td></tr>
        <tr>
          <td style="padding:9px 14px;color:#999;border-bottom:1px solid #ebebeb;width:26%;">Name</td>
          <td style="padding:9px 14px;color:#111;font-weight:600;border-bottom:1px solid #ebebeb;">{$contact}</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;color:#999;border-bottom:1px solid #ebebeb;">Company</td>
          <td style="padding:9px 14px;color:#111;border-bottom:1px solid #ebebeb;">{$company}</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;color:#999;border-bottom:1px solid #ebebeb;">Email</td>
          <td style="padding:9px 14px;color:#111;border-bottom:1px solid #ebebeb;">{$email}</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;color:#999;">Phone</td>
          <td style="padding:9px 14px;color:#111;">{$phone}</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 28px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="border:1px solid #ebebeb;border-radius:6px;overflow:hidden;font-size:13px;">
        <tr><td colspan="2" style="padding:9px 14px;background:#f4f4f4;border-bottom:1px solid #ebebeb;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;">Assessment Details</span>
        </td></tr>
        <tr>
          <td style="padding:9px 14px;color:#999;border-bottom:1px solid #ebebeb;width:26%;">Type</td>
          <td style="padding:9px 14px;color:#111;font-weight:600;border-bottom:1px solid #ebebeb;">Free IT Assessment</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;color:#999;">Category of interest</td>
          <td style="padding:9px 14px;color:#111;">{$category}</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="background:#f9f9f9;padding:16px 28px;border-top:1px solid #ebebeb;">
      <p style="margin:0;font-size:11px;color:#bbb;line-height:1.5;">
        Transient key: <code style="font-family:monospace;background:#eee;padding:1px 5px;border-radius:3px;color:#777;">cz_quote_{$quoteRef}</code> (expires in 7 days).
      </p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>
HTML;
    }

    /** @param array<string, mixed> $data */
    private static function buildAssessmentCustomerEmail(array $data, string $siteTitle): string
    {
        $contact   = esc_html((string) ($data['contact']   ?? ''));
        $quoteRef  = esc_html((string) ($data['quote_ref'] ?? ''));
        $siteLabel = esc_html($siteTitle);
        $category  = esc_html((string) ($data['category'] !== '' ? $data['category'] : 'General IT Assessment'));

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f4;padding:24px 16px;">
  <tr><td align="center">
  <table role="presentation" cellpadding="0" cellspacing="0" width="600"
         style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;">
    <tr><td style="background:#0f0f0f;padding:20px 28px;">
      <span style="color:#FFDA17;font-size:18px;font-weight:800;letter-spacing:-0.5px;">CompuZign</span>
      <span style="color:#555;font-size:10px;margin-left:12px;text-transform:uppercase;letter-spacing:1.5px;">Managed IT Services</span>
    </td></tr>
    <tr><td style="padding:28px 28px 16px;">
      <h1 style="margin:0 0 10px;font-size:20px;color:#111;font-weight:700;">Free IT Assessment Request Received</h1>
      <p style="margin:0;font-size:15px;color:#444;line-height:1.65;">
        Hi <strong>{$contact}</strong>,<br><br>
        Thank you for requesting your free IT assessment. We&#39;ve received your request
        and will be in touch within one business day to schedule your review.
      </p>
    </td></tr>
    <tr><td style="padding:0 28px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="background:#f9f9f9;border-radius:6px;border:1px solid #ebebeb;">
        <tr><td style="padding:14px 18px;">
          <span style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;">Request Reference</span><br>
          <span style="font-size:20px;font-weight:800;color:#111;font-family:monospace;letter-spacing:1px;">{$quoteRef}</span>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 28px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="border:1px solid #ebebeb;border-radius:6px;overflow:hidden;font-size:13px;">
        <tr><td colspan="2" style="padding:9px 14px;background:#f4f4f4;border-bottom:1px solid #ebebeb;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;">Your Assessment</span>
        </td></tr>
        <tr>
          <td style="padding:9px 14px;color:#999;border-bottom:1px solid #ebebeb;width:36%;">Type</td>
          <td style="padding:9px 14px;color:#111;font-weight:600;border-bottom:1px solid #ebebeb;">Free IT Assessment</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;color:#999;">Area of focus</td>
          <td style="padding:9px 14px;color:#111;">{$category}</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 28px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
             style="background:#f9f9f9;border-radius:6px;border:1px solid #ebebeb;overflow:hidden;">
        <tr><td style="padding:9px 14px;background:#f4f4f4;border-bottom:1px solid #ebebeb;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#888;">What Happens Next</span>
        </td></tr>
        <tr><td style="padding:14px 16px;font-size:13px;color:#555;line-height:1.65;">
          One of our engineers will contact you to schedule a no-obligation review of your IT environment.
          The assessment covers security posture, backup readiness, compliance gaps, and performance.
          You&#39;ll receive a written summary with prioritised recommendations.
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 28px 28px;text-align:center;">
      <p style="margin:0;font-size:13px;color:#666;line-height:1.6;">
        Questions? Reply to this email or reach us at
        <a href="mailto:hello@compuzign.com" style="color:#111;font-weight:600;text-decoration:none;">hello@compuzign.com</a>
      </p>
    </td></tr>
    <tr><td style="background:#f4f4f4;padding:18px 28px;border-top:1px solid #e8e8e8;">
      <p style="margin:0;font-size:11px;color:#bbb;">&copy; {$siteLabel} &mdash; Managed IT Services</p>
    </td></tr>
  </table>
  </td></tr>
</table>
</body>
</html>
HTML;
    }
}
