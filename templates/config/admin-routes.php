<?php
/**
 * QTR Framework — Admin Router
 * /admin/* isteklerini ilgili controller'a yönlendirir.
 *
 * Güvenlik: AdminAuthMiddleware tüm /admin/* için oturum zorunlu kılar.
 */

require_once QTR_ROOT . '/app/core/Router.php';
require_once QTR_ROOT . '/app/admin/middleware/AdminAuthMiddleware.php';

$adminRouter = new QtrRouter();

// ─── Auth ────────────────────────────────────────────────────────────────────
$adminRouter->get('/admin/login',   'AdminAuthController@loginForm');
$adminRouter->post('/admin/login',  'AdminAuthController@login');
$adminRouter->get('/admin/logout',  'AdminAuthController@logout');

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
