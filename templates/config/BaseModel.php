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
     * true ise create() created_at, update() updated_at otomatik ekler.
     * Alt sınıfta false yaparak devre dışı bırakılabilir.
     */
    protected static bool $timestamps = true;

    /**
     * Tüm kayıtları döner.
     */
    public static function findAll(): array
    {
        $tbl = static::$table;
        return static::query("SELECT * FROM `{$tbl}`")->fetchAll();
    }

    /**
     * Sayfalama, sıralama ve arama destekli liste.
     *
     * @param array $options {
     *   page     int    Sayfa numarası (varsayılan: 1)
     *   per_page int    Sayfa başı kayıt (varsayılan: 20, max: 100)
     *   sort     string Sıralama sütunu (varsayılan: 'id')
     *   order    string 'asc' | 'desc' (varsayılan: 'asc')
     *   search   string Tüm metin sütunlarında LIKE araması
     * }
     * @return array { data: array, meta: { page, per_page, total, total_pages } }
     */
    public static function paginate(array $options = []): array
    {
        $tbl      = static::$table;
        $page     = max(1, (int) ($options['page']     ?? 1));
        $perPage  = min(100, max(1, (int) ($options['per_page'] ?? 20)));
        $order    = strtolower($options['order'] ?? 'asc') === 'desc' ? 'DESC' : 'ASC';
        $search   = trim((string) ($options['search'] ?? ''));
        $offset   = ($page - 1) * $perPage;

        // Sıralama — yalnızca alfanümerik ve alt çizgi kabul et (injection koruması)
        $rawSort  = preg_replace('/[^a-zA-Z0-9_]/', '', $options['sort'] ?? 'id');
        $sort     = empty($rawSort) ? 'id' : $rawSort;

        $params   = [];
        $where    = '';

        if ($search !== '') {
            // Tablonun TEXT/VARCHAR sütunlarını INFORMATION_SCHEMA'dan al
            $cols = static::getSearchableColumns();
            if (!empty($cols)) {
                $likes  = array_map(fn($c) => "`{$c}` LIKE ?", $cols);
                $where  = 'WHERE (' . implode(' OR ', $likes) . ')';
                $params = array_fill(0, count($cols), '%' . $search . '%');
            }
        }

        $countSql = "SELECT COUNT(*) FROM `{$tbl}` {$where}";
        $total    = (int) static::query($countSql, $params)->fetchColumn();

        $dataSql  = "SELECT * FROM `{$tbl}` {$where} ORDER BY `{$sort}` {$order} LIMIT {$perPage} OFFSET {$offset}";
        $rows     = static::query($dataSql, $params)->fetchAll();

        return [
            'data' => $rows,
            'meta' => [
                'page'        => $page,
                'per_page'    => $perPage,
                'total'       => $total,
                'total_pages' => (int) ceil($total / $perPage),
            ],
        ];
    }

    /**
     * Tablonun aranabilir (metin) sütun adlarını döner.
     * Sonuç istek başına bir kez hesaplanır (basit bellek cache).
     */
    private static array $_searchableCache = [];

    private static function getSearchableColumns(): array
    {
        $tbl = static::$table;
        if (isset(self::$_searchableCache[$tbl])) {
            return self::$_searchableCache[$tbl];
        }

        try {
            $rows = static::query(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME   = ?
                   AND DATA_TYPE IN ('char','varchar','text','tinytext','mediumtext','longtext')",
                [$tbl]
            )->fetchAll(\PDO::FETCH_COLUMN);

            self::$_searchableCache[$tbl] = $rows ?: [];
        } catch (\Throwable) {
            self::$_searchableCache[$tbl] = [];
        }

        return self::$_searchableCache[$tbl];
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
     * $timestamps = true ise created_at ve updated_at otomatik set edilir.
     */
    public static function create(array $data): int
    {
        if (static::$timestamps) {
            $now = date('Y-m-d H:i:s');
            $data['created_at'] = $data['created_at'] ?? $now;
            $data['updated_at'] = $data['updated_at'] ?? $now;
        }

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
     * $timestamps = true ise updated_at otomatik set edilir.
     */
    public static function update(int $id, array $data): int
    {
        if (static::$timestamps) {
            $data['updated_at'] = $data['updated_at'] ?? date('Y-m-d H:i:s');
        }

        $tbl    = static::$table;
        $sets   = implode(', ', array_map(fn($c) => "`{$c}` = ?", array_keys($data)));
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

