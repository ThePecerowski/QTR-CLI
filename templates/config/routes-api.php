<?php
/**
 * QTR Framework — API Router
 * /api/* isteklerini QtrRouter üzerinden ilgili Controller@method'a yönlendirir.
 *
 * Yeni endpoint eklemek için:
 *   $router->get('/api/resource',        'ResourceController@index');
 *   $router->post('/api/resource',       'ResourceController@store');
 *   $router->get('/api/resource/{id}',   'ResourceController@show');
 *   $router->put('/api/resource/{id}',   'ResourceController@update');
 *   $router->delete('/api/resource/{id}','ResourceController@destroy');
 */

require_once QTR_ROOT . '/app/core/Router.php';

$router = new QtrRouter();

// ─── Sistem Route'ları ────────────────────────────────────────────────────────
$router->get('/api/health', 'HealthController@index');

// ─── Proje Route'ları (aşağıya yeni route'lar ekle) ──────────────────────────

// ─── Dispatch ─────────────────────────────────────────────────────────────────
$router->dispatch();
