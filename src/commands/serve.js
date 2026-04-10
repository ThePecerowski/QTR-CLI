'use strict';

const fs          = require('fs');
const path        = require('path');
const { spawn }   = require('child_process');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const INFO = 'serve [--port=<n>] [--stop] [--status]: PHP built-in server\'i baslatir veya durdurur.';

const HELP = `
serve [--port=<numara>] [--stop] [--status]

  PHP built-in server'i QTR projesinin public/ klasorunden baslatir.
  PHP binary ve port bilgisini .qtr.json dosyasinden okur.

  Parametreler:
    --port=<n>   Port numarasi (varsayilan: .qtr.json'daki deger veya 8000)
    --stop       Calisan serveri durdurur
    --status     Server durumunu gosterir

  Ornekler:
    qtr serve
    qtr serve --port=3000
    qtr serve --stop
    qtr serve --status
`;

const HTACCESS_CONTENT = `Options -Indexes

RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php?url=$1 [L,QSA]
`;

const PID_FILE = 'storage/.server_pid';
const QTR_JSON = '.qtr.json';

// ─── Yardımcı ────────────────────────────────────────────────────────────────

function readQtrJson(projectRoot) {
  const filePath = path.join(projectRoot, QTR_JSON);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

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

function pidFilePath(projectRoot) {
  return path.join(projectRoot, PID_FILE);
}

function readPid(projectRoot) {
  const p = pidFilePath(projectRoot);
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf-8').trim();
  const pid = parseInt(raw, 10);
  return isNaN(pid) ? null : pid;
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0); // 0 sinyali sadece varlık kontrolü yapar
    return true;
  } catch {
    return false;
  }
}

function ensureHtaccess(projectRoot) {
  const htaPath = path.join(projectRoot, '.htaccess');
  if (!fs.existsSync(htaPath)) {
    fs.writeFileSync(htaPath, HTACCESS_CONTENT, 'utf-8');
    console.log('[QTR] .htaccess bulunamadi, otomatik olusturuldu.');
  }
}

function ensureStorageDir(projectRoot) {
  const storageDir = path.join(projectRoot, 'storage');
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
}

// ─── Komutlar ────────────────────────────────────────────────────────────────

function cmdStatus(projectRoot) {
  const pid = readPid(projectRoot);
  if (!pid) {
    console.log('[QTR] Server su anda calismiyor.');
    return;
  }
  if (isProcessAlive(pid)) {
    const cfg = readQtrJson(projectRoot);
    const port = cfg?.port || 8000;
    console.log(`[QTR] Server calisiyor  (PID: ${pid})`);
    console.log(`      Adres : http://localhost:${port}`);
    console.log(`      Durmak: qtr serve --stop`);
  } else {
    console.log('[QTR] Server calismiyor (eski PID kaydı temizleniyor).');
    fs.unlinkSync(pidFilePath(projectRoot));
  }
}

function cmdStop(projectRoot) {
  const pid = readPid(projectRoot);
  if (!pid) {
    console.log('[QTR] Durduruacak aktif server bulunamadi.');
    return;
  }
  if (!isProcessAlive(pid)) {
    console.log('[QTR] Server zaten durmust, eski PID kaydi temizlendi.');
    fs.unlinkSync(pidFilePath(projectRoot));
    return;
  }
  try {
    process.kill(pid, 'SIGTERM');
    fs.unlinkSync(pidFilePath(projectRoot));
    console.log(`[QTR] Server durduruldu. (PID: ${pid})`);
  } catch (err) {
    console.error(`[QTR] Server durdurulamadi: ${err.message}`);
    process.exitCode = 1;
  }
}

function cmdStart(projectRoot, cfg, port) {
  // Mevcut PID kontrolü
  const existingPid = readPid(projectRoot);
  if (existingPid && isProcessAlive(existingPid)) {
    console.log(`[QTR] Server zaten calisiyor. (PID: ${existingPid})`);
    console.log(`      Adres : http://localhost:${port}`);
    console.log('      Durmak: qtr serve --stop');
    return;
  }

  // PHP binary doğrula
  const phpPath = cfg?.php || cfg?.php_path || '';
  if (!phpPath || !fs.existsSync(phpPath)) {
    console.error('[QTR] PHP binary bulunamadi!');
    console.error(`      Kontrol: ${phpPath || '(tanimsiz)'}`);
    console.error('      .qtr.json dosyasindaki "php" alanini duzeltin.');
    console.error('      Ornek  : "php": "C:/xampp/php/php.exe"');
    process.exitCode = 1;
    return;
  }

  // .htaccess kontrolü
  ensureHtaccess(projectRoot);
  ensureStorageDir(projectRoot);

  // public/ klasörü kontrol et
  const publicDir = path.join(projectRoot, 'public');
  if (!fs.existsSync(publicDir)) {
    console.warn('[QTR] Uyari: public/ klasoru bulunamadi, server proje kokunden baslatilacak.');
  }

  const docRoot = fs.existsSync(publicDir) ? publicDir : projectRoot;

  // public/router.php varsa router script ile başlat (URL rewriting için gerekli)
  const routerScript = path.join(publicDir, 'router.php');
  const spawnArgs = fs.existsSync(routerScript)
    ? ['-S', `localhost:${port}`, '-t', docRoot, routerScript]
    : ['-S', `localhost:${port}`, '-t', docRoot];

  // Server'ı başlat (detached, kalıcı)
  const child = spawn(phpPath, spawnArgs, {
    detached: true,
    stdio:    'ignore',
    cwd:      projectRoot,
  });

  child.unref();

  // PID kaydet
  fs.writeFileSync(pidFilePath(projectRoot), String(child.pid), 'utf-8');

  console.log('\n[QTR] Local server baslatildi.');
  console.log(`      Adres  : http://localhost:${port}`);
  console.log(`      PHP    : ${phpPath}`);
  console.log(`      Klasor : ${docRoot}`);
  console.log('      Durmak : qtr serve --stop');
  console.log('      Durum  : qtr serve --status\n');
}

// ─── Ana execute ─────────────────────────────────────────────────────────────

function execute(params) {
  if (params.info) { console.log(INFO);  return; }
  if (params.help) { console.log(HELP);  return; }

  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    console.error('[QTR] Hata: Bu klasorde bir QTR projesi bulunamadi (.qtr.json yok).');
    console.error('      Lutfen bir QTR proje dizininde calistirin.');
    process.exitCode = 1;
    return;
  }

  const cfg  = readQtrJson(projectRoot);
  const port = params.port
    ? parseInt(params.port, 10)
    : (cfg?.port || 8000);

  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(`[QTR] Gecersiz port: ${params.port}. 1-65535 arasinda bir deger girin.`);
    process.exitCode = 1;
    return;
  }

  if (params.stop)   return cmdStop(projectRoot);
  if (params.status) return cmdStatus(projectRoot);

  cmdStart(projectRoot, cfg, port);
}

module.exports = { execute };
