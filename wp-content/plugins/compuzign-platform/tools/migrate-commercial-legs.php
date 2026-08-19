<?php

declare(strict_types=1);

/**
 * One-off migration: persist Tier Pricing Rules' legacy synthesis for every
 * occupant/Edition still storing commercial_legs: [] alongside a real,
 * usable billing_cycle.
 *
 *   wp eval-file tools/migrate-commercial-legs.php          # dry run
 *   wp eval-file tools/migrate-commercial-legs.php apply    # persist
 *
 * The walk, decision, and apply logic live in
 * Support/CommercialLegsMigration.php — shared with the admin-triggered
 * preview/apply routes behind the Commercial Legs Migration popup
 * (PackageStationController), so this CLI tool and that popup can never
 * drift from each other. This file is now just the dry-run/apply command
 * shell around that shared class. See docs/code-map/tier-pricing-rules-plan.md.
 */

use CompuZign\Platform\Modules\SurfacePackages\Repositories\PackageRepository;
use CompuZign\Platform\Modules\SurfacePackages\Support\CommercialLegsMigration;

$czOut = static function (string $line = ''): void { echo $line, PHP_EOL; };

$apply = in_array('apply', $args ?? [], true);

$repo    = new PackageRepository();
$station = $repo->loadStation();
if ($station === null) {
    $czOut('No cz_package_station option found.');
    return;
}

$czOut($apply
    ? '*** APPLY — changes will be persisted ***'
    : '*** DRY RUN — nothing is written (append "apply" to persist) ***');

$plan = CommercialLegsMigration::plan($station);

foreach ($plan as $row) {
    if ($row['decision'] !== 'migrate') {
        continue;
    }
    $leg = $row['result']['commercial_legs'][0];
    $czOut(sprintf(
        '  [%s/%s] %-26s MIGRATE%s — %s (%s, %s, month %d-%s)',
        $row['instance_id'],
        $row['tier_id'],
        $row['label'],
        $row['scope'] === 'edition' ? ' (Edition)' : '',
        $row['reason'],
        $leg['payment_category'],
        $leg['billing_cycle'],
        $leg['start_month'],
        $leg['end_month'] === null ? 'Indefinite' : (string) $leg['end_month']
    ));
}

$stats = CommercialLegsMigration::summarize($plan);

$czOut();
$czOut(sprintf('Occupants migrated: %d', $stats['occupants_migrated']));
$czOut(sprintf('Occupants skipped:  %d', $stats['occupants_skipped']));
$czOut(sprintf('Editions migrated:  %d', $stats['editions_migrated']));
$czOut(sprintf('Editions skipped:   %d', $stats['editions_skipped']));
$czOut();

if (!$apply) {
    $czOut('Dry run only — re-run with "apply" to persist.');
    return;
}

$touched = ($stats['occupants_migrated'] + $stats['editions_migrated']) > 0;
if (!$touched) {
    $czOut('Nothing to change.');
    return;
}

$station = CommercialLegsMigration::applyPlan($station, $plan);
$repo->saveStation($station);
$czOut('Persisted through PackageRepository::saveStation().');
