'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const QTR_JSON   = '.qtr.json';
const MB_DIR     = 'memory-bank';

const INFO_TEXT = 'mb: Memory-bank dosyalarını yönetir (init, update, list).';

const HELP_TEXT = `
mb komutu alt komutlari:

  mb:init              -- memory-bank klasörü eksikse template'ten yeniden oluşturur.
  mb:update <dosya>    -- Belirtilen memory-bank dosyasına tarihli not ekler.
  mb:list              -- memory-bank klasöründeki tüm dosyaları listeler.
  mb:show <dosya>      -- Belirtilen dosyanın içeriğini gösterir.

Parametreler:
  --note="<metin>"     -- Eklenecek notu belirtir.
  --section="<başlık>" -- Hangi bölüme ekleneceğini belirtir (varsayılan: son satır).

Örnekler:
  qtr mb:init
  qtr mb:update CurrentProject.md --note="API sistemi kuruldu"
  qtr mb:update FixedIssue.md --note="CsrfToken 403 hatası çözüldü"
  qtr mb:list
  qtr mb:show CurrentProject.md
`;

// Komut → etkilenen mb dosyaları haritası (otomatik güncelleme için)
const CMD_MB_MAP = {
  'api:create':    ['CurrentProject.md', 'api_endpoints.md'],
  'api:crud':      ['CurrentProject.md', 'api_endpoints.md'],
  'admin:install': ['CurrentProject.md'],
  'security:fix':  ['CurrentProject.md', 'FixedIssue.md'],
  backup:          ['CurrentProject.md'],
  'github:push':   ['CurrentProject.md'],
  'db:run':        ['CurrentProject.md'],
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Bir mb dosyasına tarihli not ekler
function appendNote(mbDir, filename, note, section) {
  const filePath = path.join(mbDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  [UYARI] ${filename} bulunamadı.`);
    return false;
  }
  const header = section
    ? `\n## [${today()}] ${section}\n`
    : `\n## [${today()}]\n`;
  const content = `${header}- ${note}\n`;
  fs.appendFileSync(filePath, content, 'utf-8');
  return true;
}

// Templates dizinini bul
function findTemplatesDir() {
  // CLI'ın kendi templates klasörü
  return path.join(__dirname, '..', '..', 'templates');
}

// ─── Alt Komutlar ─────────────────────────────────────────────────────────────

function cmdInit(root) {
  const cfg      = readQtrJson(root);
  const template = cfg.template || 'professional';
  const tplDir   = path.join(findTemplatesDir(), 'memory-bank', template);
  const mbDir    = path.join(root, MB_DIR);

  console.log(`\n[MB INIT] Template: ${template}`);

  if (!fs.existsSync(tplDir)) {
    console.log(`  [HATA] Template klasörü bulunamadı: ${tplDir}`);
    process.exit(1);
  }

  fs.mkdirSync(mbDir, { recursive: true });

  let added = 0;
  for (const file of fs.readdirSync(tplDir)) {
    const dest = path.join(mbDir, file);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(tplDir, file), dest);
      console.log(`  [EKLE]  ${file}`);
      added++;
    } else {
      console.log(`  [VAR]   ${file} (atlandı)`);
    }
  }

  console.log(added > 0 ? `\n${added} dosya eklendi.` : '\nTüm dosyalar zaten mevcut.');
}

function cmdUpdate(root, filename, params) {
  const mbDir = path.join(root, MB_DIR);
  const note    = params.note    || null;
  const section = params.section || null;

  if (!filename) {
    console.log('[MB] Dosya adı gerekli. qtr mb:update <dosya> --note="..."');
    process.exit(1);
  }

  if (!note) {
    console.log('[MB] --note parametresi gerekli. qtr mb:update CurrentProject.md --note="..."');
    process.exit(1);
  }

  const ok = appendNote(mbDir, filename, note, section);
  if (ok) {
    console.log(`[MB] ${filename} güncellendi.`);
  }
}

function cmdList(root) {
  const mbDir = path.join(root, MB_DIR);
  if (!fs.existsSync(mbDir)) {
    console.log('[MB] memory-bank klasörü bulunamadı. qtr mb:init ile oluşturun.');
    return;
  }

  console.log('\n[MB LIST] memory-bank/ dosyaları:');
  const files = fs.readdirSync(mbDir).filter(f => f.endsWith('.md'));
  if (files.length === 0) { console.log('  (boş)'); return; }
  files.forEach((f, i) => {
    const size = (fs.statSync(path.join(mbDir, f)).size / 1024).toFixed(1);
    console.log(`  ${i + 1}. ${f.padEnd(30)} ${size} KB`);
  });
  console.log('');
}

function cmdShow(root, filename) {
  if (!filename) { console.log('[MB] Dosya adı gerekli.'); process.exit(1); }
  const filePath = path.join(root, MB_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`[MB] Bulunamadı: ${filename}`);
    process.exit(1);
  }
  console.log(`\n── ${filename} ──\n`);
  console.log(fs.readFileSync(filePath, 'utf-8'));
}

// ─── Hook: Diğer komutlardan çağrılır ────────────────────────────────────────

/**
 * Çalışan bir CLI komutundan sonra ilgili mb dosyalarına
 * otomatik not eklemek için kullanılır.
 *
 * @param {string} root        - Proje kök dizini
 * @param {string} commandName - qtr komut adı (örn: "api:crud")
 * @param {string} note        - Eklenecek not
 */
function autoUpdate(root, commandName, note) {
  const files = CMD_MB_MAP[commandName] || ['CurrentProject.md'];
  const mbDir = path.join(root, MB_DIR);
  for (const file of files) {
    if (fs.existsSync(path.join(mbDir, file))) {
      appendNote(mbDir, file, note, commandName);
    }
  }
}

// ─── Ana execute ──────────────────────────────────────────────────────────────

async function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  const sub = params._subcommand;
  if (!sub) { console.log(HELP_TEXT); return; }

  const root = findProjectRoot();
  if (!root) {
    console.log('[MB] Bu dizin bir QTR projesi değil (.qtr.json bulunamadı).');
    process.exit(1);
  }

  const arg = () => (params.args || []).find(a => !a.startsWith('--')) || '';

  if      (sub === 'init')   cmdInit(root);
  else if (sub === 'update') cmdUpdate(root, arg(), params);
  else if (sub === 'list')   cmdList(root);
  else if (sub === 'show')   cmdShow(root, arg());
  else {
    console.log(`[MB] Bilinmeyen alt komut: "${sub}". qtr mb --help`);
    process.exit(1);
  }
}

module.exports = { execute, autoUpdate };
