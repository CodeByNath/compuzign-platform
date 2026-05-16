<?php

function compuzign_register_taxonomies() {
    $category_labels = array(
        'name' => 'Service Categories',
        'singular_name' => 'Service Category',
        'search_items' => 'Search Service Categories',
        'all_items' => 'All Service Categories',
        'parent_item' => 'Parent Service Category',
        'parent_item_colon' => 'Parent Service Category:',
        'edit_item' => 'Edit Service Category',
        'update_item' => 'Update Service Category',
        'add_new_item' => 'Add New Service Category',
        'new_item_name' => 'New Service Category Name',
        'menu_name' => 'Service Categories',
    );

    register_taxonomy(
        'cz_service_category',
        array('cz_service'),
        array(
            'labels' => $category_labels,
            'hierarchical' => true,
            'show_in_rest' => true,
            'rewrite' => array('slug' => 'service-category'),
        )
    );

    $billing_labels = array(
        'name' => 'Billing Cycles',
        'singular_name' => 'Billing Cycle',
        'search_items' => 'Search Billing Cycles',
        'all_items' => 'All Billing Cycles',
        'edit_item' => 'Edit Billing Cycle',
        'update_item' => 'Update Billing Cycle',
        'add_new_item' => 'Add New Billing Cycle',
        'new_item_name' => 'New Billing Cycle Name',
        'menu_name' => 'Billing Cycles',
    );

    register_taxonomy(
        'cz_billing_cycle',
        array('cz_service'),
        array(
            'labels' => $billing_labels,
            'hierarchical' => false,
            'show_in_rest' => true,
            'rewrite' => array('slug' => 'billing-cycle'),
        )
    );
}
add_action('init', 'compuzign_register_taxonomies');
