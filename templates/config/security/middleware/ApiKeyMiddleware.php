<?php
/**
 * QTR Framework — ApiKeyMiddleware
 * Bearer token veya X-API-Key başlığı ile API erişim doğrulaması.
 *
 * Kullanım (routes/api.php'de belirli route'lara):
 *   ApiKeyMiddleware::handle();          // zorunlu API key
 *   ApiKeyMiddleware::optional();        // key varsa doğrula, yoksa geç
 *
 * .env'de:
 *   API_KEYS=key1,key2,key3
 *   API_KEY_HEADER=X-API-Key   (varsayılan)
 */

class ApiKeyMiddleware
{
    // ─── Zorunlu koruma ──────────────────────────────────────────────────────

    /**
     * Geçerli API key yoksa 401 döndürür.
     */
    public static function handle(array $params = []): void
    {
        $key = self::extractKey();
        if ($key === null || !self::isValidKey($key)) {
            self::reject('API anahtarı geçersiz veya eksik.');
        }
    }

    /**
     * API key varsa doğrular; yoksa geçer (opsiyonel koruma).
     */
    public static function optional(): void
    {
        $key = self::extractKey();
        if ($key !== null && !self::isValidKey($key)) {
            self::reject('Sağlanan API anahtarı geçersiz.');
        }
    }

    // ─── Dahili ─────────────────────────────────────────────────────────────

    private static function extractKey(): ?string
    {
        // 1. Authorization: Bearer <token>
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (str_starts_with($auth, 'Bearer ')) {
            return trim(substr($auth, 7));
        }

        // 2. X-API-Key başlığı
        $headerName = 'HTTP_' . strtoupper(str_replace('-', '_',
            class_exists('Config') ? (Config::get('API_KEY_HEADER', 'X-API-Key')) : 'X-API-Key'
        ));
        if (!empty($_SERVER[$headerName])) {
            return $_SERVER[$headerName];
        }

        // 3. Query string: ?api_key=...
        if (!empty($_GET['api_key'])) {
            return $_GET['api_key'];
        }

        return null;
    }

    private static function isValidKey(string $key): bool
    {
        if (empty($key)) return false;

        $configKeys = class_exists('Config') ? Config::get('API_KEYS', '') : '';
        if (empty($configKeys)) return false;

        $allowed = array_map('trim', explode(',', $configKeys));
        // Zamanlama saldırısına karşı hash karşılaştırması
        foreach ($allowed as $allowed_key) {
            if (!empty($allowed_key) && hash_equals($allowed_key, $key)) {
                return true;
            }
        }
        return false;
    }

    private static function reject(string $message): never
    {
        if (class_exists('JsonResponse')) {
            JsonResponse::unauthorized($message);
        } else {
            http_response_code(401);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'message' => $message, 'error_code' => 'UNAUTHORIZED'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}
