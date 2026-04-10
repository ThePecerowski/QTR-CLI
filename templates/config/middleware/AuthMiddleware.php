<?php
/**
 * QTR Framework — AuthMiddleware
 * Bearer token veya API key doğrulaması.
 *
 * Kullanım (controller içinde):
 *   require_once QTR_ROOT . '/app/api/middleware/AuthMiddleware.php';
 *   if (!AuthMiddleware::handle()) return;
 */

class AuthMiddleware
{
    public static function handle(): bool
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        $token  = '';

        if (str_starts_with($header, 'Bearer ')) {
            $token = trim(substr($header, 7));
        } elseif (!empty($_GET['api_key'])) {
            $token = trim($_GET['api_key']);
        }

        if (empty($token)) {
            JsonResponse::unauthorized('Token gerekli.');
            return false;
        }

        // TODO: gerçek token doğrulama buraya
        // if (!TokenService::verify($token)) {
        //     JsonResponse::unauthorized('Gecersiz token.');
        //     return false;
        // }

        return true;
    }
}
