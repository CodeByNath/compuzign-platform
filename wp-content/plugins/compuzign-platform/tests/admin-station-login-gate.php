<?php

declare(strict_types=1);

// Admin Station branded login gate (Phase 1, audit-corrected): AdminStationAuth::
// handleLoginRequest() is the pure decision core behind the template_redirect-
// hooked processLogin() — this stub exercises it directly, without needing to
// mock process termination, covering the page-scoped gate, nonce/auth handling,
// server-derived (never client-trusted) redirect resolution, and that no
// credential value or the underlying WP_Error's own distinguishing message ever
// reaches the returned URL. A second block does structural source-text proof
// (this repo's established convention for behavior these stubs can't otherwise
// exercise) that no retired Command Centre routing/menu/redirect mechanism was
// resurrected, that AdminStationModule still gates on PlatformAccess::CAP, and
// that the redirect never relies on wp_safe_redirect()'s own admin_url()
// fallback.

function sanitize_key(string $value): string { return strtolower(preg_replace('/[^a-z0-9_\-]/i', '', $value) ?? ''); }
function sanitize_user(string $value): string { return trim(strip_tags($value)); }
function wp_unslash(mixed $value): mixed { return is_string($value) ? stripslashes($value) : $value; }
function is_ssl(): bool { return false; }
function home_url(string $path = '/'): string { return 'https://cz-test.local' . $path; }
function esc_url_raw(string $url): string { return $url; }

function add_query_arg(string $key, string $value, string $url): string
{
    $sep = str_contains($url, '?') ? '&' : '?';
    return $url . $sep . $key . '=' . $value;
}

function remove_query_arg(string $key, string $url): string
{
    $parts = parse_url($url);
    if (!isset($parts['query'])) {
        return $url;
    }
    parse_str($parts['query'], $query);
    unset($query[$key]);
    $base = ($parts['scheme'] ?? '') . '://' . ($parts['host'] ?? '') . ($parts['path'] ?? '');
    return $query === [] ? $base : $base . '?' . http_build_query($query);
}

class WP_Error
{
    public function __construct(private string $code = 'error', private string $message = 'Error') {}
    public function get_error_code(): string { return $this->code; }
    public function get_error_message(): string { return $this->message; }
}
function is_wp_error(mixed $thing): bool { return $thing instanceof WP_Error; }

// Test-controlled: the next wp_signon() call resolves to this.
$__nextSignonResult = null;
$__lastSignonCredentials = null;
function wp_verify_nonce(string $nonce, string $action): bool
{
    return $nonce === 'valid-nonce';
}
function wp_signon(array $credentials, bool $secureCookie = false): mixed
{
    global $__nextSignonResult, $__lastSignonCredentials;
    $__lastSignonCredentials = $credentials;
    return $__nextSignonResult;
}

// AdminStationModule.php is checked as source text only (section 6) — it is
// never require_once'd or instantiated here, since its methods reference
// Core\PlatformAccess/Health, which this stub deliberately does not define.
require_once __DIR__ . '/../src/Modules/AdminStation/AdminStationAuth.php';

use CompuZign\Platform\Modules\AdminStation\AdminStationAuth;

$failures = [];
function check_login_gate(bool $condition, string $label, mixed $detail = null): void
{
    global $failures;
    if ($condition) {
        echo "  ok — {$label}\n";
        return;
    }
    $failures[] = $label;
    echo '  FAIL — ' . $label . ($detail !== null ? ': ' . json_encode($detail) : '') . "\n";
}

$auth = new AdminStationAuth();
$onPage  = true;
$offPage = false;
$url     = 'https://cz-test.local/some-admin-station-page/';

// ── 1) Off the Admin Station page, an otherwise-valid submission is ignored ──
echo "1) processing is scoped to the Admin Station page itself\n";
{
    global $__nextSignonResult;
    $__nextSignonResult = (object) ['ID' => 1];

    $ignoredElsewhere = $auth->handleLoginRequest('POST', [
        AdminStationAuth::NONCE_FIELD => 'valid-nonce',
        'cz_username'                 => 'nath',
        'cz_password'                 => 'x',
    ], $offPage, $url);
    check_login_gate($ignoredElsewhere === null, 'an otherwise fully valid nonce+credentials POST is ignored when the current request is not the Admin Station page');

    $processedOnPage = $auth->handleLoginRequest('POST', [
        AdminStationAuth::NONCE_FIELD => 'valid-nonce',
        'cz_username'                 => 'nath',
        'cz_password'                 => 'x',
    ], $onPage, $url);
    check_login_gate($processedOnPage !== null, 'the identical submission is processed when the current request IS the Admin Station page');
}

// ── 2) Requests that are not this form's submission are left alone ─────────
echo "\n2) non-submissions of this form return null (page renders normally)\n";
{
    check_login_gate($auth->handleLoginRequest('GET', [], $onPage, $url) === null, 'a GET request is never processed');
    check_login_gate(
        $auth->handleLoginRequest('POST', ['cz_username' => 'x', 'cz_password' => 'y'], $onPage, $url) === null,
        'a POST with no nonce field at all is never processed',
    );
    check_login_gate(
        $auth->handleLoginRequest('POST', [AdminStationAuth::NONCE_FIELD => 'garbage', 'cz_username' => 'x'], $onPage, $url) === null,
        'a POST with an invalid/stale nonce is never processed — same as no submission, no distinguishing error',
    );
}

// ── 3) A valid submission redirects to the CURRENT request's own URL ───────
echo "\n3) successful authentication redirects to the current request's own URL — never client input\n";
{
    global $__nextSignonResult, $__lastSignonCredentials;
    $__nextSignonResult = (object) ['ID' => 42]; // any non-WP_Error value signals success

    $redirect = $auth->handleLoginRequest('POST', [
        AdminStationAuth::NONCE_FIELD => 'valid-nonce',
        'cz_username'                 => 'nath',
        'cz_password'                 => 'correct horse battery staple',
        // An attacker-supplied field of this old name must have zero effect —
        // there is no such parameter in the signature at all any more.
        'cz_admin_station_redirect'   => 'https://evil.example/phish',
    ], $onPage, $url);

    check_login_gate($redirect === $url, 'redirects to exactly the current request URL, unchanged, on success', $redirect);
    check_login_gate(!str_contains((string) $redirect, 'evil.example'), 'a client-supplied redirect-shaped field has zero effect on the destination');
    check_login_gate($__lastSignonCredentials['user_login'] === 'nath', 'the sanitized username reaches wp_signon()');
    check_login_gate($__lastSignonCredentials['user_password'] === 'correct horse battery staple', 'the raw password reaches wp_signon() unmodified (never sanitized/mangled)');
}

// ── 4) A failed attempt redirects back with a generic flag only ────────────
echo "\n4) failed authentication redirects back with a generic error flag, never the WP_Error's own message\n";
{
    global $__nextSignonResult;
    $__nextSignonResult = new WP_Error('incorrect_password', 'The password you entered is incorrect.');

    $redirect = $auth->handleLoginRequest('POST', [
        AdminStationAuth::NONCE_FIELD => 'valid-nonce',
        'cz_username'                 => 'nath',
        'cz_password'                 => 'wrong-password-value',
    ], $onPage, $url);

    check_login_gate($redirect === $url . '?login_error=1', 'redirects to the same page with login_error=1', $redirect);
    check_login_gate(!str_contains((string) $redirect, 'incorrect_password'), 'the WP_Error code never reaches the redirect URL');
    check_login_gate(!str_contains((string) $redirect, 'password you entered'), 'the WP_Error message never reaches the redirect URL');
    check_login_gate(!str_contains((string) $redirect, 'wrong-password-value'), 'the submitted password value never reaches the redirect URL');
    check_login_gate(!str_contains((string) $redirect, 'nath'), 'the submitted username never reaches the redirect URL');

    $__nextSignonResult = new WP_Error('invalid_username', 'Unknown username.');
    $redirectUnknown = $auth->handleLoginRequest('POST', [
        AdminStationAuth::NONCE_FIELD => 'valid-nonce',
        'cz_username'                 => 'ghost',
        'cz_password'                 => 'x',
    ], $onPage, $url);
    check_login_gate(
        $redirectUnknown === $redirect,
        'an unknown-username failure and a wrong-password failure produce the IDENTICAL redirect — no distinguishing feedback either way',
        $redirectUnknown,
    );
}

// ── 5) A stale login_error on the current URL never survives a retry ───────
echo "\n5) a stale login_error already on the current URL is stripped before a successful redirect\n";
{
    global $__nextSignonResult;
    $__nextSignonResult = (object) ['ID' => 1];

    $strippedError = $auth->handleLoginRequest('POST', [
        AdminStationAuth::NONCE_FIELD => 'valid-nonce',
        'cz_username'                 => 'nath',
        'cz_password'                 => 'x',
    ], $onPage, $url . '?login_error=1');
    check_login_gate($strippedError === $url, 'a retry that succeeds redirects without the prior failure flag', $strippedError);
}

// ── 6) Structural proof: no retired Command Centre mechanism resurrected,
//      and the redirect never depends on wp_safe_redirect()'s own admin_url()
//      fallback ───────────────────────────────────────────────────────────
echo "\n6) no retired Command Centre mechanism resurrected; redirect never falls back to wp-admin\n";
{
    // Strips // and /* */ comments via PHP's own tokenizer — these files'
    // own explanatory prose legitimately names every retired symbol below
    // to document that it is deliberately absent, which must not itself
    // trip a check for that symbol's absence from actual code.
    $stripComments = static function (string $code): string {
        $out = '';
        foreach (token_get_all($code) as $token) {
            if (is_array($token) && in_array($token[0], [T_COMMENT, T_DOC_COMMENT], true)) {
                continue;
            }
            $out .= is_array($token) ? $token[1] : $token;
        }
        return $out;
    };

    $root         = dirname(__DIR__);
    $authSource   = $stripComments((string) file_get_contents($root . '/src/Modules/AdminStation/AdminStationAuth.php'));
    $moduleSource = $stripComments((string) file_get_contents($root . '/src/Modules/AdminStation/AdminStationModule.php'));
    $combined     = $authSource . "\n" . $moduleSource;

    $forbidden = [
        'AdminRouter',
        'admin-command-centre',
        "'compuzign_admin'",
        'admin_menu',
        'login_redirect',
        'dashboardRedirect',
        'wpadminbar',
        'wp-toolbar',
        'install_plugins',
        'admin_url',
    ];
    foreach ($forbidden as $symbol) {
        check_login_gate(!str_contains($combined, $symbol), "neither AdminStationAuth.php nor AdminStationModule.php reference the retired/forbidden symbol '{$symbol}'");
    }

    check_login_gate(
        !str_contains($authSource, 'wp_safe_redirect'),
        'AdminStationAuth.php never calls wp_safe_redirect() — its own default fallback is admin_url(), which this must never depend on',
    );
    check_login_gate(
        preg_match('/wp_validate_redirect\([^)]*home_url\(/', $authSource) === 1,
        'the redirect is explicitly validated against a home_url()-based fallback, never left to a default',
    );
    check_login_gate(
        str_contains($authSource, "add_action('template_redirect'"),
        'auth processing hooks template_redirect (early enough for cookies), not admin_init or a custom router',
    );
    check_login_gate(
        str_contains($authSource, 'has_shortcode(') && str_contains($authSource, 'AdminStationModule::SHORTCODE'),
        'the Admin-Station-page predicate is source-grounded (checks the actual shortcode is present), not a hardcoded page slug',
    );
    check_login_gate(
        !str_contains($authSource, 'cz_admin_station_redirect') && !str_contains($moduleSource, 'cz_admin_station_redirect'),
        'no client-supplied redirect field exists anywhere in the form or its processing',
    );
    check_login_gate(
        str_contains($moduleSource, 'PlatformAccess::CAP'),
        'the shortcode still gates on the shared Core\\PlatformAccess capability, not a reintroduced local one',
    );
    check_login_gate(
        str_contains($moduleSource, '!is_user_logged_in()') && str_contains($moduleSource, 'renderLoginGate'),
        'a logged-out visitor renders the branded login gate',
    );
    check_login_gate(
        str_contains($moduleSource, '!current_user_can(PlatformAccess::CAP)') && str_contains($moduleSource, 'renderAccessDenied'),
        'a logged-in visitor without the platform capability renders the product-styled access-denied state, not WP admin',
    );
    check_login_gate(
        !str_contains($moduleSource, 'provisionDefaultUser') && !str_contains($moduleSource, "'accountmanager'"),
        'this phase never touches account/credential provisioning — that stays PlatformAccess-owned and unchanged',
    );
}

if ($failures !== []) {
    fwrite(STDERR, "\n" . count($failures) . " check(s) failed.\n");
    exit(1);
}
echo "\nAdmin Station login gate checks passed.\n";
