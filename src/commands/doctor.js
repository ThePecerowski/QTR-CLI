'use strict';

const fs        = require('fs');
const path      = require('path');
const readline  = require('readline');
const { spawnSync } = require('child_process');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const INFO = 'doctor: QTR projesini tarar, sorunları raporlar ve --fix ile onarır.';

const HELP = `
doctor            QTR projesinin sağlık durumunu kontrol eder.
doctor --fix      Tespit edilen sorunları otomatik onarır.
doctor --fix --yes  Tüm onay sorularını otomatik kabul eder.

  Kontrol edilen alanlar:
    1. Proje yapısı   (.qtr.json, .env, index.php)
    2. Dizinler       (app/, routes/, database/, storage/logs/)
    3. Core dosyalar  (Router.php, Config.php, Autoloader.php ...)
    4. .env içeriği   (DB_HOST, DB_NAME, DB_USER)
    5. Veritabanı     (MySQL bağlantısı)
    6. Route dosyaları(web.php, api.php)
    7. Güvenlik       (CsrfToken.php, Validator.php)
    8. Yazma izinleri (storage/logs/)
`;

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates', 'config');

const COLORS = {
  ok:    '\x1b[32m',  // yeşil
  warn:  '\x1b[33m',  // sarı
  error: '\x1b[31m',  // kırmızı
  reset: '\x1b[0m',
  bold:  '\x1b[1m',
  dim:   '\x1b[2m',
};

const ICONS = { ok: '✔', warn: '⚠', error: '✗' };

// ─── Yardımcı ────────────────────────────────────────────────────────────────

function findProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, '.qtr.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function readQtrJson(projectRoot) {
  try {
    return JSON.parse(fs.readFileSync(path.join(projectRoot, '.qtr.json'), 'utf-8'));
  } catch { return null; }
}

function parseEnvFile(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) return result;
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = val;
  }
  return result;
}

function printStatus(label, status, detail) {
  const color = COLORS[status] || COLORS.reset;
  const icon  = ICONS[status] || '?';
  const pad   = 40;
  process.stdout.write(
    `  ${color}${icon}${COLORS.reset}  ${label.padEnd(pad)} ${color}${status.toUpperCase()}${COLORS.reset}`
  );
  if (detail) process.stdout.write(`  ${COLORS.dim}${detail}${COLORS.reset}`);
  process.stdout.write('\n');
}

// ─── Kontrol fonksiyonları ────────────────────────────────────────────────────

function checkProjectStructure(root) {
  const required = ['.qtr.json', '.env', 'index.php', 'public/index.php'];
  const missing  = required.filter(f => !fs.existsSync(path.join(root, f)));
  if (missing.length === 0)
    return { status: 'ok', message: 'Proje yapısı', detail: '' };
  return { status: 'error', message: 'Proje yapısı', detail: `Eksik: ${missing.join(', ')}` };
}

function checkDirectories(root) {
  const required = ['app', 'routes', 'database', 'storage/logs', 'resources/views'];
  const missing  = required.filter(d => !fs.existsSync(path.join(root, d)));
  if (missing.length === 0)
    return { status: 'ok', message: 'Dizinler', detail: '' };
  return { status: 'warn', message: 'Dizinler', detail: `Eksik: ${missing.join(', ')}` };
}

function checkCoreFiles(root) {
  const coreFiles = [
    'app/core/Router.php',
    'app/core/Config.php',
    'app/core/ErrorHandler.php',
    'app/core/View.php',
    'app/core/Autoloader.php',
  ];
  const missing = coreFiles.filter(f => !fs.existsSync(path.join(root, f)));
  if (missing.length === 0)
    return { status: 'ok', message: 'Core dosyaları', detail: '' };
  return { status: 'error', message: 'Core dosyaları', detail: `Eksik: ${missing.map(f => path.basename(f)).join(', ')}` };
}

function checkEnv(root) {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath))
    return { status: 'error', message: '.env içeriği', detail: '.env dosyası bulunamadı' };
  const env = parseEnvFile(envPath);
  const empty = ['DB_HOST', 'DB_NAME', 'DB_USER'].filter(k => !env[k]);
  if (empty.length === 0)
    return { status: 'ok', message: '.env içeriği', detail: '' };
  return { status: 'warn', message: '.env içeriği', detail: `Boş: ${empty.join(', ')}` };
}

function checkDatabase(root, cfg) {
  if (!cfg || !cfg.db)
    return { status: 'warn', message: 'Veritabanı', detail: '.qtr.json\'da db yapılandırması yok' };
  const args = [
    '-u', cfg.db.user || 'root',
    '-h', cfg.db.host || 'localhost',
    '-P', String(cfg.db.port || 3306),
    '--connect-timeout=3',
    '-e', `USE \`${cfg.db.name}\`;`,
  ];
  const env    = { ...process.env, MYSQL_PWD: cfg.db.pass || '' };
  const result = spawnSync('mysql', args, { encoding: 'utf-8', env, timeout: 5000 });
  if (result.status === 0)
    return { status: 'ok', message: 'Veritabanı', detail: `${cfg.db.name}@${cfg.db.host}` };
  const errMsg = (result.stderr || '').trim().split('\n')[0];
  return { status: 'error', message: 'Veritabanı', detail: errMsg || 'Bağlantı hatası' };
}

function checkRoutes(root) {
  const needed = ['routes/web.php', 'routes/api.php'];
  const missing = needed.filter(f => !fs.existsSync(path.join(root, f)));
  if (missing.length === 0)
    return { status: 'ok', message: 'Route dosyaları', detail: '' };
  return { status: 'warn', message: 'Route dosyaları', detail: `Eksik: ${missing.join(', ')}` };
}

function checkSecurity(root) {
  const secFiles = ['app/core/CsrfToken.php', 'app/core/Validator.php'];
  const missing  = secFiles.filter(f => !fs.existsSync(path.join(root, f)));
  if (missing.length === 0)
    return { status: 'ok', message: 'Güvenlik dosyaları', detail: '' };
  return { status: 'warn', message: 'Güvenlik dosyaları', detail: `Eksik: ${missing.map(f => path.basename(f)).join(', ')}` };
}

function checkPermissions(root) {
  const logsDir = path.join(root, 'storage/logs');
  if (!fs.existsSync(logsDir))
    return { status: 'warn', message: 'Yazma izinleri', detail: 'storage/logs/ dizini yok' };
  try {
    const testFile = path.join(logsDir, '.write_test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return { status: 'ok', message: 'Yazma izinleri', detail: 'storage/logs/ yazılabilir' };
  } catch {
    return { status: 'error', message: 'Yazma izinleri', detail: 'storage/logs/ yazılamıyor' };
  }
}

// ─── Onarım fonksiyonları ─────────────────────────────────────────────────────

function fixDirectories(root, checkResult) {
  const required = ['app', 'routes', 'database', 'storage/logs', 'resources/views'];
  const missing  = required.filter(d => !fs.existsSync(path.join(root, d)));
  for (const d of missing) {
    fs.mkdirSync(path.join(root, d), { recursive: true });
    console.log(`    + Oluşturuldu: ${d}/`);
  }
}

function fixCoreFiles(root) {
  const coreMap = [
    { src: 'Router.php',          dest: 'app/core/Router.php'          },
    { src: 'Config.php',          dest: 'app/core/Config.php'          },
    { src: 'ErrorHandler.php',    dest: 'app/core/ErrorHandler.php'    },
    { src: 'View.php',            dest: 'app/core/View.php'            },
    { src: 'Autoloader.php',      dest: 'app/core/Autoloader.php'      },
    { src: 'MiddlewareRegistry.php', dest: 'app/core/MiddlewareRegistry.php' },
  ];
  for (const { src, dest } of coreMap) {
    const srcPath  = path.join(TEMPLATES_DIR, src);
    const destPath = path.join(root, dest);
    if (!fs.existsSync(destPath) && fs.existsSync(srcPath)) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
      console.log(`    + Kopyalandı: ${dest}`);
    }
  }
}

function fixEnv(root, autoYes) {
  const envSrc  = path.join(root, '.env.example');
  const envDest = path.join(root, '.env');
  if (!fs.existsSync(envDest) && fs.existsSync(envSrc)) {
    fs.copyFileSync(envSrc, envDest);
    console.log('    + .env.example → .env kopyalandı');
  }
}

function fixDatabase(root, cfg) {
  if (!cfg || !cfg.db) return;
  const args = [
    '-u', cfg.db.user || 'root',
    '-h', cfg.db.host || 'localhost',
    '-P', String(cfg.db.port || 3306),
    '--connect-timeout=3',
    '-e', `CREATE DATABASE IF NOT EXISTS \`${cfg.db.name}\`;`,
  ];
  const env    = { ...process.env, MYSQL_PWD: cfg.db.pass || '' };
  const result = spawnSync('mysql', args, { encoding: 'utf-8', env, timeout: 5000 });
  if (result.status === 0) {
    console.log(`    + Veritabanı oluşturuldu: ${cfg.db.name}`);
  } else {
    console.error(`    ✗ Veritabanı oluşturulamadı: ${(result.stderr || '').trim()}`);
  }
}

// ─── Ana tarama ───────────────────────────────────────────────────────────────

async function cmdDoctor(params, root, cfg) {
  const isFix  = params.fix  === true;
  const isYes  = params.yes  === true;

  console.log(`\n${COLORS.bold}[QTR DOCTOR]${COLORS.reset}  ${root}\n`);

  const checks = [
    checkProjectStructure(root),
    checkDirectories(root),
    checkCoreFiles(root),
    checkEnv(root),
    checkDatabase(root, cfg),
    checkRoutes(root),
    checkSecurity(root),
    checkPermissions(root),
  ];

  let passed = 0;
  for (const c of checks) {
    printStatus(c.message, c.status, c.detail);
    if (c.status === 'ok') passed++;
  }

  const total = checks.length;
  const pct   = Math.round((passed / total) * 100);
  let scoreLabel;
  if (pct === 100)      scoreLabel = `${COLORS.ok}Mükemmel!${COLORS.reset}`;
  else if (pct >= 75)   scoreLabel = `${COLORS.ok}İyi durumda${COLORS.reset}`;
  else if (pct >= 50)   scoreLabel = `${COLORS.warn}Sorunlar var${COLORS.reset}`;
  else                  scoreLabel = `${COLORS.error}Kritik${COLORS.reset}`;

  console.log(`\n  Skor: ${passed}/${total} (${pct}%) — ${scoreLabel}\n`);

  if (!isFix) return;

  // ─── Onarım modu ──────────────────────────────────────────────────────────
  console.log(`${COLORS.bold}[QTR DOCTOR --fix]${COLORS.reset} Sorunlar onarılıyor...\n`);

  const dirCheck = checks[1];
  if (dirCheck.status !== 'ok') {
    console.log('  Dizinler oluşturuluyor...');
    fixDirectories(root, dirCheck);
  }

  const coreCheck = checks[2];
  if (coreCheck.status !== 'ok') {
    console.log('  Core dosyaları kopyalanıyor...');
    fixCoreFiles(root);
  }

  const envCheck = checks[3];
  if (envCheck.status !== 'ok') {
    console.log('  .env düzenleniyor...');
    fixEnv(root, isYes);
  }

  const dbCheck = checks[4];
  if (dbCheck.status !== 'ok') {
    let confirm = isYes;
    if (!isYes) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      confirm = await new Promise(resolve => {
        rl.question(`  Veritabanı "${cfg?.db?.name}" oluşturulsun mu? [e/h]: `, ans => {
          rl.close();
          resolve(ans.trim().toLowerCase() === 'e');
        });
      });
    }
    if (confirm) fixDatabase(root, cfg);
  }

  console.log('\n  Onarım tamamlandı. Tekrar kontrol: qtr doctor\n');
}

// ─── Ana execute ─────────────────────────────────────────────────────────────

async function execute(params) {
  if (params.info) { console.log(INFO); return; }
  if (params.help) { console.log(HELP); return; }

  const root = findProjectRoot();
  if (!root) {
    console.error('[QTR] Hata: Bu klasörde bir QTR projesi bulunamadı (.qtr.json yok).');
    process.exitCode = 1; return;
  }

  const cfg = readQtrJson(root);
  await cmdDoctor(params, root, cfg);
}

module.exports = { execute };
