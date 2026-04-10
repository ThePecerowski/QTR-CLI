'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const ENV_FILE     = '.env';
const ENV_EXAMPLE  = '.env.example';
const QTR_JSON     = '.qtr.json';

// Hassas key kalıpları — değerleri maskelenir
const SENSITIVE_PATTERNS = ['PASS', 'SECRET', 'TOKEN', 'API_KEY', 'KEY'];

// Zorunlu alanlar
const REQUIRED_KEYS = ['APP_ENV', 'APP_DEBUG', 'APP_URL', 'DB_HOST', 'DB_NAME', 'DB_USER'];

// Üretim ortamında ek uyarı verilen alanlar
const CRITICAL_KEYS = ['APP_DEBUG', 'APP_ENV'];

const INFO_TEXT = 'env: .env dosyasi yonetimi — setup/show/set/check.';

const HELP_TEXT = `
env komutu alt komutlari:

  env:setup            -- .env.example dosyasindan .env olusturur.
  env:show             -- .env degerlerini listeler (hassas alanlar maskelenir).
  env:set <KEY> <DEG>  -- .env'deki anahtari gunceller.
  env:check            -- Zorunlu alanlari ve ortam kurallarini dogrular.

Ornekler:
  qtr env:setup
  qtr env:show
  qtr env:set DB_NAME benim_db
  qtr env:check
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

/** Parse .env dosyasını {key: value} nesnesine çevirir */
function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const result = {};
  const lines  = fs.readFileSync(filePath, 'utf-8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    result[key] = val;
  }
  return result;
}

/** .env dosyasını {key: value} nesnesinden yeniden üretir */
function writeEnv(filePath, map) {
  const lines = Object.entries(map).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

/** Değeri maskelemesi gerekiyor mu? */
function isSensitive(key) {
  const upper = key.toUpperCase();
  return SENSITIVE_PATTERNS.some(p => upper.includes(p));
}

/** Değeri maskele */
function maskValue(value) {
  if (!value) return '(bos)';
  if (value.length <= 3) return '••••';
  return value.slice(0, 2) + '••••';
}

// ─── Alt Komutlar ────────────────────────────────────────────────────────────

function cmdSetup(projectRoot) {
  const envPath     = path.join(projectRoot, ENV_FILE);
  const examplePath = path.join(projectRoot, ENV_EXAMPLE);

  if (!fs.existsSync(examplePath)) {
    console.log(`[ENV SETUP] HATA: ${ENV_EXAMPLE} dosyasi bulunamadi.`);
    process.exit(1);
  }

  if (fs.existsSync(envPath)) {
    console.log(`[ENV SETUP] .env dosyasi zaten mevcut. Uzerine yazilmadi.`);
    console.log(`  Sifirlamak icin: once ${ENV_FILE} dosyasini silin, sonra tekrar calistirin.`);
    return;
  }

  fs.copyFileSync(examplePath, envPath);
  console.log(`[ENV SETUP] .env olusturuldu (${ENV_EXAMPLE} kopyalandi).`);
  console.log(`  Duzenlemek icin: qtr env:set <KEY> <DEGER>`);
}

function cmdShow(projectRoot) {
  const envPath = path.join(projectRoot, ENV_FILE);
  const map     = parseEnv(envPath);

  if (!map) {
    console.log(`[ENV SHOW] .env dosyasi bulunamadi. Once: qtr env:setup`);
    return;
  }

  console.log('[QTR ENV]');
  const padLen = Math.max(...Object.keys(map).map(k => k.length), 12) + 2;
  for (const [key, val] of Object.entries(map)) {
    const display = isSensitive(key) ? maskValue(val) : (val || '(bos)');
    console.log(`  ${key.padEnd(padLen)} = ${display}`);
  }
}

function cmdSet(projectRoot, key, value) {
  if (!key) {
    console.log('[ENV SET] Kullanim: qtr env:set <KEY> <DEGER>');
    process.exit(1);
  }

  const envPath = path.join(projectRoot, ENV_FILE);
  if (!fs.existsSync(envPath)) {
    console.log(`[ENV SET] .env dosyasi bulunamadi. Once: qtr env:setup`);
    process.exit(1);
  }

  // Kritik alan uyarısı
  if (CRITICAL_KEYS.includes(key.toUpperCase())) {
    console.log(`  [UYARI] "${key}" kritik bir ayardir. Degistirmek sistemi etkileyebilir.`);
  }

  const map = parseEnv(envPath);
  const upperKey = key.toUpperCase();

  map[upperKey] = value ?? '';
  writeEnv(envPath, map);

  const display = isSensitive(upperKey) ? maskValue(String(value)) : (value ?? '(bos)');
  console.log(`[ENV SET] ${upperKey} = ${display}`);
}

function cmdCheck(projectRoot) {
  const envPath = path.join(projectRoot, ENV_FILE);
  const map     = parseEnv(envPath);

  console.log('[QTR ENV CHECK]');

  // .env varlık kontrolü
  if (!map) {
    console.log('  [HATA] .env dosyasi bulunamadi.');
    console.log('         --> qtr env:setup ile olusturun.');
    return;
  }
  console.log('  [OK]   .env dosyasi mevcut');

  let allOk = true;

  // Zorunlu alanlar
  for (const reqKey of REQUIRED_KEYS) {
    const val = map[reqKey];
    if (!val || val.trim() === '') {
      console.log(`  [HATA] ${reqKey} = (bos) — zorunlu alan.`);
      allOk = false;
    } else {
      const display = isSensitive(reqKey) ? maskValue(val) : val;
      console.log(`  [OK]   ${reqKey} = ${display}`);
    }
  }

  // Production kuralları
  const env   = (map['APP_ENV'] || '').toLowerCase();
  const debug = (map['APP_DEBUG'] || '').toLowerCase();

  if (env === 'production') {
    if (debug === 'true') {
      console.log('  [HATA] Production ortaminda APP_DEBUG=true tehlikelidir!');
      console.log('         --> qtr env:set APP_DEBUG false');
      allOk = false;
    } else {
      console.log('  [OK]   Production: APP_DEBUG=false (dogru)');
    }
  }

  // İsteğe bağlı mail uyarısı
  if (!map['MAIL_HOST']) {
    console.log('  [UYARI] MAIL_HOST bos — Mail sistemi yapilandirilmamis.');
  }

  console.log('');
  console.log(allOk ? 'Tum kontroller basarili.' : 'Bazi kontroller basarisiz. Duzeltip tekrar calistirin.');
}

// ─── Ana execute ─────────────────────────────────────────────────────────────

function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  const sub = params._subcommand;

  if (!sub) {
    console.log(HELP_TEXT);
    return;
  }

  const projectRoot = findProjectRoot();
  if (!projectRoot) {
    console.log('[ENV] Bu dizin bir QTR projesi degil (.qtr.json bulunamadi).');
    process.exit(1);
  }

  if (sub === 'setup') {
    cmdSetup(projectRoot);
  } else if (sub === 'show') {
    cmdShow(projectRoot);
  } else if (sub === 'set') {
    const key   = params.args[0] || '';
    const value = params.args[1] !== undefined ? params.args[1] : '';
    cmdSet(projectRoot, key, value);
  } else if (sub === 'check') {
    cmdCheck(projectRoot);
  } else {
    console.log(`[ENV] Bilinmeyen alt komut: "${sub}". qtr env --help`);
    process.exit(1);
  }
}

module.exports = { execute };
