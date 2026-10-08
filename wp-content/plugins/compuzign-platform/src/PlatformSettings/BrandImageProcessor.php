<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformSettings;

/**
 * Owner image policy Option A: accept any selected image, prove what it is
 * by decoding ALL of it, and store only freshly re-encoded output. Client
 * MIME types and file extensions are never consulted.
 *
 * Nothing the client sent is ever stored byte-for-byte. A header that looks
 * valid is not enough: every image is fully decoded, and any decoder warning
 * (truncated data, corrupt chunks) rejects it. The decoded pixels are then
 * re-encoded, which drops any appended or embedded non-image payload, so a
 * polyglot file can never be served from the brand directory.
 *
 *   PNG / JPEG / WebP / GIF  → full GD decode, re-encoded in the same format
 *   animated GIF             → re-encoded with every frame (Imagick), or a
 *                              clear refusal — never silently flattened
 *   ICO                      → its largest embedded PNG, or Imagick, → PNG
 *   other rasters            → PNG via GD, or magic-gated Imagick
 *   SVG                      → refused; no decoder here renders it without
 *                              its scripting/external-reference surface
 *
 * FILE INDEX
 *   SECTION: INSPECTION — classification, square check
 *   SECTION: NATIVE_FORMATS — strict decode + same-format re-encode
 *   SECTION: CONVERSION — ICO extraction and other-raster decoders
 */
final class BrandImageProcessor
{
    /** Formats re-encoded in kind: IMAGETYPE => [extension, mime, encoder]. */
    private const NATIVE = [
        IMAGETYPE_PNG  => ['png',  'image/png'],
        IMAGETYPE_JPEG => ['jpg',  'image/jpeg'],
        IMAGETYPE_WEBP => ['webp', 'image/webp'],
        IMAGETYPE_GIF  => ['gif',  'image/gif'],
    ];

    private const UNSUPPORTED_MESSAGE = 'This image could not be read or converted on this server. Choose a PNG, JPEG, GIF, WebP or ICO image.';

    /** @var list<callable(string): ?string> */
    private array $converters;

    /** @param list<callable(string): ?string>|null $converters Test seam for non-native rasters; each returns PNG bytes or null. */
    public function __construct(?array $converters = null)
    {
        $this->converters = $converters ?? [
            static fn(string $bytes): ?string => self::encode(self::decodeStrict($bytes), IMAGETYPE_PNG),
            static fn(string $bytes): ?string => self::convertWithImagick($bytes),
        ];
    }

    // =====================================================================
    // SECTION: INSPECTION
    // =====================================================================

    /**
     * @return array{bytes: string, extension: string, mime: string, width: int, height: int, source_mime: string}
     * @throws PlatformSettingsFailure
     */
    public function process(string $bytes, string $field, bool $requireSquare): array
    {
        if ($bytes === '') {
            throw PlatformSettingsFailure::image('image_empty', $field, 'The selected image is empty.');
        }
        if (self::looksLikeSvg($bytes)) {
            throw PlatformSettingsFailure::image(
                'image_svg_unsupported',
                $field,
                'SVG images cannot be converted safely here. Choose a PNG, JPEG, GIF, WebP or ICO image.',
                415
            );
        }

        $info = @getimagesizefromstring($bytes);
        $type = is_array($info) ? (int) $info[2] : 0;
        $sourceMime = is_array($info) ? (string) ($info['mime'] ?? '') : '';

        if (isset(self::NATIVE[$type])) {
            $image = $this->reencodeNative($bytes, $type, $field);
        } elseif ($type === IMAGETYPE_ICO) {
            $image = $this->convertIcon($bytes, $field);
        } else {
            $image = $this->convertOther($bytes, $field);
        }
        $image['source_mime'] = $sourceMime !== '' ? $sourceMime : 'application/octet-stream';

        if ($requireSquare && $image['width'] !== $image['height']) {
            throw PlatformSettingsFailure::image(
                'favicon_not_square',
                $field,
                "The favicon must be square; this image is {$image['width']}×{$image['height']}."
            );
        }

        return $image;
    }

    private static function looksLikeSvg(string $bytes): bool
    {
        $head = strtolower(ltrim(substr($bytes, 0, 2048), "\xEF\xBB\xBF \t\r\n"));

        return str_contains($head, '<svg');
    }

    /** @return array{bytes: string, extension: string, mime: string, width: int, height: int} */
    private static function verified(?string $encoded, int $type, string $field): array
    {
        $info = is_string($encoded) && $encoded !== '' ? @getimagesizefromstring($encoded) : false;
        if (!is_array($info) || (int) $info[2] !== $type || $info[0] <= 0 || $info[1] <= 0) {
            throw PlatformSettingsFailure::image('image_unsupported', $field, self::UNSUPPORTED_MESSAGE, 415);
        }
        [$extension, $mime] = self::NATIVE[$type];

        return [
            'bytes'     => $encoded,
            'extension' => $extension,
            'mime'      => $mime,
            'width'     => (int) $info[0],
            'height'    => (int) $info[1],
        ];
    }

    // =====================================================================
    // SECTION: NATIVE_FORMATS
    // =====================================================================

    /** @return array{bytes: string, extension: string, mime: string, width: int, height: int} */
    private function reencodeNative(string $bytes, int $type, string $field): array
    {
        if ($type === IMAGETYPE_GIF && self::isAnimatedGif($bytes)) {
            $animated = self::reencodeAnimatedGif($bytes);
            if ($animated === null) {
                throw PlatformSettingsFailure::image(
                    'image_animation_unsupported',
                    $field,
                    'Animated GIFs cannot be processed safely on this server. Choose a still image.',
                    415
                );
            }

            return self::verified($animated, IMAGETYPE_GIF, $field);
        }

        return self::verified(self::encode(self::decodeStrict($bytes), $type), $type, $field);
    }

    /**
     * Full decode through GD. Any warning or notice the decoder raises —
     * libjpeg's "premature end", libpng CRC errors, truncated WebP — means
     * the bytes are not a complete, valid image, so the result is refused.
     */
    private static function decodeStrict(string $bytes): ?\GdImage
    {
        if (!function_exists('imagecreatefromstring')) {
            return null;
        }

        $warned = false;
        set_error_handler(static function () use (&$warned): bool {
            $warned = true;
            return true;
        });
        try {
            $image = imagecreatefromstring($bytes);
        } catch (\Throwable) {
            $image = false;
        } finally {
            restore_error_handler();
        }

        return ($image instanceof \GdImage && !$warned) ? $image : null;
    }

    private static function encode(?\GdImage $image, int $type): ?string
    {
        if ($image === null) {
            return null;
        }

        if ($type === IMAGETYPE_PNG || $type === IMAGETYPE_WEBP) {
            imagealphablending($image, false);
            imagesavealpha($image, true);
        }

        ob_start();
        $written = match ($type) {
            IMAGETYPE_PNG  => imagepng($image),
            IMAGETYPE_JPEG => imagejpeg($image, null, 90),
            IMAGETYPE_WEBP => function_exists('imagewebp') && imagewebp($image, null, 90),
            IMAGETYPE_GIF  => imagegif($image),
            default        => false,
        };
        $encoded = (string) ob_get_clean();

        return $written && $encoded !== '' ? $encoded : null;
    }

    private static function isAnimatedGif(string $bytes): bool
    {
        // Each frame is introduced by a Graphic Control Extension followed by
        // an image descriptor (0x2C) or another extension (0x21).
        return preg_match_all('#\x00\x21\xF9\x04.{4}\x00[\x2C\x21]#s', $bytes) > 1;
    }

    private static function reencodeAnimatedGif(string $bytes): ?string
    {
        if (!class_exists(\Imagick::class) || !in_array('GIF', \Imagick::queryFormats('GIF'), true)) {
            return null;
        }

        try {
            $imagick = new \Imagick();
            $imagick->setFormat('GIF');
            $imagick->readImageBlob($bytes);
            $frames = $imagick->coalesceImages();
            foreach ($frames as $frame) {
                $frame->setImageFormat('gif');
            }
            $gif = $frames->deconstructImages()->getImagesBlob();
            $frames->clear();
            $imagick->clear();

            return $gif;
        } catch (\Throwable) {
            return null;
        }
    }

    // =====================================================================
    // SECTION: CONVERSION
    // =====================================================================

    /**
     * Modern favicons embed PNG entries; the largest one is decoded like any
     * PNG. Legacy BMP-entry icons need Imagick, otherwise a clear refusal.
     *
     * @return array{bytes: string, extension: string, mime: string, width: int, height: int}
     */
    private function convertIcon(string $bytes, string $field): array
    {
        $entry = self::largestIconPngEntry($bytes);
        if ($entry !== null) {
            return self::verified(self::encode(self::decodeStrict($entry), IMAGETYPE_PNG), IMAGETYPE_PNG, $field);
        }

        return self::verified(self::convertWithImagick($bytes), IMAGETYPE_PNG, $field);
    }

    private static function largestIconPngEntry(string $bytes): ?string
    {
        $length = strlen($bytes);
        if ($length < 6 || substr($bytes, 0, 4) !== "\0\0\1\0") {
            return null;
        }
        $count = unpack('v', substr($bytes, 4, 2))[1];
        if ($count < 1 || 6 + 16 * $count > $length) {
            return null;
        }

        $best = null;
        $bestArea = 0;
        for ($i = 0; $i < $count; $i++) {
            $entry  = substr($bytes, 6 + 16 * $i, 16);
            $width  = ord($entry[0]) ?: 256;
            $height = ord($entry[1]) ?: 256;
            ['size' => $size, 'offset' => $offset] = unpack('Vsize/Voffset', substr($entry, 8, 8));
            if ($size <= 0 || $offset < 6 + 16 * $count || $offset + $size > $length) {
                return null;
            }
            $data = substr($bytes, $offset, $size);
            if (str_starts_with($data, "\x89PNG\r\n\x1A\n") && $width * $height > $bestArea) {
                $best = $data;
                $bestArea = $width * $height;
            }
        }

        return $best;
    }

    /** @return array{bytes: string, extension: string, mime: string, width: int, height: int} */
    private function convertOther(string $bytes, string $field): array
    {
        foreach ($this->converters as $converter) {
            try {
                $png = $converter($bytes);
            } catch (\Throwable) {
                $png = null;
            }
            if (is_string($png) && $png !== '') {
                try {
                    return self::verified($png, IMAGETYPE_PNG, $field);
                } catch (PlatformSettingsFailure) {
                    continue;
                }
            }
        }

        throw PlatformSettingsFailure::image('image_unsupported', $field, self::UNSUPPORTED_MESSAGE, 415);
    }

    /**
     * Imagick only ever receives bytes whose magic number already proves one
     * of these raster formats, and is told that format explicitly, so it can
     * never be steered into a scripting or vector coder by crafted content.
     */
    private static function convertWithImagick(string $bytes): ?string
    {
        if (!class_exists(\Imagick::class)) {
            return null;
        }

        $format = self::rasterFormatFromMagic($bytes);
        if ($format === null || !in_array($format, \Imagick::queryFormats($format), true)) {
            return null;
        }

        try {
            $imagick = new \Imagick();
            $imagick->setFormat($format);
            $imagick->readImageBlob($bytes);
            $imagick->setIteratorIndex(0);
            $imagick->setImageFormat('png');
            $png = $imagick->getImageBlob();
            $imagick->clear();

            return $png;
        } catch (\Throwable) {
            return null;
        }
    }

    private static function rasterFormatFromMagic(string $bytes): ?string
    {
        $head = substr($bytes, 0, 32);
        if (str_starts_with($head, "\0\0\1\0")) {
            return 'ICO';
        }
        if (str_starts_with($head, "II*\0") || str_starts_with($head, "MM\0*")) {
            return 'TIFF';
        }
        if (str_starts_with($head, 'BM')) {
            return 'BMP';
        }
        if (str_starts_with($head, "\0\0\0\x0CjP  ")) {
            return 'JP2';
        }
        if (substr($head, 4, 4) === 'ftyp') {
            $brand = substr($head, 8, 4);
            if (in_array($brand, ['avif', 'avis'], true)) {
                return 'AVIF';
            }
            if (in_array($brand, ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'], true)) {
                return 'HEIC';
            }
        }

        return null;
    }
}
