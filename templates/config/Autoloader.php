<?php
/**
 * QTR Framework — Autoloader
 *
 * PSR-4 tarzı otomatik sınıf yükleme.
 * spl_autoload_register ile PHP'nin class-not-found mekanizmasına bağlanır.
 * Sınıf adından suffix'e göre dizin haritası kullanır.
 * Classmap cache varsa önce ona bakar (production performansı).
 *
 * Kullanım (root-index.php içinde):
 *   require_once QTR_ROOT . '/app/core/Autoloader.php';
 *   QtrAutoloader::init();
 */

class QtrAutoloader
{
    /** Aynı istek içinde tekrar arama yapılmaması için çözülmüş yollar */
    private static array $resolved = [];

    /** Classmap cache — key: sınıf adı, value: mutlak dosya yolu */
    private static array $classmap = [];

    /** Classmap bir kez yüklendi mi */
    private static bool $classmapLoaded = false;

    // ─── Başlatma ─────────────────────────────────────────────────────────────

    /**
     * Autoloader'ı kaydeder ve classmap'i yükler.
     * root-index.php'de tanımların hemen sonrasında çağrılmalıdır.
     */
    public static function init(): void
    {
        // Classmap dosyası varsa yükle (production hızı)
        if (!self::$classmapLoaded && defined('QTR_ROOT')) {
            $classmapFile = QTR_ROOT . '/storage/cache/classmap.php';
            if (file_exists($classmapFile)) {
                $map = require $classmapFile;
                if (is_array($map)) {
                    self::$classmap = $map;
                }
            }
            self::$classmapLoaded = true;
        }

        spl_autoload_register([self::class, 'load']);
    }

    // ─── Yükleme ──────────────────────────────────────────────────────────────

    /**
     * PHP'nin class-not-found tetiklemesiyle çağrılır.
     * Önce request-cache → classmap → dinamik tarama sırasıyla arar.
     */
    public static function load(string $class): void
    {
        // 1. Aynı istek içinde daha önce çözüldü mü?
        if (isset(self::$resolved[$class])) {
            require_once self::$resolved[$class];
            return;
        }

        // 2. Classmap cache'te var mı?
        if (isset(self::$classmap[$class])) {
            $file = self::$classmap[$class];
            if (file_exists($file)) {
                self::$resolved[$class] = $file;
                require_once $file;
                return;
            }
        }

        // 3. Dinamik dosya sistemi araması (development modu)
        $file = self::findFile($class);
        if ($file !== null) {
            self::$resolved[$class] = $file;
            require_once $file;
        }
    }

    // ─── Dinamik Arama ────────────────────────────────────────────────────────

    /**
     * Sınıf adına göre olası dizinleri tara ve dosyayı bul.
     */
    private static function findFile(string $class): ?string
    {
        if (!defined('QTR_ROOT')) {
            return null;
        }

        foreach (self::getSearchPaths($class, QTR_ROOT) as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Sınıf adının suffix'ine göre aranacak olası dosya yollarını döner.
     * Öncelik sırası: en özelden en genele.
     *
     * @return string[]
     */
    private static function getSearchPaths(string $class, string $root): array
    {
        $file  = $class . '.php';
        $paths = [];

        if (str_ends_with($class, 'Controller')) {
            $paths[] = $root . '/app/api/controllers/'   . $file;
            $paths[] = $root . '/app/admin/controllers/' . $file;
            $paths[] = $root . '/app/controllers/'       . $file;
        } elseif (str_ends_with($class, 'Model')) {
            $paths[] = $root . '/app/models/' . $file;
        } elseif (str_ends_with($class, 'Service')) {
            $paths[] = $root . '/app/api/services/' . $file;
        } elseif (str_ends_with($class, 'Middleware')) {
            $paths[] = $root . '/app/api/middleware/'   . $file;
            $paths[] = $root . '/app/admin/middleware/' . $file;
        } elseif (str_ends_with($class, 'Validator')) {
            $paths[] = $root . '/app/api/validators/' . $file;
        }

        // Core sınıflar + güvenlik sınıfları + API yardımcıları
        $paths[] = $root . '/app/core/'           . $file;
        $paths[] = $root . '/app/api/responses/'  . $file;

        return $paths;
    }

    // ─── Classmap Yönetimi ────────────────────────────────────────────────────

    /**
     * Yüklü classmap'i döner (CLI cache:classmap için yardımcı).
     */
    public static function getClassmap(): array
    {
        return self::$classmap;
    }

    /**
     * Request-cache'i temizler (test senaryoları için).
     */
    public static function clearResolved(): void
    {
        self::$resolved     = [];
        self::$classmap     = [];
        self::$classmapLoaded = false;
    }
}
