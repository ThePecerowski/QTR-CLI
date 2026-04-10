'use strict';

const fs            = require('fs');
const path          = require('path');
const readline      = require('readline');
const { execSync, spawnSync } = require('child_process');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const QTR_JSON    = '.qtr.json';
const BACKUPS_DIR = 'storage/backups';
const LOG_FILE    = path.join('storage', 'logs', 'backup.log');

const INFO_TEXT = 'backup: Proje ve veritabanı yedeği alır, yönetir ve geri yükler.';

const HELP_TEXT = `
backup komutu:

  backup                   -- Proje + DB yedeği alır.
  backup --list            -- Mevcut yedekleri listeler.
  backup --restore <tarih> -- Belirtilen yedeği geri yükler.
  backup --delete <tarih>  -- Belirtilen yedeği siler.
  backup --clean           -- max_count üzerindeki eski yedekleri temizler.

Örnekler:
  qtr backup
  qtr backup --list
  qtr backup --restore 2026-04-09_14-30
  qtr backup --delete 2026-04-08_10-15
  qtr backup --clean
`;

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

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
  catch { return {}; }
}

function writeQtrJson(root, cfg) {
  fs.writeFileSync(path.join(root, QTR_JSON), JSON.stringify(cfg, null, 2), 'utf-8');
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

function appendLog(root, action, status, extra = '') {
  try {
    const logDir  = path.join(root, 'storage', 'logs');
    const logFile = path.join(logDir, 'backup.log');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const line = `[${new Date().toISOString()}] ACTION: ${action}, STATUS: ${status}${extra ? ', ' + extra : ''}\n`;
    fs.appendFileSync(logFile, line, 'utf-8');
  } catch { /* sessiz hata */ }
}

/** storage/.htaccess oluştur — web erişimini engelle */
function ensureStorageHtaccess(root) {
  const htFile = path.join(root, 'storage', '.htaccess');
  if (!fs.existsSync(htFile)) {
    fs.mkdirSync(path.dirname(htFile), { recursive: true });
    fs.writeFileSync(htFile, 'Order allow,deny\nDeny from all\n', 'utf-8');
  }
}

/** Yedek çiftlerini {stamp, zipFile, sqlFile, zipSize, sqlSize} olarak döner */
function listBackups(backupsDir) {
  if (!fs.existsSync(backupsDir)) return [];
  const files = fs.readdirSync(backupsDir);
  const stamps = new Set();
  for (const f of files) {
    const m = f.match(/^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})/);
    if (m) stamps.add(m[1]);
  }
  return Array.from(stamps).sort().reverse().map(stamp => {
    const zip = path.join(backupsDir, `${stamp}_backup.zip`);
    const sql = path.join(backupsDir, `${stamp}_db.sql`);
    const sizeMb = f => {
      try { return (fs.statSync(f).size / 1024 / 1024).toFixed(1) + ' MB'; }
      catch { return '—'; }
    };
    return { stamp, zipFile: zip, sqlFile: sql, zipSize: sizeMb(zip), sqlSize: sizeMb(sql) };
  });
}

/** max_count'u aşan en eski yedekleri sil */
function pruneBackups(backupsDir, maxCount) {
  const items = listBackups(backupsDir);
  if (items.length <= maxCount) return;
  const toDelete = items.slice(maxCount);
  for (const item of toDelete) {
    if (fs.existsSync(item.zipFile)) fs.unlinkSync(item.zipFile);
    if (fs.existsSync(item.sqlFile)) fs.unlinkSync(item.sqlFile);
    console.log(`  [SIL] Eski yedek temizlendi: ${item.stamp}`);
  }
}

// ─── ZIP oluşturma (Node yerleşik — harici modül gerektirmez) ────────────────

/** Dizini recursive olarak zip entrylerini JSZip formatında yazar.
 *  Gerçek zip için PowerShell / zip komutu kullanılır. */
function createProjectZip(root, destFile, exclude) {
  const excludeSet = new Set(exclude.map(e => e.replace(/\//g, path.sep)));

  // Windows: Compress-Archive, Unix: zip
  const isWin = process.platform === 'win32';

  if (isWin) {
    // PowerShell ile zip
    const excludeFilter = exclude.length
      ? ` | Where-Object { $_.FullName -notmatch '(${exclude.map(e => e.replace(/[\\/]/g, '\\\\')).join('|')})' }`
      : '';
    const ps = `
      $src = "${root.replace(/\\/g, '\\\\')}";
      $dest = "${destFile.replace(/\\/g, '\\\\')}";
      if (Test-Path $dest) { Remove-Item $dest -Force }
      $files = Get-ChildItem -Path $src -Recurse -File${excludeFilter};
      Compress-Archive -Path $files.FullName -DestinationPath $dest -Force
    `.trim();
    const result = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf-8' });
    if (result.status !== 0) throw new Error(result.stderr || 'ZIP oluşturulamadı.');
  } else {
    const excludeArgs = exclude.flatMap(e => ['--exclude', `./${e}/*`]);
    const result = spawnSync('zip', ['-r', destFile, '.', ...excludeArgs], { cwd: root, encoding: 'utf-8' });
    if (result.status !== 0) throw new Error(result.stderr || 'ZIP oluşturulamadı (zip komutu gerekli).');
  }
}

/** ZIP dosyasını hedef dizine açar */
function extractZip(zipFile, destDir) {
  const isWin = process.platform === 'win32';
  if (isWin) {
    const ps = `Expand-Archive -Path "${zipFile.replace(/\\/g, '\\\\')}" -DestinationPath "${destDir.replace(/\\/g, '\\\\')}" -Force`;
    const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf-8' });
    if (r.status !== 0) throw new Error(r.stderr || 'ZIP açılamadı.');
  } else {
    const r = spawnSync('unzip', ['-o', zipFile, '-d', destDir], { encoding: 'utf-8' });
    if (r.status !== 0) throw new Error(r.stderr || 'ZIP açılamadı (unzip gerekli).');
  }
}

// ─── DB Dump ─────────────────────────────────────────────────────────────────

function dumpDatabase(root, destSql) {
  // .env'den DB bilgilerini oku
  const envFile = path.join(root, '.env');
  if (!fs.existsSync(envFile)) {
    fs.writeFileSync(destSql, '-- .env bulunamadi, DB dump atlandi\n', 'utf-8');
    return false;
  }
  const env = {};
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  const { DB_HOST = '127.0.0.1', DB_PORT = '3306', DB_NAME, DB_USER, DB_PASS = '' } = env;
  if (!DB_NAME || !DB_USER) {
    fs.writeFileSync(destSql, '-- DB_NAME veya DB_USER tanimli degil, dump atlandi\n', 'utf-8');
    return false;
  }

  // mysqldump — şifreyi MYSQL_PWD env ile geçir (komut satırında görünmez)
  const args = [
    `--host=${DB_HOST}`, `--port=${DB_PORT}`,
    `--user=${DB_USER}`,
    '--single-transaction', '--skip-comments',
    DB_NAME,
  ];
  try {
    const r = spawnSync('mysqldump', args, {
      encoding: 'utf-8',
      env: { ...process.env, MYSQL_PWD: DB_PASS },
    });
    if (r.status !== 0) {
      fs.writeFileSync(destSql, `-- mysqldump hatasi: ${r.stderr}\n`, 'utf-8');
      return false;
    }
    fs.writeFileSync(destSql, r.stdout, 'utf-8');
    return true;
  } catch {
    fs.writeFileSync(destSql, '-- mysqldump bulunamadi, DB dump atlandi\n', 'utf-8');
    return false;
  }
}

function restoreDatabase(root, sqlFile) {
  const envFile = path.join(root, '.env');
  if (!fs.existsSync(envFile)) throw new Error('.env bulunamadı.');
  const env = {};
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  const { DB_HOST = '127.0.0.1', DB_PORT = '3306', DB_NAME, DB_USER, DB_PASS = '' } = env;
  if (!DB_NAME || !DB_USER) throw new Error('DB_NAME veya DB_USER .env\'de tanımlı değil.');

  const r = spawnSync('mysql', [
    `--host=${DB_HOST}`, `--port=${DB_PORT}`,
    `--user=${DB_USER}`,
    DB_NAME,
  ], {
    input: fs.readFileSync(sqlFile, 'utf-8'),
    encoding: 'utf-8',
    env: { ...process.env, MYSQL_PWD: DB_PASS },
  });

  if (r.status !== 0) throw new Error(`mysql restore hatası: ${r.stderr}`);
}

// ─── Alt Komutlar ────────────────────────────────────────────────────────────

async function cmdBackup(root) {
  const cfg        = readQtrJson(root);
  const backupConf = cfg.backup || {};
  const exclude    = backupConf.exclude || ['node_modules', '.git', 'storage/backups', 'vendor'];
  const maxCount   = backupConf.max_count ?? 10;

  const stamp     = timestamp();
  const backupsDir = path.join(root, BACKUPS_DIR);
  fs.mkdirSync(backupsDir, { recursive: true });
  ensureStorageHtaccess(root);

  const zipFile = path.join(backupsDir, `${stamp}_backup.zip`);
  const sqlFile = path.join(backupsDir, `${stamp}_db.sql`);

  console.log(`\n[BACKUP] ${stamp}`);

  // Proje zip
  process.stdout.write('  Proje dosyaları sıkıştırılıyor...');
  try {
    createProjectZip(root, zipFile, exclude);
    const sizeMb = (fs.statSync(zipFile).size / 1024 / 1024).toFixed(1);
    console.log(` ${sizeMb} MB`);
  } catch (e) {
    console.log(` HATA: ${e.message}`);
    appendLog(root, 'BACKUP', 'FAIL', `zip_error=${e.message}`);
    process.exit(1);
  }

  // DB dump
  process.stdout.write('  Veritabanı dump alınıyor...');
  const dbOk = dumpDatabase(root, sqlFile);
  if (dbOk) {
    const dbSizeMb = (fs.statSync(sqlFile).size / 1024).toFixed(0);
    console.log(` ${dbSizeMb} KB`);
  } else {
    console.log(' (atlandı — DB ayarları eksik)');
  }

  // max_count temizliği
  pruneBackups(backupsDir, maxCount);

  appendLog(root, 'BACKUP', 'SUCCESS', `stamp=${stamp}`);
  console.log(`\nYedek alındı: storage/backups/${stamp}_backup.zip`);
}

function cmdList(root) {
  const backupsDir = path.join(root, BACKUPS_DIR);
  const items      = listBackups(backupsDir);

  console.log('\n[BACKUP LIST]');
  if (items.length === 0) {
    console.log('  Kayıtlı yedek yok. qtr backup ile yedek alın.');
    return;
  }
  items.forEach((item, i) => {
    console.log(`  ${i + 1}) ${item.stamp}  (ZIP: ${item.zipSize}, DB: ${item.sqlSize})`);
  });
  console.log('');
}

async function cmdRestore(root, stamp) {
  if (!stamp) {
    console.log('[BACKUP] --restore için tarih damgası gerekli: qtr backup --restore 2026-04-09_14-30');
    process.exit(1);
  }

  const backupsDir = path.join(root, BACKUPS_DIR);
  const zipFile    = path.join(backupsDir, `${stamp}_backup.zip`);
  const sqlFile    = path.join(backupsDir, `${stamp}_db.sql`);

  if (!fs.existsSync(zipFile)) {
    console.log(`[BACKUP] ZIP dosyası bulunamadı: ${stamp}_backup.zip`);
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log(`\n[UYARI] ${stamp} yedeği geri yüklenecek.`);
    console.log('Mevcut proje dosyalarının üzerine yazılacak.');
    if (fs.existsSync(sqlFile)) console.log('Veritabanı da geri yüklenecek.');

    const confirm = await ask(rl, '\nDevam etmek istiyor musunuz? (e/H): ');
    if (confirm.trim().toLowerCase() !== 'e') {
      console.log('İptal edildi.');
      return;
    }

    // Opsiyonel: önce mini yedek al
    const mini = await ask(rl, 'Önce mevcut durumun yedeğini almak ister misiniz? (e/H): ');
    if (mini.trim().toLowerCase() === 'e') {
      console.log('  Mini yedek alınıyor...');
      await cmdBackup(root);
    }

    // ZIP aç
    process.stdout.write('  Dosyalar geri yükleniyor...');
    extractZip(zipFile, root);
    console.log(' OK');

    // DB restore
    if (fs.existsSync(sqlFile)) {
      process.stdout.write('  Veritabanı geri yükleniyor...');
      try {
        restoreDatabase(root, sqlFile);
        console.log(' OK');
      } catch (e) {
        console.log(` HATA: ${e.message}`);
      }
    }

    appendLog(root, 'RESTORE', 'SUCCESS', `stamp=${stamp}`);
    console.log(`\nGeri yükleme tamamlandı: ${stamp}`);
  } finally {
    rl.close();
  }
}

async function cmdDelete(root, stamp) {
  if (!stamp) { console.log('[BACKUP] --delete için tarih gerekli.'); process.exit(1); }

  const backupsDir = path.join(root, BACKUPS_DIR);
  const zipFile    = path.join(backupsDir, `${stamp}_backup.zip`);
  const sqlFile    = path.join(backupsDir, `${stamp}_db.sql`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const confirm = await ask(rl, `[BACKUP] "${stamp}" silinecek. Emin misiniz? (e/H): `);
    if (confirm.trim().toLowerCase() !== 'e') { console.log('İptal.'); return; }
    if (fs.existsSync(zipFile)) { fs.unlinkSync(zipFile); console.log(`  [SIL] ${stamp}_backup.zip`); }
    if (fs.existsSync(sqlFile)) { fs.unlinkSync(sqlFile); console.log(`  [SIL] ${stamp}_db.sql`); }
    appendLog(root, 'DELETE', 'SUCCESS', `stamp=${stamp}`);
  } finally {
    rl.close();
  }
}

function cmdClean(root) {
  const cfg      = readQtrJson(root);
  const maxCount = cfg.backup?.max_count ?? 10;
  const backupsDir = path.join(root, BACKUPS_DIR);
  pruneBackups(backupsDir, maxCount);
  console.log(`[BACKUP CLEAN] max_count=${maxCount} uygulandı.`);
}

// ─── Ana execute ─────────────────────────────────────────────────────────────

async function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  const root = findProjectRoot();
  if (!root) {
    console.log('[BACKUP] Bu dizin bir QTR projesi değil (.qtr.json bulunamadı).');
    process.exit(1);
  }

  if (params.list)    { cmdList(root); return; }
  if (params.restore) { await cmdRestore(root, String(params.restore)); return; }
  if (params.delete)  { await cmdDelete(root, String(params.delete)); return; }
  if (params.clean)   { cmdClean(root); return; }

  // Varsayılan: yedek al
  await cmdBackup(root);
}

module.exports = { execute };
