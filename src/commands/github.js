'use strict';

const fs   = require('fs');
const path = require('path');
const readline = require('readline');
const { spawnSync, execSync } = require('child_process');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const QTR_JSON     = '.qtr.json';
const GITHUB_JSON  = 'GithubCtrl.json';
const LOG_FILE     = path.join('storage', 'logs', 'github.log');

const INFO_TEXT = 'github: Git deposu init, push, pull ve sync işlemlerini yönetir.';

const HELP_TEXT = `
github komutu alt komutlari:

  github:init        -- GithubCtrl.json olusturur, git init + remote ekler.
  github:push        -- git add + commit + push yapar.
  github:pull        -- git pull yapar.
  github:sync        -- pull → add → commit → push sirasiyla yapar.
  github:status      -- Degistirilmis dosyalari ve dal durumunu gosterir.
  github:log         -- Son 10 commit ozetini gosterir.

Parametreler:
  --message="<mesaj>"  -- Commit mesajini belirler.
  --branch=<dal>       -- Branch adini belirler (varsayilan: GithubCtrl.json'dan).
  --path=<dizin>       -- Proje dizinini belirler (farkli dizinden calistirilirken).

Ornekler:
  qtr github:init
  qtr github:push --message="Yeni ozellik eklendi"
  qtr github:push --path="C:/projeler/benim-projem" --message="Guncelleme"
  qtr github:pull
  qtr github:sync
`;

const DEFAULT_CONFIG = {
  repository:           '',
  branch:               'main',
  auto_add:             true,
  auto_commit:          true,
  auto_push:            true,
  auto_pull:            false,
  commit_prefix:        '[QTR]',
  require_confirmation: true,
};

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function findProjectRoot(startDir) {
  let dir = startDir ? path.resolve(startDir) : process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, QTR_JSON))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function readGithubJson(root) {
  const file = path.join(root, GITHUB_JSON);
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return null; }
}

function writeGithubJson(root, cfg) {
  fs.writeFileSync(path.join(root, GITHUB_JSON), JSON.stringify(cfg, null, 2), 'utf-8');
}

function appendLog(root, action, branch, status, extra = '') {
  try {
    const logDir  = path.join(root, 'storage', 'logs');
    const logFile = path.join(logDir, 'github.log');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const line = `[${new Date().toISOString().slice(0,10)}] ACTION: ${action}, BRANCH: ${branch}, STATUS: ${status}${extra ? ', ' + extra : ''}\n`;
    fs.appendFileSync(logFile, line, 'utf-8');
  } catch { /* sessiz */ }
}

function git(root, args, silent = false) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf-8' });
  if (!silent && r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim();
    // Auth hatası tespiti
    if (/authentication|credential|password|token|403|401/i.test(err)) {
      console.log('\n[GITHUB] Kimlik doğrulama gerekiyor. Çözüm yolları:');
      console.log('  1. Git Credential Manager: git config --global credential.helper manager');
      console.log('  2. SSH key: ssh-keygen -t ed25519');
      console.log('  3. GitHub CLI: gh auth login');
    } else {
      console.log(`[GITHUB] git ${args.join(' ')} HATA: ${err}`);
    }
    process.exit(1);
  }
  return r;
}

function hasChanges(root) {
  const r = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf-8' });
  return (r.stdout || '').trim().length > 0;
}

function isGitRepo(root) {
  return fs.existsSync(path.join(root, '.git'));
}

function hasRemote(root) {
  const r = spawnSync('git', ['remote'], { cwd: root, encoding: 'utf-8' });
  return (r.stdout || '').trim().length > 0;
}

// ─── Alt Komutlar ─────────────────────────────────────────────────────────────

async function cmdInit(root) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log('\n[GITHUB INIT]');

    const existing = readGithubJson(root);
    if (existing) {
      const overwrite = await ask(rl, 'GithubCtrl.json zaten mevcut. Üzerine yazılsın mı? (e/H): ');
      if (overwrite.trim().toLowerCase() !== 'e') { console.log('İptal.'); return; }
    }

    const repo   = (await ask(rl, 'Repository URL (örn: https://github.com/user/repo.git): ')).trim();
    const branch = (await ask(rl, 'Branch (varsayılan: main): ')).trim() || 'main';
    const prefix = (await ask(rl, 'Commit prefix (varsayılan: [QTR]): ')).trim() || '[QTR]';
    const reqConf = (await ask(rl, 'Push öncesi onay ister misiniz? (E/h): ')).trim().toLowerCase() !== 'h';

    const cfg = { ...DEFAULT_CONFIG, repository: repo, branch, commit_prefix: prefix, require_confirmation: reqConf };
    writeGithubJson(root, cfg);
    console.log('  [OLUSTUR] GithubCtrl.json');

    // git init
    if (!isGitRepo(root)) {
      git(root, ['init']);
      console.log('  [GIT] git init çalıştırıldı.');
    } else {
      console.log('  [MEVCUT] .git zaten mevcut.');
    }

    // remote
    if (repo) {
      if (!hasRemote(root)) {
        git(root, ['remote', 'add', 'origin', repo]);
        console.log(`  [GIT] remote origin eklendi: ${repo}`);
      } else {
        // mevcut remote'u güncelle
        git(root, ['remote', 'set-url', 'origin', repo], true);
        console.log(`  [GIT] remote origin güncellendi: ${repo}`);
      }

      // erişilebilirlik testi
      process.stdout.write('  Repository erişim testi...');
      const test = spawnSync('git', ['ls-remote', repo], { cwd: root, encoding: 'utf-8', timeout: 8000 });
      if (test.status === 0) {
        console.log(' OK (erişilebilir)');
      } else {
        console.log(' (ulaşılamadı — kimlik doğrulama gerekebilir)');
      }
    }

    console.log('\nGithubCtrl.json hazır. qtr github:push ile ilk push yapın.');
  } finally {
    rl.close();
  }
}

async function cmdPush(root, params) {
  const cfg = readGithubJson(root);
  if (!cfg) { console.log('[GITHUB] GithubCtrl.json bulunamadı. Önce: qtr github:init'); process.exit(1); }
  if (!isGitRepo(root)) { console.log('[GITHUB] .git bulunamadı. Önce: qtr github:init'); process.exit(1); }

  const branch     = params.branch || cfg.branch || 'main';
  const userMsg    = params.message || null;
  const commitMsg  = userMsg
    ? `${cfg.commit_prefix} ${userMsg}`
    : `${cfg.commit_prefix} Update project`;

  // Onay
  if (cfg.require_confirmation) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ok = await new Promise(resolve => rl.question(`[GITHUB] "${commitMsg}" mesajıyla push yapılacak. Devam? (E/h): `, a => { rl.close(); resolve(a); }));
    if (ok.trim().toLowerCase() === 'h') { console.log('İptal.'); return; }
  }

  if (!hasChanges(root)) {
    console.log('[GITHUB] Değişiklik yok, push iptal edildi.');
    appendLog(root, 'PUSH', branch, 'SKIP', 'no_changes');
    return;
  }

  console.log(`\n[GITHUB PUSH] → ${branch}`);

  if (cfg.auto_add) {
    git(root, ['add', '.']);
    console.log('  [OK] git add .');
  }

  if (cfg.auto_commit) {
    git(root, ['commit', '-m', commitMsg]);
    console.log(`  [OK] git commit -m "${commitMsg}"`);
  }

  if (cfg.auto_push) {
    git(root, ['push', 'origin', branch]);
    console.log(`  [OK] git push origin ${branch}`);
  }

  // Değişen dosya sayısını bul
  const diff = spawnSync('git', ['diff', '--shortstat', 'HEAD~1', 'HEAD'], { cwd: root, encoding: 'utf-8' });
  const fileInfo = (diff.stdout || '').trim().split(',')[0] || '';

  appendLog(root, 'PUSH', branch, 'SUCCESS', fileInfo || '');
  console.log('\nPush tamamlandı.');
}

function cmdPull(root, params) {
  const cfg = readGithubJson(root);
  if (!cfg) { console.log('[GITHUB] GithubCtrl.json bulunamadı. Önce: qtr github:init'); process.exit(1); }

  const branch = params.branch || cfg.branch || 'main';
  console.log(`\n[GITHUB PULL] ← ${branch}`);
  git(root, ['pull', 'origin', branch]);
  console.log('  [OK] git pull tamamlandı.');
  appendLog(root, 'PULL', branch, 'SUCCESS');
}

async function cmdSync(root, params) {
  console.log('\n[GITHUB SYNC] pull → add → commit → push');
  cmdPull(root, params);
  await cmdPush(root, params);
}

function cmdStatus(root) {
  if (!isGitRepo(root)) { console.log('[GITHUB] .git bulunamadı.'); return; }
  console.log('\n[GITHUB STATUS]');
  const r = spawnSync('git', ['status', '-s'], { cwd: root, encoding: 'utf-8' });
  const out = (r.stdout || '').trim();
  console.log(out || '  Temiz çalışma ağacı (değişiklik yok).');
  const branch = spawnSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf-8' });
  console.log(`\nDal: ${(branch.stdout || '').trim()}\n`);
}

function cmdLog(root) {
  if (!isGitRepo(root)) { console.log('[GITHUB] .git bulunamadı.'); return; }
  console.log('\n[GITHUB LOG] Son 10 commit:');
  const r = spawnSync('git', ['log', '--oneline', '-10'], { cwd: root, encoding: 'utf-8' });
  console.log((r.stdout || '').trim() || '  Commit bulunamadı.');
  console.log('');
}

// ─── Ana execute ──────────────────────────────────────────────────────────────

async function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  const sub = params._subcommand;
  if (!sub) { console.log(HELP_TEXT); return; }

  const root = findProjectRoot(params.path || null);
  if (!root) {
    console.log('[GITHUB] QTR projesi bulunamadı (.qtr.json yok).');
    console.log('  Çözüm 1: Proje klasörüne geçin → cd <proje>');
    console.log('  Çözüm 2: Yolu belirtin → qtr github:push --path="C:/projeler/benim-projem"');
    process.exit(1);
  }

  if      (sub === 'init')   await cmdInit(root);
  else if (sub === 'push')   await cmdPush(root, params);
  else if (sub === 'pull')   cmdPull(root, params);
  else if (sub === 'sync')   await cmdSync(root, params);
  else if (sub === 'status') cmdStatus(root);
  else if (sub === 'log')    cmdLog(root);
  else {
    console.log(`[GITHUB] Bilinmeyen alt komut: "${sub}". qtr github --help`);
    process.exit(1);
  }
}

module.exports = { execute };
