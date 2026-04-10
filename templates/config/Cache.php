<?php
/**
 * QTR Framework — Dosya Tabanlı Cache Sistemi
 *
 * Her cache key, storage/cache/ dizininde md5(key).cache dosyası olarak saklanır.
 * Dosya içeriği serialize edilmiş ['expires' => timestamp, 'data' => value] dizisidir.
 *
 * Kullanım:
 *   Cache::put('users.all', $users, 60);          // 60 saniye TTL
 *   $users = Cache::get('users.all');              // null döner expire olduysa
 *   $users = Cache::remember('users.all', 60, fn() => UserModel::findAll());
 *   Cache::forget('users.all');
 *   Cache::flush();
 */
class Cache
{
    private static ?string $cacheDir = null;

    // ─── Başlatma ─────────────────────────────────────────────────────────────

    private static function dir(): string
    {
        if (self::$cacheDir === null) {
            self::$cacheDir = defined('QTR_ROOT')
                ? QTR_ROOT . '/storage/cache'
                : dirname(__DIR__, 2) . '/storage/cache';
        }

        if (!is_dir(self::$cacheDir)) {
            mkdir(self::$cacheDir, 0755, true);
        }

        return self::$cacheDir;
    }

    private static function filepath(string $key): string
    {
        return self::dir() . '/' . md5($key) . '.cache';
    }

    // ─── Temel Metodlar ───────────────────────────────────────────────────────

    /**
     * Cache'den değer okur. Yoksa veya süresi dolmuşsa $default döndürür.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $path = self::filepath($key);

        if (!file_exists($path)) {
            return $default;
        }

        $raw = file_get_contents($path);
        if ($raw === false) return $default;

        $entry = @unserialize($raw);
        if (!is_array($entry) || !isset($entry['expires'], $entry['data'])) {
            @unlink($path);
            return $default;
        }

        if ($entry['expires'] !== 0 && $entry['expires'] < time()) {
            @unlink($path);
            return $default;
        }

        return $entry['data'];
    }

    /**
     * Cache'e değer yazar.
     * @param string $key   Cache anahtarı
     * @param mixed  $value Saklanacak değer (serializeable olmalı)
     * @param int    $ttl   Saniye cinsinden yaşam süresi (0 = süresiz)
     */
    public static function put(string $key, mixed $value, int $ttl = 60): void
    {
        $entry = [
            'expires' => $ttl > 0 ? time() + $ttl : 0,
            'data'    => $value,
        ];

        file_put_contents(self::filepath($key), serialize($entry), LOCK_EX);
    }

    /**
     * Cache'de değer yoksa callback çalıştırır ve sonucu cache'ler.
     * @param string   $key      Cache anahtarı
     * @param int      $ttl      Saniye cinsinden yaşam süresi
     * @param callable $callback Değeri üretecek fonksiyon
     */
    public static function remember(string $key, int $ttl, callable $callback): mixed
    {
        $cached = self::get($key);
        if ($cached !== null) return $cached;

        $value = $callback();
        self::put($key, $value, $ttl);
        return $value;
    }

    /**
     * Cache'de değerin var olup olmadığını kontrol eder.
     */
    public static function has(string $key): bool
    {
        return self::get($key) !== null;
    }

    /**
     * Belirli bir cache anahtarını siler.
     */
    public static function forget(string $key): void
    {
        $path = self::filepath($key);
        if (file_exists($path)) {
            @unlink($path);
        }
    }

    /**
     * storage/cache/ içindeki tüm .cache dosyalarını siler.
     */
    public static function flush(): int
    {
        $dir   = self::dir();
        $count = 0;

        foreach (glob($dir . '/*.cache') ?: [] as $file) {
            @unlink($file);
            $count++;
        }

        return $count;
    }

    /**
     * Süresi dolmuş tüm cache dosyalarını temizler.
     */
    public static function gc(): int
    {
        $dir   = self::dir();
        $count = 0;

        foreach (glob($dir . '/*.cache') ?: [] as $file) {
            $raw   = @file_get_contents($file);
            $entry = $raw ? @unserialize($raw) : false;
            if (!is_array($entry) || ($entry['expires'] !== 0 && $entry['expires'] < time())) {
                @unlink($file);
                $count++;
            }
        }

        return $count;
    }
}
