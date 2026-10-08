<?php

declare(strict_types=1);

namespace CompuZign\Platform\PlatformSettings;

/**
 * Owner image policy Option A: accept any selected image, prove what it is
 * from its bytes, keep browser-displayable rasters as they are, convert any
 * other raster to PNG where a secure decoder exists in this runtime, and
 * otherwise refuse with a clear error. Client MIME types and file extensions
 * are never consulted.
 *
 * SVG is refused rather than rasterised: no decoder in this runtime renders
 * it without also interpreting its scripting/external-reference surface, and
 * raw SVG is never stored or served.
 *
 * FILE INDEX
 *   SECTION: INSPECTION — content sniffing, passthrough, square check
 *   SECTION: CONVERSION — runtime decoders (GD, magic-gated Imagick)
 */
final class BrandImageProcessor
{
    /** Browser-displayable rasters stored byte-for-byte. */
    private const PASSTHROUGH = [
        IMAGETYPE_PNG  => ['png',  'image/png'],
        IMAGETYPE_JPEG => ['jpg',  'image/jpeg'],
        IMAGETYPE_GIF  => ['gif',  'image/gif'],
        IMAGETYPE_WEBP => ['webp', 'image/webp'],
        IMAGETYPE_ICO  => ['ico',  'image/vnd.microsoft.icon'],
    ];

    /** @var list<callable(string): ?string> */
    private array $converters;

    /** @param list<callable(string): ?string>|null $converters Test seam; each returns PNG bytes or null. */
    public function __construct(?array $converters = null)
    {
        $this->converters = $converters ?? [
            static fn(string $bytes): ?string => self::convertWithGd($bytes),
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

        $info = @getimagesizefromstring($bytes);
        if (is_array($info) && isset(self::PASSTHROUGH[$info[2]]) && $info[0] > 0 && $info[1] > 0) {
            [$extension, $mime] = self::PASSTHROUGH[$info[2]];
            $image = [
                'bytes'       => $bytes,
                'extension'   => $extension,
                'mime'        => $mime,
                'width'       => (int) $info[0],
                'height'      => (int) $info[1],
                'source_mime' => $mime,
            ];
        } elseif (self::looksLikeSvg($bytes)) {
            throw PlatformSettingsFailure::image(
                'image_svg_unsupported',
                $field,
                'SVG images cannot be converted safely here. Choose a PNG, JPEG, GIF, WebP or ICO image.',
                415
            );
        } else {
            $image = $this->convert($bytes, $field, is_array($info) ? (string) ($info['mime'] ?? '') : '');
        }

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

    // =====================================================================
    // SECTION: CONVERSION
    // =====================================================================

    /** @return array{bytes: string, extension: string, mime: string, width: int, height: int, source_mime: string} */
    private function convert(string $bytes, string $field, string $sourceMime): array
    {
        foreach ($this->converters as $converter) {
            try {
                $png = $converter($bytes);
            } catch (\Throwable) {
                $png = null;
            }
            if (!is_string($png) || $png === '') {
                continue;
            }

            $info = @getimagesizefromstring($png);
            if (!is_array($info) || $info[2] !== IMAGETYPE_PNG || $info[0] <= 0 || $info[1] <= 0) {
                continue;
            }

            return [
                'bytes'       => $png,
                'extension'   => 'png',
                'mime'        => 'image/png',
                'width'       => (int) $info[0],
                'height'      => (int) $info[1],
                'source_mime' => $sourceMime !== '' ? $sourceMime : 'application/octet-stream',
            ];
        }

        throw PlatformSettingsFailure::image(
            'image_unsupported',
            $field,
            'This image could not be read or converted on this server. Choose a PNG, JPEG, GIF, WebP or ICO image.',
            415
        );
    }

    private static function convertWithGd(string $bytes): ?string
    {
        if (!function_exists('imagecreatefromstring') || !function_exists('imagepng')) {
            return null;
        }

        $image = @imagecreatefromstring($bytes);
        if ($image === false) {
            return null;
        }

        imagealphablending($image, false);
        imagesavealpha($image, true);
        ob_start();
        $written = imagepng($image);
        $png = (string) ob_get_clean();

        return $written ? $png : null;
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

        $imagick = new \Imagick();
        $imagick->setFormat($format);
        $imagick->readImageBlob($bytes);
        $imagick->setIteratorIndex(0);
        $imagick->setImageFormat('png');
        $png = $imagick->getImageBlob();
        $imagick->clear();

        return $png;
    }

    private static function rasterFormatFromMagic(string $bytes): ?string
    {
        $head = substr($bytes, 0, 32);
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
