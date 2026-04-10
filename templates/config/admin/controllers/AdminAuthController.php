<?php
/**
 * QTR Admin — AdminAuthController
 * Login / logout işlemleri
 *
 * Routes:
 *   GET  /admin/login          → login formu
 *   POST /admin/login          → oturum aç
 *   GET  /admin/logout         → oturumu kapat
 */

class AdminAuthController
{
    public function loginForm(array $params = []): void
    {
        // Zaten oturum açıksa dashboard'a yönlendir
        if (session_status() === PHP_SESSION_NONE) session_start();
        if (!empty($_SESSION['admin_user'])) {
            header('Location: /admin');
            exit;
        }

        $error   = $params['error'] ?? null;
        $timeout = !empty($_GET['timeout']);
        if ($timeout) $error = 'Oturum zaman aşımına uğradı. Lütfen tekrar giriş yapın.';

        View::render('admin/login', ['error' => $error], null);
    }

    public function login(array $params = []): void
    {
        if (session_status() === PHP_SESSION_NONE) session_start();

        $email    = trim($_POST['email']    ?? '');
        $password = trim($_POST['password'] ?? '');

        // TODO: gerçek DB kontrolü buraya (UserModel::findByEmail + password_verify)
        // Şimdilik .env'den basit admin kontrol
        $adminEmail = Config::get('ADMIN_EMAIL', 'admin@example.com');
        $adminPass  = Config::get('ADMIN_PASSWORD', 'changeme');

        if ($email === $adminEmail && password_verify($password, $adminPass)) {
            session_regenerate_id(true);
            $_SESSION['admin_user'] = [
                'email' => $email,
                'role'  => 'admin',
            ];
            $_SESSION['admin_last_activity'] = time();
            header('Location: /admin');
            exit;
        }

        // Başarısız giriş — aynı formu hatayla göster
        View::render('admin/login', [
            'error' => 'E-posta veya şifre hatalı.',
        ], null);
    }

    public function logout(array $params = []): void
    {
        if (session_status() === PHP_SESSION_NONE) session_start();
        session_unset();
        session_destroy();
        header('Location: /admin/login');
        exit;
    }
}
