<?php

namespace CompuZign\Platform\Core;

/**
 * PlatformAccess — the shared platform capability, role, and default holder.
 *
 * This is the single backend authority for who may reach CompuZign's
 * authenticated admin surfaces. It owns only access registration: the platform
 * capability, the role that carries it, the transparent grant for developers,
 * and provisioning of the initial platform user. It contains no routing, menu,
 * redirect, asset, or UI logic.
 *
 * Capability model:
 *   manage_compuzign — the platform capability that gates the admin surfaces.
 *   Granted natively to users in the cz_platform_manager role (registered here).
 *   Also granted transparently (via user_has_cap filter) to any user who has
 *   manage_options, so developer accounts retain access without role migration.
 *
 * Provisioning:
 *   Assign new business/platform users the 'cz_platform_manager' role.
 *   They receive manage_compuzign natively and never need install_plugins.
 */
class PlatformAccess
{
    public const CAP  = 'manage_compuzign';
    public const ROLE = 'cz_platform_manager';

    public function register(): void
    {
        add_action('init',         [$this, 'registerRole'],         1);
        add_action('init',         [$this, 'provisionDefaultUser'], 2);
        add_filter('user_has_cap', [$this, 'grantPlatformCap'], 10, 4);
    }

    // ── Role ──────────────────────────────────────────────────────────────────

    /**
     * Register the platform manager role on init if it does not yet exist.
     * The role carries manage_compuzign and read only — no WP admin surface access.
     * Also repairs a stale DB entry where the role exists but is missing manage_compuzign
     * (e.g., from a previous deploy that stored an incomplete capability set).
     * Idempotent: safe to run on every request.
     */
    public function registerRole(): void
    {
        $role = get_role(self::ROLE);

        if ($role === null) {
            add_role(self::ROLE, 'Platform Manager', [
                self::CAP => true,
                'read'    => true,
            ]);
            return;
        }

        if (empty($role->capabilities[self::CAP])) {
            $role->add_cap(self::CAP, true);
        }
    }

    /**
     * Provision the default platform user on first run.
     * Skips immediately once the account exists — one DB lookup, no overhead.
     * Credentials are initial values only; the password can be changed in WP admin.
     */
    public function provisionDefaultUser(): void
    {
        if (get_user_by('login', 'accountmanager') !== false) {
            return;
        }

        $host  = (string) parse_url(home_url(), PHP_URL_HOST);
        $email = 'accountmanager@' . ($host ?: 'compuzign.com');

        wp_insert_user([
            'user_login'   => 'accountmanager',
            'user_pass'    => 'Compuzign@2026',
            'display_name' => 'Account Manager',
            'user_email'   => $email,
            'role'         => self::ROLE,
        ]);
    }

    // ── Capability ────────────────────────────────────────────────────────────

    /**
     * Grant manage_compuzign to any user who already has manage_options.
     * Fires on every current_user_can() call — keep the fast path cheap.
     */
    public function grantPlatformCap(array $allCaps, array $caps, array $args, \WP_User $user): array
    {
        if (!empty($allCaps[self::CAP]) || empty($allCaps['manage_options'])) {
            return $allCaps;
        }
        $allCaps[self::CAP] = true;
        return $allCaps;
    }
}
