<?php
/**
 * Plugin Name: CompuZign Platform
 * Description: Core application platform.
 * Version: 1.0.0
 * Text Domain: compuzign-platform
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('COMPUZIGN_PLUGIN_VERSION')) {
    define('COMPUZIGN_PLUGIN_VERSION', '1.0.0');
}

define('COMPUZIGN_PLUGIN_FILE', __FILE__);
define('COMPUZIGN_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('COMPUZIGN_PLUGIN_URL', plugin_dir_url(__FILE__));
define('COMPUZIGN_APP_PATH', COMPUZIGN_PLUGIN_PATH . 'app/');
define('COMPUZIGN_APP_URL', COMPUZIGN_PLUGIN_URL . 'app/');
define('COMPUZIGN_DIST_PATH', COMPUZIGN_PLUGIN_PATH . 'dist/');
define('COMPUZIGN_DIST_URL', COMPUZIGN_PLUGIN_URL . 'dist/');
define('COMPUZIGN_ATOMIC_ENGINE_PATH', COMPUZIGN_PLUGIN_PATH . 'atomic-engine/');
define('COMPUZIGN_ATOMIC_ENGINE_URL', COMPUZIGN_PLUGIN_URL . 'atomic-engine/');

if (file_exists(COMPUZIGN_PLUGIN_PATH . 'vendor/autoload.php')) {
    require_once COMPUZIGN_PLUGIN_PATH . 'vendor/autoload.php';
}

require_once COMPUZIGN_APP_PATH . 'bootstrap/init.php';
