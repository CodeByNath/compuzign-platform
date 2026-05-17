<?php

namespace CompuZign\Platform\Modules\CostBuilder\Repositories;

class ServiceRepository
{
    private const POST_TYPE         = 'cz_service';
    private const CATEGORY_TAXONOMY = 'cz_service_category';

    /** @return \WP_Post[] */
    public function findByCategory(int $termId): array
    {
        return get_posts([
            'post_type'   => self::POST_TYPE,
            'post_status' => 'publish',
            'numberposts' => -1,
            'tax_query'   => [[
                'taxonomy' => self::CATEGORY_TAXONOMY,
                'field'    => 'term_id',
                'terms'    => $termId,
            ]],
        ]);
    }

    public function getMeta(int $postId): array
    {
        return get_post_meta($postId, 'cz_service_meta', true) ?: [];
    }

    public function getPricing(int $postId): array
    {
        return get_post_meta($postId, 'cz_service_pricing', true) ?: [];
    }

    /** @return \WP_Term[] */
    public function getCategories(int $postId): array
    {
        return wp_get_post_terms($postId, self::CATEGORY_TAXONOMY, ['fields' => 'all']) ?: [];
    }

    public function findCategoryBySlug(string $slug): ?\WP_Term
    {
        $term = get_term_by('slug', $slug, self::CATEGORY_TAXONOMY);
        return ($term && !is_wp_error($term)) ? $term : null;
    }
}
