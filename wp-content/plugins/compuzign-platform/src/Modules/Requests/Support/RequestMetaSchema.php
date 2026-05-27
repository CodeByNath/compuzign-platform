<?php

namespace CompuZign\Platform\Modules\Requests\Support;

class RequestMetaSchema
{
    public function register(): void
    {
        add_action('init', [$this, 'registerPostMeta']);
    }

    public function registerPostMeta(): void
    {
        // Indexed lookup key — stored separately for efficient exact-match meta queries.
        register_post_meta('cz_request', 'cz_request_ref', [
            'type'         => 'string',
            'single'       => true,
            'default'      => '',
            'show_in_rest' => false,
        ]);

        // Full payload: identical shape to transient schema + promoted_at timestamp.
        register_post_meta('cz_request', 'cz_request_data', [
            'type'         => 'object',
            'single'       => true,
            'default'      => [],
            'show_in_rest' => false,
        ]);

        // Lifecycle state — never use WP post_status for this.
        register_post_meta('cz_request', 'cz_request_status', [
            'type'         => 'string',
            'single'       => true,
            'default'      => RequestLifecycle::STATUS_NEW,
            'show_in_rest' => false,
        ]);
    }
}
