'use strict';

const fs               = require('fs');
const path             = require('path');
const { execFileSync, spawnSync } = require('child_process');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const INFO = 'db:<eylem>: SQL dosyalarini olusturur, listeler ve migration sistemi ile calistirir.';

const HELP = `
db:create <ad>          Yeni numaralı SQL dosyası oluşturur (database/<NNN>_<ad>.sql).
db:list                 Mevcut SQL dosyalarını ve migration durumlarını listeler.
db:migrate              Bekleyen migration'ları sırayla çalıştırır (_qtr_migrations takibi).
db:rollback             Son batch'i geri alır (--step=N ile N batch).
db:reset                Tüm migration'ları geri alır.
db:make-migration <ad>  UP/DOWN bloğuyla yeni migration dosyası oluşturur.
db:run                  [DEPRECATED] Eski .db_executed tabanlı çalıştırıcı.

  Örnekler:
    qtr db:make-migration create_users_table
    qtr db:migrate
    qtr db:rollback
    qtr db:rollback --step=3
    qtr db:reset
`;

const SQL_SKELETON = (tableName) => `-- QTR Framework — SQL Migrasyonu
-- Tablo: ${tableName}
-- Çalıştırmak için: qtr db:migrate

-- [UP]
CREATE TABLE IF NOT EXISTS \`${tableName}\` (
    \`id\`         INT AUTO_INCREMENT PRIMARY KEY,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- [DOWN]
DROP TABLE IF EXISTS \`${tableName}\`;
`;

// Migration şablonları
const MIG_CREATE = (table) => `-- [UP]
CREATE TABLE IF NOT EXISTS \`${table}\` (
    \`id\`         INT AUTO_INCREMENT PRIMARY KEY,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- [DOWN]
DROP TABLE IF EXISTS \`${table}\`;
`;

const MIG_ADD = (column, table) => `-- [UP]
ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` VARCHAR(255) NULL;

-- [DOWN]
ALTER TABLE \`${table}\` DROP COLUMN \`${column}\`;
`;

const MIG_DROP = (table) => `-- [UP]
DROP TABLE IF EXISTS \`${table}\`;

-- [DOWN]
-- Tablo yeniden oluşturmak için CREATE TABLE ifadesini buraya ekleyin
CREATE TABLE IF NOT EXISTS \`${table}\` (
    \`id\`         INT AUTO_INCREMENT PRIMARY KEY,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const MIG_EMPTY = `-- [UP]
-- Buraya migration SQL ifadelerini yazın

-- [DOWN]
-- Buraya geri alma SQL ifadelerini yazın
`;

const MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS \`_qtr_migrations\` (
    \`id\`         INT AUTO_INCREMENT PRIMARY KEY,
    \`migration\`  VARCHAR(255) NOT NULL UNIQUE,
    \`batch\`      INT NOT NULL DEFAULT 1,
    \`ran_at\`     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;

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

// ─── Migration yardımcıları ───────────────────────────────────────────────────

/** UP ve DOWN bloklarını ayrıştırır */
function parseMigrationFile(content) {
  const upMatch   = content.match(/--\s*\[UP\]([\s\S]*?)(?=--\s*\[DOWN\]|$)/i);
  const downMatch = content.match(/--\s*\[DOWN\]([\s\S]*?)$/i);
  return {
    up:   upMatch   ? upMatch[1].trim()   : content.trim(),
    down: downMatch ? downMatch[1].trim() : '',
  };
}

/** MySQL bağlantı ortam değişkenleri */
function getMysqlEnv(cfg) {
  return { ...process.env, MYSQL_PWD: cfg.db.pass || '' };
}

/** MySQL'e tek bir SQL sorgusu çalıştırır, sonucu string döndürür */
function runMysqlQuery(cfg, sql, dbName) {
  const args = [
    '-u', cfg.db.user || 'root',
    '-h', cfg.db.host || 'localhost',
    '-P', String(cfg.db.port || 3306),
    '--skip-column-names',
    '-e', sql,
  ];
  if (dbName) args.push(dbName);
  const result = spawnSync('mysql', args, { encoding: 'utf-8', env: getMysqlEnv(cfg) });
  if (result.status !== 0) {
    throw new Error(result.stderr || 'MySQL hatası');
  }
  return (result.stdout || '').trim();
}

/** _qtr_migrations tablosunu oluşturur (yoksa) */
function ensureMigrationsTable(cfg) {
  runMysqlQuery(cfg, MIGRATIONS_TABLE, cfg.db.name);
}

/** Mevcut en yüksek batch numarasını + 1 döndürür */
function getNextBatch(cfg) {
  const result = runMysqlQuery(cfg, 'SELECT COALESCE(MAX(batch),0) FROM `_qtr_migrations`;', cfg.db.name);
  return parseInt(result, 10) + 1;
}

/** Daha önce çalıştırılmış migration isimlerini Set olarak döndürür */
function getRanMigrations(cfg) {
  const result = runMysqlQuery(cfg, 'SELECT migration FROM `_qtr_migrations` ORDER BY id ASC;', cfg.db.name);
  return new Set(
    result.split('\n').map(l => l.trim()).filter(Boolean)
  );
}

/** Birden fazla SQL ifadesini MySQL ile çalıştırır */
function runSqlContent(cfg, sql) {
  if (!sql || !sql.trim()) return;
  const args = [
    '-u', cfg.db.user || 'root',
    '-h', cfg.db.host || 'localhost',
    '-P', String(cfg.db.port || 3306),
    cfg.db.name,
  ];
  const result = spawnSync('mysql', args, {
    input:    sql,
    encoding: 'utf-8',
    env:      getMysqlEnv(cfg),
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || 'MySQL hatası');
  }
}

// ─── db:migrate ──────────────────────────────────────────────────────────────

function cmdMigrate(projectRoot, cfg) {
  if (!cfg || !cfg.db) {
    console.error('[QTR] .qtr.json içinde "db" yapılandırması bulunamadı.');
    process.exitCode = 1; return;
  }

  try { ensureMigrationsTable(cfg); }
  catch (err) {
    console.error('[QTR] Migration tablosu oluşturulamadı:', err.message);
    process.exitCode = 1; return;
  }

  const files = listSqlFiles(projectRoot);
  let ranSet;
  try { ranSet = getRanMigrations(cfg); }
  catch (err) {
    console.error('[QTR] Migration listesi alınamadı:', err.message);
    process.exitCode = 1; return;
  }

  const pending = files.filter(f => !ranSet.has(f));
  console.log('\n[QTR MIGRATE]\n');

  if (pending.length === 0) {
    console.log('  Bekleyen migration yok. Her şey güncel.\n');
    return;
  }

  let batch;
  try { batch = getNextBatch(cfg); }
  catch (err) {
    console.error('[QTR] Batch numarası alınamadı:', err.message);
    process.exitCode = 1; return;
  }

  const pad = Math.max(...files.map(f => f.length), 30);
  let ran = 0, failed = 0;

  for (const file of pending) {
    const content = fs.readFileSync(path.join(projectRoot, 'database', file), 'utf-8');
    const { up } = parseMigrationFile(content);
    try {
      runSqlContent(cfg, up);
      runMysqlQuery(cfg,
        `INSERT INTO \`_qtr_migrations\` (migration, batch) VALUES ('${file}', ${batch});`,
        cfg.db.name
      );
      console.log(`  ✔  ${file.padEnd(pad)} migrated`);
      appendLog(projectRoot, `MIGRATED: ${file} (batch ${batch})`);
      ran++;
    } catch (err) {
      console.error(`  ✗  ${file.padEnd(pad)} HATA: ${err.message.trim()}`);
      appendLog(projectRoot, `HATA: ${file} — ${err.message.trim()}`);
      failed++;
      break;
    }
  }

  console.log(`\n  Sonuç: ${ran} çalıştırıldı, ${failed} hatalı (batch #${batch})\n`);
  if (failed > 0) {
    console.log('  Hatalar için: storage/logs/db.log');
    process.exitCode = 1;
  }
}

// ─── db:rollback ─────────────────────────────────────────────────────────────

function cmdRollback(projectRoot, cfg, step) {
  if (!cfg || !cfg.db) {
    console.error('[QTR] .qtr.json içinde "db" yapılandırması bulunamadı.');
    process.exitCode = 1; return;
  }

  try { ensureMigrationsTable(cfg); } catch (err) {
    console.error('[QTR] Migration tablosu erişilemedi:', err.message);
    process.exitCode = 1; return;
  }

  let maxBatch;
  try {
    const r = runMysqlQuery(cfg, 'SELECT COALESCE(MAX(batch),0) FROM `_qtr_migrations`;', cfg.db.name);
    maxBatch = parseInt(r, 10);
  } catch (err) {
    console.error('[QTR] Batch bilgisi alınamadı:', err.message);
    process.exitCode = 1; return;
  }

  if (maxBatch === 0) {
    console.log('[QTR] Geri alınacak migration yok.\n');
    return;
  }

  const fromBatch = Math.max(1, maxBatch - step + 1);
  console.log(`\n[QTR ROLLBACK] Batch ${fromBatch} → ${maxBatch}\n`);

  let rows;
  try {
    const r = runMysqlQuery(cfg,
      `SELECT migration FROM \`_qtr_migrations\` WHERE batch >= ${fromBatch} ORDER BY id DESC;`,
      cfg.db.name
    );
    rows = r.split('\n').map(l => l.trim()).filter(Boolean);
  } catch (err) {
    console.error('[QTR] Migration listesi alınamadı:', err.message);
    process.exitCode = 1; return;
  }

  const pad = Math.max(...rows.map(r => r.length), 30);
  let done = 0, failed = 0;

  for (const file of rows) {
    const sqlPath = path.join(projectRoot, 'database', file);
    if (!fs.existsSync(sqlPath)) {
      console.log(`  ⚠  ${file.padEnd(pad)} dosya bulunamadı, atlandı`);
      continue;
    }
    const content = fs.readFileSync(sqlPath, 'utf-8');
    const { down } = parseMigrationFile(content);
    if (!down) {
      console.log(`  ⚠  ${file.padEnd(pad)} DOWN bloğu yok, atlandı`);
      continue;
    }
    try {
      runSqlContent(cfg, down);
      runMysqlQuery(cfg,
        `DELETE FROM \`_qtr_migrations\` WHERE migration = '${file}';`,
        cfg.db.name
      );
      console.log(`  ↩  ${file.padEnd(pad)} rolled back`);
      appendLog(projectRoot, `ROLLED BACK: ${file}`);
      done++;
    } catch (err) {
      console.error(`  ✗  ${file.padEnd(pad)} HATA: ${err.message.trim()}`);
      appendLog(projectRoot, `ROLLBACK HATA: ${file} — ${err.message.trim()}`);
      failed++;
    }
  }

  console.log(`\n  Sonuç: ${done} geri alındı, ${failed} hatalı\n`);
  if (failed > 0) process.exitCode = 1;
}

// ─── db:reset ─────────────────────────────────────────────────────────────────

function cmdReset(projectRoot, cfg) {
  if (!cfg || !cfg.db) {
    console.error('[QTR] .qtr.json içinde "db" yapılandırması bulunamadı.');
    process.exitCode = 1; return;
  }

  let maxBatch;
  try {
    ensureMigrationsTable(cfg);
    const r = runMysqlQuery(cfg, 'SELECT COALESCE(MAX(batch),0) FROM `_qtr_migrations`;', cfg.db.name);
    maxBatch = parseInt(r, 10);
  } catch (err) {
    console.error('[QTR] Migration bilgisi alınamadı:', err.message);
    process.exitCode = 1; return;
  }

  if (maxBatch === 0) {
    console.log('[QTR] Sıfırlanacak migration yok.\n');
    return;
  }

  console.log(`[QTR RESET] ${maxBatch} batch sıfırlanıyor...\n`);
  cmdRollback(projectRoot, cfg, maxBatch);
}

// ─── db:make-migration ────────────────────────────────────────────────────────

function cmdMakeMigration(projectRoot, name) {
  if (!name) {
    console.error('[QTR] Kullanım: qtr db:make-migration <migration-adi>');
    console.error('      Örn: qtr db:make-migration create_users_table');
    process.exitCode = 1; return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    console.error(`[QTR] Geçersiz migration adı: "${name}"`);
    console.error('      Sadece harf, rakam ve alt çizgi (_) kullanılabilir.');
    process.exitCode = 1; return;
  }

  const dbDir = path.join(projectRoot, 'database');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

  const existing = listSqlFiles(projectRoot);
  const maxNum = existing.reduce((m, f) => {
    const n = parseInt(f.slice(0, 3), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);

  const num      = String(maxNum + 1).padStart(3, '0');
  const filename = `${num}_${name}.sql`;
  const filePath = path.join(dbDir, filename);

  if (fs.existsSync(filePath)) {
    console.log(`[QTR] Uyarı: ${filename} zaten mevcut!`);
    return;
  }

  let body;
  const createMatch = name.match(/^create_(.+)_table$/i);
  const addMatch    = name.match(/^add_(.+)_to_(.+)$/i);
  const dropMatch   = name.match(/^drop_(.+)_table$/i);

  if (createMatch) {
    body = MIG_CREATE(createMatch[1]);
  } else if (addMatch) {
    body = MIG_ADD(addMatch[1], addMatch[2]);
  } else if (dropMatch) {
    body = MIG_DROP(dropMatch[1]);
  } else {
    body = MIG_EMPTY;
  }

  const header = `-- QTR Framework — Migration\n-- Ad: ${name}\n-- Tarih: ${new Date().toISOString().slice(0, 10)}\n\n`;
  fs.writeFileSync(filePath, header + body, 'utf-8');

  console.log(`[QTR] Migration oluşturuldu: database/${filename}`);
  console.log(`      Düzenlemek: database/${filename}`);
  console.log(`      Çalıştırmak: qtr db:migrate`);
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
  console.log('[QTR UYARI] "db:run" komutu kullanımdan kaldırıldı.');
  console.log('            Yeni komut: qtr db:migrate');
  console.log('            UP/DOWN destekli migration\'lar için: qtr db:make-migration\n');

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

// ─── db:seed ──────────────────────────────────────────────────────────────────

function cmdSeed(projectRoot, cfg, targetClass) {
  if (!cfg || !cfg.db) {
    console.error('[QTR] .qtr.json içinde "db" yapılandırması bulunamadı.');
    process.exitCode = 1; return;
  }

  const phpPath   = cfg?.php || '';
  const seedersDir = path.join(projectRoot, 'database', 'seeders');

  if (!phpPath || !fs.existsSync(phpPath)) {
    console.error('[QTR] PHP binary bulunamadı!');
    console.error(`      .qtr.json dosyasındaki "php" alanını güncelleyin.`);
    process.exitCode = 1; return;
  }

  if (!fs.existsSync(seedersDir)) {
    console.error('[QTR] database/seeders/ dizini bulunamadı.');
    console.error('      Oluşturmak için: qtr db:make-seeder <ad>');
    process.exitCode = 1; return;
  }

  let seederFiles = fs.readdirSync(seedersDir)
    .filter(f => f.endsWith('.php'))
    .sort();

  if (targetClass) {
    const match = seederFiles.find(f =>
      f.toLowerCase() === (targetClass.toLowerCase() + '.php') ||
      f.toLowerCase() === targetClass.toLowerCase()
    );
    if (!match) {
      console.error(`[QTR] Seeder bulunamadı: ${targetClass}`);
      process.exitCode = 1; return;
    }
    seederFiles = [match];
  }

  if (seederFiles.length === 0) {
    console.log('[QTR] Çalıştırılacak seeder bulunamadı.');
    console.log('      Oluşturmak için: qtr db:make-seeder <ad>');
    return;
  }

  const seedRunner = path.join(projectRoot, 'app', 'scripts', 'php', 'seed-runner.php');
  if (!fs.existsSync(seedRunner)) {
    console.error('[QTR] seed-runner.php bulunamadı: app/scripts/php/seed-runner.php');
    process.exitCode = 1; return;
  }

  const qtrJsonPath = path.join(projectRoot, QTR_JSON);
  console.log('\n🌱 Running seeders...\n');

  let ok = 0, failed = 0;

  for (const file of seederFiles) {
    const seederPath = path.join(seedersDir, file);
    try {
      const result = execFileSync(phpPath, [seedRunner, qtrJsonPath, seederPath], {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      if (result.trim()) console.log(result.trim());
      ok++;
    } catch (err) {
      const errMsg = (err.stderr || err.stdout || err.message || '').trim();
      console.error(`  ✗ ${file}: ${errMsg.split('\n')[0]}`);
      appendLog(projectRoot, `SEED HATA: ${file} — ${errMsg}`);
      failed++;
    }
  }

  console.log(`\n${failed === 0 ? '✓' : '✗'} Seeding ${failed === 0 ? 'tamamlandı' : 'hatalarla tamamlandı'} — ${ok} başarılı, ${failed} hatalı\n`);
  if (failed > 0) process.exitCode = 1;
}

// ─── db:make-seeder ────────────────────────────────────────────────────────────

function cmdMakeSeeder(projectRoot, name) {
  if (!name) {
    console.error('[QTR] Kullanım: qtr db:make-seeder <ad>');
    console.error('      Örn: qtr db:make-seeder Users');
    process.exitCode = 1; return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    console.error(`[QTR] Geçersiz seeder adı: "${name}"`);
    process.exitCode = 1; return;
  }

  const className  = name.endsWith('Seeder') ? name : name + 'Seeder';
  const seedersDir = path.join(projectRoot, 'database', 'seeders');
  const filePath   = path.join(seedersDir, `${className}.php`);

  fs.mkdirSync(seedersDir, { recursive: true });

  if (fs.existsSync(filePath)) {
    console.log(`[QTR] Uyarı: ${className}.php zaten mevcut!`);
    return;
  }

  const tableName = name.toLowerCase().replace(/seeder$/i, '').replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') + 's';

  const content = `<?php
/**
 * QTR Framework — Seeder
 * Sınıf: ${className}
 * Tablo: ${tableName}
 * Çalıştırmak için: qtr db:seed --class=${className}
 */
class ${className}
{
    public function run(PDO $pdo): void
    {
        // Örnek veri
        $data = [
            // ['sütun1' => 'değer1', 'sütun2' => 'değer2'],
        ];

        if (empty($data)) {
            echo "  ⚠  ${className}: veri tanımlanmamış\\n";
            return;
        }

        $columns = implode(', ', array_map(fn($k) => "\`{$k}\`", array_keys($data[0])));
        $placeholders = implode(', ', array_fill(0, count($data[0]), '?'));
        $stmt = $pdo->prepare("INSERT INTO \`${tableName}\` ({$columns}) VALUES ({$placeholders})");

        $count = 0;
        foreach ($data as $row) {
            $stmt->execute(array_values($row));
            $count++;
        }

        echo "  ✓ ${className}: {$count} kayıt eklendi\\n";
    }
}
`;

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`[QTR] Seeder oluşturuldu: database/seeders/${className}.php`);
  console.log(`      Çalıştırmak: qtr db:seed --class=${className}`);
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

  if (sub === 'migrate') {
    const cfg = readQtrJson(projectRoot);
    cmdMigrate(projectRoot, cfg);
    return;
  }

  if (sub === 'rollback') {
    const cfg  = readQtrJson(projectRoot);
    const step = parseInt(params.step || '1', 10);
    cmdRollback(projectRoot, cfg, isNaN(step) || step < 1 ? 1 : step);
    return;
  }

  if (sub === 'reset') {
    const cfg = readQtrJson(projectRoot);
    cmdReset(projectRoot, cfg);
    return;
  }

  if (sub === 'make-migration') {
    const name = params.args[0];
    cmdMakeMigration(projectRoot, name);
    return;
  }

  if (sub === 'seed') {
    const cfg         = readQtrJson(projectRoot);
    const targetClass = params.class ? String(params.class) : null;
    cmdSeed(projectRoot, cfg, targetClass);
    return;
  }

  if (sub === 'make-seeder') {
    const name = params.args[0];
    cmdMakeSeeder(projectRoot, name);
    return;
  }

  if (sub === 'run') {
    const cfg = readQtrJson(projectRoot);
    cmdRun(projectRoot, cfg, params.force === true);
    return;
  }

  console.error(`[QTR] Bilinmeyen db alt komutu: "${sub}"`);
  console.error('      Geçerli: db:create  db:list  db:migrate  db:rollback  db:reset  db:make-migration  db:seed  db:make-seeder  db:run');
  process.exitCode = 1;
}

module.exports = { execute };
