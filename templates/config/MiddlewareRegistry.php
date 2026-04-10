<?php
/**
 * QTR Framework — MiddlewareRegistry
 *
 * Middleware isim → sınıf haritası ve parametreli middleware çözümleme.
 *
 * Kullanım (otomatik — Router tarafından kullanılır):
 *   MiddlewareRegistry::resolve('auth')             → ['class' => 'AuthMiddleware', 'params' => []]
 *   MiddlewareRegistry::resolve('rate-limit:120')   → ['class' => 'RateLimitMiddleware', 'params' => ['120']]
 *   MiddlewareRegistry::resolve('role:admin,editor')→ ['class' => 'RoleMiddleware', 'params' => ['admin','editor']]
 *
 * Yeni middleware kaydı (routes/web.php veya bootstrap'ta):
 *   MiddlewareRegistry::register('throttle', ThrottleMiddleware::class);
 */

class MiddlewareRegistry
{
    /** İsim → Sınıf adı haritası */
    private static array $map = [
        'auth'         => 'AuthMiddleware',
        'admin'        => 'AdminAuthMiddleware',
        'rate-limit'   => 'RateLimitMiddleware',
        'cors'         => 'CorsMiddleware',
        'api-key'      => 'ApiKeyMiddleware',
        'csrf'         => 'CsrfToken',
    ];

    // ─── Çözümleme ────────────────────────────────────────────────────────────

    /**
     * Middleware adını (ve opsiyonel parametrelerini) çözümler.
     *
     * Format: 'isim' veya 'isim:param1,param2'
     *
     * @return array{class: string, params: string[]}|null
     */
    public static function resolve(string $name): ?array
    {
        $params = [];

        // Parametre ayrıştırma: 'rate-limit:120' → name='rate-limit', params=['120']
        if (str_contains($name, ':')) {
            [$name, $paramStr] = explode(':', $name, 2);
            $params = array_map('trim', explode(',', $paramStr));
        }

        if (!isset(self::$map[$name])) {
            return null;
        }

        return [
            'class'  => self::$map[$name],
            'params' => $params,
        ];
    }

    // ─── Kayıt ────────────────────────────────────────────────────────────────

    /**
     * Yeni middleware isim → sınıf eşleştirmesi ekler.
     * routes/web.php veya proje bootstrap'ında çağrılabilir.
     */
    public static function register(string $name, string $class): void
    {
        self::$map[$name] = $class;
    }

    /**
     * Kayıtlı tüm middleware haritasını döner.
     */
    public static function all(): array
    {
        return self::$map;
    }

    /**
     * Bir middleware isminin kayıtlı olup olmadığını kontrol eder.
     */
    public static function has(string $name): bool
    {
        // Parametre'yi yoksay
        if (str_contains($name, ':')) {
            [$name] = explode(':', $name, 2);
        }
        return isset(self::$map[$name]);
    }
}
