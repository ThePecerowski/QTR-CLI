<?php
/**
 * QTR Framework — DB Runner
 * CLI tarafından çağrılır. Belirtilen SQL dosyasını PDO üzerinden çalıştırır.
 *
 * Kullanım: php db_runner.php <qtr_json_path> <sql_file_path>
 *
 * Çıkış kodları:
 *   0 → başarılı
 *   1 → hata (STDERR'e mesaj yazar)
 */

if ($argc < 3) {
    fwrite(STDERR, "Kullanim: php db_runner.php <qtr_json_yolu> <sql_dosyasi>\n");
    exit(1);
}

$qtrJsonPath = $argv[1];
$sqlFilePath = $argv[2];

// ─── .qtr.json oku ──────────────────────────────────────────────────────────

if (!file_exists($qtrJsonPath)) {
    fwrite(STDERR, ".qtr.json bulunamadi: {$qtrJsonPath}\n");
    exit(1);
}

$cfg = json_decode(file_get_contents($qtrJsonPath), true);
if (!$cfg) {
    fwrite(STDERR, ".qtr.json okunamadi veya gecersiz JSON.\n");
    exit(1);
}

$db = $cfg['db'] ?? [];
$host = $db['host'] ?? 'localhost';
$port = $db['port'] ?? 3306;
$name = $db['name'] ?? '';
$user = $db['user'] ?? 'root';
$pass = $db['pass'] ?? '';

// ─── SQL dosyasını oku ───────────────────────────────────────────────────────

if (!file_exists($sqlFilePath)) {
    fwrite(STDERR, "SQL dosyasi bulunamadi: {$sqlFilePath}\n");
    exit(1);
}

$sql = file_get_contents($sqlFilePath);
if ($sql === false || trim($sql) === '') {
    fwrite(STDERR, "SQL dosyasi bos veya okunamadi: {$sqlFilePath}\n");
    exit(1);
}

// ─── PDO bağlantısı ─────────────────────────────────────────────────────────

try {
    // Önce DB adı olmadan bağlan — veritabanı yoksa oluştur
    $dsn = "mysql:host={$host};port={$port};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    if ($name) {
        $safeName = preg_replace('/[^a-zA-Z0-9_]/', '', $name);
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$safeName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `{$safeName}`");
    }
} catch (PDOException $e) {
    fwrite(STDERR, "Veritabani baglantisi kurulamadi: " . $e->getMessage() . "\n");
    exit(1);
}

// ─── SQL çalıştır ───────────────────────────────────────────────────────────

try {
    // Birden fazla statement destekli çalıştırma
    $pdo->exec($sql);
    echo "OK\n";
    exit(0);
} catch (PDOException $e) {
    fwrite(STDERR, "SQL hatasi: " . $e->getMessage() . "\n");
    exit(1);
}
