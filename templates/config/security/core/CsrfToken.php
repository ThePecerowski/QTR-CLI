<?php
/**
 * QTR Framework — CsrfToken
 * Form işlemlerinde CSRF koruması sağlar.
 *
 * Kullanım (form'da):
 *   <?= CsrfToken::field() ?>
 *
 * Kullanım (doğrulama):
 *   CsrfToken::verifyOrFail(); // geçersizse 403 döner
 *   // ya da:
 *   if (!CsrfToken::validate($_POST['_token'] ?? '')) { ... }
 */

class CsrfToken
{
    private const SESSION_KEY = '_qtr_csrf_token';
    private const FIELD_NAME  = '_token';
    private const TOKEN_LEN   = 64; // karakter (hex)

    // ─── Token üretme ────────────────────────────────────────────────────────

    /**
     * Mevcut session token'ı döner; yoksa üretir.
     */
    public static function get(): string
    {
        self::ensureSession();
        if (empty($_SESSION[self::SESSION_KEY])) {
            $_SESSION[self::SESSION_KEY] = self::generate();
        }
        return $_SESSION[self::SESSION_KEY];
    }

    /**
     * Yeni bir token üretir ve session'a kaydeder.
     */
    public static function refresh(): string
    {
        self::ensureSession();
        $_SESSION[self::SESSION_KEY] = self::generate();
        return $_SESSION[self::SESSION_KEY];
    }

    private static function generate(): string
    {
        return bin2hex(random_bytes(self::TOKEN_LEN / 2));
    }

    // ─── Doğrulama ───────────────────────────────────────────────────────────

    /**
     * Verilen token'ı session token'ıyla karşılaştırır.
     * Zamanlama saldırısına karşı `hash_equals` kullanılır.
     */
    public static function validate(string $token): bool
    {
        self::ensureSession();
        $stored = $_SESSION[self::SESSION_KEY] ?? '';
        return hash_equals($stored, $token);
    }

    /**
     * Token geçersizse 403 döndürüp çıkar.
     */
    public static function verifyOrFail(): void
    {
        $token = $_POST[self::FIELD_NAME] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!self::validate($token)) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'CSRF token geçersiz veya eksik.']);
            exit;
        }
    }

    // ─── HTML yardımcıları ──────────────────────────────────────────────────

    /**
     * HTML hidden input döner — form'a eklenecek.
     */
    public static function field(): string
    {
        $token = htmlspecialchars(self::get(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        return '<input type="hidden" name="' . self::FIELD_NAME . '" value="' . $token . '">';
    }

    /**
     * Meta tag olarak token döner (SPA / AJAX için).
     */
    public static function meta(): string
    {
        $token = htmlspecialchars(self::get(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        return '<meta name="csrf-token" content="' . $token . '">';
    }

    // ─── Yardımcı ────────────────────────────────────────────────────────────

    private static function ensureSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }
}
