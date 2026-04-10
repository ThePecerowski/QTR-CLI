<?php
/**
 * QTR Framework — Global Yardımcı Fonksiyonlar
 *
 * Tüm fonksiyonlar if(!function_exists()) koruması altında tanımlanır.
 * root-index.php'de Autoloader'dan hemen sonra yüklenir.
 */

// ─── View ─────────────────────────────────────────────────────────────────────

if (!function_exists('view')) {
    /**
     * View render eder.
     * @param string $name  resources/views/ altındaki yol (ör. 'home', 'admin/dashboard')
     * @param array  $data  View'a aktarılacak değişkenler
     */
    function view(string $name, array $data = []): void
    {
        View::render($name, $data);
    }
}

// ─── Redirect ────────────────────────────────────────────────────────────────

if (!function_exists('redirect')) {
    /**
     * HTTP yönlendirmesi yapar ve betiği sonlandırır.
     * @param string $url  Hedef URL
     * @param int    $code HTTP durum kodu (varsayılan 302)
     */
    function redirect(string $url, int $code = 302): never
    {
        http_response_code($code);
        header('Location: ' . $url);
        exit();
    }
}

// ─── Config ──────────────────────────────────────────────────────────────────

if (!function_exists('config')) {
    /**
     * .env değerini Config::get() aracılığıyla döndürür.
     * @param string $key     Noktalı yol (ör. 'db.host') veya .env anahtarı
     * @param mixed  $default Değer bulunamazsa döndürülecek varsayılan
     */
    function config(string $key, mixed $default = null): mixed
    {
        if (class_exists('Config')) {
            return Config::get($key, $default);
        }
        return $default;
    }
}

// ─── Env ─────────────────────────────────────────────────────────────────────

if (!function_exists('env')) {
    /**
     * .env değişkenini döndürür.
     * @param string $key     .env anahtar adı (ör. 'DB_HOST')
     * @param mixed  $default Tanımsızsa döndürülecek değer
     */
    function env(string $key, mixed $default = null): mixed
    {
        $val = $_ENV[$key] ?? getenv($key);
        if ($val === false || $val === null) return $default;
        return match (strtolower((string) $val)) {
            'true'  => true,
            'false' => false,
            'null'  => null,
            default => $val,
        };
    }
}

// ─── Debug ───────────────────────────────────────────────────────────────────

if (!function_exists('dump')) {
    /**
     * Değerleri formatlı HTML olarak ekrana basar (var_dump benzeri).
     * @param mixed ...$vars
     */
    function dump(mixed ...$vars): void
    {
        foreach ($vars as $var) {
            echo '<pre style="background:#1e293b;color:#e2e8f0;padding:12px 16px;'
               . 'border-radius:6px;font-size:.83em;margin:8px 0;overflow:auto">';
            var_dump($var);
            echo '</pre>';
        }
    }
}

if (!function_exists('dd')) {
    /**
     * Değerleri ekrana basar ve betiği sonlandırır.
     * @param mixed ...$vars
     */
    function dd(mixed ...$vars): never
    {
        dump(...$vars);
        exit(1);
    }
}

// ─── Abort ───────────────────────────────────────────────────────────────────

if (!function_exists('abort')) {
    /**
     * HTTP hata kodu döndürür ve betiği sonlandırır.
     * @param int    $code    HTTP durum kodu (ör. 404, 403, 500)
     * @param string $message İsteğe bağlı hata mesajı
     */
    function abort(int $code, string $message = ''): never
    {
        http_response_code($code);
        if ($message) {
            echo htmlspecialchars($message);
        }
        exit();
    }
}

// ─── CSRF ─────────────────────────────────────────────────────────────────────

if (!function_exists('csrf_token')) {
    /**
     * Mevcut CSRF token'ını döndürür. CsrfToken sınıfını kullanır.
     */
    function csrf_token(): string
    {
        if (class_exists('CsrfToken')) {
            return CsrfToken::generate();
        }
        if (session_status() !== PHP_SESSION_ACTIVE) session_start();
        if (empty($_SESSION['_csrf_token'])) {
            $_SESSION['_csrf_token'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['_csrf_token'];
    }
}

if (!function_exists('csrf_field')) {
    /**
     * HTML hidden CSRF input alanı döndürür.
     * Form içinde <?= csrf_field() ?> şeklinde kullanılır.
     */
    function csrf_field(): string
    {
        return '<input type="hidden" name="_csrf_token" value="'
             . htmlspecialchars(csrf_token(), ENT_QUOTES)
             . '">';
    }
}

// ─── Old input ────────────────────────────────────────────────────────────────

if (!function_exists('old')) {
    /**
     * Form gönderiminden önceki değeri döndürür (flash veri).
     * @param string $key     Input adı
     * @param mixed  $default Değer yoksa döndürülecek
     */
    function old(string $key, mixed $default = ''): mixed
    {
        if (session_status() !== PHP_SESSION_ACTIVE) session_start();
        return $_SESSION['_old_input'][$key] ?? $default;
    }
}

// ─── Asset ────────────────────────────────────────────────────────────────────

if (!function_exists('asset')) {
    /**
     * public/ altındaki bir varlığın URL'sini, cache-buster ile döndürür.
     * @param string $path  public/ içindeki göreli yol (ör. 'css/app.css')
     */
    function asset(string $path): string
    {
        $absPath = QTR_ROOT . '/public/' . ltrim($path, '/');
        $version = file_exists($absPath) ? substr(md5((string) filemtime($absPath)), 0, 8) : '0';
        return '/public/' . ltrim($path, '/') . "?v={$version}";
    }
}

// ─── URL ─────────────────────────────────────────────────────────────────────

if (!function_exists('url')) {
    /**
     * Uygulamanın kök URL'sine göreli bir URL oluşturur.
     * @param string $path  Göreli yol (ör. 'admin/users', '/api/health')
     */
    function url(string $path = ''): string
    {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $base   = rtrim($scheme . '://' . $host, '/');
        return $base . '/' . ltrim($path, '/');
    }
}
