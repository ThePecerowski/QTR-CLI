<?php
/**
 * QTR Admin — DashboardController
 * Route: GET /admin  veya  GET /admin/dashboard
 */

require_once QTR_ROOT . '/app/admin/middleware/AdminAuthMiddleware.php';
require_once QTR_ROOT . '/app/admin/middleware/RoleMiddleware.php';

class AdminDashboardController
{
    public function index(array $params = []): void
    {
        AdminAuthMiddleware::handle();

        // Örnek istatistikler — gerçek modeller bağlandığında güncelleyin
        $stats = [
            'kullanicilar' => 0,
            'kayitlar'     => 0,
        ];

        View::render('admin/dashboard', [
            'title'    => 'Dashboard',
            'stats'    => $stats,
            'userRole' => $_SESSION['admin_user']['role'] ?? 'viewer',
        ], 'admin');
    }
}
