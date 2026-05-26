<?php

namespace CompuZign\Platform\Core;

class Health
{
    /** @var array<string, callable> */
    private static array $checks = [];

    /**
     * Register a named health check callable.
     * Each callable must return bool — true = healthy, false = degraded.
     */
    public static function register(string $name, callable $check): void
    {
        self::$checks[$name] = $check;
    }

    /**
     * Run all registered checks and return a results map.
     *
     * @return array<string, bool>
     */
    public static function run(): array
    {
        $results = [];

        foreach (self::$checks as $name => $check) {
            try {
                $results[$name] = (bool) $check();
            } catch (\Throwable $e) {
                $results[$name] = false;
            }
        }

        return $results;
    }
}
