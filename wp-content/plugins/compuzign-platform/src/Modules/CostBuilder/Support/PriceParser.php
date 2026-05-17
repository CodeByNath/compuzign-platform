<?php

namespace CompuZign\Platform\Modules\CostBuilder\Support;

class PriceParser
{
    public static function parse(mixed $value): ?float
    {
        $value = trim((string) ($value ?? ''));
        if ($value === '') {
            return null;
        }

        $value = preg_replace('/[^0-9.\-]/', '', $value);
        if ($value === '' || !is_numeric($value)) {
            return null;
        }

        return (float) $value;
    }
}
