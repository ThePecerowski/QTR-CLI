<?php
/**
 * QTR Route Exporter
 *
 * Bu dosya `qtr cache:routes` tarafından geçici olarak kullanılır.
 * Proje route dosyalarını yükler ve route tablosunu JSON olarak stdout'a yazar.
 *
 * Kullanım: php .qtr-route-exporter.php (proje kökünden)
 * Bu dosyayı doğrudan çalıştırmayın.
 */

// Proje kökü burası
define('QTR_ROOT', __DIR__);
define('QTR_VERSION', '1.0.0');

// Minimal bootstrap — sadece autoload + router
require_once QTR_ROOT . '/app/core/Config.php';

if (file_exists(QTR_ROOT . '/app/core/Autoloader.php')) {
    require_once QTR_ROOT . '/app/core/Autoloader.php';
    QtrAutoloader::init();
}

require_once QTR_ROOT . '/app/core/Router.php';

// MiddlewareRegistry varsa yükle
if (file_exists(QTR_ROOT . '/app/core/MiddlewareRegistry.php')) {
    require_once QTR_ROOT . '/app/core/MiddlewareRegistry.php';
}

// Route exporter modu: dispatch çağrılmayacak
define('QTR_EXPORT_ROUTES', true);

// ─── API Route'ları ───────────────────────────────────────────────────────────
$router = new QtrRouter();

if (file_exists(QTR_ROOT . '/routes/api.php')) {
    require QTR_ROOT . '/routes/api.php';
}

$apiRoutes = $router->exportRoutes();

// ─── Admin Route'ları ─────────────────────────────────────────────────────────
$adminRouter = new QtrRouter();

// admin-routes.php dispatch() çağırabilir; bunu engelle
if (file_exists(QTR_ROOT . '/routes/admin.php')) {
    @require QTR_ROOT . '/routes/admin.php';
}

$adminRoutes = $adminRouter->exportRoutes();

// ─── Birleştir ve çıkar ───────────────────────────────────────────────────────
$allRoutes = array_merge($apiRoutes, $adminRoutes);

echo json_encode($allRoutes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
