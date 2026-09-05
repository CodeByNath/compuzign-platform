<?php

namespace CompuZign\Platform\Modules\Requests\Support;

/**
 * Phase 8J-C1: the secure read boundary for one stored quote snapshot.
 * Pure resolution logic only (no WordPress transient/REST calls) so it can
 * be exercised directly by focused contracts — RequestsController owns the
 * get_transient() lookup and the WP_REST_Response wrapping, exactly the
 * same separation RequestSchema::validate() already keeps from its own
 * WP_REST_Request-consuming caller.
 *
 * Every failure path (malformed reference, no secret, wrong secret,
 * missing/expired transient, a legacy snapshot with no stored hash at all)
 * returns the identical ['ok' => false] shape — the caller must render one
 * generic non-disclosing response for all of them, never a distinguishing
 * message that would let an attacker tell "wrong secret" apart from
 * "quote doesn't exist".
 */
class QuoteViewAccess
{
    /**
     * Only the fields the future customer quote renderer (the accepted
     * QuoteProposalPreview.tsx experience) actually needs — never the raw
     * submission payload wholesale, so server-only fields (the stored
     * view_secret_hash) and PII the proposal never shows (notes, category)
     * can't leak by omission-from-a-denylist.
     */
    private const RETURNED_FIELDS = ['quote_ref', 'type', 'contact', 'company', 'email', 'phone', 'submitted', 'items'];

    /**
     * Auditor correction (2026-09-05, "leg-level breakdown presentation"):
     * legPaymentSummaries[].source (a Commercial Leg Platform ID, CZTL/CZTEL,
     * or the legacy literal 'default') MUST stay in the durable stored
     * Request — RequestSchema::sanitizeLegPaymentSummaries() keeps
     * persisting it unchanged, and every admin-side reader (Admin print,
     * email via NotificationTemplates.php) still reads the stored Request
     * directly, never through this class. This allow-list is the customer
     * quote-view boundary ONLY: every other payment fact survives, `source`
     * does not.
     */
    private const CUSTOMER_SAFE_LEG_SUMMARY_FIELDS = [
        'billingCycle', 'price', 'startMonth', 'endMonth', 'isOngoing', 'occurrenceMonths', 'subtotal',
    ];

    /**
     * @param  mixed  $storedPayload get_transient('cz_quote_'.$ref) result — false when missing/expired
     * @return array{ok: bool, quote?: array<string, mixed>}
     */
    public static function resolve($storedPayload, string $ref, string $secret): array
    {
        if (!preg_match(RequestSchema::QUOTE_REF_PATTERN, $ref) || $secret === '') {
            return ['ok' => false];
        }

        if (!is_array($storedPayload) || !isset($storedPayload['view_secret_hash']) || !is_string($storedPayload['view_secret_hash'])) {
            return ['ok' => false];
        }

        if (!QuoteViewSecret::verify($secret, $storedPayload['view_secret_hash'])) {
            return ['ok' => false];
        }

        $quote = [];
        foreach (self::RETURNED_FIELDS as $field) {
            $quote[$field] = $storedPayload[$field] ?? null;
        }
        if (is_array($quote['items'])) {
            $quote['items'] = self::projectItemsForCustomer($quote['items']);
        }

        return ['ok' => true, 'quote' => $quote];
    }

    /**
     * Auditor correction (2026-09-05, "leg-level breakdown presentation"):
     * the customer quote-view projection — strips only
     * legPaymentSummaries[].source from each item's own stored payment
     * streams. Operates on (and returns) a copy; never mutates the caller's
     * $storedPayload, so the durable Request this came from is untouched.
     * commercialBreakdown already carries no internal identifiers at all
     * (see RequestSchema::sanitizeCommercialBreakdown()) and needs no
     * projection here.
     *
     * @param  array<int, mixed> $items
     * @return array<int, mixed>
     */
    private static function projectItemsForCustomer(array $items): array
    {
        return array_map(function ($item) {
            if (!is_array($item) || !isset($item['legPaymentSummaries']) || !is_array($item['legPaymentSummaries'])) {
                return $item;
            }

            $item['legPaymentSummaries'] = array_map(function ($summary) {
                if (!is_array($summary)) {
                    return $summary;
                }

                return array_intersect_key($summary, array_flip(self::CUSTOMER_SAFE_LEG_SUMMARY_FIELDS));
            }, $item['legPaymentSummaries']);

            return $item;
        }, $items);
    }
}
