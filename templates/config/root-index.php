<?php
/**
 * QTR Framework — Ana Giriş Noktası
 * Tüm HTTP istekleri buraya gelir ve ana router'a aktarılır.
 *
 * Güvenlik: path traversal, geçersiz sayfa adı ve boş URL koruması mevcuttur.
 */

defined('QTR_ROOT')    || define('QTR_ROOT', __DIR__);
defined('QTR_VERSION') || define('QTR_VERSION', '1.0.0');

// Config sınıfını yükle (.env okuma + Config::get())
require_once QTR_ROOT . '/app/core/Config.php';

// Hata işleyicisini kaydet (APP_DEBUG'a göre detaylı veya kullanıcı dostu hata)
require_once QTR_ROOT . '/app/core/ErrorHandler.php';
ErrorHandler::register();

// View yardımcı sınıfını yükle
require_once QTR_ROOT . '/app/core/View.php';

// BaseModel — tüm modeller bu sınıfı extend eder
require_once QTR_ROOT . '/app/models/BaseModel.php';

// JsonResponse — API controller'lar için standart yanıt yardımcısı
require_once QTR_ROOT . '/app/api/responses/JsonResponse.php';

// Debug modunda PHP hata raporlamasını aç
$debug = Config::isDebug();
ini_set('display_errors', $debug ? 1 : 0);
error_reporting($debug ? E_ALL : E_ERROR);

// Web route'larını yükle
require_once QTR_ROOT . '/routes/web.php';
