'use strict';

const fs            = require('fs');
const path          = require('path');
const { execFileSync } = require('child_process');

const QTR_JSON = '.qtr.json';

// ─── Info / Help texts ───────────────────────────────────────────────────────

const INFO_MAP = {
  'deploy:check':        'deploy:check: Production deploy oncesi tum kritik kontrolleri yapar.',
  'deploy:nginx-config': 'deploy:nginx-config: Proje icin ornek Nginx sunucu bloku gosterir.',
};

const HELP_MAP = {
  'deploy:check': [
    'deploy:check kullanimi:',
    '  qtr deploy:check     -- APP_ENV, APP_DEBUG, .env, storage, .htaccess, guvenlik, DB kontrol eder.',
    '  Cikti: [OK] / [HATA] formatinda her kontrol icin satir.',
  ].join('\n'),
  'deploy:nginx-config': [
    'deploy:nginx-config kullanimi:',
    '  qtr deploy:nginx-config   -- Nginx server bloku ornegini konsolda gosterir.',
    '  Bu ciktiyi /etc/nginx/sites-available/proje.conf dosyasina kopyalayin.',
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

function readEnv(root) {
  const envFile = path.join(root, '.env');
  const result  = {};
  if (!fs.existsSync(envFile)) return result;
  const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = val;
  }
  return result;
}

function printChecks(checks) {
  const PAD = 40;
  console.log('');
  for (const c of checks) {
    const label  = (c.label + ' ').padEnd(PAD, '.');
    const status = c.ok ? '[OK]   ' : '[HATA] ';
    const detail = c.detail ? `  ${c.detail}` : '';
    console.log(`  ${status} ${label}${detail}`);
  }
  console.log('');
}

// ─── deploy:check ────────────────────────────────────────────────────────────

async function cmdDeployCheck(params) {
  const root = findProjectRoot();
  if (!root) {
    console.error('[HATA] QTR projesi bulunamadi.');
    process.exitCode = 1;
    return;
  }

  const cfg  = readQtrJson(root);
  const env  = readEnv(root);
  const checks = [];

  // 1. .env dosyasi mevcut mu?
  const envExists = fs.existsSync(path.join(root, '.env'));
  checks.push({
    label:  '.env dosyasi mevcut',
    ok:     envExists,
    detail: envExists ? '' : '.env bulunamadi — qtr env:setup calistirin',
  });

  // 2. APP_ENV=production
  const appEnv = env['APP_ENV'] || '';
  const envIsProduction = appEnv === 'production';
  checks.push({
    label:  'APP_ENV=production',
    ok:     envIsProduction,
    detail: envIsProduction ? appEnv : `APP_ENV="${appEnv}" — qtr env:set APP_ENV production`,
  });

  // 3. APP_DEBUG=false
  const appDebug = (env['APP_DEBUG'] || 'false').toLowerCase();
  const debugOff = appDebug === 'false' || appDebug === '0' || appDebug === '';
  checks.push({
    label:  'APP_DEBUG=false',
    ok:     debugOff,
    detail: debugOff ? '' : 'APP_DEBUG acik! — qtr env:set APP_DEBUG false',
  });

  // 4. storage/logs/ yazılabilir mi?
  const logsDir = path.join(root, 'storage', 'logs');
  let logsOk = false;
  let logsDetail = '';
  if (!fs.existsSync(logsDir)) {
    logsDetail = 'storage/logs/ klasoru yok';
  } else {
    try { fs.accessSync(logsDir, fs.constants.W_OK); logsOk = true; }
    catch { logsDetail = 'storage/logs/ yazilabilir degil (izin sorunu)'; }
  }
  checks.push({ label: 'storage/logs/ yazilabilir', ok: logsOk, detail: logsDetail });

  // 5. storage/backups/ erisilebilir mi?
  const backupsDir = path.join(root, 'storage', 'backups');
  const backupsOk  = fs.existsSync(backupsDir);
  checks.push({
    label:  'storage/backups/ mevcut',
    ok:     backupsOk,
    detail: backupsOk ? '' : 'storage/backups/ klasoru yok — qtr backup ile olusturulacak',
  });

  // 6. .htaccess mevcut mu? (public/ veya kok dizin)
  const htPublic = path.join(root, 'public', '.htaccess');
  const htRoot   = path.join(root, '.htaccess');
  const htOk     = fs.existsSync(htPublic) || fs.existsSync(htRoot);
  checks.push({
    label:  '.htaccess mevcut',
    ok:     htOk,
    detail: htOk ? '' : '.htaccess bulunamadi — qtr create ile olusturulur',
  });

  // 7. Guvenlik katmanlari kontrol
  const security = (cfg && cfg.security) || {};
  // security doğrudan flat objedir: { mode, csrf: true, xss: true, ... }
  const securityKeys = ['input_validation', 'sql_injection', 'xss', 'csrf', 'auth', 'rate_limit', 'api_security', 'file_upload', 'debug_protection', 'config_protection'];
  const enabledLayers  = securityKeys.filter(k => security[k] === true);
  const disabledLayers = securityKeys.filter(k => security[k] !== true);
  const secOk = enabledLayers.length > 0 && disabledLayers.length === 0;
  checks.push({
    label:  'Guvenlik katmanlari aktif',
    ok:     secOk,
    detail: enabledLayers.length === 0
      ? 'Guvenlik kurulmamis — qtr security:fix'
      : (disabledLayers.length > 0 ? `${disabledLayers.length} katman devre disi (${disabledLayers.join(', ')}) — qtr security:mode strict` : ''),
  });

  // 8. DB baglantisi (PHP PDO testi — PHP binary gerektirir)
  const phpPath = (cfg && (cfg.php || cfg.php_path)) || '';
  if (phpPath && fs.existsSync(phpPath)) {
    const db   = (cfg && cfg.db) || {};
    const host = db.host || 'localhost';
    const port = db.port || 3306;
    const user = db.user || 'root';
    const pass = (db.pass || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    const phpCode = [
      `try {`,
      `  $p = new PDO('mysql:host=${host};port=${port};charset=utf8mb4','${user}','${pass}',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);`,
      `  echo 'OK';`,
      `} catch(Exception $e){ fwrite(STDERR, $e->getMessage()); exit(1); }`,
    ].join(' ');

    try {
      execFileSync(phpPath, ['-r', phpCode], { stdio: ['ignore', 'pipe', 'pipe'] });
      checks.push({ label: `MySQL baglantisi (${host}:${port})`, ok: true, detail: '' });
    } catch (err) {
      const msg = (err.stderr || '').toString().trim() || 'Baglanti kurulamadi';
      checks.push({ label: `MySQL baglantisi (${host}:${port})`, ok: false, detail: msg.slice(0, 80) });
    }
  } else {
    checks.push({
      label:  'MySQL baglantisi',
      ok:     false,
      detail: 'PHP binary tanimlanmamis — .qtr.json "php" alanini kontrol edin',
    });
  }

  // ─── Cikti ──────────────────────────────────────────────────────────────────
  console.log('Deploy Kontrol Listesi');
  console.log('======================');
  printChecks(checks);

  const failCount = checks.filter(c => !c.ok).length;
  if (failCount === 0) {
    console.log('[OK] Tum kontroller gecti. Deploy icin hazir.');
  } else {
    console.log(`[HATA] ${failCount} kontrol basarisiz. Yukardaki hatalari duzeltip tekrar calistirin.`);
    process.exitCode = 1;
  }
}

// ─── deploy:nginx-config ─────────────────────────────────────────────────────

function cmdNginxConfig(params) {
  const root    = findProjectRoot();
  const cfg     = root ? readQtrJson(root) : null;
  const appName = (cfg && cfg.name) || 'myapp.local';
  const docRoot = root
    ? path.join(root, 'public').replace(/\\/g, '/')
    : '/var/www/myapp/public';

  const nginxConfig = `
# QTR Framework — Nginx Sunucu Bloku
# /etc/nginx/sites-available/${appName}.conf dosyasina kopyalayin.
# Ardindan: sudo ln -s /etc/nginx/sites-available/${appName}.conf /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl reload nginx

server {
    listen 80;
    server_name ${appName} www.${appName};

    root ${docRoot};
    index index.php index.html;

    # Tum istekleri public/index.php ye yonlendir
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP-FPM
    location ~ \\.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;  # PHP surumunuze gore degistirin
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # storage/ ve .env dosyasini disariya kapali tut
    location ~ ^/(storage|.env) {
        deny all;
        return 404;
    }

    # Statik dosyalar icin cache
    location ~* \\.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gizli dosyalara erisimi engelle
    location ~ /\\. {
        deny all;
    }

    access_log /var/log/nginx/${appName}_access.log;
    error_log  /var/log/nginx/${appName}_error.log;
}
`;
  console.log(nginxConfig);
  console.log('HTTPS icin Let\'s Encrypt: sudo certbot --nginx -d ' + appName);
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

async function execute(params) {
  const cmd = params._command || '';

  if (params.info)  { console.log(INFO_MAP[cmd] || 'deploy: Deploy komutlari.'); return; }
  if (params.help)  { console.log(HELP_MAP[cmd] || 'Parametre bilgisi mevcut degil.'); return; }

  if (cmd === 'deploy:check')        return cmdDeployCheck(params);
  if (cmd === 'deploy:nginx-config') return cmdNginxConfig(params);

  console.log('Bilinmeyen deploy komutu: ' + cmd);
  process.exitCode = 1;
}

module.exports = { execute };
