<?php
/**
 * QTR Framework — HealthController
 * GET /api/health — Sunucu durumu kontrolü.
 */

class HealthController
{
    public function index(array $params = []): void
    {
        JsonResponse::success([
            'status'  => 'ok',
            'version' => defined('QTR_VERSION') ? QTR_VERSION : '1.0.0',
            'time'    => date('c'),
        ], 'Server is running');
    }
}
