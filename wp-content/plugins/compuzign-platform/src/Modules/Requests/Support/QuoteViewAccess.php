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

        return ['ok' => true, 'quote' => $quote];
    }
}
