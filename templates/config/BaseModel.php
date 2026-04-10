<?php
/**
 * QTR Framework — BaseModel
 *
 * Tüm model sınıfları bu sınıfı extend eder.
 * PDO bağlantısı Config::get() üzerinden .env'den okunur.
 * Bağlantı statik olarak cache'lenir (tek bağlantı).
 *
 * Kullanım:
 *   class UserModel extends BaseModel { ... }
 *   $users = UserModel::findAll();
 */

class BaseModel
{
    /** @var PDO|null Paylaşılan PDO bağlantısı */
    private static ?PDO $pdo = null;

    // ─── Bağlantı ────────────────────────────────────────────────────────────

    /**
     * PDO bağlantısını başlatır (zaten açıksa atlar).
     */
    public static function connect(): void
    {
        if (self::$pdo !== null) return;

        $host = Config::get('DB_HOST', 'localhost');
        $port = Config::get('DB_PORT', '3306');
        $name = Config::get('DB_NAME', '');
        $user = Config::get('DB_USER', 'root');
        $pass = Config::get('DB_PASS', '');

        $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

        self::$pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }

    /**
     * PDO nesnesini döner (test / özel sorgular için).
     */
    public static function getPdo(): PDO
    {
        self::connect();
        return self::$pdo;
    }

    // ─── Sorgu Yardımcısı ────────────────────────────────────────────────────

    /**
     * Hazırlanmış sorgu çalıştırır ve PDOStatement döner.
     * Tüm parametreler bind edilir (SQL injection koruması).
     *
     * @param  string  $sql    Hazırlanmış SQL sorgusu (? veya :key)
     * @param  array   $params Bind edilecek parametreler
     */
    protected static function query(string $sql, array $params = []): \PDOStatement
    {
        self::connect();
        $stmt = self::$pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    // ─── Temel CRUD ──────────────────────────────────────────────────────────

    /**
     * Alt sınıfta geçersiz kılınacak tablo adı.
     * Örnek: protected static string $table = 'users';
     */
    protected static string $table = '';

    /**
     * Tüm kayıtları döner.
     */
    public static function findAll(): array
    {
        $tbl = static::$table;
        return static::query("SELECT * FROM `{$tbl}`")->fetchAll();
    }

    /**
     * ID'ye göre tek kayıt döner; bulunamazsa null.
     */
    public static function findById(int $id): ?array
    {
        $tbl = static::$table;
        $row = static::query("SELECT * FROM `{$tbl}` WHERE id = ?", [$id])->fetch();
        return $row ?: null;
    }

    /**
     * Koşula göre kayıtları filtreler.
     * Örnek: UserModel::where('email = ?', ['a@b.com'])
     *
     * @param  string $condition WHERE koşulu (prepared — asla ham değer geçirme)
     * @param  array  $params    Bind parametreleri
     */
    public static function where(string $condition, array $params = []): array
    {
        $tbl = static::$table;
        return static::query("SELECT * FROM `{$tbl}` WHERE {$condition}", $params)->fetchAll();
    }

    /**
     * Yeni kayıt ekler, eklenen satırın ID'sini döner.
     * $data dizi anahtarları = sütun adları.
     */
    public static function create(array $data): int
    {
        $tbl     = static::$table;
        $cols    = array_keys($data);
        $holders = array_fill(0, count($cols), '?');

        $sql = sprintf(
            "INSERT INTO `{$tbl}` (%s) VALUES (%s)",
            implode(', ', array_map(fn($c) => "`{$c}`", $cols)),
            implode(', ', $holders)
        );

        static::query($sql, array_values($data));
        return (int) static::getPdo()->lastInsertId();
    }

    /**
     * ID'ye göre kaydı günceller.
     * $data dizi anahtarları = güncellenecek sütun adları.
     */
    public static function update(int $id, array $data): int
    {
        $tbl  = static::$table;
        $sets = implode(', ', array_map(fn($c) => "`{$c}` = ?", array_keys($data)));
        $params = array_merge(array_values($data), [$id]);

        $stmt = static::query("UPDATE `{$tbl}` SET {$sets} WHERE id = ?", $params);
        return $stmt->rowCount();
    }

    /**
     * ID'ye göre kaydı siler.
     */
    public static function delete(int $id): int
    {
        $tbl  = static::$table;
        $stmt = static::query("DELETE FROM `{$tbl}` WHERE id = ?", [$id]);
        return $stmt->rowCount();
    }
}

