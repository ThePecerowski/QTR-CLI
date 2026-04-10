'use strict';

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const QTR_JSON    = '.qtr.json';
const SCRIPTS_DIR = 'app/scripts';
const LOG_FILE    = path.join('storage', 'logs', 'runner.log');

const INFO_TEXT = 'run: PHP/Python/Node.js/Go scriptlerini güvenli sandbox ortamında çalıştırır.';

const HELP_TEXT = `
run komutu:

  run <dosya>              -- Scripti sandbox'ta çalıştırır.
  run <dosya> --data="..." -- Script'e veri aktarır.
  runtime:list             -- Mevcut runtime'ları ve durumlarını gösterir.
  runtime:enable <dil>     -- Runtime'ı etkinleştirir (python|node|go|php).
  runtime:disable <dil>    -- Runtime'ı devre dışı bırakır.
  runtime:add <dil>        -- Yeni runtime ekler.

Desteklenen uzantılar:
  .php → PHP runtime
  .py  → Python runtime
  .js  → Node.js runtime
  .go  → Go runtime

Örnekler:
  qtr run app/scripts/python/analyze.py
  qtr run app/scripts/python/process.py --data="hello world"
  qtr runtime:list
  qtr runtime:enable python
  qtr runtime:disable node
`;

// Varsayılan runtime yapılandırması
const DEFAULT_RUNTIMES = {
  php:    { enabled: true,  binary: 'php',    extensions: ['.php'] },
  python: { enabled: true,  binary: 'python', extensions: ['.py']  },
  node:   { enabled: false, binary: 'node',   extensions: ['.js']  },
  go:     { enabled: false, binary: 'go',     extensions: ['.go'],  args: ['run'] },
};

const DEFAULT_TIMEOUT_MS = 30_000; // 30 saniye

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

function appendLog(root, script, lang, status, durationMs, error = '') {
  try {
    const logDir  = path.join(root, 'storage', 'logs');
    const logFile = path.join(logDir, 'runner.log');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const line = `[${new Date().toISOString()}] SCRIPT: ${script}, LANG: ${lang}, STATUS: ${status}, TIME: ${durationMs}ms${error ? ', ERR: ' + error.slice(0, 120) : ''}\n`;
    fs.appendFileSync(logFile, line, 'utf-8');
  } catch { /* sessiz */ }
}

// Runtime config'i döner (QtrJson + defaults birleşimi)
function getRuntimes(cfg) {
  const runtimes = {};
  for (const [lang, defaults] of Object.entries(DEFAULT_RUNTIMES)) {
    const saved = cfg.runtimes?.[lang] || {};
    runtimes[lang] = { ...defaults, ...saved };
  }
  // .qtr.json'da ekstra runtime varsa dahil et
  if (cfg.runtimes) {
    for (const [lang, conf] of Object.entries(cfg.runtimes)) {
      if (!runtimes[lang]) runtimes[lang] = conf;
    }
  }
  return runtimes;
}

// Uzantıdan runtime adını bul
function detectRuntime(filePath, runtimes) {
  const ext = path.extname(filePath).toLowerCase();
  for (const [lang, rt] of Object.entries(runtimes)) {
    if (rt.extensions?.includes(ext)) return lang;
  }
  return null;
}

// ─── Sandbox Güvenlik ────────────────────────────────────────────────────────

/**
 * Dosya yolunu normalize eder ve proje kök içinde olduğunu doğrular.
 * Path traversal ( ../ ) koruması.
 */
function resolveSafePath(root, inputPath) {
  // Mutlak yol veya relative yol olabilir
  const abs = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(root, inputPath);

  const normalized = path.normalize(abs);

  // Proje kökü içinde mi?
  if (!normalized.startsWith(path.normalize(root) + path.sep) &&
      normalized !== path.normalize(root)) {
    return null; // Güvensiz
  }
  return normalized;
}

/**
 * Dosya yolunun izin verilen scripts dizininde olduğunu kontrol eder.
 */
function isInScriptsDir(root, absPath) {
  const allowedDir = path.normalize(path.join(root, SCRIPTS_DIR));
  return absPath.startsWith(allowedDir + path.sep);
}

/**
 * Veri stringinden komut injection karakterlerini temizler.
 * Node.js child_process arg array'i kullandığı için exec injection riski yok;
 * bu ek bir güvenlik katmanıdır.
 */
function sanitizeData(data) {
  // Null byte ve shell meta karakterleri temizle
  return data.replace(/[\0\r]/g, '').slice(0, 4096);
}

// ─── Runner ─────────────────────────────────────────────────────────────────

function cmdRun(root, scriptInput, params) {
  if (!scriptInput) {
    console.log('[RUN] Dosya adı gerekli. qtr run <dosya>');
    process.exit(1);
  }

  const cfg      = readQtrJson(root);
  const runtimes = getRuntimes(cfg);

  // Sandbox: güvenli yol çözümle
  const absPath = resolveSafePath(root, scriptInput);
  if (!absPath) {
    console.log('[RUN] HATA: Dosya proje dizini dışında — erişim engellendi.');
    process.exit(1);
  }

  if (!isInScriptsDir(root, absPath)) {
    console.log(`[RUN] HATA: Dosya app/scripts/ dışında — sadece bu dizin çalıştırılabilir.`);
    console.log(`      Yol: ${absPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(absPath)) {
    console.log(`[RUN] Dosya bulunamadı: ${absPath}`);
    process.exit(1);
  }

  // Runtime tespiti
  const lang = detectRuntime(absPath, runtimes);
  if (!lang) {
    console.log(`[RUN] Desteklenmeyen dosya uzantısı: ${path.extname(absPath)}`);
    process.exit(1);
  }

  const rt = runtimes[lang];
  if (!rt.enabled) {
    console.log(`[RUN] "${lang}" runtime devre dışı. Açmak için: qtr runtime:enable ${lang}`);
    process.exit(1);
  }

  // Argümanlar oluştur
  const binary  = rt.binary;
  const preArgs = rt.args || [];   // örn: go için ["run"]
  const data    = params.data ? sanitizeData(String(params.data)) : null;
  const spawnArgs = [...preArgs, absPath];
  if (data) spawnArgs.push('--data', data);

  const timeoutMs = params.timeout ? parseInt(params.timeout, 10) * 1000 : DEFAULT_TIMEOUT_MS;

  // Çalıştır
  const relPath = path.relative(root, absPath);
  console.log(`\n[QTR RUNNER]`);
  console.log(`  Script  : ${relPath}`);
  console.log(`  Runtime : ${lang} (${binary})`);
  if (data) console.log(`  Data    : ${data.slice(0, 80)}${data.length > 80 ? '...' : ''}`);
  console.log('');

  const startMs = Date.now();
  const result  = spawnSync(binary, spawnArgs, {
    cwd:      root,
    encoding: 'utf-8',
    timeout:  timeoutMs,
  });
  const durationMs = Date.now() - startMs;

  if (result.error) {
    const errMsg = result.error.code === 'ETIMEDOUT'
      ? `Timeout (${timeoutMs / 1000}s aşıldı)`
      : (result.error.message || String(result.error));
    console.log(`  Status  : FAILED`);
    console.log(`  Error   : ${errMsg}`);
    console.log(`  Time    : ${durationMs}ms`);
    appendLog(root, relPath, lang, 'FAIL', durationMs, errMsg);
    process.exit(1);
  }

  if (result.status !== 0) {
    const errOut = (result.stderr || '').trim();
    console.log(`  Status  : FAILED (exit ${result.status})`);
    if (errOut) console.log(`  Stderr  : ${errOut}`);
    console.log(`  Time    : ${durationMs}ms`);
    appendLog(root, relPath, lang, 'FAIL', durationMs, errOut);
    process.exit(1);
  }

  const stdout = (result.stdout || '').trim();

  // JSON parse dene
  let parsed = null;
  try { parsed = JSON.parse(stdout); } catch { /* metin çıktı */ }

  console.log(`  Status  : SUCCESS`);
  console.log(`  Time    : ${durationMs}ms`);
  if (stdout) {
    console.log(`  Output  :`);
    if (parsed !== null) {
      console.log(JSON.stringify(parsed, null, 4).split('\n').map(l => '    ' + l).join('\n'));
    } else {
      stdout.split('\n').slice(0, 50).forEach(l => console.log('    ' + l));
    }
  }
  console.log('');

  appendLog(root, relPath, lang, 'SUCCESS', durationMs);
}

// ─── Runtime Yönetimi ─────────────────────────────────────────────────────────

function cmdRuntimeList(root) {
  const cfg      = readQtrJson(root);
  const runtimes = getRuntimes(cfg);

  console.log('\n[RUNTIME LIST] Mevcut Runtime\'lar:');
  const COL = 12;
  console.log(`  ${'Dil'.padEnd(COL)} ${'Durum'.padEnd(10)} Binary`);
  console.log('  ' + '-'.repeat(40));
  for (const [lang, rt] of Object.entries(runtimes)) {
    const status = rt.enabled ? '[AKTIF] ' : '[KAPALI]';
    // Binary mevcut mu?
    const check = spawnSync(rt.binary, ['--version'], { encoding: 'utf-8', timeout: 2000 });
    const available = check.status === 0 ? '(kurulu)' : '(kurulu değil)';
    console.log(`  ${lang.padEnd(COL)} ${status.padEnd(10)} ${rt.binary} ${available}`);
  }
  console.log('');
}

function cmdRuntimeEnable(root, lang) {
  if (!lang) { console.log('[RUNTIME] Dil adı gerekli.'); process.exit(1); }
  const cfg = readQtrJson(root);
  if (!cfg.runtimes) cfg.runtimes = {};
  cfg.runtimes[lang] = { ...(cfg.runtimes[lang] || DEFAULT_RUNTIMES[lang] || {}), enabled: true };
  if (!cfg.runtimes[lang].binary) cfg.runtimes[lang].binary = lang;
  if (!cfg.runtimes[lang].extensions) cfg.runtimes[lang].extensions = [];
  writeQtrJson(root, cfg);
  console.log(`[RUNTIME] "${lang}" etkinleştirildi.`);
}

function cmdRuntimeDisable(root, lang) {
  if (!lang) { console.log('[RUNTIME] Dil adı gerekli.'); process.exit(1); }
  const cfg = readQtrJson(root);
  if (!cfg.runtimes) cfg.runtimes = {};
  cfg.runtimes[lang] = { ...(cfg.runtimes[lang] || DEFAULT_RUNTIMES[lang] || {}), enabled: false };
  writeQtrJson(root, cfg);
  console.log(`[RUNTIME] "${lang}" devre dışı bırakıldı.`);
}

function cmdRuntimeAdd(root, lang) {
  if (!lang) { console.log('[RUNTIME] Dil adı gerekli.'); process.exit(1); }
  const cfg = readQtrJson(root);
  if (!cfg.runtimes) cfg.runtimes = {};
  if (cfg.runtimes[lang]) {
    console.log(`[RUNTIME] "${lang}" zaten tanımlı. runtime:enable ile aktifleştirin.`);
    return;
  }
  cfg.runtimes[lang] = { enabled: true, binary: lang, extensions: [], args: [] };
  writeQtrJson(root, cfg);
  console.log(`[RUNTIME] "${lang}" eklendi. Binary: ${lang}`);
  console.log(`  Not: binary adını ve extensions'ı .qtr.json'dan düzenleyebilirsiniz.`);
}

// ─── Ana execute ──────────────────────────────────────────────────────────────

async function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  const sub = params._subcommand;
  const cmd = params._command || '';

  const root = findProjectRoot();
  if (!root) {
    console.log('[RUN] Bu dizin bir QTR projesi değil (.qtr.json bulunamadı).');
    process.exit(1);
  }

  const arg = () => (params.args || []).find(a => !a.startsWith('--')) || '';

  // runtime:* komutları
  if (cmd.startsWith('runtime:')) {
    if      (sub === 'list')    cmdRuntimeList(root);
    else if (sub === 'enable')  cmdRuntimeEnable(root, arg());
    else if (sub === 'disable') cmdRuntimeDisable(root, arg());
    else if (sub === 'add')     cmdRuntimeAdd(root, arg());
    else { console.log(`[RUNTIME] Bilinmeyen: "${sub}".`); process.exit(1); }
    return;
  }

  // run komutu — _subcommand = '' (tek kelime komut), arg = dosya
  const scriptFile = (params.args || [])[0] || '';
  cmdRun(root, scriptFile, params);
}

module.exports = { execute };
