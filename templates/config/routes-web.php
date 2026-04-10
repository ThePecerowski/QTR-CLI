<?php
/**
 * QTR Framework — Web Router
 * Gelen URL'yi parçalayarak ilgili page dosyasına yönlendirir.
 * API isteklerini api.php'ye aktarır.
 */

$url = isset($_GET['url']) ? rtrim($_GET['url'], '/') : 'index';
$parts = explode('/', $url);

// API isteklerini ayrı route motoruna aktar
if ($parts[0] === 'api') {
    require_once __DIR__ . '/api.php';
    exit;
}

// Admin isteklerini admin route motoruna aktar
if ($parts[0] === 'admin') {
    require_once __DIR__ . '/admin.php';
    exit;
}

$page = $parts[0] ?: 'index';

// Güvenlik: path traversal koruması
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $page)) {
    http_response_code(400);
    echo '400 - QTR: Gecersiz sayfa adi!';
    exit;
}

$filePath = QTR_ROOT . '/pages/' . $page . '.php';
if (file_exists($filePath)) {
    require_once $filePath;
} else {
    http_response_code(404);
    require_once QTR_ROOT . '/pages/404.php';
}
