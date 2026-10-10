<?php

declare(strict_types=1);

/*
 * FILE INDEX
 *
 * ACCOUNT_ROUTES       The Account Station REST route registrations
 * DETAIL_HANDLER       Read-only detail (never mints, never bootstraps)
 * PROFILE_HANDLERS     Brand draft save and settle
 * MEDIA_HANDLERS      Account-owned Logo/Favicon upload and library (host directory only)
 * LIFECYCLE_HANDLERS   Publish (platform_status) and Disable/Enable mask
 * AUTHORIZATION        Permission callback
 *
 * OWNERSHIP
 * The single backend owner of Account Station's singleton tree: its four
 * Platform ID nodes, Brand draft/canonical fields, and lifecycle state.
 * Follows the locked Station and Drawer Lifecycle Contract exactly as
 * Service does, with one module (Brand) instead of three, and no numeric
 * record id — the record IS the singleton, addressed by nothing but its own
 * fixed native references (see Support\AccountIdentity).
 */

namespace CompuZign\Platform\Modules\Account\Http;

use CompuZign\Platform\Modules\Account\Support\AccountIdentity;
use CompuZign\Platform\Modules\Account\Support\AccountMedia;
use CompuZign\Platform\Modules\Account\Support\AccountRepository;
use CompuZign\Platform\Modules\Account\Support\AccountSchema;
use CompuZign\Platform\Modules\Account\Support\AccountStorageBusy;
use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierConflict;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

class AccountController
{
    private AccountRepository $repository;
    private AccountMedia $media;

    /** @var callable(string): bool */
    private $uploadVerifier;

    /**
     * @param ?callable(string): bool $uploadVerifier Whether a tmp_name is a file PHP itself received as an
     *        HTTP upload. Defaults to is_uploaded_file(); only a test harness, which has no real HTTP
     *        upload to point at, substitutes its own.
     */
    public function __construct(private PlatformIdentifierStation $platformIdentifiers, ?callable $uploadVerifier = null, ?AccountRepository $repository = null)
    {
        $this->repository     = $repository ?? new AccountRepository();
        $this->media          = new AccountMedia($this->repository);
        $this->uploadVerifier = $uploadVerifier ?? 'is_uploaded_file';
    }

    public function register(): void
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
    }

    public function registerRoutes(): void
    {
        // ===================================================================
        // SECTION: ACCOUNT_ROUTES
        // ===================================================================
        register_rest_route('compuzign/v1', '/admin/account-station', [
            'methods'             => 'GET',
            'callback'            => [$this, 'fetchDetail'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        register_rest_route('compuzign/v1', '/admin/account-station/profile', [
            'methods'             => 'POST',
            'callback'            => [$this, 'saveProfile'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => AccountSchema::brandArgs(),
        ]);

        register_rest_route('compuzign/v1', '/admin/account-station/profile/settle', [
            'methods'             => 'POST',
            'callback'            => [$this, 'settleProfile'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        register_rest_route('compuzign/v1', '/admin/account-station/profile/media', [
            'methods'             => 'POST',
            'callback'            => [$this, 'uploadBrandMedia'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        register_rest_route('compuzign/v1', '/admin/account-station/profile/media/library', [
            'methods'             => 'GET',
            'callback'            => [$this, 'listBrandMedia'],
            'permission_callback' => [$this, 'requireAdmin'],
        ]);

        register_rest_route('compuzign/v1', '/admin/account-station/status', [
            'methods'             => 'POST',
            'callback'            => [$this, 'updateStatus'],
            'permission_callback' => [$this, 'requireAdmin'],
            'args'                => AccountSchema::statusArgs(),
        ]);
    }

    // ===================================================================
    // SECTION: DETAIL_HANDLER
    // ===================================================================

    /** Strictly read-only — never reserves, binds, or writes. An unbootstrapped install reads back its own defaults. */
    public function fetchDetail(\WP_REST_Request $request): \WP_REST_Response
    {
        $lifecycle = $this->repository->readLifecycle();

        return rest_ensure_response([
            'success'                  => true,
            'bootstrapped'             => $this->repository->isBootstrapped(),
            'nodes'                    => $this->repository->readNodes(),
            'platform_status'          => $lifecycle['platform_status'],
            'previous_platform_status' => $lifecycle['previous_platform_status'],
            'module_status'            => $lifecycle['module_status'],
            'brand'                    => AccountSchema::presentBrand($this->repository->readBrand(), $this->media),
            'drafts'                   => ['brand' => $this->presentDraft($this->repository->readBrandDraft())],
        ]);
    }

    /** readBrandDraft() returns null when there is no draft — presentBrand() only accepts a brand shape. */
    private function presentDraft(?array $draft): ?array
    {
        return $draft === null ? null : AccountSchema::presentBrand($draft, $this->media);
    }

    // ===================================================================
    // SECTION: PROFILE_HANDLERS
    // ===================================================================

    /**
     * Overview-Save equivalent: on the very first call this bootstraps the
     * four-node identity chain (Account Station -> Settings -> Tools ->
     * Profile), exactly once, then writes the Brand draft in the same
     * request — one Save, matching the Owner's Brand spec, while still
     * persisting through the same boundary Service's Overview Save uses.
     */
    public function saveProfile(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->serialized(fn (): \WP_REST_Response => $this->applyProfileSave($request));
    }

    private function applyProfileSave(\WP_REST_Request $request): \WP_REST_Response
    {
        $logoMedia = AccountSchema::resolveMediaId($request->get_param('logo_media_id'), $this->media);
        if ($logoMedia === false) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Logo must reference an existing Account image.'], 422);
        }

        $faviconMedia = AccountSchema::resolveMediaId($request->get_param('favicon_media_id'), $this->media);
        if ($faviconMedia === false) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Favicon must reference an existing Account image.'], 422);
        }

        // Legacy WordPress attachment references stay readable and re-saveable
        // until an Account image replaces them; choosing one is that explicit
        // replacement, so it wins and the legacy reference is dropped from the
        // draft (the canonical value is untouched until settle).
        $logo = $logoMedia === null ? AccountSchema::resolveAttachmentId($request->get_param('logo_attachment_id')) : null;
        if ($logo === false) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Logo must reference an existing image.'], 422);
        }

        $favicon = $faviconMedia === null ? AccountSchema::resolveAttachmentId($request->get_param('favicon_attachment_id')) : null;
        if ($favicon === false) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Favicon must reference an existing image.'], 422);
        }

        try {
            (new AccountIdentity($this->platformIdentifiers, $this->repository))->bootstrap();
        } catch (PlatformIdentifierConflict) {
            // A losing concurrent first-Save leaves a harmless unused reservation
            // behind (reservations are never reused) and must retry, not corrupt
            // the aggregate — see AccountIdentity's own idempotency note.
            return new \WP_REST_Response(['success' => false, 'message' => 'Could not establish the Account Station identity. Please retry.'], 500);
        }

        $draft = [
            'name'                  => AccountSchema::sanitizeName((string) ($request->get_param('name') ?? '')),
            'code'                  => AccountSchema::sanitizeCode((string) ($request->get_param('code') ?? '')),
            'logo_attachment_id'    => $logo,
            'favicon_attachment_id' => $favicon,
            'logo_media_id'         => $logoMedia,
            'favicon_media_id'      => $faviconMedia,
        ];

        $this->repository->writeBrandDraft($draft);

        $lifecycle = $this->repository->readLifecycle();
        $lifecycle['module_status'][AccountSchema::MODULE_BRAND] = StationLifecycle::MODULE_PENDING;
        $this->repository->writeLifecycle($lifecycle['platform_status'], $lifecycle['previous_platform_status'], $lifecycle['module_status']);

        return rest_ensure_response([
            'success'       => true,
            'draft'         => AccountSchema::presentBrand($draft, $this->media),
            'module_status' => $lifecycle['module_status'],
            // Same four-node shape fetchDetail() returns — the frontend's only
            // authoritative source for Platform IDs, since this is the first
            // request in which they can exist. Without this, the mounted drawer
            // has no way to show the bound identity after first Save short of a
            // second GET, which the locked no-remount handoff forbids.
            'nodes'         => $this->repository->readNodes(),
        ]);
    }

    /** Promotes the Brand draft to canonical. Brand has no required field, so it always settles (blanks are valid). */
    public function settleProfile(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->serialized(fn (): \WP_REST_Response => $this->applyProfileSettle($request));
    }

    private function applyProfileSettle(\WP_REST_Request $request): \WP_REST_Response
    {
        // Same existence predicate as updateStatus(): without it a settle on an
        // unbootstrapped or half-bootstrapped install would write canonical Brand
        // and module status for an Account that has no complete identity chain.
        if (!$this->repository->isBootstrapped()) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Account Station has not been set up yet. Save Brand first.'], 422);
        }

        $brand = $this->repository->settleBrandDraft();

        $lifecycle = $this->repository->readLifecycle();
        $lifecycle['module_status'][AccountSchema::MODULE_BRAND] = AccountSchema::isBrandComplete()
            ? StationLifecycle::MODULE_SETTLED
            : StationLifecycle::MODULE_NOT_CONFIGURED;
        $this->repository->writeLifecycle($lifecycle['platform_status'], $lifecycle['previous_platform_status'], $lifecycle['module_status']);

        return rest_ensure_response([
            'success'       => true,
            'brand'         => AccountSchema::presentBrand($brand, $this->media),
            'module_status' => $lifecycle['module_status'],
        ]);
    }

    // ===================================================================
    // SECTION: MEDIA_HANDLERS
    // ===================================================================

    /**
     * Accepts one image file and stores it in Account Station's own uploads
     * directory (see Support\AccountMedia) — no WordPress attachment, no Media
     * Library row. The type is sniffed from the file's bytes, never its name
     * or claimed MIME. This never touches Brand's draft or canonical state:
     * the returned id is only persisted once the caller includes it in an
     * ordinary Save.
     */
    public function uploadBrandMedia(\WP_REST_Request $request): \WP_REST_Response
    {
        $file = $request->get_file_params()['file'] ?? null;

        if (!is_array($file) || !isset($file['error'])) {
            return new \WP_REST_Response(['success' => false, 'message' => 'No file was uploaded.'], 422);
        }

        if ($file['error'] !== UPLOAD_ERR_OK) {
            return new \WP_REST_Response(['success' => false, 'message' => 'The upload failed. Please try again.'], 422);
        }

        // Only a file PHP itself received as an HTTP upload is trusted: a REST
        // caller cannot name an arbitrary server path through tmp_name.
        $tmpName = (string) ($file['tmp_name'] ?? '');
        if ($tmpName === '' || !($this->uploadVerifier)($tmpName)) {
            return new \WP_REST_Response(['success' => false, 'message' => 'No file was uploaded.'], 422);
        }

        // Real on-disk size first, so an oversize file is never read into memory.
        if ((int) filesize($tmpName) > AccountSchema::MAX_BRAND_MEDIA_BYTES) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Image must be smaller than 5 MB.'], 422);
        }

        // One read: the bytes sniffed, hashed and written below are the same bytes.
        $bytes = @file_get_contents($tmpName);
        if ($bytes === false) {
            return new \WP_REST_Response(['success' => false, 'message' => 'The upload failed. Please try again.'], 422);
        }

        $mime = $this->media->sniffMime($bytes);
        if ($mime === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Logo and Favicon must be a JPEG, PNG, GIF, or WebP image.'], 422);
        }

        try {
            $item = $this->media->store($bytes, $mime, (string) ($file['name'] ?? ''));
        } catch (AccountStorageBusy) {
            return $this->busyResponse();
        }
        if ($item === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Could not store the uploaded image.'], 500);
        }

        return rest_ensure_response(['success' => true, 'item' => $item]);
    }

    /** Every image Account Station has stored, newest first — the picker's "choose existing" list. */
    public function listBrandMedia(\WP_REST_Request $request): \WP_REST_Response
    {
        return rest_ensure_response(['success' => true, 'items' => $this->media->listItems()]);
    }

    // ===================================================================
    // SECTION: LIFECYCLE_HANDLERS
    // ===================================================================

    public function updateStatus(\WP_REST_Request $request): \WP_REST_Response
    {
        return $this->serialized(fn (): \WP_REST_Response => $this->applyStatusUpdate($request));
    }

    private function applyStatusUpdate(\WP_REST_Request $request): \WP_REST_Response
    {
        $lifecycle = $this->repository->readLifecycle();

        if ($request->has_param('action')) {
            // Same existence requirement as Publish below: a never-bootstrapped
            // install has no Account to mask. Without this, the default
            // platform_status ('disabled') reads as already-live and a stray
            // disable/enable call would mutate a singleton that doesn't exist yet.
            if (!$this->repository->isBootstrapped()) {
                return new \WP_REST_Response(['success' => false, 'message' => 'Account Station has not been set up yet. Save Brand first.'], 422);
            }

            return $this->applyDisabledMask($lifecycle, (string) $request->get_param('action'));
        }

        if (!$request->has_param('platform_status') || $request->get_param('platform_status') !== StationLifecycle::STATUS_ACTIVE) {
            return new \WP_REST_Response(['success' => false, 'message' => 'No valid status parameter provided.'], 422);
        }

        // A never-bootstrapped install has no four-node identity to activate —
        // Service has no equivalent case, since a Service id must already exist
        // before its /status route is even addressable.
        if (!$this->repository->isBootstrapped()) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Account Station has not been set up yet. Save Brand first.'], 422);
        }

        $change = StationLifecycle::publish($lifecycle['platform_status'], $lifecycle['previous_platform_status'] ?: null);
        if ($change === null) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Only a disabled Account Profile can be published.'], 422);
        }

        $this->repository->writeLifecycle($change['status'], (string) ($change['previous_status'] ?? ''), $lifecycle['module_status']);

        return $this->statusResponse();
    }

    /**
     * Disable/Enable — the same presentation mask Service uses, never a
     * lifecycle rewrite: Disable never touches module_status; Enable always
     * lands back in unmasked 'disabled' (Pending), never straight to active.
     * previous_platform_status is the mask signal itself.
     */
    private function applyDisabledMask(array $lifecycle, string $action): \WP_REST_Response
    {
        $current = $lifecycle['platform_status'];

        if ($action === 'disable') {
            if (!StationLifecycle::isLive($current)) {
                return new \WP_REST_Response(['success' => false, 'message' => 'Only an active or disabled Account Profile can be disabled.'], 422);
            }
            $previous = ($current === StationLifecycle::STATUS_ACTIVE || $lifecycle['previous_platform_status'] === '')
                ? $current
                : $lifecycle['previous_platform_status'];
            $this->repository->writeLifecycle(StationLifecycle::STATUS_DISABLED, $previous, $lifecycle['module_status']);
        } elseif ($action === 'enable') {
            if ($current !== StationLifecycle::STATUS_DISABLED) {
                return new \WP_REST_Response(['success' => false, 'message' => 'Only a disabled Account Profile can be enabled.'], 422);
            }
            $this->repository->writeLifecycle(StationLifecycle::STATUS_DISABLED, '', $lifecycle['module_status']);
        } else {
            return new \WP_REST_Response(['success' => false, 'message' => 'Invalid action.'], 422);
        }

        return $this->statusResponse();
    }

    private function statusResponse(): \WP_REST_Response
    {
        $lifecycle = $this->repository->readLifecycle();

        return rest_ensure_response([
            'success'                  => true,
            'platform_status'          => $lifecycle['platform_status'],
            'previous_platform_status' => $lifecycle['previous_platform_status'],
            'module_status'            => $lifecycle['module_status'],
        ]);
    }

    /**
     * Runs a read-decide-write handler under the Account storage lock, so two
     * overlapping Saves/Publishes cannot each act on a stale read and overwrite
     * one another. A lock that stays held past the bounded wait is a retryable
     * 503, never an unprotected write.
     */
    private function serialized(callable $handler): \WP_REST_Response
    {
        try {
            return $this->repository->withLock($handler);
        } catch (AccountStorageBusy) {
            return $this->busyResponse();
        }
    }

    private function busyResponse(): \WP_REST_Response
    {
        return new \WP_REST_Response(['success' => false, 'message' => 'Account Station is busy. Please retry.'], 503);
    }

    // ===================================================================
    // SECTION: AUTHORIZATION
    // ===================================================================

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Core\PlatformAccess::CAP);
    }
}
