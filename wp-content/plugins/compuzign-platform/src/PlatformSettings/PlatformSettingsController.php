<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformSettings;

use CompuZign\Platform\Core\PlatformAccess;

/**
 * Authenticated REST surface for Platform Settings and its Profile section.
 *
 * Every route requires the platform capability AND a valid REST nonce, so
 * editable Settings data is never reachable anonymously or cross-site. The
 * read-by-ID patterns accept exactly one full-length identifier of their own
 * type, so `profile`, `CZPS…`, and `CZPSP…` addresses can never collide.
 *
 *   GET  /admin/platform-settings
 *   GET  /admin/platform-settings/{CZPS id}
 *   GET  /admin/platform-settings/profile
 *   POST /admin/platform-settings/profile        (multipart; one Save)
 *   GET  /admin/platform-settings/profiles/{CZPSP id}
 */
final class PlatformSettingsController
{
    private const NAMESPACE = 'compuzign/v1';
    private const SUFFIX    = '[2-9A-HJKMNP-TV-Z]{5}';

    private \Closure $readUpload;

    /** @param callable(string): ?string|null $readUpload Test seam: uploaded tmp path → bytes. */
    public function __construct(private PlatformSettingsStation $station, ?callable $readUpload = null)
    {
        $this->readUpload = $readUpload === null
            ? static fn(string $path): ?string => is_uploaded_file($path) ? (file_get_contents($path) ?: null) : null
            : \Closure::fromCallable($readUpload);
    }

    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        register_rest_route(self::NAMESPACE, '/admin/platform-settings', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getSettings'],
            'permission_callback' => [$this, 'requirePlatformAccess'],
        ]);
        register_rest_route(self::NAMESPACE, '/admin/platform-settings/(?P<platform_id>CZPS' . self::SUFFIX . ')', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getSettingsByPlatformId'],
            'permission_callback' => [$this, 'requirePlatformAccess'],
        ]);
        register_rest_route(self::NAMESPACE, '/admin/platform-settings/profile', [
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'getProfile'],
                'permission_callback' => [$this, 'requirePlatformAccess'],
            ],
            [
                'methods'             => 'POST',
                'callback'            => [$this, 'saveProfile'],
                'permission_callback' => [$this, 'requirePlatformAccess'],
            ],
        ]);
        register_rest_route(self::NAMESPACE, '/admin/platform-settings/profiles/(?P<platform_id>CZPSP' . self::SUFFIX . ')', [
            'methods'             => 'GET',
            'callback'            => [$this, 'getProfileByPlatformId'],
            'permission_callback' => [$this, 'requirePlatformAccess'],
        ]);
    }

    /** Platform capability plus a valid `wp_rest` nonce in X-WP-Nonce. */
    public function requirePlatformAccess(\WP_REST_Request $request): bool
    {
        $nonce = (string) $request->get_header('X-WP-Nonce');

        return current_user_can(PlatformAccess::CAP)
            && $nonce !== ''
            && wp_verify_nonce($nonce, 'wp_rest') !== false;
    }

    public function getSettings(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->respond(fn(): array => ['settings' => $this->station->settings()]);
    }

    public function getSettingsByPlatformId(\WP_REST_Request $request): \WP_REST_Response
    {
        $platformId = strtoupper((string) $request->get_param('platform_id'));

        return $this->respond(fn(): array => ['settings' => $this->station->settingsByPlatformId($platformId)]);
    }

    public function getProfile(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->respond(fn(): array => ['profile' => $this->station->profile()]);
    }

    public function getProfileByPlatformId(\WP_REST_Request $request): \WP_REST_Response
    {
        $platformId = strtoupper((string) $request->get_param('platform_id'));

        return $this->respond(fn(): array => ['profile' => $this->station->profileByPlatformId($platformId)]);
    }

    public function saveProfile(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->respond(function () use ($request): array {
            $input = [];
            foreach (['expected_revision', 'name', 'code', 'clear_logo', 'clear_favicon',
                      'platform_id', 'parent_platform_id', 'platformId', 'parentPlatformId'] as $field) {
                if ($request->has_param($field)) {
                    $input[$field] = $request->get_param($field);
                }
            }

            return ['profile' => $this->station->saveProfile($input, $this->uploadedImages($request), get_current_user_id())];
        });
    }

    /**
     * @return array<string, string> image field => raw bytes
     * @throws PlatformSettingsFailure
     */
    private function uploadedImages(\WP_REST_Request $request): array
    {
        $files  = $request->get_file_params();
        $images = [];
        foreach (['logo', 'favicon'] as $field) {
            $file = $files[$field] ?? null;
            if (!is_array($file)) {
                continue;
            }

            $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
            if ($error === UPLOAD_ERR_NO_FILE) {
                continue;
            }
            if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
                throw PlatformSettingsFailure::image('image_too_large', $field, 'The image is larger than this server accepts.', 413);
            }
            if ($error !== UPLOAD_ERR_OK) {
                throw PlatformSettingsFailure::image('image_upload_failed', $field, 'The image did not upload completely. Try again.', 400);
            }

            $bytes = ($this->readUpload)((string) ($file['tmp_name'] ?? ''));
            if (!is_string($bytes)) {
                throw PlatformSettingsFailure::image('image_upload_failed', $field, 'The uploaded image could not be read.', 400);
            }
            $images[$field] = $bytes;
        }

        return $images;
    }

    /** @param callable(): array<string, mixed> $operation */
    private function respond(callable $operation): \WP_REST_Response
    {
        try {
            return new \WP_REST_Response(['success' => true] + $operation(), 200);
        } catch (PlatformSettingsFailure $failure) {
            $body = ['success' => false, 'code' => $failure->errorCode(), 'message' => $failure->getMessage()];
            if ($failure->fields() !== []) {
                $body['fields'] = $failure->fields();
            }

            return new \WP_REST_Response($body, $failure->status());
        }
    }
}
