<?php
/**
 * QTR Framework — ErrorHandler
 * APP_DEBUG degerine gore hatalar ekranda veya log dosyasinda gosterilir.
 *
 * Kullanim (index.php'de):
 *   require_once QTR_ROOT . '/app/core/ErrorHandler.php';
 *   ErrorHandler::register();
 */

class ErrorHandler
{
    private static bool $debug = false;

    /**
     * PHP hata yakalamalarini kaydeder.
     * Config sinifi yuklenmis oldugu varsayilir.
     */
    public static function register(): void
    {
        self::$debug = class_exists('Config') ? Config::isDebug() : false;

        set_error_handler([self::class, 'handleError']);
        set_exception_handler([self::class, 'handleException']);
        register_shutdown_function([self::class, 'handleShutdown']);
    }

    // ─── Hata İşleyiciler ────────────────────────────────────────────────────

    public static function handleError(int $errno, string $errstr, string $errfile, int $errline): bool
    {
        if (!(error_reporting() & $errno)) return false;

        self::render(
            'PHP Hatası',
            "[{$errno}] {$errstr}",
            $errfile,
            $errline
        );

        return true;
    }

    public static function handleException(\Throwable $e): void
    {
        self::render(
            get_class($e),
            $e->getMessage(),
            $e->getFile(),
            $e->getLine(),
            $e->getTraceAsString()
        );
    }

    public static function handleShutdown(): void
    {
        $error = error_get_last();
        if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
            self::render(
                'Kritik PHP Hatası',
                $error['message'],
                $error['file'],
                $error['line']
            );
        }
    }

    // ─── Render ─────────────────────────────────────────────────────────────

    private static function render(
        string  $type,
        string  $message,
        string  $file  = '',
        int     $line  = 0,
        string  $trace = ''
    ): void {
        // LOG'a yaz
        self::writeLog($type, $message, $file, $line);

        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: text/html; charset=utf-8');
        }

        if (self::$debug) {
            echo self::debugPage($type, $message, $file, $line, $trace);
        } else {
            echo self::productionPage();
        }
    }

    private static function debugPage(string $type, string $message, string $file, int $line, string $trace): string
    {
        $esc = fn(string $s) => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        return <<<HTML
<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8">
<title>QTR Hata</title>
<style>
  body{margin:0;padding:0;font-family:monospace;background:#1a1a2e;color:#e0e0e0}
  .box{max-width:900px;margin:40px auto;background:#16213e;border:1px solid #e94560;border-radius:8px;overflow:hidden}
  .head{background:#e94560;padding:16px 24px;color:#fff;font-size:1.1em}
  .body{padding:24px}
  .label{color:#a0a0c0;font-size:.85em;margin-top:16px}
  .msg{color:#fff;font-size:1em;margin:6px 0 0}
  .loc{color:#f5a623;font-size:.9em;margin:4px 0 0}
  pre{background:#0f3460;padding:16px;border-radius:4px;overflow-x:auto;color:#a9d0f5;font-size:.85em;margin-top:16px}
</style>
</head><body><div class="box">
<div class="head">{$esc($type)}</div>
<div class="body">
  <div class="label">Mesaj</div>
  <div class="msg">{$esc($message)}</div>
  <div class="loc">{$esc($file)} : {$line}</div>
  {$( $trace ? '<div class="label">Stack Trace</div><pre>' . $esc($trace) . '</pre>' : '' )}
</div></div></body></html>
HTML;
    }

    private static function productionPage(): string
    {
        return <<<HTML
<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8"><title>Hata</title>
<style>
  body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;
       background:#f4f4f4;font-family:sans-serif;color:#333}
  .card{background:#fff;padding:40px 56px;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.1);text-align:center}
  h1{font-size:2em;margin:0 0 12px;color:#c0392b}p{color:#666;margin:0}
</style></head>
<body><div class="card">
  <h1>Bir hata oluştu</h1>
  <p>Lütfen daha sonra tekrar deneyin.</p>
</div></body></html>
HTML;
    }

    // ─── Log ────────────────────────────────────────────────────────────────

    private static function writeLog(string $type, string $message, string $file, int $line): void
    {
        $logDir  = defined('QTR_ROOT') ? QTR_ROOT . '/storage/logs' : null;
        if (!$logDir) return;

        if (!is_dir($logDir)) @mkdir($logDir, 0755, true);

        $logFile = $logDir . '/app.log';
        $date    = date('Y-m-d H:i:s');
        $entry   = "[{$date}] [{$type}] {$message} | {$file}:{$line}" . PHP_EOL;
        @file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
    }
}
