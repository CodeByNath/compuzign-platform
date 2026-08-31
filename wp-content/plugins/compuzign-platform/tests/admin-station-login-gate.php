<?php

declare(strict_types=1);

// Admin Station branded login gate (Phase 1): AdminStationAuth::handleLoginRequest()
// is the pure decision core behind the template_redirect-hooked processLogin() —
// this stub exercises it directly, without needing to mock process termination,
// covering nonce/auth handling, safe-redirect target resolution, and that no
// credential value or the underlying WP_Error's own distinguishing message ever
// reaches the returned URL. A second block does structural source-text proof
// (this repo's established convention for behavior these stubs can't otherwise
// exercise) that no retired Command Centre routing/menu/redirect mechanism was
// resurrected, and that AdminStationModule still gates on PlatformAccess::CAP.

function sanitize_key(string $value): string { return strtolower(preg_replace('/[^a-z0-9_\-]/i', '', $value) ?? ''); }
function sanitize_user(string $value): string { return trim(strip_tags($value)); }
function wp_unslash(mixed $value): mixed { return is_string($value) ? stripslashes($value) : $value; }
function is_ssl(): bool { return false; }
function home_url(string $path = '/'): string { return 'https://cz-test.local' . $path; }

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

// ── 1) Requests that are not this form's submission are left alone ─────────
echo "1) non-submissions of this form return null (page renders normally)\n";
{
    check_login_gate($auth->handleLoginRequest('GET', []) === null, 'a GET request is never processed');
    check_login_gate(
        $auth->handleLoginRequest('POST', ['cz_username' => 'x', 'cz_password' => 'y']) === null,
        'a POST with no nonce field at all is never processed',
    );
    check_login_gate(
        $auth->handleLoginRequest('POST', [AdminStationAuth::NONCE_FIELD => 'garbage', 'cz_username' => 'x']) === null,
        'a POST with an invalid/stale nonce is never processed — same as no submission, no distinguishing error',
    );
}

// ── 2) A valid submission always calls wp_signon(), never an ad-hoc check ──
echo "\n2) successful authentication redirects to the submitted same-page target\n";
{
    global $__nextSignonResult, $__lastSignonCredentials;
    $__nextSignonResult = (object) ['ID' => 42]; // any non-WP_Error value signals success

    $redirect = $auth->handleLoginRequest('POST', [
        AdminStationAuth::NONCE_FIELD    => 'valid-nonce',
        AdminStationAuth::REDIRECT_FIELD => 'https://cz-test.local/some-admin-station-page/',
        'cz_username'                    => 'nath',
        'cz_password'                    => 'correct horse battery staple',
    ]);

    check_login_gate($redirect === 'https://cz-test.local/some-admin-station-page/', 'redirects to the exact submitted page, unchanged, on success', $redirect);
    check_login_gate($__lastSignonCredentials['user_login'] === 'nath', 'the sanitized username reaches wp_signon()');
    check_login_gate($__lastSignonCredentials['user_password'] === 'correct horse battery staple', 'the raw password reaches wp_signon() unmodified (never sanitized/mangled)');
}

// ── 3) A failed attempt redirects back with a generic flag only ────────────
echo "\n3) failed authentication redirects back with a generic error flag, never the WP_Error's own message\n";
{
    global $__nextSignonResult;
    $__nextSignonResult = new WP_Error('incorrect_password', 'The password you entered is incorrect.');

    $redirect = $auth->handleLoginRequest('POST', [
        AdminStationAuth::NONCE_FIELD    => 'valid-nonce',
        AdminStationAuth::REDIRECT_FIELD => 'https://cz-test.local/some-admin-station-page/',
        'cz_username'                    => 'nath',
        'cz_password'                    => 'wrong-password-value',
    ]);

    check_login_gate($redirect === 'https://cz-test.local/some-admin-station-page/?login_error=1', 'redirects to the same page with login_error=1', $redirect);
    check_login_gate(!str_contains((string) $redirect, 'incorrect_password'), 'the WP_Error code never reaches the redirect URL');
    check_login_gate(!str_contains((string) $redirect, 'password you entered'), 'the WP_Error message never reaches the redirect URL');
    check_login_gate(!str_contains((string) $redirect, 'wrong-password-value'), 'the submitted password value never reaches the redirect URL');
    check_login_gate(!str_contains((string) $redirect, 'nath'), 'the submitted username never reaches the redirect URL');

    $__nextSignonResult = new WP_Error('invalid_username', 'Unknown username.');
    $redirectUnknown = $auth->handleLoginRequest('POST', [
        AdminStationAuth::NONCE_FIELD    => 'valid-nonce',
        AdminStationAuth::REDIRECT_FIELD => 'https://cz-test.local/some-admin-station-page/',
        'cz_username'                    => 'ghost',
        'cz_password'                    => 'x',
    ]);
    check_login_gate(
        $redirectUnknown === $redirect,
        'an unknown-username failure and a wrong-password failure produce the IDENTICAL redirect — no distinguishing feedback either way',
        $redirectUnknown,
    );
}

// ── 4) Redirect-target resolution is a same-site default, error stripped ──
echo "\n4) redirect target: sane default, and a stale login_error never survives a retry\n";
{
    global $__nextSignonResult;
    $__nextSignonResult = (object) ['ID' => 1];

    $emptyTarget = $auth->handleLoginRequest('POST', [
        AdminStationAuth::NONCE_FIELD    => 'valid-nonce',
        AdminStationAuth::REDIRECT_FIELD => '',
        'cz_username'                    => 'nath',
        'cz_password'                    => 'x',
    ]);
    check_login_gate($emptyTarget === 'https://cz-test.local/', 'an empty/missing redirect field falls back to the site home, never an external default', $emptyTarget);

    $strippedError = $auth->handleLoginRequest('POST', [
        AdminStationAuth::NONCE_FIELD    => 'valid-nonce',
        AdminStationAuth::REDIRECT_FIELD => 'https://cz-test.local/admin-station/?login_error=1',
        'cz_username'                    => 'nath',
        'cz_password'                    => 'x',
    ]);
    check_login_gate($strippedError === 'https://cz-test.local/admin-station/', 'a stale login_error on the submitted target is stripped before a successful redirect', $strippedError);
}

// ── 5) Structural proof: no retired Command Centre mechanism resurrected ──
echo "\n5) no retired Command Centre routing/menu/redirect mechanism resurrected\n";
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
    ];
    foreach ($forbidden as $symbol) {
        check_login_gate(!str_contains($combined, $symbol), "neither AdminStationAuth.php nor AdminStationModule.php reference the retired Command Centre symbol '{$symbol}'");
    }

    check_login_gate(
        str_contains($authSource, "add_action('template_redirect'"),
        'auth processing hooks template_redirect (early enough for cookies), not admin_init or a custom router',
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
