<?php

namespace CompuZign\Platform\Core;

class TaxonomyRegistrar
{
    public function register(): void
    {
        add_action('init', [$this, 'registerTaxonomies']);
    }

    public function registerTaxonomies(): void
    {
        register_taxonomy('cz_service_category', ['cz_service'], [
            'labels'       => [
                'name'              => 'Service Categories',
                'singular_name'     => 'Service Category',
                'search_items'      => 'Search Service Categories',
                'all_items'         => 'All Service Categories',
                'parent_item'       => 'Parent Service Category',
                'parent_item_colon' => 'Parent Service Category:',
                'edit_item'         => 'Edit Service Category',
                'update_item'       => 'Update Service Category',
                'add_new_item'      => 'Add New Service Category',
                'new_item_name'     => 'New Service Category Name',
                'menu_name'         => 'Service Categories',
            ],
            'hierarchical' => true,
            'show_in_rest' => true,
            'rewrite'      => ['slug' => 'service-category'],
        ]);

        register_taxonomy('cz_billing_cycle', ['cz_service'], [
            'labels'       => [
                'name'          => 'Billing Cycles',
                'singular_name' => 'Billing Cycle',
                'search_items'  => 'Search Billing Cycles',
                'all_items'     => 'All Billing Cycles',
                'edit_item'     => 'Edit Billing Cycle',
                'update_item'   => 'Update Billing Cycle',
                'add_new_item'  => 'Add New Billing Cycle',
                'new_item_name' => 'New Billing Cycle Name',
                'menu_name'     => 'Billing Cycles',
            ],
            'hierarchical' => false,
            'show_in_rest' => true,
            'rewrite'      => ['slug' => 'billing-cycle'],
        ]);
    }
}
