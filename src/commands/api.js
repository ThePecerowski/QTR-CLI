'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const QTR_JSON   = '.qtr.json';
const API_ROUTES = 'routes/api.php';
const MB_ENDPOINTS = 'memory-bank/api_endpoints.md';
const OPENAPI_JSON = 'openapi.json';

const INFO_TEXT = 'api: API endpoint yönetimi — create/crud/list/docs/middleware.';

const HELP_TEXT = `
api komutu alt komutlari:

  api:create <Modul>              -- Controller + Service + Validator olusturur.
  api:crud   <Modul>              -- 5 CRUD endpoint + dosyalar olusturur.
  api:list                        -- Kayitli API endpoint'lerini listeler.
  api:docs                        -- memory-bank/api_endpoints.md ve openapi.json uretir.
  api:middleware <Tur>            -- Middleware dosyasi olusturur (auth|rate-limit|cors).

  Secenekler:
    --version=v1    API prefix versiyonlar (varsayilan: versiyonsuz)
    --dry-run       Dosya olusturmadan simule eder

Ornekler:
  qtr api:create User
  qtr api:crud   Product
  qtr api:crud   Product --version=v1
  qtr api:list
  qtr api:docs
  qtr api:middleware auth
`;

// ─── Yardımcı ────────────────────────────────────────────────────────────────

function findProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, QTR_JSON))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Modül adından URL prefix üretir: Product → products, UserOrder → user-orders */
function toUrlSlug(name) {
  return name
    .replace(/([A-Z])/g, (m, c, i) => (i > 0 ? '-' : '') + c.toLowerCase())
    .replace(/^-/, '') + 's';
}

/** Dosya varsa üzerine yazmadan uyarı döner */
function writeIfNew(filePath, content, isDryRun) {
  if (fs.existsSync(filePath)) {
    console.log(`  [ATLA]  ${path.relative(process.cwd(), filePath)} (zaten mevcut)`);
    return false;
  }
  if (!isDryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  console.log(`  [${isDryRun ? 'DRY ' : ''}OLUSTUR] ${path.relative(process.cwd(), filePath)}`);
  return true;
}

// ─── PHP Şablon Oluşturucular ─────────────────────────────────────────────────

function controllerTemplate(name, slug, version) {
  const prefix = version ? `/api/${version}/${slug}` : `/api/${slug}`;
  return `<?php
/**
 * ${name}Controller
 * Prefix: ${prefix}
 *
 * Mimari: Controller -> ${name}Service -> ${name}Model -> DB
 */

require_once QTR_ROOT . '/app/api/services/${name}Service.php';
require_once QTR_ROOT . '/app/api/validators/${name}Validator.php';

class ${name}Controller
{
    /** GET ${prefix} */
    public function index(array $params = []): void
    {
        $data = ${name}Service::get${name}List();
        JsonResponse::success($data);
    }

    /** GET ${prefix}/{id} */
    public function show(array $params = []): void
    {
        $item = ${name}Service::get${name}ById((int) ($params['id'] ?? 0));
        if (!$item) { JsonResponse::notFound(); return; }
        JsonResponse::success($item);
    }

    /** POST ${prefix} */
    public function store(array $params = []): void
    {
        $body   = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $errors = ${name}Validator::validateCreate($body);
        if (!empty($errors)) { JsonResponse::validationError($errors); return; }
        $id = ${name}Service::create${name}($body);
        JsonResponse::created(['id' => $id]);
    }

    /** PUT ${prefix}/{id} */
    public function update(array $params = []): void
    {
        $body   = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $errors = ${name}Validator::validateUpdate($body);
        if (!empty($errors)) { JsonResponse::validationError($errors); return; }
        $rows = ${name}Service::update${name}((int) ($params['id'] ?? 0), $body);
        JsonResponse::success(['updated' => $rows]);
    }

    /** DELETE ${prefix}/{id} */
    public function destroy(array $params = []): void
    {
        $rows = ${name}Service::delete${name}((int) ($params['id'] ?? 0));
        JsonResponse::success(['deleted' => $rows]);
    }
}
`.replace(/\${name}/g, name).replace(/\${prefix}/g, prefix).replace(/\${slug}/g, slug);
}

function serviceTemplate(name) {
  return `<?php
/**
 * ${name}Service — is mantigi katmani
 * Controller asla dogrudan Model kullanmaz.
 */

// require_once QTR_ROOT . '/app/models/${name}Model.php';

class ${name}Service
{
    public static function get${name}List(): array
    {
        // return ${name}Model::findAll();
        return [];
    }

    public static function get${name}ById(int $id): ?array
    {
        // return ${name}Model::findById($id);
        return null;
    }

    public static function create${name}(array $data): int
    {
        // return ${name}Model::create($data);
        return 0;
    }

    public static function update${name}(int $id, array $data): int
    {
        // return ${name}Model::update($id, $data);
        return 0;
    }

    public static function delete${name}(int $id): int
    {
        // return ${name}Model::delete($id);
        return 0;
    }
}
`.replace(/\${name}/g, name);
}

function validatorTemplate(name) {
  return `<?php
/**
 * ${name}Validator — giris dogrulama
 * Hata varsa array donerr, bos array = gecerli.
 * exit/die ASLA kullanilmaz.
 */

class ${name}Validator
{
    public static function validateCreate(array $data): array
    {
        $errors = [];
        // Ornek: if (empty($data['title'])) $errors['title'][] = 'Zorunlu alan.';
        return $errors;
    }

    public static function validateUpdate(array $data): array
    {
        $errors = [];
        return $errors;
    }
}
`.replace(/\${name}/g, name);
}

function routeBlock(slug, name, version) {
  const p = version ? `/api/${version}/${slug}` : `/api/${slug}`;
  return [
    `// --- ${name} ---`,
    `$router->get('${p}',          '${name}Controller@index');`,
    `$router->get('${p}/{id}',     '${name}Controller@show');`,
    `$router->post('${p}',         '${name}Controller@store');`,
    `$router->put('${p}/{id}',     '${name}Controller@update');`,
    `$router->delete('${p}/{id}',  '${name}Controller@destroy');`,
  ].join('\n');
}

// ─── Alt Komutlar ────────────────────────────────────────────────────────────

function cmdCreate(root, moduleName, version, isDryRun) {
  const name = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  const slug = toUrlSlug(name);

  console.log(`\n[QTR API CREATE] ${name} (${version ? 'v: ' + version : 'versiyonsuz'})`);

  writeIfNew(path.join(root, `app/api/controllers/${name}Controller.php`), controllerTemplate(name, slug, version), isDryRun);
  writeIfNew(path.join(root, `app/api/services/${name}Service.php`),       serviceTemplate(name), isDryRun);
  writeIfNew(path.join(root, `app/api/validators/${name}Validator.php`),   validatorTemplate(name), isDryRun);

  // routes/api.php'ye route bloğu ekle
  if (!isDryRun) {
    appendRouteBlock(root, name, slug, version);
  } else {
    console.log(`  [DRY] routes/api.php'ye route satiri eklenecek`);
  }

  console.log(`\nTamamlandi! Sonraki adim: app/models/${name}Model.php olustur ve Service'i bagla.`);
}

function cmdCrud(root, moduleName, version, isDryRun) {
  // crud = create ile ayni + memory-bank kaydi
  cmdCreate(root, moduleName, version, isDryRun);

  // memory-bank api_endpoints.md satiri
  if (!isDryRun) {
    appendApiEndpointsMd(root, moduleName.charAt(0).toUpperCase() + moduleName.slice(1), version);
  }
}

function cmdList(root) {
  const apiFile = path.join(root, API_ROUTES);
  if (!fs.existsSync(apiFile)) {
    console.log('[API LIST] routes/api.php bulunamadi.');
    return;
  }
  const lines = fs.readFileSync(apiFile, 'utf-8').split('\n');
  const methods = ['get', 'post', 'put', 'delete', 'patch'];
  const entries = [];

  for (const line of lines) {
    const trimmed = line.trim();
    for (const m of methods) {
      const re = new RegExp(`^\\$router->${m}\\('([^']+)'\\s*,\\s*'([^']+)'\\s*\\)`);
      const match = trimmed.match(re);
      if (match) {
        entries.push({ method: m.toUpperCase(), path: match[1], handler: match[2] });
      }
    }
  }

  if (entries.length === 0) {
    console.log('[API LIST] Kayitli route bulunamadi.');
    return;
  }

  console.log('\n[QTR API LIST]');
  const mPad = 8, pPad = 40;
  console.log('  ' + 'METHOD'.padEnd(mPad) + 'PATH'.padEnd(pPad) + 'HANDLER');
  console.log('  ' + '-'.repeat(mPad + pPad + 30));
  for (const e of entries) {
    console.log('  ' + e.method.padEnd(mPad) + e.path.padEnd(pPad) + e.handler);
  }
  console.log(`\nToplam: ${entries.length} endpoint\n`);
  return entries;
}

function cmdDocs(root, isDryRun) {
  const apiFile = path.join(root, API_ROUTES);
  if (!fs.existsSync(apiFile)) {
    console.log('[API DOCS] routes/api.php bulunamadi.');
    return;
  }

  const lines   = fs.readFileSync(apiFile, 'utf-8').split('\n');
  const methods = ['get', 'post', 'put', 'delete', 'patch'];
  const entries = [];

  for (const line of lines) {
    const trimmed = line.trim();
    for (const m of methods) {
      const re = new RegExp(`^\\$router->${m}\\('([^']+)'\\s*,\\s*'([^']+)'\\s*\\)`);
      const match = trimmed.match(re);
      if (match) entries.push({ method: m.toUpperCase(), path: match[1], handler: match[2] });
    }
  }

  // --- api_endpoints.md ---
  let md = '# API Endpoints\n\n';
  md += `> Otomatik uretildi: ${new Date().toISOString().slice(0, 10)}\n\n`;
  for (const e of entries) {
    md += `## ${e.method} ${e.path}\n`;
    md += `- **Handler:** ${e.handler}\n`;
    md += `- **Auth:** -\n`;
    md += `- **Aciklama:** -\n\n`;
  }

  // --- openapi.json ---
  const paths = {};
  for (const e of entries) {
    const opPath = e.path.replace(/\{(\w+)\}/g, '{$1}');
    if (!paths[opPath]) paths[opPath] = {};
    paths[opPath][e.method.toLowerCase()] = {
      summary: e.handler,
      operationId: e.handler.replace('@', '_'),
      responses: { '200': { description: 'Basarili' } },
    };
  }
  const openapi = {
    openapi: '3.0.0',
    info: { title: 'QTR API', version: '1.0.0' },
    paths,
  };

  if (!isDryRun) {
    fs.mkdirSync(path.join(root, 'memory-bank'), { recursive: true });
    fs.writeFileSync(path.join(root, MB_ENDPOINTS), md, 'utf-8');
    fs.writeFileSync(path.join(root, OPENAPI_JSON), JSON.stringify(openapi, null, 2), 'utf-8');
  }

  console.log(`\n[QTR API DOCS]${isDryRun ? ' (dry-run)' : ''}`);
  console.log(`  memory-bank/api_endpoints.md  (${entries.length} endpoint)`);
  console.log(`  openapi.json`);
  console.log('');
}

function cmdMiddleware(root, type, isDryRun) {
  const types = {
    auth:         'AuthMiddleware',
    'rate-limit': 'RateLimitMiddleware',
    cors:         'CorsMiddleware',
  };
  const className = types[type];
  if (!className) {
    console.log(`[API MIDDLEWARE] Bilinmeyen tur: "${type}". (auth | rate-limit | cors)`);
    process.exit(1);
  }

  let content = '';
  if (type === 'auth') {
    content = `<?php
/**
 * AuthMiddleware — Bearer token veya API key dogrulama
 * Kullanim: if (!AuthMiddleware::handle()) return;
 */
class AuthMiddleware
{
    public static function handle(): bool
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        $token  = '';

        if (str_starts_with($header, 'Bearer ')) {
            $token = trim(substr($header, 7));
        } elseif (!empty($_GET['api_key'])) {
            $token = trim($_GET['api_key']);
        }

        if (empty($token)) {
            JsonResponse::unauthorized('Token gerekli.');
            return false;
        }

        // TODO: token dogrulama mantigi buraya (DB, JWT, vs.)
        // if (!TokenService::verify($token)) {
        //     JsonResponse::unauthorized('Gecersiz token.');
        //     return false;
        // }

        return true;
    }
}
`;
  } else if (type === 'rate-limit') {
    content = `<?php
/**
 * RateLimitMiddleware — IP bazli istek limiti
 * Varsayilan: 60 istek / dakika
 * Kullanim: if (!RateLimitMiddleware::handle()) return;
 */
class RateLimitMiddleware
{
    private static int $maxRequests = 60;
    private static int $windowSec   = 60;

    public static function handle(): bool
    {
        $ip      = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $key     = md5($ip);
        $dir     = defined('QTR_ROOT') ? QTR_ROOT . '/storage/rate_limit' : sys_get_temp_dir();
        $file    = $dir . '/' . $key . '.json';

        if (!is_dir($dir)) @mkdir($dir, 0755, true);

        $now  = time();
        $data = ['count' => 0, 'window_start' => $now];

        if (file_exists($file)) {
            $data = json_decode(file_get_contents($file), true) ?: $data;
        }

        if ($now - $data['window_start'] > static::$windowSec) {
            $data = ['count' => 0, 'window_start' => $now];
        }

        $data['count']++;
        file_put_contents($file, json_encode($data), LOCK_EX);

        if ($data['count'] > static::$maxRequests) {
            http_response_code(429);
            JsonResponse::error('Cok fazla istek. Lutfen bekleyin.', 429);
            return false;
        }

        return true;
    }
}
`;
  } else {
    content = `<?php
/**
 * CorsMiddleware — Cross-Origin Resource Sharing basliklarini yonetir
 * Kullanim: CorsMiddleware::handle();  (her API isteginin basinda)
 */
class CorsMiddleware
{
    private static array $allowedOrigins = ['*'];
    private static array $allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    private static array $allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With'];

    public static function handle(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';

        if (static::$allowedOrigins === ['*'] || in_array($origin, static::$allowedOrigins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }

        header('Access-Control-Allow-Methods: ' . implode(', ', static::$allowedMethods));
        header('Access-Control-Allow-Headers: ' . implode(', ', static::$allowedHeaders));
        header('Access-Control-Max-Age: 86400');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
`;
  }

  const dest = path.join(root, `app/api/middleware/${className}.php`);
  writeIfNew(dest, content, isDryRun);
  console.log(`\n[API MIDDLEWARE] ${className} hazir.`);
  if (!isDryRun) {
    console.log(`  Kullanim: if (!${className}::handle()) return;`);
  }
}

// ─── İç Yardımcılar ──────────────────────────────────────────────────────────

function appendRouteBlock(root, name, slug, version) {
  const apiFile = path.join(root, API_ROUTES);
  if (!fs.existsSync(apiFile)) return;

  const content = fs.readFileSync(apiFile, 'utf-8');
  const marker  = '// ─── Dispatch';

  if (content.includes(`${name}Controller@index`)) {
    console.log(`  [ATLA]  routes/api.php (${name} route'lari zaten mevcut)`);
    return;
  }

  const block   = routeBlock(slug, name, version);
  const updated = content.replace(marker, block + '\n\n' + marker);
  fs.writeFileSync(apiFile, updated, 'utf-8');
  console.log(`  [GUNCELLE] routes/api.php (+${name} route'lari)`);
}

function appendApiEndpointsMd(root, name, version) {
  const mbFile = path.join(root, MB_ENDPOINTS);
  const slug   = toUrlSlug(name);
  const prefix = version ? `/api/${version}/${slug}` : `/api/${slug}`;

  let existing = fs.existsSync(mbFile) ? fs.readFileSync(mbFile, 'utf-8') : '# API Endpoints\n\n';

  if (existing.includes(`## GET ${prefix}`)) return;

  const block = `## GET ${prefix}\n- **Handler:** ${name}Controller@index\n- **Auth:** -\n\n` +
                `## POST ${prefix}\n- **Handler:** ${name}Controller@store\n- **Auth:** -\n\n`;

  fs.mkdirSync(path.join(root, 'memory-bank'), { recursive: true });
  fs.writeFileSync(mbFile, existing + block, 'utf-8');
  console.log(`  [GUNCELLE] memory-bank/api_endpoints.md (+${name})`);
}

// ─── Ana execute ─────────────────────────────────────────────────────────────

function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  const sub      = params._subcommand;
  const isDryRun = params['dry-run'] === true || (params.args || []).includes('--dry-run');
  const version  = (() => {
    const vArg = (params.args || []).find(a => a.startsWith('--version='));
    return vArg ? vArg.split('=')[1] : null;
  })();

  if (!sub) { console.log(HELP_TEXT); return; }

  const root = findProjectRoot();
  if (!root) {
    console.log('[API] Bu dizin bir QTR projesi degil (.qtr.json bulunamadi).');
    process.exit(1);
  }

  // Modül adı gerektiren komutlar
  if (sub === 'create' || sub === 'crud') {
    const rawName = (params.args || []).find(a => !a.startsWith('--'));
    if (!rawName) {
      console.log(`[API ${sub.toUpperCase()}] Kullanim: qtr api:${sub} <ModulAdi>`);
      process.exit(1);
    }
    const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    if (sub === 'create') cmdCreate(root, name, version, isDryRun);
    else                  cmdCrud(root, name, version, isDryRun);
  } else if (sub === 'list') {
    cmdList(root);
  } else if (sub === 'docs') {
    cmdDocs(root, isDryRun);
  } else if (sub === 'middleware') {
    const type = (params.args || []).find(a => !a.startsWith('--')) || '';
    if (!type) {
      console.log('[API MIDDLEWARE] Kullanim: qtr api:middleware <auth|rate-limit|cors>');
      process.exit(1);
    }
    cmdMiddleware(root, type, isDryRun);
  } else {
    console.log(`[API] Bilinmeyen alt komut: "${sub}". qtr api --help`);
    process.exit(1);
  }
}

module.exports = { execute };
