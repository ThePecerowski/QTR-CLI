<?php
/**
 * QTR Admin — RoleMiddleware
 * Session'daki rol bilgisine göre erişim kontrolü yapar.
 *
 * Roller: admin > editor > viewer
 *
 * Kullanım:
 *   RoleMiddleware::require('admin');   // sadece admin geçer
 *   RoleMiddleware::require('editor');  // admin + editor geçer
 *   RoleMiddleware::can('delete');      // izin kontrolü
 */

class RoleMiddleware
{
    /** Rol hiyerarşisi: yüksek seviye düşük seviyeyi kapsıyor */
    private static array $hierarchy = ['admin' => 3, 'editor' => 2, 'viewer' => 1];

    /**
     * Minimum rol seviyesi kontrolü.
     * Yetersizse 403 JSON döner (veya admin login'e yönlendirir).
     */
    public static function require(string $minRole): void
    {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $userRole  = $_SESSION['admin_user']['role'] ?? 'viewer';
        $minLevel  = static::$hierarchy[$minRole]  ?? 0;
        $userLevel = static::$hierarchy[$userRole] ?? 0;

        if ($userLevel < $minLevel) {
            http_response_code(403);
            // API isteğiyse JSON, değilse HTML
            if (str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) {
                header('Content-Type: application/json');
                echo json_encode(['success' => false, 'message' => 'Yetersiz yetki.']);
            } else {
                echo '<!DOCTYPE html><html><body><h2>403 — Yetkisiz Erişim</h2>'
                   . '<p>Bu sayfaya erişim yetkiniz yok.</p>'
                   . '<a href="/admin">Panele dön</a></body></html>';
            }
            exit;
        }
    }

    /**
     * Kullanıcının belirli bir izne sahip olup olmadığını döner.
     * İzin tablosu: admin → her şey, editor → içerik, viewer → sadece okuma.
     */
    public static function can(string $permission): bool
    {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $role = $_SESSION['admin_user']['role'] ?? 'viewer';

        $permissions = [
            'admin'  => ['read', 'create', 'update', 'delete', 'manage_users', 'manage_settings'],
            'editor' => ['read', 'create', 'update'],
            'viewer' => ['read'],
        ];

        return in_array($permission, $permissions[$role] ?? [], true);
    }
}
