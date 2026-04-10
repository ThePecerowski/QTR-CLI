<?php
/**
 * QTR Framework — Seed Runner
 * CLI tarafından çağrılır: php seed-runner.php <qtr-json-path> <seeder-file-path>
 *
 * Kullanım (CLI tarafından otomatik):
 *   php seed-runner.php /proje/.qtr.json /proje/database/seeders/UsersSeeder.php
 */

if ($argc < 3) {
    fwrite(STDERR, "Kullanım: php seed-runner.php <qtr.json-yolu> <seeder-dosyası>\n");
    exit(1);
}

$qtrJsonPath  = $argv[1];
$seederPath   = $argv[2];

// .qtr.json oku
if (!file_exists($qtrJsonPath)) {
    fwrite(STDERR, "Hata: .qtr.json bulunamadı: {$qtrJsonPath}\n");
    exit(1);
}

$cfg = json_decode(file_get_contents($qtrJsonPath), true);
if (!$cfg || !isset($cfg['db'])) {
    fwrite(STDERR, "Hata: .qtr.json geçersiz veya 'db' alanı eksik.\n");
    exit(1);
}

// Seeder dosyasını yükle
if (!file_exists($seederPath)) {
    fwrite(STDERR, "Hata: Seeder dosyası bulunamadı: {$seederPath}\n");
    exit(1);
}

require_once $seederPath;

// Sınıf adını dosya adından çıkar
$className = basename($seederPath, '.php');

if (!class_exists($className)) {
    fwrite(STDERR, "Hata: Sınıf bulunamadı: {$className} (dosya: {$seederPath})\n");
    exit(1);
}

// PDO bağlantısı kur
$db = $cfg['db'];
$host = $db['host'] ?? 'localhost';
$port = $db['port'] ?? 3306;
$name = $db['name'] ?? '';
$user = $db['user'] ?? 'root';
$pass = $db['pass'] ?? '';

if (!$name) {
    fwrite(STDERR, "Hata: .qtr.json 'db.name' alanı boş.\n");
    exit(1);
}

try {
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    fwrite(STDERR, "Hata: Veritabanı bağlantısı kurulamadı: " . $e->getMessage() . "\n");
    exit(1);
}

// Seeder'ı çalıştır
$seeder = new $className();
$seeder->run($pdo);
