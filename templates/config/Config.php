<?php
/**
 * QTR Framework — Config
 * .env dosyasini okur ve uygulama genelinde Config::get() ile erisim saglar.
 * Dosya bir kez okunup cache'lenir (statik $values dizisi).
 */

class Config
{
    private static array $values = [];
    private static bool  $loaded = false;

    /**
     * .env dosyasini bir kez yukler.
     */
    public static function load(): void
    {
        if (self::$loaded) return;

        $envPath = defined('QTR_ROOT') ? QTR_ROOT . '/.env' : dirname(__DIR__, 2) . '/.env';

        if (!file_exists($envPath)) {
            self::$loaded = true;
            return;
        }

        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) continue;

            $idx = strpos($line, '=');
            if ($idx === false) continue;

            $key            = trim(substr($line, 0, $idx));
            $value          = trim(substr($line, $idx + 1));
            self::$values[$key] = $value;
        }

        self::$loaded = true;
    }

    /**
     * Belirtilen anahtarin degerini dondurur.
     * Anahtar yoksa $default doner.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        self::load();
        return self::$values[$key] ?? $default;
    }

    /**
     * APP_DEBUG true mu?  (string "true" karsilastirmasi)
     */
    public static function isDebug(): bool
    {
        return strtolower(self::get('APP_DEBUG', 'false')) === 'true';
    }

    /**
     * Aktif ortam adini dondurur: local | staging | production
     */
    public static function env(): string
    {
        return strtolower(self::get('APP_ENV', 'local'));
    }
}
