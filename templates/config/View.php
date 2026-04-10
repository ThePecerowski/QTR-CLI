<?php
/**
 * QTR Framework — View
 * resources/views/ altindaki PHP view dosyalarini render eder.
 *
 * Kullanim:
 *   View::render('blog/index', ['posts' => $posts]);
 *   View::render('admin/dashboard', ['title' => 'Dashboard'], 'admin');
 *   View::json(['ok' => true]);
 */

class View
{
    /**
     * Belirtilen view dosyasini render eder.
     *
     * @param string $view   Dosya yolu, resources/views/ altinden (uzanti olmadan).
     *                       Ornek: 'blog/index' → resources/views/blog/index.php
     * @param array  $data   View'a aktarilacak degiskenler (extract ile acilir).
     * @param string $layout Layout adi (main|admin|blank). null ise layout kullanilmaz.
     */
    public static function render(string $view, array $data = [], ?string $layout = 'main'): void
    {
        $viewPath = defined('QTR_ROOT')
            ? QTR_ROOT . "/resources/views/{$view}.php"
            : "resources/views/{$view}.php";

        if (!file_exists($viewPath)) {
            http_response_code(500);
            $safe = htmlspecialchars($view, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            exit("View bulunamiadi: {$safe}");
        }

        // View içeriğini arabelleğe al
        extract($data, EXTR_SKIP);
        ob_start();
        require $viewPath;
        $content = ob_get_clean();

        if ($layout === null) {
            echo $content;
            return;
        }

        $layoutPath = defined('QTR_ROOT')
            ? QTR_ROOT . "/resources/views/layouts/{$layout}.php"
            : "resources/views/layouts/{$layout}.php";

        if (!file_exists($layoutPath)) {
            // Layout yoksa içeriği direkt bas
            echo $content;
            return;
        }

        require $layoutPath;
    }

    /**
     * JSON yaniti gonderir ve cikis yapar.
     *
     * @param mixed $data    Diziye donusturulecek veri.
     * @param int   $status  HTTP durum kodu.
     */
    public static function json(mixed $data, int $status = 200): void
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /**
     * Basit partial dosyasini dahil eder.
     *
     * @param string $partial Dosya yolu, resources/views/partials/ altinden.
     *                        Ornek: 'header' → resources/views/partials/header.php
     * @param array  $data    Partial'a aktarilacak degiskenler.
     */
    public static function partial(string $partial, array $data = []): void
    {
        $partialPath = defined('QTR_ROOT')
            ? QTR_ROOT . "/resources/views/partials/{$partial}.php"
            : "resources/views/partials/{$partial}.php";

        if (!file_exists($partialPath)) return;

        extract($data, EXTR_SKIP);
        require $partialPath;
    }
}
