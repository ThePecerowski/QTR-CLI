<?php
/**
 * QTR Framework — Admin Router
 * /admin/* isteklerini ilgili controller'a yönlendirir.
 *
 * Middleware zinciri:
 *   - 'cors'  → CORS başlıkları (tüm admin route'ları için)
 *   - 'admin' → AdminAuthMiddleware — login/logout hariç oturum zorunlu
 *
 * Yeni admin modülü eklemek için:
 *   $adminRouter->get('/admin/resource',         'AdminResourceController@index')
 *               ->middleware('admin');   // grup içindeyse otomatik eklenir
 */

require_once QTR_ROOT . '/app/core/Router.php';

if (file_exists(QTR_ROOT . '/app/core/MiddlewareRegistry.php')) {
    require_once QTR_ROOT . '/app/core/MiddlewareRegistry.php';
}

$adminRouter = new QtrRouter();

// Global: CORS tüm admin route'larda
$adminRouter->globalMiddleware('cors');

// ─── Auth gerektirmeyen route'lar ────────────────────────────────────────────
$adminRouter->get('/admin/login',  'AdminAuthController@loginForm');
$adminRouter->post('/admin/login', 'AdminAuthController@login');
$adminRouter->get('/admin/logout', 'AdminAuthController@logout');

// ─── Auth gerektiren route'lar (grup ile toplu middleware) ───────────────────
$adminRouter->group(['middleware' => ['admin']], function ($r) {

    // Dashboard
    $r->get('/admin',           'AdminDashboardController@index');
    $r->get('/admin/dashboard', 'AdminDashboardController@index');

    // ─── Log Viewer ──────────────────────────────────────────────────────────
    $r->get('/admin/logs',         'LogViewerController@index');
    $r->get('/admin/logs/content', 'LogViewerController@getContent');

    // ─── Modüller (qtr admin:add-module ile eklenecek) ─────────────────────
    // $r->get('/admin/users',            'AdminUsersController@index');
    // $r->get('/admin/users/{id}',       'AdminUsersController@show');
    // $r->post('/admin/users',           'AdminUsersController@store');
    // $r->put('/admin/users/{id}',       'AdminUsersController@update');
    // $r->delete('/admin/users/{id}',    'AdminUsersController@destroy');

    // ─── Ayarlar ─────────────────────────────────────────────────────────────
    // $r->get('/admin/settings',         'AdminSettingsController@index');
    // $r->post('/admin/settings',        'AdminSettingsController@update');
});

// Route exporter modunda dispatch çağırmayacağız
if (!defined('QTR_EXPORT_ROUTES')) {
    $adminRouter->dispatch();
}

