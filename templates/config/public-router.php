<?php
/**
 * QTR Framework — PHP Built-in Server Router Script
 *
 * PHP'nin built-in sunucusu (php -S) Apache/Nginx gibi URL rewriting yapmaz.
 * Bu dosya her isteği önce buraya yönlendirir:
 *   - Statik dosya varsa (CSS, JS, resim vb.) doğrudan servis eder.
 *   - Yoksa index.php'ye yönlendirir ve $_GET['url'] set eder.
 *
 * Kullanım (qtr serve tarafından otomatik yapılır):
 *   php -S localhost:8000 -t public public/router.php
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Statik dosya isteği mi? (CSS, JS, resim, font, vb.)
$staticExtensions = ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
                     'ico', 'woff', 'woff2', 'ttf', 'eot', 'map', 'pdf'];

$ext = strtolower(pathinfo($uri, PATHINFO_EXTENSION));

if ($ext !== '' && in_array($ext, $staticExtensions, true)) {
    // Dosya fiziksel olarak mevcut mu?
    $filePath = __DIR__ . $uri;
    if (file_exists($filePath)) {
        return false; // PHP built-in server dosyayı doğrudan serve eder
    }
}

// Dinamik istek: index.php'ye yönlendir ve URL'yi $_GET['url'] olarak set et
$url = ltrim($uri, '/');

// Sorgu parametrelerini koru
$query = $_SERVER['QUERY_STRING'] ?? '';
if ($query !== '') {
    parse_str($query, $queryParams);
} else {
    $queryParams = [];
}

// url parametresini enjekte et (varsa üzerine yazma)
if (!isset($queryParams['url'])) {
    $queryParams['url'] = $url ?: '';
}

$_GET   = array_merge($_GET, $queryParams);
$_REQUEST = array_merge($_REQUEST, $queryParams);

require __DIR__ . '/index.php';
