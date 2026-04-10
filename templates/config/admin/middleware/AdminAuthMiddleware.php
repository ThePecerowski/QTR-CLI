<?php
/**
 * QTR Admin — AdminAuthMiddleware
 * Tüm /admin/* isteklerinde oturum kontrolü yapar.
 *
 * Kullanım (routes/admin.php içinde):
 *   require_once QTR_ROOT . '/app/admin/middleware/AdminAuthMiddleware.php';
 *   AdminAuthMiddleware::handle();
 */

class AdminAuthMiddleware
{
    public static function handle(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

        // Login sayfası ve public asset'ler auth gerektirmez
        $publicPaths = ['/admin/login', '/admin/login-process'];
        foreach ($publicPaths as $p) {
            if ($path === $p || str_starts_with($path, '/public/')) return;
        }

        if (empty($_SESSION['admin_user'])) {
            header('Location: /admin/login');
            exit;
        }

        // Session timeout: 2 saat hareketsizlik
        $timeout = 7200;
        if (isset($_SESSION['admin_last_activity']) && (time() - $_SESSION['admin_last_activity']) > $timeout) {
            session_unset();
            session_destroy();
            header('Location: /admin/login?timeout=1');
            exit;
        }

        $_SESSION['admin_last_activity'] = time();
    }
}
