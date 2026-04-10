<?php
/**
 * QTR Framework — JsonResponse
 *
 * API controller'larda standart JSON yanıtlar üretmek için kullanılır.
 *
 * Kullanim:
 *   JsonResponse::success($data);
 *   JsonResponse::created(['id' => $id]);
 *   JsonResponse::error('Hata mesajı', 400);
 *   JsonResponse::validationError(['email' => 'Geçersiz e-posta']);
 *   JsonResponse::notFound('Kullanıcı bulunamadı');
 */

class JsonResponse
{
    private static function send(mixed $body, int $status): void
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /** 200 OK */
    public static function success(mixed $data = null, string $message = 'OK'): void
    {
        static::send(['success' => true, 'message' => $message, 'data' => $data], 200);
    }

    /** 201 Created */
    public static function created(mixed $data = null): void
    {
        static::send(['success' => true, 'message' => 'Olusturuldu.', 'data' => $data], 201);
    }

    /** 400 Bad Request (genel hata) */
    public static function error(string $message, int $status = 400): void
    {
        static::send(['success' => false, 'message' => $message], $status);
    }

    /** 422 Validation Error */
    public static function validationError(array $errors): void
    {
        static::send(['success' => false, 'message' => 'Dogrulama hatasi.', 'errors' => $errors], 422);
    }

    /** 404 Not Found */
    public static function notFound(string $message = 'Bulunamadi.'): void
    {
        static::send(['success' => false, 'message' => $message], 404);
    }

    /** 401 Unauthorized */
    public static function unauthorized(string $message = 'Yetkisiz erisim.'): void
    {
        static::send(['success' => false, 'message' => $message], 401);
    }

    /** 500 Internal Server Error */
    public static function serverError(string $message = 'Sunucu hatasi.'): void
    {
        static::send(['success' => false, 'message' => $message], 500);
    }
}
