'use strict';

const { sendCommand, isAppRunning } = require('../utils/connection');
const { execSync, execFileSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const QTR_JSON = '.qtr.json';

const INFO_TEXT = 'fix: CLI ve uygulama kurulumunun dogru calisip calismadigini kontrol eder.';
const HELP_TEXT = [
  'fix komutu parametreleri:',
  '  fix            -- Temel baglanti testi yapar.',
  '  fix --doctor   -- Windows ortamini ve kurulumu derinlemesine kontrol eder.',
  '  fix --show     -- Tespit edilen sorunlari nasil cozecegini anlatir.',
].join('\n');

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
  try { return JSON.parse(fs.readFileSync(path.join(projectRoot, QTR_JSON), 'utf-8')); }
  catch { return null; }
}

// ─── Kontroller ──────────────────────────────────────────────────────────────

function getNodeVersion() {
  try { return process.version; } catch { return null; }
}

function getNpmVersion() {
  try { return execSync('npm --version', { stdio: 'pipe' }).toString().trim(); } catch { return null; }
}

function checkExeExists() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || '', 'SpeakerQuarter', 'SpeakerQuarter.exe'),
    'C:\\Program Files\\SpeakerQuarter\\SpeakerQuarter.exe',
  ];
  return candidates.some(p => fs.existsSync(p));
}

/**
 * QTR projesi varsa PHP binary ve MySQL bağlantısını test eder.
 * PHP ile inline PDO bağlantı testi yapar.
 */
function checkQtrProject(checks) {
  const root = findProjectRoot();
  if (!root) return; // QTR projesi dışındaysa bu kontrolleri atla

  const cfg    = readQtrJson(root);
  if (!cfg) return;

  // PHP binary kontrolü
  const phpPath = cfg.php || cfg.php_path || '';
  const phpOk   = !!phpPath && fs.existsSync(phpPath);
  checks.push({
    label:  'PHP binary (.qtr.json)',
    ok:     phpOk,
    detail: phpOk ? phpPath : `Bulunamadi: ${phpPath || '(tanimsiz)'}`,
  });

  // MySQL bağlantı testi (PHP -r ile inline PDO)
  if (phpOk) {
    const db   = cfg.db || {};
    const host = db.host || 'localhost';
    const port = db.port || 3306;
    const user = db.user || 'root';
    const pass = db.pass || '';

    const phpCode = [
      `try {`,
      `  $p = new PDO('mysql:host=${host};port=${port};charset=utf8mb4','${user}','${pass}',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);`,
      `  echo 'OK';`,
      `} catch(Exception $e){ fwrite(STDERR, $e->getMessage()); exit(1); }`,
    ].join(' ');

    try {
      execFileSync(phpPath, ['-r', phpCode], { stdio: ['ignore', 'pipe', 'pipe'] });
      checks.push({
        label:  `MySQL baglantisi (${host}:${port})`,
        ok:     true,
        detail: 'Baglanti basarili',
      });
    } catch (err) {
      const msg = (err.stderr || '').toString().trim() || 'Baglanti kurulamadi';
      checks.push({
        label:  `MySQL baglantisi (${host}:${port})`,
        ok:     false,
        detail: msg,
      });
    }
  }
}

async function runBasicCheck() {
  const checks = [];

  // 1. Node.js
  const nodeVer = getNodeVersion();
  checks.push({ label: 'Node.js',   ok: !!nodeVer, detail: nodeVer || 'bulunamadi' });

  // 2. npm
  const npmVer = getNpmVersion();
  checks.push({ label: 'npm',       ok: !!npmVer,  detail: npmVer  || 'bulunamadi' });

  // 3. Uygulama baglantisi
  const running = await isAppRunning();
  checks.push({
    label: 'SpeakerQuarter baglantisi',
    ok: running,
    detail: running ? 'Baglanti basarili' : 'Uygulama calismiyor veya baglanti kurulamiyor',
  });

  return checks;
}

async function runDoctorCheck() {
  const checks = await runBasicCheck();

  // 4. Windows WASAPI / ses hizmeti
  try {
    const audsrv = execSync('sc query AudioSrv', { stdio: 'pipe' }).toString();
    const running = audsrv.includes('RUNNING');
    checks.push({ label: 'Windows Ses Servisi (AudioSrv)', ok: running, detail: running ? 'Calisiyor' : 'Durdurulmus' });
  } catch {
    checks.push({ label: 'Windows Ses Servisi (AudioSrv)', ok: false, detail: 'Sorgulanamadi' });
  }

  // 5. SpeakerQuarter.exe varligi
  const exeFound = checkExeExists();
  checks.push({
    label: 'SpeakerQuarter.exe',
    ok: exeFound,
    detail: exeFound ? 'Bulundu' : 'Standart konumlarda bulunamadi (PATH kontrolu yapilmadi)',
  });

  // 6. QTR proje — PHP binary + MySQL bağlantısı
  checkQtrProject(checks);

  // 7. QTR proje — ortam (production) güvenlik kontrolü
  const root = findProjectRoot();
  if (root) {
    const cfg = readQtrJson(root);
    const envFile = path.join(root, '.env');
    if (cfg && fs.existsSync(envFile)) {
      const envLines = fs.readFileSync(envFile, 'utf-8').split('\n');
      const envMap   = {};
      for (const ln of envLines) {
        const idx = ln.indexOf('=');
        if (idx !== -1) envMap[ln.slice(0, idx).trim()] = ln.slice(idx + 1).trim();
      }
      const appEnv   = (envMap['APP_ENV']   || 'local').toLowerCase();
      const appDebug = (envMap['APP_DEBUG']  || 'false').toLowerCase();

      if (appEnv === 'production') {
        const debugOk = appDebug !== 'true';
        checks.push({
          label:  'Production: APP_DEBUG=false',
          ok:     debugOk,
          detail: debugOk ? 'Guvenli (false)' : 'TEHLIKE: APP_DEBUG=true production ortaminda!',
        });

        // storage/logs/ yazilabilir mi?
        const logsDir = path.join(root, 'storage', 'logs');
        let logsOk = false; let logsDetail = '';
        if (!fs.existsSync(logsDir)) {
          logsDetail = 'klasor mevcut degil';
        } else {
          try { fs.accessSync(logsDir, fs.constants.W_OK); logsOk = true; }
          catch { logsDetail = 'izin sorunu — yazilabilir degil'; }
        }
        checks.push({ label: 'storage/logs/ yazilabilir', ok: logsOk, detail: logsDetail });

        // storage/backups/ mevcut mu?
        const backupsDir = path.join(root, 'storage', 'backups');
        const backupsOk  = fs.existsSync(backupsDir);
        checks.push({
          label:  'storage/backups/ mevcut',
          ok:     backupsOk,
          detail: backupsOk ? '' : 'qtr backup ile olusturulacak',
        });

        // .htaccess mevcut mu?
        const htPublic = path.join(root, 'public', '.htaccess');
        const htRoot2  = path.join(root, '.htaccess');
        const htOk     = fs.existsSync(htPublic) || fs.existsSync(htRoot2);
        checks.push({
          label:  '.htaccess mevcut',
          ok:     htOk,
          detail: htOk ? '' : 'qtr create ile olusturulur',
        });

        // Guvenlik katmanlari
        const security   = (cfg && cfg.security) || {};
        const layers     = security.layers || {};
        const totalLyr   = Object.keys(layers).length;
        const disabledLyr = Object.values(layers).filter(l => !l.enabled).length;
        const secOk = totalLyr > 0 && disabledLyr === 0;
        checks.push({
          label:  'Guvenlik katmanlari aktif',
          ok:     secOk,
          detail: totalLyr === 0
            ? 'Guvenlik kurulmamis — qtr security:fix'
            : (disabledLyr > 0 ? `${disabledLyr} katman devre disi — qtr security:mode strict` : ''),
        });

      } else {
        checks.push({
          label:  `APP_ENV`,
          ok:     true,
          detail: appEnv,
        });
      }
    }
  }

  return checks;
}

function printChecks(checks) {
  const padLabel = 40;
  console.log('');
  for (const c of checks) {
    const status = c.ok ? '[OK]  ' : '[HATA]';
    console.log(`  ${status}  ${c.label.padEnd(padLabel)} ${c.detail}`);
  }
  const allOk = checks.every(c => c.ok);
  console.log('');
  console.log(allOk
    ? 'Tum kontroller basarili.'
    : 'Bazi kontroller basarisiz. "qtr fix --show" ile cozum onerilerini gorebilirsiniz.');
  console.log('');
}

const SHOW_TEXT = `
SpeakerQuarter CLI Sorun Giderme Kilavuzu
==========================================

[HATA] SpeakerQuarter baglantisi -- Uygulama calismiyor
  -> SpeakerQuarter.exe uygulamasini baslatin.
  -> Uygulama sistem tepsisinde (sag alt kose) kucultulmus olabilir.

[HATA] Windows Ses Servisi (AudioSrv) -- Durdurulmus
  -> Windows + R > services.msc acin.
  -> "Windows Audio" servisini bulup "Baslat" a tiklayin.
  -> Veya terminalde: net start AudioSrv

[HATA] Node.js / npm bulunamadi
  -> https://nodejs.org adresinden LTS surumu indirip kurun.

[HATA] SpeakerQuarter.exe standart konumda bulunamadi
  -> Bu bir uyari: uygulama farkli bir konumda olmasi durumunda
     baglanti testi yukaridaki baglanti kontrolune bakar.
     Eger baglanti OK ise bu uyari onemsizdir.

[HATA] PHP binary bulunamadi
  -> .qtr.json dosyasindaki "php" alaninin dogru bir PHP yolu
     icerdiginden emin olun. Ornek: "php": "C:/php/php.exe"
  -> XAMPP kullaniyorsaniz: C:/xampp/php/php.exe

[HATA] MySQL baglantisi BASARISIZ
  -> .qtr.json dosyasindaki "db" alanini kontrol edin
     (host, port, name, user, pass).
  -> MySQL/XAMPP/Laragon servisinin calistigini dogrulayin.
  -> Kullanici adina ve sifresine dikkat edin.

[HATA] Production: APP_DEBUG=true TEHLIKE
  -> .env dosyasinda APP_DEBUG=false olarak ayarlayin.
  -> qtr env:set APP_DEBUG false
  -> Production ortaminda debug acik birakmayin.
`;

async function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  if (params.show) {
    console.log(SHOW_TEXT);
    return;
  }

  const deep = !!params.doctor;
  console.log(deep ? 'Derinlemesine sistem kontrolu yapiliyor...' : 'Temel kontroller yapiliyor...');

  try {
    const checks = deep ? await runDoctorCheck() : await runBasicCheck();
    printChecks(checks);
    const anyFail = checks.some(c => !c.ok);
    if (anyFail) process.exitCode = 1;
  } catch (err) {
    console.error('Kontrol sirasinda hata: ' + err.message);
    process.exitCode = 1;
  }
}

module.exports = { execute };
