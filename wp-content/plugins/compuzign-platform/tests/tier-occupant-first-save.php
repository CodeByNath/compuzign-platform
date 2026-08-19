<?php

declare(strict_types=1);

// Locks the Tier occupant first-save persistence boundary: the first
// successful Overview module Save on an empty slot must mint a durable,
// unpublished current_occupant (stable occupant_id, platform_status
// disabled, is_explicitly_disabled false) without settling data, assigning
// CZT/CZTA, or touching Tier assignment. Later saves/existing occupants are
// unaffected — PackageSchema::ensurePendingOccupant is a no-op once an
// occupant already exists.

if (!function_exists('sanitize_text_field')) {
    function sanitize_text_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}
if (!function_exists('sanitize_textarea_field')) {
    function sanitize_textarea_field(mixed $value): string { return trim(strip_tags((string) $value)); }
}

require_once __DIR__ . '/../vendor/autoload.php';

use CompuZign\Platform\Modules\SurfacePackages\Support\PackageSchema as Schema;

function check_first_save(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException('Tier occupant first save: ' . $message);
    }
}

// ── Empty slot: ensurePendingOccupant mints a bare, unpublished occupant ──

$empty = Schema::ensureTierLifecycle([]);
$created = Schema::ensurePendingOccupant($empty);
check_first_save(Schema::isOccupantFormat($created), 'ensurePendingOccupant produces an occupant-format slot');
check_first_save(
    is_string($created['current_occupant']['id'] ?? null) && str_starts_with($created['current_occupant']['id'], 'occ_'),
    'a stable occupant_id is minted'
);
check_first_save($created['current_occupant']['platform_status'] === 'disabled', 'the created occupant is not active — Publish alone activates');
check_first_save($created['current_occupant']['is_explicitly_disabled'] === false, 'the created occupant carries no explicit Disable marker');
check_first_save($created['current_occupant']['label'] === '', 'the created occupant carries no settled data — the draft, not this shell, holds the edit');
check_first_save($created['current_occupant']['is_addon'] === false, 'the created occupant defaults is_addon false — the draft is not settled into it');
check_first_save(empty($created['current_occupant']['cz_platform_id']), 'ensurePendingOccupant never mints a Platform Identifier — that stays the Publish/settle boundary');

// ── Idempotent: a second call on an already-occupied slot is a no-op ──────

$again = Schema::ensurePendingOccupant($created);
check_first_save($again === $created, 'ensurePendingOccupant is a no-op once current_occupant already exists');
check_first_save(
    $again['current_occupant']['id'] === $created['current_occupant']['id'],
    'occupant_id never changes across repeated first-save attempts'
);

// ── The Overview draft, set after occupant creation, survives untouched ───

$slot = $created;
$slot['drafts']['overview'] = [
    'label' => 'Starter Cloud', 'ideal_for' => 'Small workloads',
    'price' => null, 'contact' => false, 'billing_cycle' => 'monthly',
];
$slot['module_status']['overview'] = 'pending';
check_first_save($slot['current_occupant']['label'] === '', 'the draft never settles into current_occupant on first save — only Publish settles it');
check_first_save($slot['module_status']['overview'] === 'pending', 'the module stays pending, never settled, after occupant creation');
check_first_save(
    array_unique(array_values(array_diff_key($slot['module_status'], ['overview' => true]))) === ['not-configured'],
    'Features/FAQs remain not-configured — occupant creation does not settle sibling modules'
);

// ── Publish still activates and assigns identity through the existing path ──

$published = Schema::settleTierSlot($slot);
check_first_save($published['current_occupant']['id'] === $created['current_occupant']['id'], 'Publish preserves the occupant_id minted at first save — never a second identity');
check_first_save($published['current_occupant']['platform_status'] === 'active', 'Publish activates the occupant created at first save');
check_first_save($published['current_occupant']['is_explicitly_disabled'] === false, 'Publish keeps the marker clear');
check_first_save($published['current_occupant']['label'] === 'Starter Cloud', 'Publish settles the draft-preferred overview into the occupant first created bare');

// ── Existing occupants are unaffected: ensurePendingOccupant never touches settled data ──

$existing = Schema::upsertOccupant([], ['label' => 'Existing Tier', 'billing_cycle' => 'monthly'], true);
$untouched = Schema::ensurePendingOccupant($existing);
check_first_save($untouched === $existing, 'ensurePendingOccupant is a no-op for an already-settled, published occupant');
check_first_save($untouched['current_occupant']['label'] === 'Existing Tier', 'an existing occupant\'s settled data is never overwritten');

// ── Add-on: first save creates a pending occupant without CZTA; is_addon rides the later Publish ──

$addonEmpty = Schema::ensureTierLifecycle([]);
$addonCreated = Schema::ensurePendingOccupant($addonEmpty);
check_first_save($addonCreated['current_occupant']['is_addon'] === false, 'a bare first-save occupant defaults is_addon false regardless of intended designation — the draft carries it');
check_first_save(empty($addonCreated['current_occupant']['addon_platform_id']), 'no CZTA is assigned at first save — that stays the Publish/settle boundary');

$addonCreated['drafts']['overview'] = [
    'label' => 'Backup Shield', 'ideal_for' => 'Disaster recovery',
    'price' => null, 'contact' => false, 'billing_cycle' => 'monthly', 'is_addon' => true,
];
$addonCreated['module_status']['overview'] = 'pending';
$addonPublished = Schema::settleTierSlot($addonCreated);
check_first_save($addonPublished['current_occupant']['is_addon'] === true, 'the add-on designation settles at Publish, from the draft, exactly like a normal Tier');
check_first_save($addonPublished['current_occupant']['id'] === $addonCreated['current_occupant']['id'], 'the add-on keeps the occupant_id minted at first save');

echo "Tier occupant first-save checks passed.\n";
