<?php
/**
 * QTR Framework — Router
 *
 * Basit, hafif bir HTTP router. API ve sayfa route'larını
 * HTTP metoduna + URI pattern'ına göre eşleştirir.
 *
 * Kullanım (routes/api.php içinde):
 *   $router = new QtrRouter();
 *   $router->get('/api/products',           'ProductController@index');
 *   $router->post('/api/products',          'ProductController@store');
 *   $router->get('/api/products/{id}',      'ProductController@show');
 *   $router->put('/api/products/{id}',      'ProductController@update');
 *   $router->delete('/api/products/{id}',   'ProductController@destroy');
 *   $router->dispatch();
 */

class QtrRouter
{
    /** @var array<int, array{method:string, pattern:string, handler:string}> */
    private array $routes = [];

    // ─── Route kayıt metotları ───────────────────────────────────────────────

    public function get(string $pattern, string $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    public function post(string $pattern, string $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    public function put(string $pattern, string $handler): void
    {
        $this->add('PUT', $pattern, $handler);
    }

    public function delete(string $pattern, string $handler): void
    {
        $this->add('DELETE', $pattern, $handler);
    }

    public function patch(string $pattern, string $handler): void
    {
        $this->add('PATCH', $pattern, $handler);
    }

    private function add(string $method, string $pattern, string $handler): void
    {
        $this->routes[] = [
            'method'  => strtoupper($method),
            'pattern' => $pattern,
            'handler' => $handler,
        ];
    }

    // ─── Dispatch ────────────────────────────────────────────────────────────

    /**
     * Gelen isteği route tablosuna karşılaştırır ve ilgili controller'ı çağırır.
     * Eşleşme bulunamazsa 404 JSON döner.
     *
     * @param string|null $uri    Test kolaylığı için enjekte edilebilir; null ise $_GET['url']
     * @param string|null $method Test için enjekte edilebilir; null ise $_SERVER['REQUEST_METHOD']
     */
    public function dispatch(?string $uri = null, ?string $method = null): void
    {
        $method = strtoupper($method ?? ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $uri    = $uri    ?? (isset($_GET['url']) ? '/' . rtrim($_GET['url'], '/') : '/');

        // /api prefix olmadan da çalışabilmesi için normalize et
        if (!str_starts_with($uri, '/')) {
            $uri = '/' . $uri;
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            $params = [];
            if ($this->match($route['pattern'], $uri, $params)) {
                $this->call($route['handler'], $params);
                return;
            }
        }

        // Eşleşme bulunamadı — /api/* → JSON 404, diğerleri → HTML 404 sayfası
        $isApiRequest = str_starts_with($uri, '/api/') || $uri === '/api';

        if ($isApiRequest) {
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

    // ─── Yardımcılar ─────────────────────────────────────────────────────────

    /**
     * URI pattern'ını gerçek URI ile karşılaştırır.
     * `{id}` gibi dinamik segmentleri çıkarır.
     *
     * @param array<string, string> $params çıkarılan segment değerleri
     */
    private function match(string $pattern, string $uri, array &$params): bool
    {
        // Pattern'ı regex'e çevir: {id} → ([^/]+)
        $regex = preg_replace('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', '([^/]+)', $pattern);
        $regex = '#^' . $regex . '$#';

        if (!preg_match($regex, $uri, $matches)) {
            return false;
        }

        // Segment isimlerini çıkar
        preg_match_all('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', $pattern, $names);
        array_shift($matches); // tam eşleşmeyi at

        foreach ($names[1] as $i => $name) {
            $params[$name] = $matches[$i] ?? '';
        }

        return true;
    }

    /**
     * "Controller@method" formatındaki handler'ı çözümleyip çağırır.
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

        // Controller arama dizinleri (öncelik sırasıyla)
        $controllerDirs = [
            QTR_ROOT . '/app/api/controllers/',
            QTR_ROOT . '/app/admin/controllers/',
            QTR_ROOT . '/app/controllers/',
        ];

        $controllerFile = null;
        foreach ($controllerDirs as $dir) {
            $candidate = $dir . $class . '.php';
            if (file_exists($candidate)) {
                $controllerFile = $candidate;
                break;
            }
        }

        if ($controllerFile === null) {
            $this->errorResponse(500, 'Controller bulunamadi: ' . htmlspecialchars($class, ENT_QUOTES, 'UTF-8'), $class);
            return;
        }

        require_once $controllerFile;

        if (!class_exists($class)) {
            $this->errorResponse(500, 'Sinif bulunamadi: ' . htmlspecialchars($class, ENT_QUOTES, 'UTF-8'), $class);
            return;
        }

        $controller = new $class();

        if (!method_exists($controller, $method)) {
            $this->errorResponse(404, 'Metot bulunamadi: ' . htmlspecialchars($method, ENT_QUOTES, 'UTF-8'), $class);
            return;
        }

        // URL segmentlerini metoda argüman olarak ilet
        $controller->$method($params);
    }

    /**
     * Hata yanıtı döner: /api/* → JSON, diğerleri → HTML.
     *
     * @param string $context Hangi sınıf/rota için hata oluştu (loglama vs.)
     */
    private function errorResponse(int $code, string $message, string $context = ''): void
    {
        $uri = isset($_GET['url']) ? '/' . ltrim($_GET['url'], '/') : '/';
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
