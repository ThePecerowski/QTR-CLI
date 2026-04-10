'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const INFO = 'route:<eylem>: Proje route\'larini listeler, olusturur veya kaldirir.';

const HELP = `
route:list                      Tum page route'larini listeler.
route:create <ad>               Yeni sayfa + route olusturur.
route:remove <ad>               Belirtilen route ve .php dosyasini kaldirir.

  Ornekler:
    qtr route:list
    qtr route:create blog
    qtr route:remove blog
    qtr route:create about --dry-run
`;

const PAGE_SKELETON = (name) => `<?php
/**
 * QTR Framework — Sayfa: /${name}
 * URL: /${name}
 */
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
</head>
<body>
    <h1>${name}</h1>
    <p>Bu sayfa <code>pages/${name}.php</code> dosyasından sunuluyor.</p>
</body>
</html>
`;

const QTR_JSON = '.qtr.json';

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

function validateName(name) {
  return typeof name === 'string' && /^[a-zA-Z0-9_-]+$/.test(name);
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, ans => resolve(ans.trim())));
}

// ─── route:list ──────────────────────────────────────────────────────────────

function cmdList(projectRoot) {
  const pagesDir = path.join(projectRoot, 'pages');

  if (!fs.existsSync(pagesDir)) {
    console.log('[QTR] pages/ klasoru bulunamadi. Proje iskeletini kontrol edin.');
    return;
  }

  const files = fs.readdirSync(pagesDir)
    .filter(f => f.endsWith('.php'))
    .sort();

  if (files.length === 0) {
    console.log('[QTR] Hic route bulunamadi. Olusturmak icin: qtr route:create <ad>');
    return;
  }

  const col1 = 'Route';
  const col2 = 'Dosya';
  const col3 = 'Durum';
  const rows = files.map(f => {
    const name = f.replace(/\.php$/, '');
    const route = name === 'index' ? '/' : `/${name}`;
    return { route, file: `pages/${f}`, status: '✓' };
  });

  const maxRoute = Math.max(col1.length, ...rows.map(r => r.route.length));
  const maxFile  = Math.max(col2.length, ...rows.map(r => r.file.length));

  const line = `${'─'.repeat(maxRoute + 2)}┼${'─'.repeat(maxFile + 2)}┼${'─'.repeat(8)}`;
  const fmt  = (a, b, c) =>
    ` ${a.padEnd(maxRoute)} │ ${b.padEnd(maxFile)} │ ${c}`;

  console.log(`\n[QTR ROUTES] ${projectRoot}\n`);
  console.log(fmt(col1, col2, col3));
  console.log(line);
  for (const r of rows) {
    console.log(fmt(r.route, r.file, r.status));
  }
  console.log(`\n  Toplam: ${rows.length} route\n`);
}

// ─── route:create ────────────────────────────────────────────────────────────

function cmdCreate(projectRoot, name, isDryRun) {
  if (!validateName(name)) {
    console.error(`[QTR] Gecersiz route adi: "${name}"`);
    console.error('      Sadece harf, rakam, tire (-) ve alt cizgi (_) kullanilabilir.');
    process.exitCode = 1;
    return;
  }

  const pagesDir  = path.join(projectRoot, 'pages');
  const filePath  = path.join(pagesDir, `${name}.php`);
  const routeUrl  = name === 'index' ? '/' : `/${name}`;

  if (!isDryRun && !fs.existsSync(pagesDir)) {
    fs.mkdirSync(pagesDir, { recursive: true });
  }

  if (!isDryRun && fs.existsSync(filePath)) {
    console.log(`[QTR] Uyari: pages/${name}.php zaten mevcut!`);
    console.log(`      Route: ${routeUrl}`);
    return;
  }

  if (isDryRun) {
    console.log(`[QTR DRY-RUN] Olusturulacak: pages/${name}.php  →  ${routeUrl}`);
    return;
  }

  fs.writeFileSync(filePath, PAGE_SKELETON(name), 'utf-8');
  console.log(`[QTR] Route olusturuldu!`);
  console.log(`      Dosya : pages/${name}.php`);
  console.log(`      URL   : ${routeUrl}`);
  console.log(`      Durum : qtr serve ile server baslatilip test edilebilir.`);
}

// ─── route:remove ────────────────────────────────────────────────────────────

async function cmdRemove(projectRoot, name) {
  if (!validateName(name)) {
    console.error(`[QTR] Gecersiz route adi: "${name}"`);
    process.exitCode = 1;
    return;
  }

  const filePath = path.join(projectRoot, 'pages', `${name}.php`);

  if (!fs.existsSync(filePath)) {
    console.log(`[QTR] pages/${name}.php bulunamadi. Zaten silinmis olabilir.`);
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const confirm = await ask(rl, `[QTR] pages/${name}.php silinecek. Emin misiniz? (e/H): `);
  rl.close();

  if (confirm.toLowerCase() !== 'e' && confirm.toLowerCase() !== 'evet') {
    console.log('[QTR] Iptal edildi.');
    return;
  }

  fs.unlinkSync(filePath);
  console.log(`[QTR] Route kaldirildi: pages/${name}.php`);
}

// ─── Ana execute ─────────────────────────────────────────────────────────────

function execute(params) {
  if (params.info) { console.log(INFO); return; }
  if (params.help) { console.log(HELP); return; }

  // Subcommand: params._subcommand index.js tarafından enjekte edilir
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

  const isDryRun = params['dry-run'] === true;

  if (sub === 'list') {
    cmdList(projectRoot);
    return;
  }

  if (sub === 'create') {
    const name = params.args[0];
    if (!name) {
      console.error('[QTR] Kullanim: qtr route:create <sayfa-adi>');
      process.exitCode = 1;
      return;
    }
    cmdCreate(projectRoot, name, isDryRun);
    return;
  }

  if (sub === 'remove') {
    const name = params.args[0];
    if (!name) {
      console.error('[QTR] Kullanim: qtr route:remove <sayfa-adi>');
      process.exitCode = 1;
      return;
    }
    cmdRemove(projectRoot, name).catch(err => {
      console.error(`[QTR] Hata: ${err.message}`);
      process.exitCode = 1;
    });
    return;
  }

  console.error(`[QTR] Bilinmeyen route alt komutu: "${sub}"`);
  console.error('      Gecerli: route:list  route:create <ad>  route:remove <ad>');
  process.exitCode = 1;
}

module.exports = { execute };
