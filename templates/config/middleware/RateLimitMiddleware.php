<?php
/**
 * QTR Framework — RateLimitMiddleware
 *
 * Önce API key (X-Api-Key header veya ?api_key parametresi) bazlı limit uygular.
 * API key yoksa IP bazlı limite döner.
 *
 * Varsayılan limit: 60 istek / dakika (key bazlı ve IP bazlı ayrı sayaçlar).
 *
 * Kullanım (controller içinde):
 *   if (!RateLimitMiddleware::handle()) return;
 *
 * Key bazlı limit özelleştirme:
 *   RateLimitMiddleware::setKeyLimit('my-key', 120);  // 120 req/min
 */

class RateLimitMiddleware
{
    /** IP bazlı varsayılan limit */
    private static int $defaultIpLimit  = 60;

    /** Key bazlı varsayılan limit */
    private static int $defaultKeyLimit = 60;

    private static int $windowSec = 60;

    /** Belirli key'ler için özel limit haritası [ key => limit ] */
    private static array $keyLimits = [];

    // ─── Konfigürasyon ────────────────────────────────────────────────────────

    public static function setIpLimit(int $max): void  { self::$defaultIpLimit  = $max; }
    public static function setKeyLimit(string $key, int $max): void { self::$keyLimits[$key] = $max; }

    // ─── Ana Kontrol ──────────────────────────────────────────────────────────

    /**
     * @param array $params Parametrik kullanım: ['120'] → istek başına 120/dk limit
     *   ->middleware('rate-limit:120') şeklinde geçilir.
     */
    public static function handle(array $params = []): bool
    {
        // Parametrik limit: rate-limit:120 → dakikada 120 istek
        $limit = isset($params[0]) && is_numeric($params[0])
            ? (int) $params[0]
            : null;

        // Önce API key'i bul
        $apiKey = self::resolveApiKey();

        if ($apiKey !== null) {
            $maxLimit = $limit ?? (self::$keyLimits[$apiKey] ?? self::$defaultKeyLimit);
            return self::checkLimit('key_' . md5($apiKey), $maxLimit);
        }

        // API key yoksa IP kullan
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        return self::checkLimit('ip_' . md5($ip), $limit ?? self::$defaultIpLimit);
    }

    // ─── Yardımcılar ──────────────────────────────────────────────────────────

    /**
     * İstek headerından veya query string'den API key döner.
     * Bulunamazsa null döner.
     */
    private static function resolveApiKey(): ?string
    {
        // 1. X-Api-Key header
        $header = $_SERVER['HTTP_X_API_KEY'] ?? '';
        if ($header !== '') return $header;

        // 2. Authorization: Bearer ...
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (str_starts_with($auth, 'Bearer ')) {
            return trim(substr($auth, 7));
        }

        // 3. ?api_key= query parametresi
        $qp = $_GET['api_key'] ?? '';
        if ($qp !== '') return $qp;

        return null;
    }

    /**
     * Verilen identifier için pencere bazlı sayaç kontrolü yapar.
     * Limit aşılırsa 429 döner ve false return eder.
     */
    private static function checkLimit(string $identifier, int $maxRequests): bool
    {
        $dir = defined('QTR_ROOT') ? QTR_ROOT . '/storage/rate_limit' : sys_get_temp_dir();
        if (!is_dir($dir)) @mkdir($dir, 0755, true);

        $file = $dir . '/' . $identifier . '.json';
        $now  = time();
        $data = ['count' => 0, 'window_start' => $now];

        if (file_exists($file)) {
            $data = json_decode((string) file_get_contents($file), true) ?: $data;
        }

        if ($now - (int) $data['window_start'] > static::$windowSec) {
            $data = ['count' => 0, 'window_start' => $now];
        }

        $data['count']++;
        @file_put_contents($file, json_encode($data), LOCK_EX);

        if ($data['count'] > $maxRequests) {
            JsonResponse::rateLimited();
            return false;
        }

        return true;
    }
}
