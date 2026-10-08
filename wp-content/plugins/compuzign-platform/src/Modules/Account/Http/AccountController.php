<?php

declare(strict_types=1);

/*
 * FILE INDEX
 *
 * ACCOUNT_ROUTES       The Account Station REST route registrations
 * DETAIL_HANDLER       Read-only detail (never mints, never bootstraps)
 * PROFILE_HANDLERS     Brand draft save and settle
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
use CompuZign\Platform\Modules\Account\Support\AccountRepository;
use CompuZign\Platform\Modules\Account\Support\AccountSchema;
use CompuZign\Platform\Modules\Admin\Support\StationLifecycle;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierConflict;
use CompuZign\Platform\PlatformIdentifier\PlatformIdentifierStation;

class AccountController
{
    private AccountRepository $repository;

    public function __construct(private PlatformIdentifierStation $platformIdentifiers)
    {
        $this->repository = new AccountRepository();
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
            'brand'                    => $this->repository->readBrand(),
            'drafts'                   => ['brand' => $this->repository->readBrandDraft()],
        ]);
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
        $logo = AccountSchema::resolveAttachmentId($request->get_param('logo_attachment_id'));
        if ($logo === false) {
            return new \WP_REST_Response(['success' => false, 'message' => 'Logo must reference an existing image.'], 422);
        }

        $favicon = AccountSchema::resolveAttachmentId($request->get_param('favicon_attachment_id'));
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
        ];

        $this->repository->writeBrandDraft($draft);

        $lifecycle = $this->repository->readLifecycle();
        $lifecycle['module_status'][AccountSchema::MODULE_BRAND] = StationLifecycle::MODULE_PENDING;
        $this->repository->writeLifecycle($lifecycle['platform_status'], $lifecycle['previous_platform_status'], $lifecycle['module_status']);

        return rest_ensure_response([
            'success'       => true,
            'draft'         => $draft,
            'module_status' => $lifecycle['module_status'],
        ]);
    }

    /** Promotes the Brand draft to canonical. Brand has no required field, so it always settles (blanks are valid). */
    public function settleProfile(\WP_REST_Request $request): \WP_REST_Response
    {
        $brand = $this->repository->settleBrandDraft();

        $lifecycle = $this->repository->readLifecycle();
        $lifecycle['module_status'][AccountSchema::MODULE_BRAND] = AccountSchema::isBrandComplete()
            ? StationLifecycle::MODULE_SETTLED
            : StationLifecycle::MODULE_NOT_CONFIGURED;
        $this->repository->writeLifecycle($lifecycle['platform_status'], $lifecycle['previous_platform_status'], $lifecycle['module_status']);

        return rest_ensure_response([
            'success'       => true,
            'brand'         => $brand,
            'module_status' => $lifecycle['module_status'],
        ]);
    }

    // ===================================================================
    // SECTION: LIFECYCLE_HANDLERS
    // ===================================================================

    public function updateStatus(\WP_REST_Request $request): \WP_REST_Response
    {
        $lifecycle = $this->repository->readLifecycle();

        if ($request->has_param('action')) {
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

    // ===================================================================
    // SECTION: AUTHORIZATION
    // ===================================================================

    public function requireAdmin(): bool
    {
        return current_user_can(\CompuZign\Platform\Core\PlatformAccess::CAP);
    }
}
