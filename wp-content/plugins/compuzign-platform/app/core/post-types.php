<?php

function compuzign_register_post_types() {
    $labels = array(
        'name' => 'Services',
        'singular_name' => 'Service',
        'menu_name' => 'Services',
        'name_admin_bar' => 'Service',
        'add_new' => 'Add New',
        'add_new_item' => 'Add New Service',
        'new_item' => 'New Service',
        'edit_item' => 'Edit Service',
        'view_item' => 'View Service',
        'all_items' => 'All Services',
        'search_items' => 'Search Services',
        'not_found' => 'No services found.',
        'not_found_in_trash' => 'No services found in Trash.',
    );

    $args = array(
        'labels' => $labels,
        'public' => true,
        'has_archive' => true,
        'show_in_rest' => true,
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'rewrite' => array('slug' => 'services'),
        'menu_icon' => 'dashicons-hammer',
    );

    register_post_type('cz_service', $args);
}
add_action('init', 'compuzign_register_post_types');
