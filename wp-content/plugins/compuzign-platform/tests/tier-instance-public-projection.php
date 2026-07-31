<?php

declare(strict_types=1);

$publicProjectionOption = null;
$publicProjectionPosts = [];
$publicProjectionMeta = [];

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_title')) {
    function sanitize_title(mixed $value): string
    {
        return trim((string) preg_replace('/[^a-z0-9]+/', '-', strtolower((string) $value)), '-');
    }
}
if (!function_exists('current_time')) {
    function current_time(string $type, bool $gmt = false): string { return '2026-07-25 00:00:00'; }
}
if (!function_exists('get_option')) {
    function get_option(string $key, mixed $default = false): mixed
    {
        global $publicProjectionOption;
        return $key === 'cz_package_station' ? ($publicProjectionOption ?? $default) : $default;
    }
}
if (!function_exists('update_option')) {
    function update_option(string $key, mixed $value, bool $autoload = false): bool
    {
        global $publicProjectionOption;
        if ($key === 'cz_package_station') $publicProjectionOption = $value;
        return true;
    }
}
if (!function_exists('get_posts')) {
    function get_posts(array $args = []): array { return []; }
}
if (!function_exists('get_post')) {
    function get_post(int $postId): ?WP_Post
    {
        global $publicProjectionPosts;
        return $publicProjectionPosts[$postId] ?? null;
    }
}
if (!function_exists('get_post_meta')) {
    function get_post_meta(int $postId, string $key = '', bool $single = false): mixed
    {
        global $publicProjectionMeta;
        return $publicProjectionMeta[$postId][$key] ?? ($single ? null : []);
    }
}
if (!function_exists('wp_get_post_terms')) {
    function wp_get_post_terms(int $postId, string $taxonomy, array $args = []): array { return []; }
}
if (!function_exists('rest_ensure_response')) {
    function rest_ensure_response(mixed $value): WP_REST_Response
    {
        return $value instanceof WP_REST_Response ? $value : new WP_REST_Response($value, 200);
    }
}

if (!class_exists('WP_Post')) {
    class WP_Post
    {
        public int $ID;
        public string $post_type = 'cz_service';
        public string $post_status = 'publish';
        public string $post_title;
        public string $post_name;

        public function __construct(int $id, string $title)
        {
            $this->ID = $id;
            $this->post_title = $title;
            $this->post_name = sanitize_title($title);
        }
    }
}
if (!class_exists('WP_REST_Request')) {
    class WP_REST_Request {}
}
if (!class_exists('WP_REST_Response')) {
    class WP_REST_Response
    {
        public function __construct(private mixed $data = null, private int $status = 200) {}
        public function get_data(): mixed { return $this->data; }
        public function get_status(): int { return $this->status; }
    }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Http\PackageStationReadController;
use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\PackageManagerSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierAssignmentSchema;
use CompuZign\Platform\Modules\SurfacePackages\Support\TierInstanceSchema;

function check_public_projection(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier instance public projection: ' . $message);
    }
}

function public_projection_family(string $id, string $label, string $status = 'active'): array
{
    return [
        'group_id' => $id,
        'label' => $label,
        'description' => '',
        'platform_status' => $status,
        'previous_platform_status' => null,
        'module_status' => ['overview' => 'settled'],
        'overview_draft' => null,
        'sort_order' => 0,
    ];
}

function public_projection_instance(
    string $id,
    string $title,
    string $label,
    string $rateSheetId,
    string $rateItemId,
    string $status = 'active',
    ?string $addonLabel = null
): array {
    $tiers = TierInstanceSchema::emptyTierMap();
    $tiers['basic'] = [
        'current_occupant' => [
            'id' => 'occ_' . substr(hash('sha256', $id), 0, 8),
            'label' => $label,
            'ideal_for' => '',
            'price' => null,
            'contact' => false,
            'billing_cycle' => 'monthly',
            'rate_sheet_id' => $rateSheetId,
            'rate_sheet_items' => [['item_id' => $rateItemId, 'quantity' => 1]],
            'inclusions_override' => [],
            'features' => [],
            'faq_refs' => [],
            'platform_status' => $status,
            'is_addon' => false,
        ],
        'history' => [],
    ];
    if ($addonLabel !== null) {
        $tiers['standard'] = [
            'current_occupant' => [
                'id' => 'occ_' . substr(hash('sha256', $id . '_addon'), 0, 8),
                'label' => $addonLabel,
                'ideal_for' => '',
                'price' => null,
                'contact' => false,
                'billing_cycle' => 'monthly',
                'rate_sheet_id' => $rateSheetId,
                'rate_sheet_items' => [['item_id' => $rateItemId, 'quantity' => 1]],
                'inclusions_override' => [],
                'features' => [],
                'faq_refs' => [],
                'platform_status' => $status,
                'is_addon' => true,
            ],
            'history' => [],
        ];
    }
    return [
        'tier_instance_id' => $id,
        'title' => $title,
        'status' => $status,
        'allowed_rate_sheet_ids' => [$rateSheetId],
        'popular_tier' => 'basic',
        'popular_label' => $title . ' popular',
        'tiers' => $tiers,
        'occupant_bin' => [],
    ];
}

$serviceNames = [
    101 => 'KAIROS Service',
    102 => 'APTOS Service',
    103 => 'OMNIA Service',
    104 => 'No Family Service',
    105 => 'Archived Family Service',
    106 => 'Unready Instance Service',
    107 => 'Ambiguous Family Service',
    108 => 'Unknown Instance Service',
    109 => 'No Relationship Service',
];
foreach ($serviceNames as $serviceId => $title) {
    $publicProjectionPosts[$serviceId] = new WP_Post($serviceId, $title);
    $publicProjectionMeta[$serviceId] = [
        'cz_service_meta' => ['platform_status' => 'active'],
        'cz_service_inclusions' => ['inclusions' => [[
            'id' => 'inc_' . $serviceId,
            'label' => $title . ' inclusion',
        ]]],
        'cz_service_faqs' => [],
    ];
}

$families = [
    public_projection_family('pcg_kairos', 'KAIROS'),
    public_projection_family('pcg_aptos', 'APTOS'),
    public_projection_family('pcg_omnia', 'OMNIA'),
    public_projection_family('pcg_archived', 'ARCHIVED', 'archived'),
    public_projection_family('pcg_unready', 'UNREADY'),
    public_projection_family('pcg_unknown', 'UNKNOWN'),
];
$sources = [
    ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 101, 'category_group_id' => 'pcg_kairos'],
    ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 102, 'category_group_id' => 'pcg_aptos'],
    ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 103, 'category_group_id' => 'pcg_omnia'],
    ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 104, 'category_group_id' => null],
    ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 105, 'category_group_id' => 'pcg_archived'],
    ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 106, 'category_group_id' => 'pcg_unready'],
    ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 107, 'category_group_id' => 'pcg_kairos'],
    // Deliberately corrupt duplicate: the public resolver sees both and fails closed.
    ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 107, 'category_group_id' => 'pcg_aptos'],
    ['provider_key' => 'service', 'entity_type' => 'service', 'entity_id' => 108, 'category_group_id' => 'pcg_unknown'],
];

$kairosSourceId = 'inc_101';
$aptosSourceId = 'service:102:inc_102';
$kairosManagerItemId = PackageManagerSchema::deriveItemId('inclusion', $kairosSourceId);
$aptosManagerItemId = PackageManagerSchema::deriveItemId('inclusion', $aptosSourceId);
$rateItemId = 'rate_shared_identity';
$manager = [
    'sources' => $sources,
    'groups' => [],
    'category_groups' => $families,
    'items' => [],
    'rate_sheets' => [
        [
            'rate_sheet_id' => 'rs_kairos',
            'title' => 'KAIROS Rates',
            'status' => 'active',
            'groups' => [],
            'items' => [[
                'item_id' => $rateItemId,
                'source_item_id' => $kairosManagerItemId,
                'unit_price' => 11,
                'per' => 'Per item',
                'quantity' => 1,
                'group_id' => null,
            ]],
        ],
        [
            'rate_sheet_id' => 'rs_aptos',
            'title' => 'APTOS Rates',
            'status' => 'active',
            'groups' => [],
            'items' => [[
                'item_id' => $rateItemId,
                'source_item_id' => $aptosManagerItemId,
                'unit_price' => 22,
                'per' => 'Per item',
                'quantity' => 1,
                'group_id' => null,
            ]],
        ],
    ],
];

$instances = [
    public_projection_instance('ti_kairos', 'KAIROS Tier Set', 'KAIROS Basic', 'rs_kairos', $rateItemId, 'active', 'Backup & DR Shield'),
    public_projection_instance('ti_aptos', 'APTOS Tier Set', 'APTOS Basic', 'rs_aptos', $rateItemId),
    public_projection_instance('ti_unready', 'Unready Tier Set', 'Unready Basic', 'rs_kairos', $rateItemId, 'disabled'),
];
$assignments = [
    [
        'assignment_id' => TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_kairos', 'ti_kairos'),
        'consumer_type' => 'package_family', 'consumer_id' => 'pcg_kairos', 'tier_instance_id' => 'ti_kairos',
    ],
    [
        'assignment_id' => TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_aptos', 'ti_aptos'),
        'consumer_type' => 'package_family', 'consumer_id' => 'pcg_aptos', 'tier_instance_id' => 'ti_aptos',
    ],
    [
        'assignment_id' => TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_archived', 'ti_kairos'),
        'consumer_type' => 'package_family', 'consumer_id' => 'pcg_archived', 'tier_instance_id' => 'ti_kairos',
    ],
    [
        'assignment_id' => TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_unready', 'ti_unready'),
        'consumer_type' => 'package_family', 'consumer_id' => 'pcg_unready', 'tier_instance_id' => 'ti_unready',
    ],
    [
        'assignment_id' => TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_unknown', 'ti_missing'),
        'consumer_type' => 'package_family', 'consumer_id' => 'pcg_unknown', 'tier_instance_id' => 'ti_missing',
    ],
];

// Sharing remains representable only as corrupt input and is denied by the
// assignment sanitiser. Keep the controller fixture valid by giving ARCHIVED
// its own assigned instance; public projection still rejects the inactive Family.
$instances[] = public_projection_instance('ti_archived', 'Archived Tier Set', 'Archived Basic', 'rs_kairos', $rateItemId);
$assignments[2]['assignment_id'] = TierAssignmentSchema::deriveAssignmentId('package_family', 'pcg_archived', 'ti_archived');
$assignments[2]['tier_instance_id'] = 'ti_archived';

$publicProjectionOption = [
    'platform_status' => 'active',
    'tiers' => ['basic' => ['label' => 'Forbidden legacy fallback', 'price' => 999]],
    'tier_instances' => $instances,
    'tier_assignments' => $assignments,
    'popular_tier' => 'ultimate',
    'popular_label' => 'Forbidden legacy popular',
    'sort_position' => 0,
    'bundle' => ['title' => '', 'description' => '', 'price' => null],
    'occupant_bin' => [],
    'promotions' => [],
    'package_manager' => $manager,
    'legacy_host_service_id' => 101,
    'valid_from' => null,
    'valid_until' => null,
];

$repository = new PackageRepository();
$publicMap = $repository->findAllActiveIndexedByServiceId();
check_public_projection(array_keys($publicMap) === [101, 102], 'only KAIROS and APTOS resolve publicly');
check_public_projection($publicMap[101]['tiers']['basic']['label'] === 'KAIROS Basic', 'KAIROS receives only its assigned Tier occupant');
check_public_projection($publicMap[102]['tiers']['basic']['label'] === 'APTOS Basic', 'APTOS receives only its assigned Tier occupant');
check_public_projection($publicMap[101]['tiers']['basic']['price'] === 11.0, 'KAIROS resolves the shared row id inside rs_kairos');
check_public_projection($publicMap[102]['tiers']['basic']['price'] === 22.0, 'APTOS resolves the shared row id inside rs_aptos');
check_public_projection($publicMap[101]['popular_label'] === 'KAIROS Tier Set popular', 'KAIROS popular configuration comes from its instance');
check_public_projection($publicMap[102]['popular_label'] === 'APTOS Tier Set popular', 'APTOS popular configuration comes from its instance');
check_public_projection($publicMap[101]['tiers']['basic']['is_addon'] === false, 'a normal occupant survives the repository projection as is_addon: false');
check_public_projection($publicMap[101]['tiers']['standard']['is_addon'] === true, 'an add-on occupant survives the repository projection as is_addon: true, ready for PricingBuilder::overlayPackage');
check_public_projection($publicMap[101]['tiers']['standard']['label'] === 'Backup & DR Shield', 'the add-on occupant keeps its own label through the repository projection');
check_public_projection(!str_contains(serialize($publicMap), 'Forbidden legacy fallback'), 'legacy global Tiers never enter an assigned projection');

$disabledServiceIds = $repository->findDisabledPackageServiceIds();
foreach ([103, 104, 105, 106, 107, 108] as $serviceId) {
    check_public_projection(isset($disabledServiceIds[$serviceId]), "unresolved covered Service {$serviceId} suppresses legacy fallback");
    check_public_projection(!isset($publicMap[$serviceId]), "unresolved covered Service {$serviceId} has no public package projection");
}
check_public_projection(isset($disabledServiceIds[103]), 'genuinely unassigned OMNIA is explicitly unavailable, not a legacy fallback');
check_public_projection(!isset($disabledServiceIds[109]), 'a Service with no Package source relationship remains the existing no-package path');

$sanitizedManager = PackageManagerSchema::sanitize($manager);
check_public_projection(
    TierInstanceSchema::resolveInstanceForService(109, $sanitizedManager, $assignments, $instances) === null,
    'no source relationship fails closed'
);
check_public_projection(
    TierInstanceSchema::resolveInstanceForService(104, $sanitizedManager, $assignments, $instances) === null,
    'null Family relationship fails closed'
);

$readResponse = (new PackageStationReadController($repository))->list(new WP_REST_Request())->get_data();
check_public_projection($readResponse['total'] === 4, 'admin read emits one row per valid assigned instance');
$rowsByTitle = [];
foreach ($readResponse['packages'] as $row) $rowsByTitle[$row['title']] = $row;
check_public_projection($rowsByTitle['KAIROS Tier Set']['service_refs'] === [101, 107], 'KAIROS assigned row carries its related Services');
check_public_projection($rowsByTitle['APTOS Tier Set']['service_refs'] === [102, 107], 'APTOS assigned row remains separate');
check_public_projection($rowsByTitle['KAIROS Tier Set']['tiers']['basic']['price'] === 11.0, 'assigned-instance read row preserves KAIROS Rate Sheet identity');
check_public_projection($rowsByTitle['APTOS Tier Set']['tiers']['basic']['price'] === 22.0, 'assigned-instance read row preserves APTOS Rate Sheet identity');

$repositorySource = (string) file_get_contents(__DIR__ . '/../src/Modules/SurfacePackages/Repositories/PackageRepository.php');
$repositoryProjection = substr(
    $repositorySource,
    (int) strpos($repositorySource, 'public function findAllActiveIndexedByServiceId'),
    (int) strpos($repositorySource, 'public function findDisabledPackageServiceIds')
        - (int) strpos($repositorySource, 'public function findAllActiveIndexedByServiceId')
);
check_public_projection(substr_count($repositoryProjection, 'buildReadModel(') === 1, 'public index builds the manager read model exactly once');
$readControllerSource = (string) file_get_contents(__DIR__ . '/../src/Modules/SurfacePackages/Http/PackageStationReadController.php');
check_public_projection(substr_count($readControllerSource, 'buildReadModel(') === 1, 'assigned-instance read builds the manager read model exactly once');

$expired = $publicProjectionOption;
$expired['valid_until'] = '2026-07-24 23:59:59';
$publicProjectionOption = $expired;
$expiredRepository = new PackageRepository();
check_public_projection($expiredRepository->findAllActiveIndexedByServiceId() === [], 'expired station projects nothing');
foreach ([101, 102, 103] as $serviceId) {
    check_public_projection(isset($expiredRepository->findDisabledPackageServiceIds()[$serviceId]), 'expired coverage suppresses legacy fallback');
}

echo "Tier instance public projection checks passed.\n";
