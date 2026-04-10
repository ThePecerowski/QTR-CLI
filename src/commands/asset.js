'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const INFO = 'asset:<eylem>: CSS/JS dosyalarını birleştirir ve minify eder.';

const HELP = `
asset:build           public/css/*.css → public/css/app.min.css
                      public/js/*.js   → public/js/app.min.js

asset:watch           Dosya değişikliklerini izler, değişince otomatik build çalıştırır.

Örnekler:
  qtr asset:build
  qtr asset:watch
`;

// ─── Yardımcı ────────────────────────────────────────────────────────────────

function findProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, '.qtr.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function formatSize(bytes) {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── CSS Minify ───────────────────────────────────────────────────────────────

function minifyCss(content) {
  return content
    // Çok satırlı yorumlar
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Tek satır yorumlar (/* */ dışı — CSS'de // yorum değil ama temizlik amaçlı)
    // Çoklu boşluk → tek boşluk
    .replace(/\s{2,}/g, ' ')
    // Newline ve tab → boşluk
    .replace(/[\r\n\t]/g, ' ')
    // Seçici/kural etrafındaki gereksiz boşluklar
    .replace(/\s*([{}:;,>~+])\s*/g, '$1')
    // Noktalı virgülden önce kapanan küme parantezi
    .replace(/;}/g, '}')
    .trim();
}

// ─── JS Minify ────────────────────────────────────────────────────────────────

function minifyJs(content) {
  // String literal'leri geçici olarak korumak için yer tutucu sistemi
  const strings = [];
  let result = content;

  // Tek ve çift tırnaklu string'leri koru
  result = result.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, (match) => {
    const idx = strings.length;
    strings.push(match);
    return `__STR_${idx}__`;
  });

  // Çok satırlı yorumlar (/** */ ve /* */)
  result = result.replace(/\/\*[\s\S]*?\*\//g, ' ');

  // Tek satır yorumlar (//) — string içindeki URL'lere dikkat
  result = result.replace(/\/\/[^\r\n]*/g, '');

  // Çoklu boşluk ve newline → tek boşluk
  result = result.replace(/[\r\n\t]+/g, '\n');
  result = result.replace(/[ \t]{2,}/g, ' ');

  // Operatör etrafındaki boşluklar (basit)
  result = result.replace(/\s*([=+\-*/%&|^!<>?:,;{}()\[\]])\s*/g, '$1');

  // String'leri geri yükle
  result = result.replace(/__STR_(\d+)__/g, (_, idx) => strings[parseInt(idx, 10)]);

  return result.trim();
}

// ─── asset:build ─────────────────────────────────────────────────────────────

function cmdBuild(root) {
  const publicDir = path.join(root, 'public');
  const cssDir    = path.join(publicDir, 'css');
  const jsDir     = path.join(publicDir, 'js');

  console.log('\n📦 Asset Build\n' + '─'.repeat(40));

  let totalCssBefore = 0, totalCssAfter = 0;
  let totalJsBefore  = 0, totalJsAfter  = 0;

  // ─── CSS ─────────────────────────────────────────────────────────────────
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir)
      .filter(f => f.endsWith('.css') && !f.endsWith('.min.css'))
      .sort();

    if (cssFiles.length > 0) {
      const parts = [];
      for (const file of cssFiles) {
        const content = fs.readFileSync(path.join(cssDir, file), 'utf-8');
        totalCssBefore += Buffer.byteLength(content, 'utf-8');
        parts.push(`/* === ${file} === */\n${content}`);
      }

      const combined  = parts.join('\n\n');
      const minified  = minifyCss(combined);
      totalCssAfter   = Buffer.byteLength(minified, 'utf-8');
      const outPath   = path.join(cssDir, 'app.min.css');
      fs.writeFileSync(outPath, minified, 'utf-8');

      console.log(`CSS: ${cssFiles.length} dosya birleştirildi → app.min.css`);
      console.log(`     ${formatSize(totalCssBefore)} → ${formatSize(totalCssAfter)} (${Math.round((1 - totalCssAfter / totalCssBefore) * 100)}% küçültme)`);
    } else {
      console.log('CSS: Kaynak dosya bulunamadı (public/css/*.css)');
    }
  } else {
    console.log('CSS: public/css/ dizini yok, atlandı.');
  }

  // ─── JS ──────────────────────────────────────────────────────────────────
  if (fs.existsSync(jsDir)) {
    const jsFiles = fs.readdirSync(jsDir)
      .filter(f => f.endsWith('.js') && !f.endsWith('.min.js'))
      .sort();

    if (jsFiles.length > 0) {
      const parts = [];
      for (const file of jsFiles) {
        const content = fs.readFileSync(path.join(jsDir, file), 'utf-8');
        totalJsBefore += Buffer.byteLength(content, 'utf-8');
        parts.push(`/* === ${file} === */\n${content}`);
      }

      const combined = parts.join('\n\n');
      const minified = minifyJs(combined);
      totalJsAfter   = Buffer.byteLength(minified, 'utf-8');
      const outPath  = path.join(jsDir, 'app.min.js');
      fs.writeFileSync(outPath, minified, 'utf-8');

      console.log(`JS:  ${jsFiles.length} dosya birleştirildi → app.min.js`);
      console.log(`     ${formatSize(totalJsBefore)} → ${formatSize(totalJsAfter)} (${Math.round((1 - totalJsAfter / Math.max(totalJsBefore, 1)) * 100)}% küçültme)`);
    } else {
      console.log('JS:  Kaynak dosya bulunamadı (public/js/*.js)');
    }
  } else {
    console.log('JS:  public/js/ dizini yok, atlandı.');
  }

  console.log('\n✓ Build tamamlandı\n');
}

// ─── asset:watch ─────────────────────────────────────────────────────────────

function cmdWatch(root) {
  const publicDir = path.join(root, 'public');
  const cssDir    = path.join(publicDir, 'css');
  const jsDir     = path.join(publicDir, 'js');

  console.log('\n👁  Asset Watch — Dosya değişiklikleri izleniyor... (Ctrl+C ile çıkış)\n');

  // İlk build
  cmdBuild(root);

  let debounce = null;
  const rebuild = (filename) => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      console.log(`\n  Değişiklik: ${filename} — Rebuild...\n`);
      cmdBuild(root);
    }, 300);
  };

  const watchDir = (dir, ext) => {
    if (!fs.existsSync(dir)) return;
    fs.watch(dir, (eventType, filename) => {
      if (filename && filename.endsWith(ext) && !filename.endsWith('.min' + ext)) {
        rebuild(filename);
      }
    });
  };

  watchDir(cssDir, '.css');
  watchDir(jsDir,  '.js');

  process.on('SIGINT', () => {
    console.log('\n[QTR] İzleme durduruldu.\n');
    process.exit(0);
  });
}

// ─── Ana execute ─────────────────────────────────────────────────────────────

function execute(params) {
  if (params.info) { console.log(INFO); return; }
  if (params.help) { console.log(HELP); return; }

  const sub = params._subcommand || '';

  const root = findProjectRoot();
  if (!root) {
    console.error('[QTR] Hata: Bu klasörde bir QTR projesi bulunamadı (.qtr.json yok).');
    process.exitCode = 1; return;
  }

  if (sub === 'build') { cmdBuild(root); return; }
  if (sub === 'watch') { cmdWatch(root); return; }

  console.error(`[QTR] Bilinmeyen asset alt komutu: "${sub}"`);
  console.error('      Geçerli: asset:build  asset:watch');
  process.exitCode = 1;
}

module.exports = { execute };
