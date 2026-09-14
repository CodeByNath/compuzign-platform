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

$loader = new AssetLoader();
$method = new ReflectionMethod(AssetLoader::class, 'adminStationDestination');

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

echo "\n4) structural proof: no hardcoded page slug, no wp_safe_redirect() dependency, wp_logout_url() preserved\n";
{
    $source = (string) file_get_contents(__DIR__ . '/../src/Core/AssetLoader.php');

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
