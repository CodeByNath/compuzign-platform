<?php

declare(strict_types=1);

// Admin Station header User-menu Log out redirect (2026-09-15 correction):
// wp_logout_url()'s $redirect argument must resolve the CANONICAL permalink
// of whichever page is actually hosting the Admin Station shortcode, never a
// hardcoded slug — the same source-grounded has_shortcode()/queried-post
// predicate AdminStationAuth::isAdminStationRequest() already uses for the
// post-login redirect (see tests/admin-station-login-gate.php). This
// exercises AssetLoader's private adminStationDestination() directly via
// Reflection — the smallest surface testable without standing up the rest of
// the asset-enqueue pipeline (rest_url()/wp_create_nonce()/dist paths/etc,
// all unrelated to this fix) — plus a structural source-text proof that the
// fix never reintroduces a hardcoded page slug or a wp_safe_redirect()
// dependency (whose own un-overridable fallback is admin_url()).

function is_singular(): bool
{
    global $__singular;
    return $__singular;
}

function get_post(): ?WP_Post
{
    global $__post;
    return $__post;
}

function has_shortcode(string $content, string $tag): bool
{
    return str_contains($content, '[' . $tag);
}

function get_permalink(WP_Post $post): string|false
{
    global $__permalink;
    return $__permalink;
}

function home_url(string $path = '/'): string
{
    return 'https://cz-test.local' . $path;
}

// Faithful to core: wp_logout_url() delegates to wp_nonce_url(), which returns
// esc_html()'d output — so every `&` comes back as `&amp;`. Reproducing that
// here is the whole point: without the decode under test, these assertions
// fail exactly the way live did.
function wp_logout_url(string $redirect = ''): string
{
    $url = 'https://cz-test.local/wp-login.php?action=logout';
    if ($redirect !== '') {
        $url .= '&redirect_to=' . urlencode($redirect);
    }
    $url .= '&_wpnonce=test-log-out-nonce';
    return str_replace('&', '&amp;', $url);
}

// The subset of WP's own ENT_QUOTES translation table a URL can carry.
function wp_specialchars_decode(string $text, int $quote_style = ENT_NOQUOTES): string
{
    return strtr($text, ['&amp;' => '&', '&lt;' => '<', '&gt;' => '>', '&quot;' => '"', '&#039;' => "'"]);
}

function esc_url_raw(string $url): string
{
    return $url;
}

class WP_Post
{
    public function __construct(public string $post_content) {}
}

// AdminStationModule.php is required only for its SHORTCODE constant, never
// instantiated or invoked — referencing a class constant does not touch its
// methods' own Core\PlatformAccess/Health dependencies, which this stub
// deliberately does not define (same reasoning as the login-gate test).
require_once __DIR__ . '/../src/Modules/AdminStation/AdminStationModule.php';
require_once __DIR__ . '/../src/Core/AssetLoader.php';

use CompuZign\Platform\Core\AssetLoader;
use CompuZign\Platform\Modules\AdminStation\AdminStationModule;

$failures = [];
function check_logout_redirect(bool $condition, string $label, mixed $detail = null): void
{
    global $failures;
    if ($condition) {
        echo "  ok — {$label}\n";
        return;
    }
    $failures[] = $label;
    echo '  FAIL — ' . $label . ($detail !== null ? ': ' . json_encode($detail) : '') . "\n";
}

$loader    = new AssetLoader();
$method    = new ReflectionMethod(AssetLoader::class, 'adminStationDestination');
$logoutUrl = new ReflectionMethod(AssetLoader::class, 'adminStationLogoutUrl');

global $__singular, $__post, $__permalink;

echo "1) resolves the Admin Station page's own canonical permalink\n";
{
    $__singular  = true;
    $__post      = new WP_Post('some intro text [' . AdminStationModule::SHORTCODE . '] more text');
    $__permalink = 'https://cz-test.local/wherever-this-page-actually-lives/';

    $destination = $method->invoke($loader);
    check_logout_redirect($destination === $__permalink, "returns the queried post's own canonical permalink, not a guessed/hardcoded path", $destination);
}

echo "\n2) never assumes a fixed slug — a differently-slugged host page resolves correctly too\n";
{
    $__singular  = true;
    $__post      = new WP_Post('[' . AdminStationModule::SHORTCODE . ']');
    $__permalink = 'https://cz-test.local/completely/different/path/';

    $destination = $method->invoke($loader);
    check_logout_redirect($destination === $__permalink, 'follows the shortcode wherever it actually lives, proving no slug is hardcoded', $destination);
}

echo "\n3) off the Admin Station page — or when the permalink can't be resolved — falls back to the front page, never wp-admin\n";
{
    $__singular  = false;
    $__post      = null;
    $__permalink = false;
    $destination = $method->invoke($loader);
    check_logout_redirect($destination === home_url('/'), 'falls back to the site front page when off any singular page', $destination);

    $__singular  = true;
    $__post      = new WP_Post('a page with no Admin Station shortcode at all');
    $destination = $method->invoke($loader);
    check_logout_redirect($destination === home_url('/'), 'falls back to the front page on a singular page that does not carry the shortcode', $destination);

    $__singular  = true;
    $__post      = new WP_Post('[' . AdminStationModule::SHORTCODE . ']');
    $__permalink = false; // get_permalink() can legitimately return false
    $destination = $method->invoke($loader);
    check_logout_redirect($destination === home_url('/'), "falls back to the front page if get_permalink() itself returns false", $destination);
}

// The 2026-09-15 live failure: wp_logout_url()'s HTML-encoded `&amp;` reached
// window.CompuZignConfig verbatim, renaming `_wpnonce` to `amp;_wpnonce` and
// `redirect_to` to `amp;redirect_to`. WordPress therefore saw neither, showed
// its own "Do you really want to log out?" confirmation, and then landed on
// wp-login.php. These assertions fail if that decode is ever removed.
echo "\n4) the runtime config URL is decoded for JavaScript — real `&` separators, no HTML entities\n";
{
    $__singular  = true;
    $__post      = new WP_Post('[' . AdminStationModule::SHORTCODE . ']');
    $__permalink = 'https://cz-test.local/wherever-this-page-actually-lives/';

    $url = $logoutUrl->invoke($loader);

    check_logout_redirect(!str_contains($url, '&amp;'), 'carries no literal &amp; — the exact defect seen live in the browser URL', $url);
    check_logout_redirect(str_contains($url, '&_wpnonce='), 'the nonce parameter is named _wpnonce, not amp;_wpnonce', $url);
    check_logout_redirect(str_contains($url, '&redirect_to='), 'the redirect parameter is named redirect_to, not amp;redirect_to', $url);
    check_logout_redirect(!str_contains($url, 'amp;'), 'no `amp;`-prefixed parameter name survives anywhere in the URL', $url);
    check_logout_redirect(
        str_contains($url, 'redirect_to=' . urlencode($__permalink)),
        'still redirects back to the canonical shortcode-hosting permalink',
        $url,
    );

    // parse_str() is what a server does with the query string — the real proof
    // that WordPress can actually read both parameters back.
    parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
    check_logout_redirect(($query['action'] ?? null) === 'logout', 'action=logout parses back correctly', $query);
    check_logout_redirect(($query['_wpnonce'] ?? null) === 'test-log-out-nonce', 'the nonce parses back under its own name, so logout is not challenged', $query);
    check_logout_redirect(($query['redirect_to'] ?? null) === $__permalink, 'redirect_to parses back to the Admin Station page itself', $query);
}

echo "\n5) structural proof: no hardcoded page slug, no wp_safe_redirect() dependency, wp_logout_url() preserved\n";
{
    // Strips // and /* */ comments via PHP's own tokenizer — this file's own
    // explanatory prose legitimately names symbols the checks below prove are
    // absent from actual code (same convention as the login-gate test).
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

    $source = $stripComments((string) file_get_contents(__DIR__ . '/../src/Core/AssetLoader.php'));

    check_logout_redirect(
        str_contains($source, 'wp_specialchars_decode('),
        'the HTML-entity decode is still applied before the URL reaches runtime config',
    );
    check_logout_redirect(
        !str_contains($source, 'wp-login.php') && !str_contains($source, "'log-out'"),
        'the logout endpoint and its nonce are never hand-built — both come from wp_logout_url() alone',
    );

    check_logout_redirect(
        !str_contains($source, "'/studio/'") && !str_contains($source, '"/studio/"'),
        'AssetLoader.php contains no hardcoded /studio/ (or similar) page slug',
    );
    check_logout_redirect(str_contains($source, 'wp_logout_url('), 'still uses wp_logout_url() — WordPress remains logout/session owner');
    check_logout_redirect(!str_contains($source, 'wp_safe_redirect'), "never calls wp_safe_redirect() directly — its own un-overridable fallback is admin_url()");
    check_logout_redirect(
        str_contains($source, 'has_shortcode(') && str_contains($source, 'AdminStationModule::SHORTCODE'),
        'the destination predicate is source-grounded (checks the actual shortcode is present), not a hardcoded page slug',
    );
    check_logout_redirect(str_contains($source, 'get_permalink('), "resolves the CANONICAL permalink, not a raw \$_SERVER['REQUEST_URI'] string");
    check_logout_redirect(!str_contains($source, 'REQUEST_URI'), 'no longer derives the destination from the raw request path');
}

if ($failures !== []) {
    fwrite(STDERR, "\n" . count($failures) . " check(s) failed.\n");
    exit(1);
}
echo "\nAdmin Station logout redirect checks passed.\n";
