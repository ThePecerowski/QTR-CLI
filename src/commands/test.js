'use strict';

const fs       = require('fs');
const path     = require('path');
const http     = require('http');
const { execFileSync, spawnSync } = require('child_process');

const QTR_JSON = '.qtr.json';

// ─── Info / Help texts ───────────────────────────────────────────────────────

const INFO_MAP = {
  'api:test':       'api:test: Tek bir API endpointini test eder.',
  'api:test-suite': 'api:test-suite: routes/api.php dosyasindaki tum endpointleri test eder.',
  'test:install':   'test:install: PHPUnit kurar ve tests/ klasor yapısını olusturur.',
  'test:run':       'test:run: PHPUnit testlerini calistirir.',
  'test:coverage':  'test:coverage: PHPUnit ile HTML coverage raporu olusturur.',
};

const HELP_MAP = {
  'api:test': [
    'api:test kullanimi:',
    '  qtr api:test <url> <method>          -- HTTP isteği atar (GET, POST, PUT, DELETE)',
    '  qtr api:test /api/users GET          -- Goreli yol, localhost:port e gonder',
    '  qtr api:test http://... POST         -- Tam URL',
    '  --data="{...}"                       -- JSON body (POST/PUT icin)',
    '  --port=8000                          -- Port (varsayilan .qtr.json port veya 8000)',
  ].join('\n'),
  'api:test-suite': [
    'api:test-suite kullanimi:',
    '  qtr api:test-suite                   -- routes/api.php deki tüm endpointleri test eder',
    '  --port=8000                          -- Hangi porta baglanilaak?',
    '  --method=GET                         -- Tum istekler icin kullanilacak metot',
  ].join('\n'),
  'test:install': [
    'test:install kullanimi:',
    '  qtr test:install                     -- composer ile PHPUnit kurar, tests/ yapisi olusturur',
  ].join('\n'),
  'test:run': [
    'test:run kullanimi:',
    '  qtr test:run                         -- Tum testleri calistirir',
    '  qtr test:run tests/Unit/UserTest.php -- Belirli bir test dosyasi calistirir',
  ].join('\n'),
  'test:coverage': [
    'test:coverage kullanimi:',
    '  qtr test:coverage                    -- Testleri calistirir, storage/coverage/ klasorune HTML rapor yazar',
    '  Gereksinim: Xdebug veya PCOV extension aktif olmalidir.',
  ].join('\n'),
};

// ─── Yardimci fonksiyonlar ───────────────────────────────────────────────────

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

function readQtrJson(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, QTR_JSON), 'utf-8')); }
  catch { return null; }
}

function ensureLogDir(root) {
  const logDir = path.join(root, 'storage', 'logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  return logDir;
}

function writeApiLog(root, entry) {
  try {
    const logDir = ensureLogDir(root);
    const logFile = path.join(logDir, 'api.log');
    const line = `[${new Date().toISOString()}] ${entry}\n`;
    fs.appendFileSync(logFile, line, 'utf-8');
  } catch { /* log yazma hatasi kritik degil */ }
}

// ─── api:test ────────────────────────────────────────────────────────────────

/**
 * Tek bir HTTP isteği atar, sonucu konsolda gösterir ve loga yazar.
 * @param {string} urlOrPath  Tam URL veya /api/... gibi yoreli yol
 * @param {string} method     GET | POST | PUT | DELETE | PATCH
 * @param {object} opts       { port, data, root }
 */
function httpRequest(urlOrPath, method, opts = {}) {
  return new Promise((resolve) => {
    const port   = opts.port || 8000;
    let hostname = 'localhost';
    let reqPath  = urlOrPath;
    let protocol = 'http:';

    // Tam URL ise parse et
    if (/^https?:\/\//i.test(urlOrPath)) {
      try {
        const u = new URL(urlOrPath);
        protocol = u.protocol;
        hostname = u.hostname;
        reqPath  = u.pathname + u.search;
        if (u.port) opts.port = parseInt(u.port, 10);
      } catch {
        return resolve({ ok: false, status: 0, ms: 0, body: 'Gecersiz URL' });
      }
    }

    const body    = opts.data ? JSON.stringify(opts.data) : '';
    const headers = { 'Content-Type': 'application/json' };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);

    const reqOpts = {
      hostname,
      port: opts.port || port,
      path: reqPath,
      method: method.toUpperCase(),
      headers,
    };

    const t0 = Date.now();
    const req = http.request(reqOpts, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        const ms = Date.now() - t0;
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode, ms, body: raw.slice(0, 400) });
      });
    });

    req.on('error', (err) => {
      const ms = Date.now() - t0;
      resolve({ ok: false, status: 0, ms, body: err.message });
    });

    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ ok: false, status: 0, ms: 8000, body: 'Timeout (8s)' });
    });

    if (body) req.write(body);
    req.end();
  });
}

async function cmdApiTest(params) {
  const args = params._args || [];
  const urlOrPath = args[0];
  const method    = (args[1] || 'GET').toUpperCase();

  if (!urlOrPath) {
    console.log('Kullanim: qtr api:test <url> <method>');
    console.log('Ornek:    qtr api:test /api/users GET');
    return;
  }

  const root = findProjectRoot();
  const cfg  = root ? readQtrJson(root) : null;
  const port = parseInt(params.port || (cfg && cfg.port) || 8000, 10);

  let data = undefined;
  if (params.data) {
    try { data = JSON.parse(params.data); }
    catch { console.warn('Uyari: --data JSON olarak ayrilsanamadi, yoksayildi.'); }
  }

  console.log(`Istek gonderiliyor: ${method} ${urlOrPath} (port: ${port})`);
  const result = await httpRequest(urlOrPath, method, { port, data });

  const statusIcon = result.ok ? '[OK]' : '[HATA]';
  console.log(`${statusIcon} HTTP ${result.status}  (${result.ms}ms)`);
  if (result.body) {
    console.log('--- Yanit ---');
    console.log(result.body);
  }

  if (root) {
    writeApiLog(root, `${method} ${urlOrPath} -> ${result.status} (${result.ms}ms)`);
  }

  if (!result.ok) process.exitCode = 1;
}

// ─── api:test-suite ──────────────────────────────────────────────────────────

/**
 * routes/api.php dosyasini okur, Route:: satirlarinden yol cikarir.
 * Ornek: Route::get('/users', ...)  →  /users
 */
function parseApiRoutes(root) {
  const apiRoutesFile = path.join(root, 'routes', 'api.php');
  if (!fs.existsSync(apiRoutesFile)) return [];

  const content = fs.readFileSync(apiRoutesFile, 'utf-8');
  const routes  = [];

  // Route::get('/path', veya Route::post('/path', vb.
  const re = /Route::(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    const method = m[1].toUpperCase();
    let   rpath  = m[2];
    // Prefix /api yoksa ekle
    if (!rpath.startsWith('/api')) rpath = '/api' + (rpath.startsWith('/') ? rpath : '/' + rpath);
    routes.push({ method, path: rpath });
  }
  return routes;
}

async function cmdApiTestSuite(params) {
  const root = findProjectRoot();
  if (!root) {
    console.error('[HATA] QTR projesi bulunamadi.');
    process.exitCode = 1;
    return;
  }

  const routes = parseApiRoutes(root);
  if (routes.length === 0) {
    console.log('routes/api.php dosyasinda test edilecek Route:: satiri bulunamadi.');
    return;
  }

  const cfg  = readQtrJson(root);
  const port = parseInt(params.port || (cfg && cfg.port) || 8000, 10);
  const forceMethod = params.method ? params.method.toUpperCase() : null;

  console.log(`\nAPI Test Suite — ${routes.length} endpoint (port:${port})\n`);
  console.log('  Durum  | Kod  | Sure  | Endpoint');
  console.log('---------|------|-------|---------------------------');

  let pass = 0; let fail = 0;

  for (const route of routes) {
    const method = forceMethod || route.method;
    const result = await httpRequest(route.path, method, { port });
    const icon   = result.ok ? ' [OK]  ' : '[HATA] ';
    const code   = String(result.status).padEnd(4);
    const ms     = (result.ms + 'ms').padEnd(6);
    console.log(`  ${icon}| ${code} | ${ms}| ${method} ${route.path}`);
    writeApiLog(root, `SUITE ${method} ${route.path} -> ${result.status} (${result.ms}ms)`);
    if (result.ok) pass++; else fail++;
  }

  console.log(`\n  Sonuc: ${pass} basarili, ${fail} basarisiz`);
  if (fail > 0) process.exitCode = 1;
}

// ─── test:install ────────────────────────────────────────────────────────────

function cmdTestInstall(params) {
  const root = findProjectRoot();
  if (!root) {
    console.error('[HATA] QTR projesi bulunamadi.');
    process.exitCode = 1;
    return;
  }

  console.log('PHPUnit kuruluyor (composer require --dev phpunit/phpunit)...');

  const composerResult = spawnSync('composer', ['require', '--dev', 'phpunit/phpunit'], {
    cwd:   root,
    stdio: 'inherit',
    shell: true,
  });

  if (composerResult.status !== 0) {
    console.error('[HATA] composer komutu basarisiz. composer kurulu mu?');
    process.exitCode = 1;
    return;
  }

  // tests/ klasor yapisi
  const dirs = [
    path.join(root, 'tests', 'Unit'),
    path.join(root, 'tests', 'Feature'),
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
      console.log(`Klasor olusturuldu: ${path.relative(root, d)}`);
    } else {
      console.log(`Zaten mevcut: ${path.relative(root, d)}`);
    }
  }

  // phpunit.xml kopyala
  const templateXml = path.join(__dirname, '..', '..', 'templates', 'config', 'phpunit.xml');
  const destXml     = path.join(root, 'phpunit.xml');
  if (fs.existsSync(templateXml) && !fs.existsSync(destXml)) {
    fs.copyFileSync(templateXml, destXml);
    console.log('phpunit.xml olusturuldu.');
  } else if (fs.existsSync(destXml)) {
    console.log('phpunit.xml zaten mevcut, atlanıyor.');
  }

  console.log('\n[OK] PHPUnit hazir. Testleri calistirmak icin: qtr test:run');
}

// ─── test:run ────────────────────────────────────────────────────────────────

function cmdTestRun(params) {
  const root = findProjectRoot();
  if (!root) {
    console.error('[HATA] QTR projesi bulunamadi.');
    process.exitCode = 1;
    return;
  }

  const phpunitBin = path.join(root, 'vendor', 'bin', 'phpunit');
  if (!fs.existsSync(phpunitBin)) {
    console.error('[HATA] vendor/bin/phpunit bulunamadi. Once qtr test:install calistirin.');
    process.exitCode = 1;
    return;
  }

  const args   = params._args || [];
  const target = args[0] || null;
  const cmdArgs = target ? [target] : [];

  console.log(target ? `Calistiriliyor: phpunit ${target}` : 'Tum testler calistiriliyor...');

  const cfg  = readQtrJson(root);
  const php  = (cfg && cfg.php) || 'php';

  const result = spawnSync(php, [phpunitBin, ...cmdArgs], {
    cwd:   root,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) process.exitCode = result.status || 1;
}

// ─── test:coverage ───────────────────────────────────────────────────────────

function cmdTestCoverage(params) {
  const root = findProjectRoot();
  if (!root) {
    console.error('[HATA] QTR projesi bulunamadi.');
    process.exitCode = 1;
    return;
  }

  const phpunitBin = path.join(root, 'vendor', 'bin', 'phpunit');
  if (!fs.existsSync(phpunitBin)) {
    console.error('[HATA] vendor/bin/phpunit bulunamadi. Once qtr test:install calistirin.');
    process.exitCode = 1;
    return;
  }

  const coverageDir = path.join(root, 'storage', 'coverage');
  if (!fs.existsSync(coverageDir)) fs.mkdirSync(coverageDir, { recursive: true });

  console.log('Coverage raporu uretiliyor (Xdebug/PCOV gereklidir)...');
  console.log(`Cikti: ${path.relative(root, coverageDir)}`);

  const cfg  = readQtrJson(root);
  const php  = (cfg && cfg.php) || 'php';

  const result = spawnSync(php, [phpunitBin, '--coverage-html', coverageDir], {
    cwd:   root,
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    console.error('[HATA] Coverage uretime basarisiz. Xdebug veya PCOV extension aktif mi?');
    process.exitCode = result.status || 1;
  } else {
    console.log(`[OK] HTML rapor hazir: ${path.relative(root, coverageDir)}/index.html`);
  }
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

async function execute(params) {
  const cmd = params._command || '';

  if (params.info)  { console.log(INFO_MAP[cmd] || 'test: Test komutlari.'); return; }
  if (params.help)  { console.log(HELP_MAP[cmd] || 'Parametre bilgisi mevcut degil.'); return; }

  if (cmd === 'api:test')       return cmdApiTest(params);
  if (cmd === 'api:test-suite') return cmdApiTestSuite(params);
  if (cmd === 'test:install')   return cmdTestInstall(params);
  if (cmd === 'test:run')       return cmdTestRun(params);
  if (cmd === 'test:coverage')  return cmdTestCoverage(params);

  console.log('Bilinmeyen test komutu: ' + cmd);
  process.exitCode = 1;
}

module.exports = { execute };
