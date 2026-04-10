<?php
/**
 * QTR Framework — JsonResponse
 *
 * API controller'larda standart JSON yanıtlar üretmek için kullanılır.
 * Her yanıt aynı zarfı (envelope) kullanır:
 *   { success, message, error_code?, data?, errors? }
 *
 * Hata kodları (error_code):
 *   VALIDATION_ERROR  — 422 girdi doğrulama hatası
 *   NOT_FOUND         — 404 kayıt bulunamadı
 *   UNAUTHORIZED      — 401 kimlik doğrulama başarısız
 *   FORBIDDEN         — 403 yetki yetersiz
 *   RATE_LIMITED      — 429 çok fazla istek
 *   SERVER_ERROR      — 500 sunucu hatası
 *   BAD_REQUEST       — 400 genel istemci hatası
 *
 * Kullanim:
 *   JsonResponse::success($data);
 *   JsonResponse::created(['id' => $id]);
 *   JsonResponse::error('Hata mesajı', 400, 'BAD_REQUEST');
 *   JsonResponse::validationError(['email' => 'Geçersiz e-posta']);
 *   JsonResponse::notFound('Kullanıcı bulunamadı');
 */

class JsonResponse
{
    // ─── Error Code Sabitleri ──────────────────────────────────────────────────

    const EC_VALIDATION  = 'VALIDATION_ERROR';
    const EC_NOT_FOUND   = 'NOT_FOUND';
    const EC_UNAUTHORIZED = 'UNAUTHORIZED';
    const EC_FORBIDDEN   = 'FORBIDDEN';
    const EC_RATE_LIMITED = 'RATE_LIMITED';
    const EC_SERVER_ERROR = 'SERVER_ERROR';
    const EC_BAD_REQUEST  = 'BAD_REQUEST';

    // ─── Temel Gönderici ──────────────────────────────────────────────────────

    private static function send(mixed $body, int $status): void
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    // ─── Başarı Yanıtları ─────────────────────────────────────────────────────

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

    // ─── Hata Yanıtları ───────────────────────────────────────────────────────

    /** Genel hata — istenilen HTTP kodu ve error_code ile */
    public static function error(string $message, int $status = 400, string $errorCode = self::EC_BAD_REQUEST): void
    {
        static::send(['success' => false, 'message' => $message, 'error_code' => $errorCode], $status);
    }

    /** 422 Validation Error */
    public static function validationError(array $errors): void
    {
        static::send([
            'success'    => false,
            'message'    => 'Dogrulama hatasi.',
            'error_code' => self::EC_VALIDATION,
            'errors'     => $errors,
        ], 422);
    }

    /** 404 Not Found */
    public static function notFound(string $message = 'Bulunamadi.'): void
    {
        static::send(['success' => false, 'message' => $message, 'error_code' => self::EC_NOT_FOUND], 404);
    }

    /** 401 Unauthorized */
    public static function unauthorized(string $message = 'Yetkisiz erisim.'): void
    {
        static::send(['success' => false, 'message' => $message, 'error_code' => self::EC_UNAUTHORIZED], 401);
    }

    /** 403 Forbidden */
    public static function forbidden(string $message = 'Erisim yasak.'): void
    {
        static::send(['success' => false, 'message' => $message, 'error_code' => self::EC_FORBIDDEN], 403);
    }

    /** 429 Too Many Requests */
    public static function rateLimited(string $message = 'Cok fazla istek. Lutfen bekleyin.'): void
    {
        static::send(['success' => false, 'message' => $message, 'error_code' => self::EC_RATE_LIMITED], 429);
    }

    /** 500 Internal Server Error */
    public static function serverError(string $message = 'Sunucu hatasi.'): void
    {
        static::send(['success' => false, 'message' => $message, 'error_code' => self::EC_SERVER_ERROR], 500);
    }
}
