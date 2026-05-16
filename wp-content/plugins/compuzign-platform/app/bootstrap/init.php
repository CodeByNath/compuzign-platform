<?php

if (!defined('COMPUZIGN_PLUGIN_PATH')) {
    return;
}

require_once COMPUZIGN_APP_PATH . 'core/enqueue.php';
require_once COMPUZIGN_APP_PATH . 'core/rest.php';
require_once COMPUZIGN_APP_PATH . 'core/post-types.php';
require_once COMPUZIGN_APP_PATH . 'core/taxonomies.php';

$cost_builder_init = COMPUZIGN_APP_PATH . 'modules/cost-builder/init.php';
if (file_exists($cost_builder_init)) {
    require_once $cost_builder_init;
}
