<?php
/**
 * QTR Framework — API Router
 * /api/* isteklerini QtrRouter üzerinden ilgili Controller@method'a yönlendirir.
 *
 * Middleware kullanımı:
 *   $router->get('/api/resource', 'ResourceController@index')->middleware('auth');
 *   $router->post('/api/resource', 'ResourceController@store')->middleware('auth', 'rate-limit:60');
 *
 * Grup tanımı:
 *   $router->group(['middleware' => ['auth', 'rate-limit']], function($r) {
 *       $r->get('/api/resource',       'ResourceController@index');
 *       $r->post('/api/resource',      'ResourceController@store');
 *   });
 */

require_once QTR_ROOT . '/app/core/Router.php';

if (file_exists(QTR_ROOT . '/app/core/MiddlewareRegistry.php')) {
    require_once QTR_ROOT . '/app/core/MiddlewareRegistry.php';
}

$router = new QtrRouter();

// Global: CORS tüm API route'larında
$router->globalMiddleware('cors');

// ─── Route Cache (production) ─────────────────────────────────────────────────
// Cache varsa ve güncelsse route'lar buradan yüklenip aşağıdaki tanımlar atlanır.
$_routeCacheFile = defined('QTR_ROOT') ? QTR_ROOT . '/storage/cache/routes.php' : null;
if ($_routeCacheFile && $router->loadCache($_routeCacheFile)) {
    // Cache'den yüklendi — manuel tanımlar atlandı
} else {
    // ─── Sistem Route'ları ────────────────────────────────────────────────────
    $router->get('/api/health', 'HealthController@index');

    // ─── Proje Route'ları (aşağıya yeni route'lar ekle) ──────────────────────

}

// Route exporter modunda dispatch çağırmayacağız
if (!defined('QTR_EXPORT_ROUTES')) {
    $router->dispatch();
}

