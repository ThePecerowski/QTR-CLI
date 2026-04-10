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
        // Güvenli oturum başlat
        if (class_exists('SessionSecurity')) {
            SessionSecurity::start();
        } elseif (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
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
        if (class_exists('SessionSecurity')) {
            SessionSecurity::start();
        } elseif (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        // CSRF doğrulaması
        if (class_exists('CsrfToken') && !CsrfToken::verify($_POST['_token'] ?? '')) {
            View::render('admin/login', ['error' => 'CSRF token geçersiz. Sayfayı yenileyip tekrar deneyin.'], null);
            return;
        }

        $email    = trim($_POST['email']    ?? '');
        $password = trim($_POST['password'] ?? '');

        // .env'den admin bilgileri — ADMIN_PASSWORD düz metin veya bcrypt hash olabilir
        $adminEmail = Config::get('ADMIN_EMAIL', 'admin@example.com');
        $adminPass  = Config::get('ADMIN_PASSWORD', 'changeme');

        // Şifre kontrolü: bcrypt hash ise password_verify, değilse düz karşılaştır
        $passOk = false;
        if (strlen($adminPass) === 60 && str_starts_with($adminPass, '$2')) {
            $passOk = password_verify($password, $adminPass);
        } else {
            $passOk = hash_equals($adminPass, $password);
        }

        if ($email === $adminEmail && $passOk) {
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
