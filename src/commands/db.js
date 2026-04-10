'use strict';

const fs             = require('fs');
const path           = require('path');
const { execFileSync } = require('child_process');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const INFO = 'db:<eylem>: SQL dosyalarini olusturur, listeler ve PDO uzerinden calistirir.';

const HELP = `
db:create <ad>    Yeni numaralı SQL dosyası oluşturur (database/<NNN>_<ad>.sql).
db:list           Mevcut SQL dosyalarını ve çalıştırılma durumlarını listeler.
db:run            SQL dosyalarını sırayla PDO ile çalıştırır.
db:run --force    .db_executed kaydını yok sayarak tüm dosyaları baştan çalıştırır.

  Örnekler:
    qtr db:create users
    qtr db:list
    qtr db:run
    qtr db:run --force
`;

const SQL_SKELETON = (tableName) => `-- QTR Framework — SQL Migrasyonu
-- Tablo: ${tableName}
-- Çalıştırmak için: qtr db:run

CREATE TABLE IF NOT EXISTS \`${tableName}\` (
    \`id\`         INT AUTO_INCREMENT PRIMARY KEY,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const QTR_JSON       = '.qtr.json';
const DB_EXECUTED    = 'storage/.db_executed';
const DB_LOG         = 'storage/logs/db.log';
const DB_RUNNER_PHP  = 'app/scripts/php/db_runner.php';

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

function readQtrJson(projectRoot) {
  try {
    return JSON.parse(fs.readFileSync(path.join(projectRoot, QTR_JSON), 'utf-8'));
  } catch {
    return null;
  }
}

function validateName(name) {
  return typeof name === 'string' && /^[a-zA-Z0-9_]+$/.test(name);
}

/** database/ klasöründeki NNN_isim.sql dosyalarını sıralı döndürür */
function listSqlFiles(projectRoot) {
  const dbDir = path.join(projectRoot, 'database');
  if (!fs.existsSync(dbDir)) return [];
  return fs.readdirSync(dbDir)
    .filter(f => /^\d{3}_.*\.sql$/.test(f))
    .sort();
}

/** storage/.db_executed dosyasından daha önce çalıştırılmış dosyaları oku */
function readExecuted(projectRoot) {
  const fp = path.join(projectRoot, DB_EXECUTED);
  if (!fs.existsSync(fp)) return new Set();
  return new Set(
    fs.readFileSync(fp, 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
  );
}

function markExecuted(projectRoot, filename) {
  const fp = path.join(projectRoot, DB_EXECUTED);
  fs.appendFileSync(fp, filename + '\n', 'utf-8');
}

function appendLog(projectRoot, message) {
  const logPath = path.join(projectRoot, DB_LOG);
  const logsDir = path.dirname(logPath);
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const ts = new Date().toISOString();
  fs.appendFileSync(logPath, `[${ts}] ${message}\n`, 'utf-8');
}

// ─── db:create ───────────────────────────────────────────────────────────────

function cmdCreate(projectRoot, name) {
  if (!validateName(name)) {
    console.error(`[QTR] Gecersiz tablo adi: "${name}"`);
    console.error('      Sadece harf, rakam ve alt cizgi (_) kullanilabilir.');
    process.exitCode = 1;
    return;
  }

  const dbDir = path.join(projectRoot, 'database');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  // Mevcut en yüksek numarayı bul
  const existing = listSqlFiles(projectRoot);
  const maxNum = existing.reduce((m, f) => {
    const n = parseInt(f.slice(0, 3), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);

  const num      = String(maxNum + 1).padStart(3, '0');
  const filename = `${num}_${name}.sql`;
  const filePath = path.join(dbDir, filename);

  if (fs.existsSync(filePath)) {
    console.log(`[QTR] Uyari: ${filename} zaten mevcut!`);
    return;
  }

  fs.writeFileSync(filePath, SQL_SKELETON(name), 'utf-8');
  console.log(`[QTR] SQL dosyasi olusturuldu: database/${filename}`);
  console.log(`      Duzenlemek: database/${filename}`);
  console.log(`      Calistirmak: qtr db:run`);
}

// ─── db:list ─────────────────────────────────────────────────────────────────

function cmdList(projectRoot) {
  const files    = listSqlFiles(projectRoot);
  const executed = readExecuted(projectRoot);

  if (files.length === 0) {
    console.log('[QTR] Hic SQL dosyasi bulunamadi.');
    console.log('      Olusturmak icin: qtr db:create <tablo-adi>');
    return;
  }

  const col1 = 'Dosya';
  const col2 = 'Durum';
  const maxFile = Math.max(col1.length, ...files.map(f => f.length));
  const line    = `${'─'.repeat(maxFile + 2)}┼${'─'.repeat(16)}`;
  const fmt     = (a, b) => ` ${a.padEnd(maxFile)} │ ${b}`;

  console.log(`\n[QTR DB] ${projectRoot}\n`);
  console.log(fmt(col1, col2));
  console.log(line);
  for (const f of files) {
    const status = executed.has(f) ? '✔ Calistirildi' : '○ Bekliyor';
    console.log(fmt(f, status));
  }

  const doneCount    = files.filter(f => executed.has(f)).length;
  const pendingCount = files.length - doneCount;
  console.log(`\n  Toplam: ${files.length}  |  Tamamlanan: ${doneCount}  |  Bekleyen: ${pendingCount}\n`);
}

// ─── db:run ──────────────────────────────────────────────────────────────────

function cmdRun(projectRoot, cfg, isForce) {
  const phpPath  = cfg?.php || cfg?.php_path || '';
  const dbRunner = path.join(projectRoot, DB_RUNNER_PHP);

  if (!phpPath || !fs.existsSync(phpPath)) {
    console.error('[QTR] PHP binary bulunamadi!');
    console.error(`      Kontrol: ${phpPath || '(tanimsiz)'}`);
    console.error('      .qtr.json dosyasindaki "php" alanini guncelleyin.');
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(dbRunner)) {
    console.error(`[QTR] db_runner.php bulunamadi: ${dbRunner}`);
    console.error('      Proje iskeletiyle birlikte gelmesi gerekiyor.');
    process.exitCode = 1;
    return;
  }

  const files    = listSqlFiles(projectRoot);
  if (files.length === 0) {
    console.log('[QTR] Calistirilacak SQL dosyasi bulunamadi.');
    console.log('      Olusturmak icin: qtr db:create <tablo-adi>');
    return;
  }

  let executed = isForce ? new Set() : readExecuted(projectRoot);

  if (isForce) {
    // .db_executed dosyasını sıfırla
    const execFile = path.join(projectRoot, DB_EXECUTED);
    if (fs.existsSync(execFile)) fs.writeFileSync(execFile, '', 'utf-8');
    console.log('[QTR] --force: Tum dosyalar basdan calistirilacak.\n');
  }

  const qtrJsonPath = path.join(projectRoot, QTR_JSON);
  let ran = 0, skipped = 0, failed = 0;

  console.log('[QTR DB RUN]\n');

  for (const file of files) {
    const sqlPath = path.join(projectRoot, 'database', file);

    if (executed.has(file)) {
      console.log(`  ⏭  ${file.padEnd(35)} (Zaten calistirilmis)`);
      skipped++;
      continue;
    }

    try {
      execFileSync(phpPath, [dbRunner, qtrJsonPath, sqlPath], {
        encoding: 'utf-8',
        stdio:    ['ignore', 'pipe', 'pipe'],
      });
      markExecuted(projectRoot, file);
      console.log(`  ✔  ${file.padEnd(35)} (OK)`);
      ran++;
    } catch (err) {
      const errMsg = err.stderr || err.message || 'Bilinmeyen hata';
      console.error(`  ✗  ${file.padEnd(35)} (HATA)`);
      console.error(`       ${errMsg.trim()}`);
      appendLog(projectRoot, `HATA: ${file} — ${errMsg.trim()}`);
      failed++;
    }
  }

  console.log(`\n  Sonuc: ${ran} calistirildi, ${skipped} atlandi, ${failed} hatali\n`);
  if (failed > 0) {
    console.log(`  Hatalar icin bkz: storage/logs/db.log`);
    process.exitCode = 1;
  }
}

// ─── Ana execute ─────────────────────────────────────────────────────────────

function execute(params) {
  if (params.info) { console.log(INFO); return; }
  if (params.help) { console.log(HELP); return; }

  const sub = params._subcommand || '';

  if (!sub) {
    console.log(INFO);
    console.log(HELP);
    return;
  }

  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    console.error('[QTR] Hata: Bu klasorde bir QTR projesi bulunamadi (.qtr.json yok).');
    process.exitCode = 1;
    return;
  }

  if (sub === 'create') {
    const name = params.args[0];
    if (!name) {
      console.error('[QTR] Kullanim: qtr db:create <tablo-adi>');
      process.exitCode = 1;
      return;
    }
    cmdCreate(projectRoot, name);
    return;
  }

  if (sub === 'list') {
    cmdList(projectRoot);
    return;
  }

  if (sub === 'run') {
    const cfg = readQtrJson(projectRoot);
    cmdRun(projectRoot, cfg, params.force === true);
    return;
  }

  console.error(`[QTR] Bilinmeyen db alt komutu: "${sub}"`);
  console.error('      Gecerli: db:create <ad>  db:list  db:run [--force]');
  process.exitCode = 1;
}

module.exports = { execute };
