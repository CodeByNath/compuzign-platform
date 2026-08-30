<?php

declare(strict_types=1);

// Focused contract for Phase 8J-C1: the secure customer quote read boundary.
// The short CZ-xxxxxx quote reference is identification only — a
// cryptographically strong view secret (stored only as a one-way hash) must
// be independently required, verified in constant time, and every failure
// path (wrong secret, no secret, missing/expired quote, malformed
// reference, a legacy snapshot with no stored hash at all) must return the
// identical non-disclosing outcome. QuoteViewAccess::resolve() is pure (no
// WordPress transient/REST calls), so this exercises it directly — exactly
// the same separation RequestSchema::validate() keeps from its own
// WP_REST_Request-consuming caller.

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\Requests\Support\QuoteViewAccess;
use CompuZign\Platform\Modules\Requests\Support\QuoteViewSecret;

function check_quote_view_access(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Quote view access boundary: ' . $message);
    }
}

// ── QuoteViewSecret: generation, hashing, constant-time verification ───────

$secretA = QuoteViewSecret::generate();
$secretB = QuoteViewSecret::generate();
check_quote_view_access(strlen($secretA) === 64, 'a generated secret must be 64 hex chars (32 bytes)');
check_quote_view_access((bool) preg_match('/^[0-9a-f]{64}$/', $secretA), 'a generated secret must be lowercase hex only');
check_quote_view_access($secretA !== $secretB, 'two generated secrets must never collide in practice');

$hash = QuoteViewSecret::hash($secretA);
check_quote_view_access($hash !== $secretA, 'the stored hash must never equal the raw secret');
check_quote_view_access(QuoteViewSecret::verify($secretA, $hash), 'the correct secret must verify against its own hash');
check_quote_view_access(!QuoteViewSecret::verify($secretB, $hash), 'a different (but validly-shaped) secret must not verify');
check_quote_view_access(!QuoteViewSecret::verify('', $hash), 'an empty secret must not verify');

// ── QuoteViewAccess::resolve() ──────────────────────────────────────────────

$storedPayload = [
    'quote_ref' => 'CZ-ABC123',
    'type'      => 'quote_cart',
    'contact'   => 'Jane Doe',
    'company'   => 'Acme Co',
    'email'     => 'jane@example.com',
    'phone'     => '555-0100',
    'notes'     => 'internal note the proposal never renders',
    'category'  => '',
    'submitted' => '2026-08-30 00:00:00',
    'items'     => [['serviceId' => 1, 'price' => 49]],
    'view_secret_hash' => $hash,
];

// Valid access.
$result = QuoteViewAccess::resolve($storedPayload, 'CZ-ABC123', $secretA);
check_quote_view_access($result['ok'] === true, 'a correct ref + secret must resolve successfully');
check_quote_view_access($result['quote']['quote_ref'] === 'CZ-ABC123', 'resolved quote must carry quote_ref');
check_quote_view_access($result['quote']['contact'] === 'Jane Doe', 'resolved quote must carry contact');
check_quote_view_access($result['quote']['items'] === [['serviceId' => 1, 'price' => 49]], 'resolved quote must carry the stored items snapshot');

// No secret/hash leakage: the returned quote must never carry the stored
// hash, and must not broaden PII beyond what the accepted proposal needs.
check_quote_view_access(!array_key_exists('view_secret_hash', $result['quote']), 'resolved quote must never leak the stored hash');
check_quote_view_access(!array_key_exists('notes', $result['quote']), 'resolved quote must not broaden PII beyond what the proposal needs (notes)');
check_quote_view_access(!array_key_exists('category', $result['quote']), 'resolved quote must not broaden PII beyond what the proposal needs (category)');

// Wrong secret.
$wrongSecret = QuoteViewAccess::resolve($storedPayload, 'CZ-ABC123', $secretB);
check_quote_view_access($wrongSecret['ok'] === false, 'a wrong secret must be rejected');
check_quote_view_access(!isset($wrongSecret['quote']), 'a rejected request must never carry quote data');

// Quote-reference-only access (no secret) must never be sufficient.
$noSecret = QuoteViewAccess::resolve($storedPayload, 'CZ-ABC123', '');
check_quote_view_access($noSecret['ok'] === false, 'the quote reference alone, with no secret, must never be sufficient');

// Missing/expired quote — get_transient() returns false on a WordPress miss.
$missing = QuoteViewAccess::resolve(false, 'CZ-ZZZZZZ', $secretA);
check_quote_view_access($missing['ok'] === false, 'a missing/expired transient must be rejected');

// Malformed reference.
foreach (['<script>alert(1)</script>', 'CZ-abc123', 'CZ-ABC12', '', 'not-a-ref'] as $malformed) {
    $malformedResult = QuoteViewAccess::resolve($storedPayload, $malformed, $secretA);
    check_quote_view_access($malformedResult['ok'] === false, "a malformed reference '{$malformed}' must be rejected");
}

// A pre-8J-C1 snapshot with no view_secret_hash at all (or a non-string one)
// must reject rather than error — backward compatibility with any quote
// already in its 7-day window when this phase deploys.
$legacyPayload = $storedPayload;
unset($legacyPayload['view_secret_hash']);
$legacyResult = QuoteViewAccess::resolve($legacyPayload, 'CZ-ABC123', $secretA);
check_quote_view_access($legacyResult['ok'] === false, 'a pre-8J-C1 snapshot with no stored hash must be rejected, not error');

$malformedHashPayload           = $storedPayload;
$malformedHashPayload['view_secret_hash'] = ['not', 'a', 'string'];
$malformedHashResult = QuoteViewAccess::resolve($malformedHashPayload, 'CZ-ABC123', $secretA);
check_quote_view_access($malformedHashResult['ok'] === false, 'a non-string stored hash must be rejected, not error');

// Non-array stored payload (e.g. some other unrelated transient shape).
$nonArrayResult = QuoteViewAccess::resolve('not-an-array', 'CZ-ABC123', $secretA);
check_quote_view_access($nonArrayResult['ok'] === false, 'a non-array stored payload must be rejected, not error');

echo "Quote view access boundary checks passed.\n";
