<?php
/**
 * QTR Framework — XssHelper
 * Tüm çıkış verilerini XSS saldırılarına karşı temizler.
 *
 * View katmanında otomatik kullanılabilir; bağımsız da çağrılabilir.
 *
 * Kullanım:
 *   echo XssHelper::escape($userInput);
 *   $clean = XssHelper::cleanArray($_POST);
 */

class XssHelper
{
    // ─── Temel encode ────────────────────────────────────────────────────────

    /**
     * Bir string değeri HTML özel karakterlerden temizler.
     * View'larda `<?= XssHelper::e($var) ?>` şeklinde kullanılır.
     */
    public static function escape(mixed $value): string
    {
        return htmlspecialchars(
            (string) $value,
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8'
        );
    }

    /** Kısayol */
    public static function e(mixed $value): string
    {
        return self::escape($value);
    }

    // ─── Dizi temizleme ──────────────────────────────────────────────────────

    /**
     * Tüm dizi değerlerini özyinelemeli olarak escape eder.
     *
     * @param  array<string,mixed> $data
     * @return array<string,mixed>
     */
    public static function cleanArray(array $data): array
    {
        $out = [];
        foreach ($data as $key => $value) {
            $out[$key] = is_array($value) ? self::cleanArray($value) : self::escape($value);
        }
        return $out;
    }

    // ─── Gelişmiş filtreler ──────────────────────────────────────────────────

    /**
     * HTML etiketlerini tamamen kaldırır (zengin metin alanları için).
     */
    public static function stripTags(string $value, string $allowedTags = ''): string
    {
        return strip_tags($value, $allowedTags);
    }

    /**
     * Sadece alphanumeric + belirtilen karakterlere izin verir.
     */
    public static function alphaNumOnly(string $value, string $extra = ''): string
    {
        $pattern = '/[^a-zA-Z0-9' . preg_quote($extra, '/') . ']/u';
        return preg_replace($pattern, '', $value) ?? '';
    }

    /**
     * URL'yi güvenli hale getirir (javascript: protokolünü engeller).
     */
    public static function safeUrl(string $url): string
    {
        $url = trim($url);
        // javascript: ve data: protokollerini engelle
        if (preg_match('/^(javascript|data|vbscript):/i', $url)) {
            return '#';
        }
        return self::escape($url);
    }

    /**
     * SQL özel karakterlerden arındırılmış string döner.
     * NOT: Her zaman PDO prepared statements kullanın. Bu sadece ek katmandır.
     */
    public static function stripSqlChars(string $value): string
    {
        // Tek tırnak, ters slash ve null byte temizle
        return str_replace(["'", '"', '\\', "\0", "\n", "\r", "\x1a"], '', $value);
    }
}
