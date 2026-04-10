'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const INFO = 'log:<eylem>: storage/logs/ klasöründeki log dosyalarını görüntüler.';

const HELP = `
log:show                  Son 50 satırı gösterir.
log:show --lines=N        Son N satırı gösterir.
log:show --level=error    Sadece belirli seviyedeki satırları filtreler (error/warning/info/debug).
log:show --file=app.log   Belirli bir log dosyasını açar.
log:tail                  Log dosyasını canlı izler (Ctrl+C ile çıkış).
log:tail --file=app.log   Belirli dosyayı canlı izler.
`;

const ANSI = {
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  grey:   '\x1b[90m',
  dim:    '\x1b[2m',
  reset:  '\x1b[0m',
};

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

/** storage/logs/ içindeki en yeni .log dosyasını döndürür */
function findLatestLog(root) {
  const logsDir = path.join(root, 'storage', 'logs');
  if (!fs.existsSync(logsDir)) return null;
  const logs = fs.readdirSync(logsDir)
    .filter(f => f.endsWith('.log'))
    .map(f => ({ name: f, mtime: fs.statSync(path.join(logsDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return logs.length > 0 ? path.join(logsDir, logs[0].name) : null;
}

/** Satırı log seviyesine göre renklendirir */
function colorLine(line) {
  const upper = line.toUpperCase();
  if (upper.includes('[ERROR]') || upper.includes('[CRITICAL]'))
    return `${ANSI.red}${line}${ANSI.reset}`;
  if (upper.includes('[WARNING]') || upper.includes('[WARN]'))
    return `${ANSI.yellow}${line}${ANSI.reset}`;
  if (upper.includes('[INFO]'))
    return `${ANSI.blue}${line}${ANSI.reset}`;
  if (upper.includes('[DEBUG]'))
    return `${ANSI.grey}${line}${ANSI.reset}`;
  return `${ANSI.dim}${line}${ANSI.reset}`;
}

/** Satırın seviye filtresini geçip geçmediği */
function matchesLevel(line, level) {
  if (!level) return true;
  return line.toUpperCase().includes(`[${level.toUpperCase()}]`);
}

// ─── log:show ────────────────────────────────────────────────────────────────

function cmdShow(params, root) {
  const linesCount = parseInt(params.lines || '50', 10);
  const level      = params.level  ? String(params.level).trim()  : null;
  const fileArg    = params.file   ? String(params.file).trim()   : null;

  let logPath;
  if (fileArg) {
    // Güvenlik: path traversal koruması — sadece dosya adını kullan
    const safeName = path.basename(fileArg);
    logPath = path.join(root, 'storage', 'logs', safeName);
  } else {
    logPath = findLatestLog(root);
  }

  if (!logPath || !fs.existsSync(logPath)) {
    console.log('[QTR] Log dosyası bulunamadı.');
    console.log('      storage/logs/ klasörü boş veya log yazılmamış.');
    return;
  }

  const relPath = path.relative(root, logPath);
  const content = fs.readFileSync(logPath, 'utf-8');
  let lines = content.split('\n').filter(l => l.trim());

  if (level) lines = lines.filter(l => matchesLevel(l, level));
  const slice = lines.slice(-linesCount);

  console.log(`\n${ANSI.dim}[${relPath}]  Son ${slice.length} satır${level ? `  (filtre: ${level})` : ''}${ANSI.reset}\n`);
  for (const line of slice) {
    console.log(colorLine(line));
  }
  console.log();
}

// ─── log:tail ────────────────────────────────────────────────────────────────

function cmdTail(params, root) {
  const fileArg = params.file ? String(params.file).trim() : null;

  let logPath;
  if (fileArg) {
    const safeName = path.basename(fileArg);
    logPath = path.join(root, 'storage', 'logs', safeName);
  } else {
    logPath = findLatestLog(root);
  }

  if (!logPath || !fs.existsSync(logPath)) {
    console.log('[QTR] Log dosyası bulunamadı.');
    console.log('      storage/logs/ klasörü boş veya log yazılmamış.');
    return;
  }

  const relPath = path.relative(root, logPath);
  console.log(`\n${ANSI.dim}[${relPath}]  Canlı izleniyor... (Ctrl+C ile çıkış)${ANSI.reset}\n`);

  let lastSize = fs.statSync(logPath).size;

  const watcher = fs.watchFile(logPath, { interval: 500 }, (curr) => {
    if (curr.size > lastSize) {
      const fd     = fs.openSync(logPath, 'r');
      const delta  = curr.size - lastSize;
      const buf    = Buffer.alloc(delta);
      fs.readSync(fd, buf, 0, delta, lastSize);
      fs.closeSync(fd);
      const newText = buf.toString('utf-8');
      lastSize = curr.size;
      const lines = newText.split('\n').filter(l => l.trim());
      for (const line of lines) {
        console.log(colorLine(line));
      }
    }
  });

  process.on('SIGINT', () => {
    fs.unwatchFile(logPath);
    console.log(`\n${ANSI.dim}[QTR] İzleme durduruldu.${ANSI.reset}\n`);
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

  if (sub === 'show') { cmdShow(params, root); return; }
  if (sub === 'tail') { cmdTail(params, root); return; }

  console.error(`[QTR] Bilinmeyen log alt komutu: "${sub}"`);
  console.error('      Geçerli: log:show  log:tail');
  process.exitCode = 1;
}

module.exports = { execute };
