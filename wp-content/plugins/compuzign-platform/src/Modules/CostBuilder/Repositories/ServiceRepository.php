<?php

namespace CompuZign\Platform\Modules\CostBuilder\Repositories;

use CompuZign\Platform\Modules\CostBuilder\Support\MetaSchema;

class ServiceRepository
{
    private const POST_TYPE         = 'cz_service';
    private const CATEGORY_TAXONOMY = 'cz_service_category';

    /**
     * Return published services in a category that are also platform_status=active.
     * post_status=publish is required by WordPress; platform_status=active is the
     * CompuZign business gate (Rule 2). Legacy records without platform_status are
     * resolved via MetaSchema::resolvePlatformStatus() for backward compat (Rule 8).
     *
     * @return \WP_Post[]
     */
    public function findByCategory(int $termId): array
    {
        $posts = get_posts([
            'post_type'   => self::POST_TYPE,
            'post_status' => 'publish',
            'numberposts' => -1,
            'tax_query'   => [[
                'taxonomy' => self::CATEGORY_TAXONOMY,
                'field'    => 'term_id',
                'terms'    => $termId,
            ]],
        ]);

        return array_values(array_filter($posts, function (\WP_Post $post): bool {
            $meta = get_post_meta($post->ID, 'cz_service_meta', true);
            $meta = is_array($meta) ? $meta : [];
            return MetaSchema::resolvePlatformStatus($meta, $post->post_status) === 'active';
        }));
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

    public function getInclusions(int $postId): array
    {
        return get_post_meta($postId, 'cz_service_inclusions', true) ?: [];
    }

    public function getFaqs(int $postId): array
    {
        return get_post_meta($postId, 'cz_service_faqs', true) ?: [];
    }
}
