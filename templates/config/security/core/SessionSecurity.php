<?php
/**
 * QTR Framework — SessionSecurity
 * Oturum güvenliği: hijacking koruması, timeout, IP takibi, secure cookie.
 *
 * Kullanım (index.php veya bootstrap'da):
 *   SessionSecurity::start();
 *
 * Login sonrası:
 *   SessionSecurity::regenerate();
 */

class SessionSecurity
{
    /** Varsayılan inactiviy timeout (saniye) */
    private const DEFAULT_TIMEOUT = 7200; // 2 saat

    // ─── Başlatma ────────────────────────────────────────────────────────────

    /**
     * Güvenli session ayarlarıyla oturumu başlatır.
     */
    public static function start(int $timeout = self::DEFAULT_TIMEOUT): void
    {
        if (session_status() !== PHP_SESSION_NONE) return;

        // Güvenli cookie ayarları
        session_set_cookie_params([
            'lifetime' => 0,              // tarayıcı kapanınca sil
            'path'     => '/',
            'domain'   => '',
            'secure'   => self::isHttps(),
            'httponly' => true,           // JavaScript erişimi engelle
            'samesite' => 'Lax',
        ]);

        session_start();
        self::enforceTimeout($timeout);
        self::checkIpConsistency();
    }

    // ─── Oturum yenileme ────────────────────────────────────────────────────

    /**
     * Session ID'yi yeniler (login sonrası çağrılmalı).
     * Eski session verisini korur, ID'yi değiştirir.
     */
    public static function regenerate(): void
    {
        if (session_status() === PHP_SESSION_NONE) self::start();
        session_regenerate_id(true);
        $_SESSION['_qtr_ip']        = self::clientIp();
        $_SESSION['_qtr_last_seen'] = time();
    }

    // ─── Yok etme ───────────────────────────────────────────────────────────

    /**
     * Oturumu tamamen temizler.
     */
    public static function destroy(): void
    {
        if (session_status() === PHP_SESSION_NONE) return;
        $_SESSION = [];
        $params = session_get_cookie_params();
        setcookie(
            session_name(), '', time() - 3600,
            $params['path'], $params['domain'],
            $params['secure'], $params['httponly']
        );
        session_destroy();
    }

    // ─── Dahili kontroller ──────────────────────────────────────────────────

    private static function enforceTimeout(int $timeout): void
    {
        if (isset($_SESSION['_qtr_last_seen'])) {
            if ((time() - $_SESSION['_qtr_last_seen']) > $timeout) {
                self::destroy();
                session_start();
            }
        }
        $_SESSION['_qtr_last_seen'] = time();
    }

    private static function checkIpConsistency(): void
    {
        $current = self::clientIp();
        if (isset($_SESSION['_qtr_ip']) && $_SESSION['_qtr_ip'] !== $current) {
            // IP değişti — olası hijacking, oturumu temizle
            self::destroy();
            session_start();
        }
        $_SESSION['_qtr_ip'] = $current;
    }

    private static function clientIp(): string
    {
        // Proxy arkasındaysa güvenilir başlık kullanılabilir, ama varsayılan REMOTE_ADDR
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    private static function isHttps(): bool
    {
        return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['SERVER_PORT'] ?? 80) == 443);
    }
}
