'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const INFO = `
  cache:classmap   ─ app/ altındaki sınıfları tarar, storage/cache/classmap.php oluşturur
  cache:routes     ─ route dosyalarını yükler, storage/cache/routes.php oluşturur
  cache:clear      ─ storage/cache/ altındaki tüm cache dosyalarını siler
`;

const HELP = `
cache:classmap
  app/ altındaki tüm PHP dosyalarındaki sınıfları tarar ve
  storage/cache/classmap.php cache'ini oluşturur.
  Production'da autoloader; dosya sistemi taraması yapmadan doğrudan buradan yükler.

cache:routes
  routes/ dosyalarını (api.php, web.php, admin.php) JavaScript regex ile tarar,
  oluşan route listesini storage/cache/routes.php olarak kaydeder.
  PHP gerektirmez — tamamen Node.js ile çalışır.
  Route dosyaları değiştiğinde otomatik geçersiz sayılır.

cache:clear
  storage/cache/ altındaki tüm cache dosyalarını siler.

Örnekler:
  qtr cache:classmap
  qtr cache:routes
  qtr cache:clear
`;

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

/**
 * Çalışma dizininde .qtr.json var mı kontrol eder.
 * @returns {string} proje kökü
 */
function findProjectRoot() {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, '.qtr.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

/**
 * Bir PHP dosyasındaki sınıf adlarını regex ile çıkarır.
 * @param {string} content
 * @returns {string[]}
 */
function extractClassNames(content) {
  const names = [];
  const re = /^\s*(?:abstract\s+|final\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    names.push(m[1]);
  }
  return names;
}

/**
 * Dizini özyinelemeli tarar, tüm .php dosyalarını döner.
 * @param {string} dir
 * @returns {string[]}
 */
function scanPhpFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanPhpFiles(full));
    } else if (entry.name.endsWith('.php')) {
      results.push(full);
    }
  }
  return results;
}

// ─── cache:classmap ───────────────────────────────────────────────────────────

function cmdClassmap(params) {
  const root = findProjectRoot();
  if (!root) {
    console.error('[QTR] .qtr.json bulunamadı. Proje dizininde çalıştırın.');
    process.exitCode = 1;
    return;
  }

  console.log('[QTR] Classmap cache oluşturuluyor...');

  const appDir = path.join(root, 'app');
  const phpFiles = scanPhpFiles(appDir);

  const classmap = {}; // { ClassName: '/abs/path/to/File.php' }

  for (const file of phpFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const classes = extractClassNames(content);
      for (const cls of classes) {
        classmap[cls] = file.replace(/\\/g, '/');
      }
    } catch {
      // Okunamayan dosyayı atla
    }
  }

  const count    = Object.keys(classmap).length;
  const cacheDir = path.join(root, 'storage', 'cache');
  fs.mkdirSync(cacheDir, { recursive: true });

  const lines = ['<?php', '// QTR Autoloader Classmap Cache', '// Oluşturulma: ' + new Date().toISOString(), 'return ['];
  for (const [cls, file] of Object.entries(classmap)) {
    lines.push(`    ${JSON.stringify(cls)} => ${JSON.stringify(file)},`);
  }
  lines.push('];', '');

  fs.writeFileSync(path.join(cacheDir, 'classmap.php'), lines.join('\n'), 'utf-8');

  console.log(`[QTR] ✓ classmap.php oluşturuldu — ${count} sınıf kaydedildi`);
}

// ─── cache:routes ─────────────────────────────────────────────────────────────

/**
 * Route dosyalarını regex ile tarar ve routes.php cache'i oluşturur.
 * PHP gerektirmez.
 *
 * Desteklenen format:
 *   $router->get('/path', 'Controller@method');
 *   $adminRouter->post('/admin/path', 'Controller@method');
 */
function cmdRoutes(params) {
  const root = findProjectRoot();
  if (!root) {
    console.error('[QTR] .qtr.json bulunamadı. Proje dizininde çalıştırın.');
    process.exitCode = 1;
    return;
  }

  console.log('[QTR] Route cache oluşturuluyor...');

  // Taranacak route dosyaları
  const routeFiles = [
    path.join(root, 'routes', 'api.php'),
    path.join(root, 'routes', 'web.php'),
    path.join(root, 'routes', 'admin.php'),
  ].filter(f => fs.existsSync(f));

  if (routeFiles.length === 0) {
    console.error('[QTR] routes/ altında api.php, web.php veya admin.php bulunamadı.');
    process.exitCode = 1;
    return;
  }

  // $router->METHOD('pattern', 'Handler@method') regex
  // değişken adı: herhangi bir $xxxRouter değişkeni
  // Not: // ile başlayan yorum satırları atlanır
  const routeRe = /\$\w*[Rr]outer\s*->\s*(get|post|put|delete|patch)\s*\(\s*(['"])([^'"]+)\2\s*,\s*(['"])([^'"]+)\4/gi;

  const routes = [];
  for (const file of routeFiles) {
    // Yorum satırlarını kaldır, sonra route'ları çıkar
    const raw     = fs.readFileSync(file, 'utf-8');
    const content = raw
      .split('\n')
      .filter(line => !/^\s*\/\//.test(line))  // tek satır yorumları kaldır
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '');        // blok yorumları kaldır
    routeRe.lastIndex = 0;
    let m;
    while ((m = routeRe.exec(content)) !== null) {
      routes.push({
        method:           m[1].toUpperCase(),
        pattern:          m[3],
        handler:          m[5],
        middlewares:      [],
        afterMiddlewares: [],
      });
    }
  }

  const cacheDir = path.join(root, 'storage', 'cache');
  fs.mkdirSync(cacheDir, { recursive: true });

  const lines = ['<?php', '// QTR Route Cache', '// Oluşturulma: ' + new Date().toISOString(), 'return ['];
  for (const r of routes) {
    const mw      = phpArray(r.middlewares);
    const afterMw = phpArray(r.afterMiddlewares);
    lines.push(`    ['method' => '${r.method}', 'pattern' => '${r.pattern}', 'handler' => '${r.handler}', 'middlewares' => ${mw}, 'afterMiddlewares' => ${afterMw}],`);
  }
  lines.push('];', '');

  fs.writeFileSync(path.join(cacheDir, 'routes.php'), lines.join('\n'), 'utf-8');
  console.log(`[QTR] ✓ routes.php oluşturuldu — ${routes.length} route kaydedildi`);
}

/** String dizisini PHP array literal'e çevirir: ['a','b'] */
function phpArray(arr) {
  if (!arr || arr.length === 0) return '[]';
  return '[' + arr.map(v => `'${v}'`).join(', ') + ']';
}

// ─── cache:clear ─────────────────────────────────────────────────────────────

function cmdClear(params) {
  const root = findProjectRoot();
  if (!root) {
    console.error('[QTR] .qtr.json bulunamadı. Proje dizininde çalıştırın.');
    process.exitCode = 1;
    return;
  }

  const cacheDir = path.join(root, 'storage', 'cache');

  if (!fs.existsSync(cacheDir)) {
    console.log('[QTR] storage/cache/ dizini zaten boş.');
    return;
  }

  const files = fs.readdirSync(cacheDir).filter(f =>
    f.endsWith('.php') || f.endsWith('.cache') || f.endsWith('.json')
  );

  if (files.length === 0) {
    console.log('[QTR] Cache zaten temiz.');
    return;
  }

  for (const file of files) {
    fs.unlinkSync(path.join(cacheDir, file));
  }

  console.log(`[QTR] ✓ Cache temizlendi — ${files.length} dosya silindi`);
}

// ─── Komut Yönlendirme ────────────────────────────────────────────────────────

function execute(params) {
  if (params.info) {
    console.log(INFO);
    return;
  }
  if (params.help) {
    console.log(HELP);
    return;
  }

  const sub = params._subcommand || params.subcommand || '';

  if (sub === 'classmap') return cmdClassmap(params);
  if (sub === 'routes')   return cmdRoutes(params);
  if (sub === 'clear')    return cmdClear(params);

  console.log('[QTR] Bilinmeyen cache komutu. Kullanım:');
  console.log(INFO);
  process.exitCode = 1;
}

module.exports = { execute };
