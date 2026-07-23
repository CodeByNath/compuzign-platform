<?php

namespace CompuZign\Platform\Modules\Service\Support;

/**
 * Service module lifecycle rules — the domain logic for the Service drawer's
 * three modules (overview, inclusions, faqs): mark a draft pending, settle a
 * draft into canonical Active, derive module status on activation, and the
 * completeness gates each module settles against.
 *
 * Extracted verbatim from ServiceController so the HTTP layer orchestrates
 * requests while these rules live beside the schema (ServiceSchema) and pool
 * write path (ServicePools) they operate on. Behaviour is unchanged: every
 * method reads/writes cz_service_* meta and the category taxonomy exactly as
 * before. Static, like ServicePools — these are stateless rules keyed by a
 * service id, holding no controller state.
 *
 * NOT here: the cross-station pool-settle reference guard (poolSettleWarnings)
 * stays in ServiceController — it reads Package Station storage through
 * PackageRepository and is request orchestration, not a Service module rule.
 */
final class ServiceModules
{
    /**
     * Writing a draft always marks the module as 'pending', regardless of platform_status.
     * Handles not-configured → pending transition on first save for inclusions/faqs.
     */
    public static function markModuleDraft(int $id, string $module): array
    {
        $meta = get_post_meta($id, ServiceSchema::META_KEY, true);
        $meta = is_array($meta) ? $meta : [];

        if (!isset($meta['module_status']) || !is_array($meta['module_status'])) {
            $meta['module_status'] = ServiceSchema::defaultModuleStatus();
        }

        $meta['module_status'][$module] = 'pending';
        update_post_meta($id, ServiceSchema::META_KEY, $meta);

        return $meta['module_status'];
    }

    /**
     * Promotes one module's draft to canonical Active. Called by both per-module and bulk routes.
     * Returns the updated module_status array.
     */
    public static function settleModule(int $id, string $module): array
    {
        $meta = get_post_meta($id, ServiceSchema::META_KEY, true);
        $meta = is_array($meta) ? $meta : [];
        if (!isset($meta['module_status']) || !is_array($meta['module_status'])) {
            $meta['module_status'] = ServiceSchema::defaultModuleStatus();
        }

        switch ($module) {
            case 'overview':
                $draft = get_post_meta($id, ServiceSchema::DRAFT_OVERVIEW, true);
                if (!is_array($draft) || empty($draft)) break;

                $post = get_post($id);
                wp_update_post([
                    'ID'           => $id,
                    'post_title'   => $draft['title']   ?? ($post->post_title ?? ''),
                    'post_excerpt' => $draft['excerpt']  ?? '',
                    'post_content' => $draft['content']  ?? '',
                ]);

                $catIds = isset($draft['category_ids']) && is_array($draft['category_ids'])
                          ? array_map('intval', $draft['category_ids'])
                          : [];
                wp_set_object_terms($id, $catIds, ServiceSchema::CATEGORY_TAXONOMY);

                delete_post_meta($id, ServiceSchema::DRAFT_OVERVIEW);

                $freshPost = get_post($id);
                $meta['module_status']['overview'] = self::isOverviewComplete($freshPost) ? 'settled' : 'not-configured';
                break;

            case 'inclusions':
                $draft = get_post_meta($id, ServiceSchema::DRAFT_INCLUSIONS, true);
                if (!is_array($draft)) break;

                $existing = get_post_meta($id, ServiceSchema::META_INCLUSIONS, true);
                $existing = is_array($existing) ? $existing : [];
                update_post_meta($id, ServiceSchema::META_INCLUSIONS, [
                    'inclusions'      => $draft,
                    'tier_inclusions' => $existing['tier_inclusions'] ?? [],
                ]);

                delete_post_meta($id, ServiceSchema::DRAFT_INCLUSIONS);
                $meta['module_status']['inclusions'] = self::isInclusionsComplete($id) ? 'settled' : 'not-configured';
                break;

            case 'faqs':
                $draft = get_post_meta($id, ServiceSchema::DRAFT_FAQS, true);
                if (!is_array($draft)) break;

                update_post_meta($id, ServiceSchema::META_FAQS, $draft);
                delete_post_meta($id, ServiceSchema::DRAFT_FAQS);
                $meta['module_status']['faqs'] = self::isFaqsComplete($id) ? 'settled' : 'not-configured';
                break;
        }

        update_post_meta($id, ServiceSchema::META_KEY, $meta);
        return $meta['module_status'];
    }

    /**
     * On activation, drafts stay pending. Modules without drafts are resolved from canonical.
     */
    public static function resolveModuleStatusOnActivation(int $id, \WP_Post $post, array $meta): array
    {
        return [
            'overview'   => self::hasDraft($id, 'overview')
                            ? 'pending'
                            : (self::isOverviewComplete($post)  ? 'settled' : 'not-configured'),
            'inclusions' => self::hasDraft($id, 'inclusions')
                            ? 'pending'
                            : (self::isInclusionsComplete($id)   ? 'settled' : 'not-configured'),
            'faqs'       => self::hasDraft($id, 'faqs')
                            ? 'pending'
                            : (self::isFaqsComplete($id)         ? 'settled' : 'not-configured'),
        ];
    }

    public static function hasDraft(int $id, string $module): bool
    {
        $key = ServiceSchema::draftKey($module);
        return $key !== null && !empty(get_post_meta($id, $key, true));
    }

    public static function isOverviewComplete(\WP_Post $post): bool
    {
        // Overview completeness = title + category + content. Excerpt is intentionally
        // NOT required — it is not collected in the current Overview workflow, so it must
        // not block module settlement. Aligns with the frontend completeness gate.
        if (trim($post->post_title) === '')   return false;
        if (trim($post->post_content) === '')  return false;
        $terms = wp_get_post_terms($post->ID, ServiceSchema::CATEGORY_TAXONOMY, ['fields' => 'ids']);
        return !empty($terms);
    }

    public static function isInclusionsComplete(int $id): bool
    {
        $raw        = get_post_meta($id, ServiceSchema::META_INCLUSIONS, true);
        $inclusions = is_array($raw) ? ($raw['inclusions'] ?? []) : [];
        if (empty($inclusions)) return false;
        foreach ($inclusions as $inc) {
            if (trim((string) ($inc['label'] ?? '')) === '') return false;
        }
        return true;
    }

    public static function isFaqsComplete(int $id): bool
    {
        $faqs = get_post_meta($id, ServiceSchema::META_FAQS, true);
        if (!is_array($faqs) || empty($faqs)) return false;
        foreach ($faqs as $faq) {
            if (trim((string) ($faq['question'] ?? '')) === '') return false;
            if (trim((string) ($faq['answer']   ?? '')) === '') return false;
        }
        return true;
    }
}
