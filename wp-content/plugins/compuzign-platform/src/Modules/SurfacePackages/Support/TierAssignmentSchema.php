<?php

namespace CompuZign\Platform\Modules\SurfacePackages\Support;

/** Package-owned peer relationship between a Family and a Tier instance. */
final class TierAssignmentSchema
{
    public const CONSUMER_TYPES = ['package_family'];

    public static function deriveAssignmentId(string $type, string $id, string $instanceId): string
    {
        return 'tasg_' . substr(hash('sha256', "{$type}:{$id}:{$instanceId}"), 0, 16);
    }

    /**
     * @param array<string, array<string, true>> $consumerRegistry
     * @return array<int, array<string, string>>
     */
    public static function sanitizeAssignments(mixed $rows, array $consumerRegistry, array $instances): array
    {
        if (!is_array($rows)) {
            return [];
        }

        $out = [];
        $seenConsumers = [];
        $seenInstances = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $type = self::textId($row['consumer_type'] ?? '');
            $consumerId = self::textId($row['consumer_id'] ?? '');
            $instanceId = self::textId($row['tier_instance_id'] ?? '');
            if (!in_array($type, self::CONSUMER_TYPES, true)
                || $consumerId === ''
                || $instanceId === ''
                || !isset($consumerRegistry[$type][$consumerId])
                || TierInstanceSchema::findInstance($instances, $instanceId) === null
            ) {
                continue;
            }

            $consumerKey = $type . ':' . $consumerId;
            if (isset($seenConsumers[$consumerKey]) || isset($seenInstances[$instanceId])) {
                continue;
            }
            $seenConsumers[$consumerKey] = true;
            $seenInstances[$instanceId] = true;
            $out[] = [
                'assignment_id'   => self::deriveAssignmentId($type, $consumerId, $instanceId),
                'consumer_type'   => $type,
                'consumer_id'     => $consumerId,
                'tier_instance_id' => $instanceId,
            ];
        }
        return $out;
    }

    /** @return array<string, string>|null */
    public static function findForConsumer(array $rows, string $type, string $id): ?array
    {
        foreach ($rows as $row) {
            if (is_array($row)
                && ($row['consumer_type'] ?? null) === $type
                && ($row['consumer_id'] ?? null) === $id
            ) {
                return $row;
            }
        }
        return null;
    }

    /** @return array<string, string>|null */
    public static function findForInstance(array $rows, string $instanceId): ?array
    {
        foreach ($rows as $row) {
            if (is_array($row) && ($row['tier_instance_id'] ?? null) === $instanceId) {
                return $row;
            }
        }
        return null;
    }

    /**
     * @param array<string, true> $registry
     * @return array<int, array<string, string>>
     */
    public static function assign(
        array $rows,
        string $type,
        string $id,
        string $instanceId,
        array $registry,
        array $instances
    ): array {
        $type = sanitize_text_field($type);
        $id = sanitize_text_field($id);
        $instanceId = sanitize_text_field($instanceId);

        if (!in_array($type, self::CONSUMER_TYPES, true)) {
            throw new \RuntimeException('unknown_consumer_type');
        }
        if ($id === '' || !isset($registry[$id])) {
            throw new \RuntimeException('unknown_consumer');
        }
        if ($instanceId === '' || TierInstanceSchema::findInstance($instances, $instanceId) === null) {
            throw new \RuntimeException('unknown_tier_instance');
        }
        if (self::findForConsumer($rows, $type, $id) !== null) {
            throw new \RuntimeException('consumer_already_assigned');
        }
        if (self::findForInstance($rows, $instanceId) !== null) {
            throw new \RuntimeException('instance_already_assigned');
        }

        $rows[] = [
            'assignment_id'    => self::deriveAssignmentId($type, $id, $instanceId),
            'consumer_type'    => $type,
            'consumer_id'      => $id,
            'tier_instance_id' => $instanceId,
        ];
        return array_values($rows);
    }

    /** @return array<int, array<string, string>> */
    public static function unassign(array $rows, string $assignmentId): array
    {
        $found = false;
        $out = [];
        foreach ($rows as $row) {
            if (is_array($row) && ($row['assignment_id'] ?? null) === $assignmentId) {
                $found = true;
                continue;
            }
            if (is_array($row)) {
                $out[] = $row;
            }
        }
        if (!$found) {
            throw new \RuntimeException('unknown_assignment');
        }
        return array_values($out);
    }

    /** @return array<string, true> */
    public static function consumerRegistryFor(string $type, array $manager): array
    {
        if ($type !== 'package_family') {
            return [];
        }
        return PackageCategoryGroups::idSet(
            is_array($manager['category_groups'] ?? null) ? $manager['category_groups'] : []
        );
    }

    private static function textId(mixed $value): string
    {
        return is_scalar($value) || $value === null
            ? sanitize_text_field((string) $value)
            : '';
    }
}
