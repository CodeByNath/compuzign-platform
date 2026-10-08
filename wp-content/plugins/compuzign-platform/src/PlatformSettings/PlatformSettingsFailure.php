<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformSettings;

/**
 * A Platform Settings request that did not commit.
 *
 * Every failure carries a stable machine code and the HTTP status the
 * controller returns. Throwing one always means the authoritative Profile
 * record was left exactly as it was before the request.
 */
final class PlatformSettingsFailure extends \RuntimeException
{
    /** @param array<string, string> $fields */
    public function __construct(
        private string $errorCode,
        string $message,
        private int $status,
        private array $fields = []
    ) {
        parent::__construct($message);
    }

    public static function invalid(array $fields): self
    {
        return new self('invalid_profile', 'The Profile has invalid fields.', 400, $fields);
    }

    public static function immutableIdentity(): self
    {
        return new self('identity_immutable', 'Platform identifiers are immutable and output-only.', 422);
    }

    public static function image(string $code, string $field, string $message, int $status = 422): self
    {
        return new self($code, $message, $status, [$field => $message]);
    }

    public static function revisionConflict(): self
    {
        return new self('revision_conflict', 'The Profile was saved elsewhere. Reload before saving again.', 409);
    }

    public static function busy(): self
    {
        return new self('settings_busy', 'Another Settings save is in progress. Try again.', 409);
    }

    public static function identityConflict(string $detail): self
    {
        return new self('settings_identity_conflict', 'Platform Settings identity is inconsistent: ' . $detail, 409);
    }

    public static function notFound(): self
    {
        return new self('not_found', 'Platform Settings record not found.', 404);
    }

    public static function storage(string $detail): self
    {
        return new self('storage_failed', 'The Profile could not be stored: ' . $detail, 500);
    }

    public function errorCode(): string
    {
        return $this->errorCode;
    }

    public function status(): int
    {
        return $this->status;
    }

    /** @return array<string, string> */
    public function fields(): array
    {
        return $this->fields;
    }
}
