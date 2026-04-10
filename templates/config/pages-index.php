<?php
/**
 * QTR Framework — Ana Giriş Noktası
 * Tüm istekler burada başlar. Router çalıştırılır.
 */

define('QTR_ROOT', __DIR__);
define('QTR_VERSION', '1.0.0');

// Hata raporlama (APP_DEBUG .env'den okunur)
$debug = getenv('APP_DEBUG') === 'true';
ini_set('display_errors', $debug ? 1 : 0);
error_reporting($debug ? E_ALL : E_ERROR);

// Web route'larını yükle
require_once QTR_ROOT . '/routes/web.php';
