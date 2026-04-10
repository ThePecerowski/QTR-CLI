<?php
/**
 * QTR Framework — Router
 *
 * HTTP router. Route-level middleware, middleware grupları, global middleware,
 * parametrik middleware, after-hook ve route cache desteği içerir.
 *
 * Kullanım (routes/api.php içinde):
 *   $router = new QtrRouter();
 *
 *   // Temel kayıt
 *   $router->get('/api/products', 'ProductController@index');
 *
 *   // Middleware zinciri
 *   $router->post('/api/orders', 'OrderController@store')
 *          ->middleware('auth', 'rate-limit:120');
 *
 *   // Grup tanımı
 *   $router->group(['prefix' => '/admin', 'middleware' => ['auth', 'admin']], function($r) {
 *       $r->get('/dashboard', 'AdminDashboardController@index');
 *   });
 *
 *   // Global middleware
 *   $router->globalMiddleware('cors');
 *
 *   // Route cache kullanımı
 *   if (!$router->loadCache(QTR_ROOT . '/storage/cache/routes.php')) {
 *       $router->get('/api/health', 'HealthController@index');
 *   }
 *
 *   $router->dispatch();
 */

// ─── Route ───────────────────────────────────────────────────────────────────

class Route
{
    public string $method;
    public string $pattern;
    public string $handler;

    /** Before (controller öncesi) middleware isimleri */
    public array $middlewares = [];

    /** After (controller sonrası) middleware isimleri */
    public array $afterMiddlewares = [];

    public function __construct(string $method, string $pattern, string $handler)
    {
        $this->method  = $method;
        $this->pattern = $pattern;
        $this->handler = $handler;
    }

    /**
     * Route'a before-middleware ekler. Zincir sözdizimini destekler.
     *   ->middleware('auth', 'role:admin')
     */
    public function middleware(string ...$names): self
    {
        $this->middlewares = array_merge($this->middlewares, $names);
        return $this;
    }

    /**
     * Route'a after-middleware ekler (controller çalıştıktan sonra).
     *   ->after('log:api')
     */
    public function after(string ...$names): self
    {
        $this->afterMiddlewares = array_merge($this->afterMiddlewares, $names);
        return $this;
    }
}

// ─── QtrRouter ───────────────────────────────────────────────────────────────

class QtrRouter
{
    /** @var Route[] */
    private array $routes = [];

    /** Route cache'den yüklendi mi */
    private bool $cacheLoaded = false;

    /** Tüm route'lara uygulanan global middleware'ler */
    private array $globalMiddlewares = [];

    /** Aktif group() yığını — prefix + middleware miras alımı */
    private array $groupStack = [];

    // ─── Route Kayıt ─────────────────────────────────────────────────────────

    public function get(string $pattern, string $handler): Route
    {
        return $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, string $handler): Route
    {
        return $this->add('POST', $pattern, $handler);
    }

    public function put(string $pattern, string $handler): Route
    {
        return $this->add('PUT', $pattern, $handler);
    }

    public function delete(string $pattern, string $handler): Route
    {
        return $this->add('DELETE', $pattern, $handler);
    }

    public function patch(string $pattern, string $handler): Route
    {
        return $this->add('PATCH', $pattern, $handler);
    }

    private function add(string $method, string $pattern, string $handler): Route
    {
        $prefix  = $this->getGroupPrefix();
        $pattern = $prefix . $pattern;

        $route = new Route(strtoupper($method), $pattern, $handler);

        $groupMw = $this->getGroupMiddlewares();
        if (!empty($groupMw)) {
            $route->middleware(...$groupMw);
        }

        $this->routes[] = $route;
        return $route;
    }

    // ─── Grup ────────────────────────────────────────────────────────────────

    /**
     * Prefix ve/veya middleware paylaşan route grubu tanımlar.
     *
     *   $router->group(['prefix' => '/admin', 'middleware' => ['auth', 'admin']], function($r) {
     *       $r->get('/dashboard', 'AdminDashboardController@index');
     *   });
     */
    public function group(array $options, callable $callback): void
    {
        $this->groupStack[] = $options;
        $callback($this);
        array_pop($this->groupStack);
    }

    private function getGroupPrefix(): string
    {
        $prefix = '';
        foreach ($this->groupStack as $opts) {
            $prefix .= rtrim($opts['prefix'] ?? '', '/');
        }
        return $prefix;
    }

    private function getGroupMiddlewares(): array
    {
        $middlewares = [];
        foreach ($this->groupStack as $opts) {
            $middlewares = array_merge($middlewares, $opts['middleware'] ?? []);
        }
        return $middlewares;
    }

    // ─── Global Middleware ────────────────────────────────────────────────────

    /**
     * Tüm route'lardan önce çalışacak global middleware ekler.
     *   $router->globalMiddleware('cors');
     */
    public function globalMiddleware(string ...$names): void
    {
        $this->globalMiddlewares = array_merge($this->globalMiddlewares, $names);
    }

    // ─── Route Cache ──────────────────────────────────────────────────────────

    /**
     * Önceden oluşturulmuş route cache dosyasını yükler.
     * Route dosyaları değiştiyse cache'i geçersiz sayar (auto-invalidation).
     * true döndürürse route tanımlarını atlayın.
     */
    public function loadCache(string $cacheFile): bool
    {
        if (!file_exists($cacheFile)) {
            return false;
        }

        // Route dosyaları değiştiyse cache geçersiz (development auto-invalidation)
        if (defined('QTR_ROOT')) {
            $cacheTime  = filemtime($cacheFile);
            $routeFiles = [
                QTR_ROOT . '/routes/api.php',
                QTR_ROOT . '/routes/admin.php',
                QTR_ROOT . '/routes/web.php',
            ];
            foreach ($routeFiles as $rf) {
                if (file_exists($rf) && filemtime($rf) > $cacheTime) {
                    return false;
                }
            }
        }

        $data = require $cacheFile;
        if (!is_array($data)) {
            return false;
        }

        foreach ($data as $r) {
            $route = new Route($r['method'], $r['pattern'], $r['handler']);
            $route->middlewares      = $r['middlewares']      ?? [];
            $route->afterMiddlewares = $r['afterMiddlewares'] ?? [];
            $this->routes[] = $route;
        }

        $this->cacheLoaded = true;
        return true;
    }

    /**
     * Mevcut route tablosunu dizi olarak döner.
     * qtr cache:routes CLI komutu tarafından kullanılır.
     */
    public function exportRoutes(): array
    {
        $data = [];
        foreach ($this->routes as $route) {
            $data[] = [
                'method'           => $route->method,
                'pattern'          => $route->pattern,
                'handler'          => $route->handler,
                'middlewares'      => $route->middlewares,
                'afterMiddlewares' => $route->afterMiddlewares,
            ];
        }
        return $data;
    }

    // ─── Dispatch ─────────────────────────────────────────────────────────────

    /**
     * Gelen isteği route tablosuna karşılaştırır ve middleware + controller zincirini çalıştırır.
     *
     * @param string|null $uri    Test için enjekte edilebilir; null ise $_GET['url']
     * @param string|null $method Test için enjekte edilebilir; null ise REQUEST_METHOD
     */
    public function dispatch(?string $uri = null, ?string $method = null): void
    {
        $method = strtoupper($method ?? ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $uri    = $uri ?? (isset($_GET['url']) ? '/' . rtrim($_GET['url'], '/') : '/');

        if (!str_starts_with($uri, '/')) {
            $uri = '/' . $uri;
        }

        foreach ($this->routes as $route) {
            if ($route->method !== $method) {
                continue;
            }

            $params = [];
            if ($this->match($route->pattern, $uri, $params)) {
                // 1. Global middlewares
                if (!$this->runMiddlewareList($this->globalMiddlewares)) {
                    return;
                }

                // 2. Route-level before middlewares
                if (!$this->runMiddlewareList($route->middlewares)) {
                    return;
                }

                // 3. Controller
                $this->call($route->handler, $params);

                // 4. After middlewares
                $this->runAfterMiddlewareList($route->afterMiddlewares);

                return;
            }
        }

        // Eşleşme bulunamadı
        $isApi = str_starts_with($uri, '/api/') || $uri === '/api';

        if ($isApi) {
            http_response_code(404);
            header('Content-Type: application/json');
            if (class_exists('JsonResponse')) {
                JsonResponse::notFound('API endpoint bulunamadi: ' . htmlspecialchars($uri, ENT_QUOTES, 'UTF-8'));
            } else {
                echo json_encode(['status' => 'error', 'message' => 'API endpoint bulunamadi.', 'path' => htmlspecialchars($uri, ENT_QUOTES, 'UTF-8')]);
            }
        } else {
            http_response_code(404);
            $page404 = defined('QTR_ROOT') ? QTR_ROOT . '/pages/404.php' : null;
            if ($page404 && file_exists($page404)) {
                require $page404;
            } else {
                echo '<h1>404 - Sayfa Bulunamadı</h1><p>' . htmlspecialchars($uri, ENT_QUOTES, 'UTF-8') . '</p>';
            }
        }
    }

    // ─── Middleware Çalışma ───────────────────────────────────────────────────

    /**
     * Before middleware listesini çalıştırır.
     * Herhangi biri false dönerse zincir durur.
     */
    private function runMiddlewareList(array $names): bool
    {
        foreach ($names as $name) {
            if (!$this->runSingleMiddleware($name)) {
                return false;
            }
        }
        return true;
    }

    /**
     * After middleware listesini çalıştırır (sonuç önemsenmez).
     */
    private function runAfterMiddlewareList(array $names): void
    {
        foreach ($names as $name) {
            $resolved = $this->resolveMiddleware($name);
            if ($resolved === null) {
                continue;
            }
            /** @var class-string $class */
            $class  = $resolved['class'];
            $params = $resolved['params'];

            if (class_exists($class) && method_exists($class, 'after')) {
                $class::after($params);
            }
        }
    }

    /**
     * Tek bir middleware'i çalıştırır.
     * void dönen middleware → true kabul edilir.
     * false dönen middleware → zinciri durdurur.
     */
    private function runSingleMiddleware(string $name): bool
    {
        $resolved = $this->resolveMiddleware($name);
        if ($resolved === null) {
            error_log("[QTR Router] Bilinmeyen middleware: {$name}");
            return true;
        }

        /** @var class-string $class */
        $class  = $resolved['class'];
        $params = $resolved['params'];

        if (!class_exists($class)) {
            error_log("[QTR Router] Middleware sınıfı bulunamadı: {$class}");
            return true;
        }

        // handle(array $params) veya handle() — her iki imzayı destekle
        $result = empty($params)
            ? $class::handle()
            : $class::handle($params);

        // void (null) → devam et; false → durdur
        return $result !== false;
    }

    /**
     * 'role:admin,editor' formatını çözümler.
     * MiddlewareRegistry varsa onu kullanır.
     */
    private function resolveMiddleware(string $name): ?array
    {
        if (class_exists('MiddlewareRegistry')) {
            return MiddlewareRegistry::resolve($name);
        }

        // Registry yoksa basit fallback: isim = sınıf adı
        $params = [];
        if (str_contains($name, ':')) {
            [$name, $paramStr] = explode(':', $name, 2);
            $params = array_map('trim', explode(',', $paramStr));
        }
        return ['class' => $name, 'params' => $params];
    }

    // ─── URI Eşleştirme ──────────────────────────────────────────────────────

    /**
     * URI pattern'ını gerçek URI ile karşılaştırır.
     * {id} gibi dinamik segmentleri çıkarır.
     *
     * @param array<string, string> $params çıkarılan segment değerleri
     */
    private function match(string $pattern, string $uri, array &$params): bool
    {
        $regex = preg_replace('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', '([^/]+)', $pattern);
        $regex = '#^' . $regex . '$#';

        if (!preg_match($regex, $uri, $matches)) {
            return false;
        }

        preg_match_all('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', $pattern, $names);
        array_shift($matches);

        foreach ($names[1] as $i => $name) {
            $params[$name] = $matches[$i] ?? '';
        }

        return true;
    }

    // ─── Controller Çağrısı ──────────────────────────────────────────────────

    /**
     * "Controller@method" formatındaki handler'ı çözümleyip çağırır.
     * Autoloader yüklendiyse sınıfı otomatik bulur; yoksa manuel dizin taraması yapar.
     *
     * @param array<string, string> $params dinamik URL segmentleri
     */
    private function call(string $handler, array $params): void
    {
        [$class, $method] = explode('@', $handler, 2);

        // Güvenlik: sınıf ve metot adı alfanumerik kontrolü
        if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $class) ||
            !preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $method)) {
            $this->errorResponse(500, 'Gecersiz handler tanimi.', $class);
            return;
        }

        // Autoloader sınıfı bulamazsa → manuel dizin taraması (fallback)
        if (!class_exists($class)) {
            $dirs = [
                QTR_ROOT . '/app/api/controllers/',
                QTR_ROOT . '/app/admin/controllers/',
                QTR_ROOT . '/app/controllers/',
            ];
            foreach ($dirs as $dir) {
                $file = $dir . $class . '.php';
                if (file_exists($file)) {
                    require_once $file;
                    break;
                }
            }
        }

        if (!class_exists($class)) {
            $this->errorResponse(500, 'Controller bulunamadi: ' . htmlspecialchars($class, ENT_QUOTES, 'UTF-8'), $class);
            return;
        }

        if (!method_exists($class, $method)) {
            $this->errorResponse(404, 'Metot bulunamadi: ' . htmlspecialchars($method, ENT_QUOTES, 'UTF-8'), $class);
            return;
        }

        $controller = new $class();
        $controller->$method($params);
    }

    /**
     * Hata yanıtı döner: /api/* → JSON, diğerleri → HTML.
     *
     * @param string $context Hangi sınıf/rota için hata oluştu (loglama vs.)
     */
    private function errorResponse(int $code, string $message, string $context = ''): void
    {
        $uri   = isset($_GET['url']) ? '/' . ltrim($_GET['url'], '/') : '/';
        $isApi = str_starts_with($uri, '/api/') || $uri === '/api';

        http_response_code($code);

        if ($isApi) {
            header('Content-Type: application/json');
            echo json_encode(['status' => 'error', 'message' => $message]);
        } else {
            $page404 = defined('QTR_ROOT') ? QTR_ROOT . '/pages/404.php' : null;
            if ($page404 && file_exists($page404)) {
                require $page404;
            } else {
                echo '<h1>' . $code . ' - Hata</h1><p>' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</p>';
            }
        }
    }
}
