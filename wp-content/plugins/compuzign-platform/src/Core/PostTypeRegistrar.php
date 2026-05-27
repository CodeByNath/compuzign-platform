<?php

namespace CompuZign\Platform\Core;

class PostTypeRegistrar
{
    public function register(): void
    {
        add_action('init', [$this, 'registerPostTypes']);
    }

    public function registerPostTypes(): void
    {
        register_post_type('cz_surface_package', [
            'labels'       => [
                'name'               => 'Surface Packages',
                'singular_name'      => 'Surface Package',
                'add_new_item'       => 'Add New Surface Package',
                'edit_item'          => 'Edit Surface Package',
                'new_item'           => 'New Surface Package',
                'view_item'          => 'View Surface Package',
                'search_items'       => 'Search Surface Packages',
                'not_found'          => 'No surface packages found.',
                'not_found_in_trash' => 'No surface packages in trash.',
            ],
            'public'                => false,
            'publicly_queryable'    => false,
            'show_ui'               => false,
            'show_in_nav_menus'     => false,
            'show_in_rest'          => false,
            'has_archive'           => false,
            'rewrite'               => false,
            'query_var'             => false,
            'supports'              => ['title'],
            'capability_type'       => 'post',
            'capabilities'          => [
                'create_posts' => 'manage_options',
                'edit_post'    => 'manage_options',
                'delete_post'  => 'manage_options',
                'read_post'    => 'manage_options',
            ],
            'map_meta_cap'          => true,
        ]);

        register_post_type('cz_service', [
            'labels'       => [
                'name'               => 'Services',
                'singular_name'      => 'Service',
                'menu_name'          => 'Services',
                'name_admin_bar'     => 'Service',
                'add_new'            => 'Add New',
                'add_new_item'       => 'Add New Service',
                'new_item'           => 'New Service',
                'edit_item'          => 'Edit Service',
                'view_item'          => 'View Service',
                'all_items'          => 'All Services',
                'search_items'       => 'Search Services',
                'not_found'          => 'No services found.',
                'not_found_in_trash' => 'No services found in Trash.',
            ],
            'public'       => true,
            'has_archive'  => true,
            'show_in_rest' => true,
            'supports'     => ['title', 'editor', 'thumbnail', 'excerpt'],
            'rewrite'      => ['slug' => 'services'],
            'menu_icon'    => 'dashicons-hammer',
        ]);
    }
}
