'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const QTR_JSON = '.qtr.json';

const INFO_TEXT = 'security: Proje güvenlik katmanlarını yönetir (enable/disable/audit/mode).';

const HELP_TEXT = `
security komutu alt komutlari:

  security:list          -- Tüm güvenlik katmanlarının durumunu gösterir.
  security:enable <tur>  -- Belirtilen güvenlik katmanını etkinleştirir.
  security:disable <tur> -- Belirtilen güvenlik katmanını devre dışı bırakır.
  security:mode <mod>    -- Güvenlik modunu ayarlar (strict|balanced|relaxed).
  security:audit         -- Risk skoru hesaplar, rapor üretir.
  security:fix           -- Eksik/kapalı güvenlikleri otomatik açar.
  security:reset         -- Tüm güvenlik ayarlarını varsayılana sıfırlar.
  security:disable-all   -- TEHLİKELİ — tüm güvenlikleri kapatır (uzun onay).

Güvenlik katmanları (tur):
  input_validation  -- Giriş doğrulama
  sql_injection     -- SQL Injection koruması
  csrf              -- CSRF token koruması
  xss               -- XSS çıkış encode
  auth              -- Kimlik doğrulama
  rate_limit        -- IP / Key bazlı istek sınırlama
  api_security      -- API key doğrulama
  file_upload       -- Dosya yükleme koruması
  debug_protection  -- Üretimde hata detaylarını maskele
  config_protection -- Konfigürasyon koruması

Örnekler:
  qtr security:list
  qtr security:enable csrf
  qtr security:disable rate-limit
  qtr security:mode strict
  qtr security:audit
  qtr security:fix
`;

// Güvenlik katmanları ve varsayılan açıklama / varsayılan durum
// Key'ler create.js'in .qtr.json'a yazdığı key'lerle eşleşmeli
const ALL_LAYERS = [
  { key: 'input_validation',  label: 'Giriş Doğrulama',                default: true  },
  { key: 'sql_injection',     label: 'SQL Injection Koruması',          default: true  },
  { key: 'csrf',              label: 'CSRF Token Koruması',             default: true  },
  { key: 'xss',               label: 'XSS Encode (htmlspecialchars)',   default: true  },
  { key: 'auth',              label: 'Kimlik Doğrulama',                default: true  },
  { key: 'rate_limit',        label: 'IP / Key Rate Limiting',          default: true  },
  { key: 'api_security',      label: 'API Key Doğrulama',              default: true  },
  { key: 'file_upload',       label: 'Dosya Yükleme Koruması',         default: true  },
  { key: 'debug_protection',  label: 'Hata Detay Maskeleme (prod)',     default: true  },
  { key: 'config_protection', label: 'Konfigürasyon Koruması',         default: true  },
];

const SECURITY_MODES = {
  strict:   { rate_limit: true, api_security: true,  debug_protection: true, csrf: true,  label: 'Tüm korumalar aktif, rate limit sıkı.' },
  balanced: { rate_limit: true, api_security: false,  debug_protection: true, csrf: true,  label: 'Çoğu koruma aktif, bazı limitler esnek.' },
  relaxed:  { rate_limit: false, api_security: false, debug_protection: false, csrf: false, label: 'Development modu — debug açık, limitler kapalı.' },
};

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

function getSecurityConfig(cfg) {
  if (!cfg.security) cfg.security = {};
  // Varsayılanları doldur
  for (const layer of ALL_LAYERS) {
    if (cfg.security[layer.key] === undefined) {
      cfg.security[layer.key] = layer.default;
    }
  }
  if (!cfg.security.mode) cfg.security.mode = 'balanced';
  return cfg.security;
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function appendSecurityLog(root, action) {
  const logDir  = path.join(root, 'storage', 'logs');
  const logFile = path.join(logDir, 'security.log');
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const line = `[${new Date().toISOString()}] ${action}\n`;
    fs.appendFileSync(logFile, line, 'utf-8');
  } catch { /* log yazılamazsa sessizce geç */ }
}

// ─── Alt Komutlar ────────────────────────────────────────────────────────────

function cmdList(root) {
  const cfg      = readQtrJson(root);
  const security = getSecurityConfig(cfg);

  console.log('\n[SECURITY LIST] Güvenlik Katmanları Durumu');
  console.log(`Mod: ${security.mode || 'balanced'}\n`);

  const COL1 = 32, COL2 = 14;
  const header = 'Katman'.padEnd(COL1) + 'Durum'.padEnd(COL2) + 'Açıklama';
  console.log(header);
  console.log('-'.repeat(header.length + 10));

  for (const layer of ALL_LAYERS) {
    const enabled = security[layer.key] !== false;
    const status  = enabled ? '[AKTIF] ' : '[KAPALI]';
    console.log(`  ${layer.label.padEnd(COL1)}${status.padEnd(COL2)}${layer.key}`);
  }
  console.log('');
}

function cmdEnable(root, layerKey) {
  const layer = ALL_LAYERS.find(l => l.key === layerKey);
  if (!layer) {
    console.log(`[SECURITY] Bilinmeyen katman: "${layerKey}". qtr security --help`);
    process.exit(1);
  }
  const cfg = readQtrJson(root);
  getSecurityConfig(cfg);
  cfg.security[layerKey] = true;
  writeQtrJson(root, cfg);
  appendSecurityLog(root, `ENABLE ${layerKey}`);
  console.log(`[SECURITY] "${layer.label}" aktifleştirildi.`);
}

function cmdDisable(root, layerKey) {
  const layer = ALL_LAYERS.find(l => l.key === layerKey);
  if (!layer) {
    console.log(`[SECURITY] Bilinmeyen katman: "${layerKey}". qtr security --help`);
    process.exit(1);
  }
  const cfg = readQtrJson(root);
  getSecurityConfig(cfg);
  cfg.security[layerKey] = false;
  writeQtrJson(root, cfg);
  appendSecurityLog(root, `DISABLE ${layerKey}`);
  console.log(`[SECURITY] "${layer.label}" devre dışı bırakıldı.`);
}

function cmdMode(root, modeName) {
  if (!SECURITY_MODES[modeName]) {
    console.log(`[SECURITY] Geçersiz mod: "${modeName}". (strict|balanced|relaxed)`);
    process.exit(1);
  }
  const cfg      = readQtrJson(root);
  const security = getSecurityConfig(cfg);
  const modeConf = SECURITY_MODES[modeName];

  // Mod ayarlarını uygula
  for (const [key, val] of Object.entries(modeConf)) {
    if (key !== 'label') security[key] = val;
  }
  security.mode = modeName;
  writeQtrJson(root, cfg);
  appendSecurityLog(root, `MODE_SET ${modeName}`);
  console.log(`[SECURITY] Mod ayarlandı: ${modeName} — ${modeConf.label}`);
}

function cmdAudit(root) {
  const cfg      = readQtrJson(root);
  const security = getSecurityConfig(cfg);
  const envFile  = path.join(root, '.env');
  const htaccess = path.join(root, 'public', '.htaccess');

  console.log('\n[SECURITY AUDIT] Risk Raporu');
  console.log('─'.repeat(50));

  let score    = 0; // 0=iyi, yüksek=riskli
  const issues = [];

  for (const layer of ALL_LAYERS) {
    const enabled = security[layer.key] !== false;
    if (!enabled) {
      score += layer.key === 'debug-mask' ? 30 : 10;
      issues.push(`  [UYARI] ${layer.label} kapalı.`);
    } else {
      console.log(`  [OK]    ${layer.label}`);
    }
  }

  // .env kontrolü
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf-8');
    if (/APP_DEBUG\s*=\s*true/i.test(envContent)) {
      score += 20;
      issues.push('  [UYARI] APP_DEBUG=true — üretim ortamında tehlikeli!');
    }
    if (/APP_ENV\s*=\s*production/i.test(envContent) && security.mode === 'relaxed') {
      score += 15;
      issues.push('  [UYARI] Production ortamında relaxed mod kullanılıyor.');
    }
  }

  // .htaccess kontrolü
  if (!fs.existsSync(htaccess)) {
    score += 10;
    issues.push('  [BİLGİ] public/.htaccess bulunamadı (URL rewrite kuralları eksik olabilir).');
  }

  // Sonuç
  console.log('');
  if (issues.length > 0) {
    console.log('Tespit Edilen Sorunlar:');
    issues.forEach(i => console.log(i));
  }

  const riskLevel = score === 0 ? 'Çok Düşük' : score <= 20 ? 'Düşük' : score <= 50 ? 'Orta' : 'Yüksek';
  console.log(`\nRisk Skoru: ${score} / 100 — ${riskLevel}`);

  if (score === 0) {
    console.log('Tebrikler! Tüm güvenlik katmanları aktif.\n');
  } else {
    console.log('qtr security:fix ile eksiklikleri otomatik giderin.\n');
  }
}

function cmdFix(root) {
  const cfg      = readQtrJson(root);
  const security = getSecurityConfig(cfg);
  let fixed      = 0;

  console.log('\n[SECURITY FIX] Eksik güvenlikler düzeltiliyor...');

  for (const layer of ALL_LAYERS) {
    if (security[layer.key] === false) {
      security[layer.key] = true;
      console.log(`  [FIX] "${layer.label}" aktifleştirildi.`);
      fixed++;
    }
  }

  // .htaccess ekle
  const htaccDest = path.join(root, 'public', '.htaccess');
  if (!fs.existsSync(htaccDest)) {
    const htaccContent = `# QTR Framework — Güvenli .htaccess\nOptions -Indexes\n\n<FilesMatch "\\.(env|json|log|md|sql)$">\n  Order allow,deny\n  Deny from all\n</FilesMatch>\n\nRewriteEngine On\nRewriteCond %{REQUEST_FILENAME} !-f\nRewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule ^ index.php [QSA,L]\n`;
    fs.mkdirSync(path.dirname(htaccDest), { recursive: true });
    fs.writeFileSync(htaccDest, htaccContent, 'utf-8');
    console.log('  [FIX] public/.htaccess oluşturuldu.');
    fixed++;
  }

  writeQtrJson(root, cfg);
  appendSecurityLog(root, `SECURITY_FIX fixed=${fixed}`);

  console.log(fixed > 0 ? `\n${fixed} düzeltme yapıldı.` : '\nZaten her şey hazır, düzeltme gerekmedi.');
}

function cmdReset(root) {
  const cfg = readQtrJson(root);
  cfg.security = {};
  for (const layer of ALL_LAYERS) cfg.security[layer.key] = layer.default;
  cfg.security.mode = 'balanced';
  writeQtrJson(root, cfg);
  appendSecurityLog(root, 'SECURITY_RESET');
  console.log('[SECURITY] Tüm güvenlik ayarları varsayılana sıfırlandı.');
}

async function cmdDisableAll(root) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log('\n[UYARI] Bu işlem TÜM güvenlik katmanlarını kapatır!');
    console.log('Sadece geliştirme/debug amacıyla kullanın.\n');

    const a1 = await ask(rl, 'Devam etmek istiyor musunuz? (evet yazın): ');
    if (a1.trim() !== 'evet') { console.log('İptal edildi.'); return; }

    const a2 = await ask(rl, 'Emin misiniz? Projeniz riske girecek! (ONAYLIYORUM yazın): ');
    if (a2.trim() !== 'ONAYLIYORUM') { console.log('İptal edildi.'); return; }

    const cfg = readQtrJson(root);
    getSecurityConfig(cfg);
    for (const layer of ALL_LAYERS) cfg.security[layer.key] = false;
    cfg.security.mode = 'relaxed';
    writeQtrJson(root, cfg);
    appendSecurityLog(root, 'DISABLE_ALL');
    console.log('[SECURITY] Tüm katmanlar kapatıldı. TEKRAR AÇMAYI UNUTMAYIN!');
  } finally {
    rl.close();
  }
}

// ─── Ana execute ─────────────────────────────────────────────────────────────

async function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  const sub = params._subcommand;
  if (!sub) { console.log(HELP_TEXT); return; }

  const root = findProjectRoot();
  if (!root) {
    console.log('[SECURITY] Bu dizin bir QTR projesi değil (.qtr.json bulunamadı).');
    process.exit(1);
  }

  const arg = () => (params.args || []).find(a => !a.startsWith('--')) || '';

  if      (sub === 'list')        cmdList(root);
  else if (sub === 'enable')      cmdEnable(root, arg());
  else if (sub === 'disable')     cmdDisable(root, arg());
  else if (sub === 'mode')        cmdMode(root, arg());
  else if (sub === 'audit')       cmdAudit(root);
  else if (sub === 'fix')         cmdFix(root);
  else if (sub === 'reset')       cmdReset(root);
  else if (sub === 'disable-all') await cmdDisableAll(root);
  else {
    console.log(`[SECURITY] Bilinmeyen alt komut: "${sub}". qtr security --help`);
    process.exit(1);
  }
}

module.exports = { execute };
