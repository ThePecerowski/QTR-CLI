<?php
/**
 * QTR Framework — Admin Router
 * /admin/* isteklerini ilgili controller'a yönlendirir.
 *
 * Güvenlik: AdminAuthMiddleware tüm /admin/* için oturum zorunlu kılar.
 */

require_once QTR_ROOT . '/app/core/Router.php';

$adminRouter = new QtrRouter();

// ─── Auth (middleware gerektirmeyen route'lar) ────────────────────────────────
$adminRouter->get('/admin/login',   'AdminAuthController@loginForm');
$adminRouter->post('/admin/login',  'AdminAuthController@login');
$adminRouter->get('/admin/logout',  'AdminAuthController@logout');

// ─── Auth Middleware — login dışındaki tüm admin isteklerinde oturum kontrol ──
$url = isset($_GET['url']) ? rtrim($_GET['url'], '/') : '';
if ($url !== 'admin/login' && $url !== 'admin/logout') {
    require_once QTR_ROOT . '/app/admin/middleware/AdminAuthMiddleware.php';
    AdminAuthMiddleware::handle();
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
$adminRouter->get('/admin',           'AdminDashboardController@index');
$adminRouter->get('/admin/dashboard', 'AdminDashboardController@index');

// ─── Modüller (qtr admin:add-module ile eklenecek) ───────────────────────────
// $adminRouter->get('/admin/users',            'AdminUsersController@index');
// $adminRouter->get('/admin/users/{id}',       'AdminUsersController@show');
// $adminRouter->post('/admin/users',           'AdminUsersController@store');
// $adminRouter->put('/admin/users/{id}',       'AdminUsersController@update');
// $adminRouter->delete('/admin/users/{id}',    'AdminUsersController@destroy');

// ─── Ayarlar ─────────────────────────────────────────────────────────────────
// $adminRouter->get('/admin/settings',         'AdminSettingsController@index');
// $adminRouter->post('/admin/settings',        'AdminSettingsController@update');

$adminRouter->dispatch();
