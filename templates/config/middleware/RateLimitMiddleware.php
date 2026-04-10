<?php
/**
 * QTR Framework — RateLimitMiddleware
 * IP bazlı istek limiti. Varsayılan: 60 istek / dakika.
 *
 * Kullanım (controller içinde):
 *   require_once QTR_ROOT . '/app/api/middleware/RateLimitMiddleware.php';
 *   if (!RateLimitMiddleware::handle()) return;
 */

class RateLimitMiddleware
{
    private static int $maxRequests = 60;
    private static int $windowSec   = 60;

    public static function handle(): bool
    {
        $ip  = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $dir = defined('QTR_ROOT') ? QTR_ROOT . '/storage/rate_limit' : sys_get_temp_dir();

        if (!is_dir($dir)) @mkdir($dir, 0755, true);

        $file = $dir . '/' . md5($ip) . '.json';
        $now  = time();
        $data = ['count' => 0, 'window_start' => $now];

        if (file_exists($file)) {
            $data = json_decode((string) file_get_contents($file), true) ?: $data;
        }

        // Pencere süresi dolmuşsa sıfırla
        if ($now - (int) $data['window_start'] > static::$windowSec) {
            $data = ['count' => 0, 'window_start' => $now];
        }

        $data['count']++;
        @file_put_contents($file, json_encode($data), LOCK_EX);

        if ($data['count'] > static::$maxRequests) {
            http_response_code(429);
            JsonResponse::error('Cok fazla istek. Lutfen bekleyin.', 429);
            return false;
        }

        return true;
    }
}
