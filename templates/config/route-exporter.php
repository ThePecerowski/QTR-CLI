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
define('QTR_EXPORT_ROUTES', true);

// ─── Stub sınıflar ────────────────────────────────────────────────────────────
// JsonResponse::send() gerçek sürümde exit() çağırır. Exporter'da bunu engelle.
class JsonResponse {
    public static function __callStatic(string $name, array $args): void { /* no-op in export mode */ }
}

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

// Route exporter modu: dispatch çağrılmayacak — define already at top

// ─── API Route'ları ───────────────────────────────────────────────────────────
$router = new QtrRouter();

ob_start(); // route dosyaları dispatch() çağırabilir; çıktıyı yakala
if (file_exists(QTR_ROOT . '/routes/api.php')) {
    require QTR_ROOT . '/routes/api.php';
}
ob_end_clean(); // dispatch çıktısını at

$apiRoutes = $router->exportRoutes();

// ─── Admin Route'ları ─────────────────────────────────────────────────────────
$adminRouter = new QtrRouter();

ob_start();
if (file_exists(QTR_ROOT . '/routes/admin.php')) {
    @require QTR_ROOT . '/routes/admin.php';
}
ob_end_clean();

$adminRoutes = $adminRouter->exportRoutes();

// ─── Birleştir ve çıkar ───────────────────────────────────────────────────────
$allRoutes = array_merge($apiRoutes, $adminRoutes);

echo json_encode($allRoutes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
