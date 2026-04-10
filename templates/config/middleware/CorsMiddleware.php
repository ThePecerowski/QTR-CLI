<?php
/**
 * QTR Framework — CorsMiddleware
 * Cross-Origin Resource Sharing başlıklarını yönetir.
 *
 * Kullanım (routes/api.php başına):
 *   require_once QTR_ROOT . '/app/api/middleware/CorsMiddleware.php';
 *   CorsMiddleware::handle();
 */

class CorsMiddleware
{
    /** İzin verilen origin'ler. ['*'] = hepsi */
    private static array $allowedOrigins = ['*'];
    private static array $allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    private static array $allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With'];

    public static function handle(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';

        if (static::$allowedOrigins === ['*'] || in_array($origin, static::$allowedOrigins, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }
        header('Access-Control-Allow-Methods: ' . implode(', ', static::$allowedMethods));
        header('Access-Control-Allow-Headers: ' . implode(', ', static::$allowedHeaders));
        header('Access-Control-Max-Age: 86400');

        // Preflight isteğini hemen bitir
        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
