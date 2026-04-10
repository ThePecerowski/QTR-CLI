'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const QTR_JSON     = '.qtr.json';
const ADMIN_ROUTES = 'routes/admin.php';

const INFO_TEXT = 'admin/backend: Admin panel ve backend kurulumu ve yönetimi.';

const HELP_TEXT = `
admin / backend komutu alt komutlari:

  admin:install               -- Basic Admin Panel kurar (interaktif).
  backend:install             -- Auth + User Management backend kurar.
  stack:install               -- Admin panel + backend birlikte kurar.
  admin:add-module <Modul>    -- Admin panele yeni modul ekler.
  admin:remove-module <Modul> -- Modulu kaldirir (onay ister).
  admin:list-modules          -- Kurulu modulleri listeler.
  admin:bind-api <Modul>      -- API endpoint'lerini modul sayfasina baglar.
  admin:theme:set <tema>      -- Tema ayarlar (light|dark|auto|minimal).

Ornekler:
  qtr admin:install
  qtr backend:install
  qtr stack:install
  qtr admin:add-module Users
  qtr admin:bind-api Products
  qtr admin:list-modules
  qtr admin:theme:set dark
`;

const ADMIN_VIEWS_DIR       = 'resources/views/admin';
const ADMIN_CONTROLLERS_DIR = 'app/admin/controllers';
const ADMIN_MIDDLEWARE_DIR  = 'app/admin/middleware';
const ADMIN_SERVICES_DIR    = 'app/admin/services';

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

function readQtrJson(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, QTR_JSON), 'utf-8')); }
  catch { return {}; }
}

function writeQtrJson(root, cfg) {
  fs.writeFileSync(path.join(root, QTR_JSON), JSON.stringify(cfg, null, 2), 'utf-8');
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function writeIfNew(filePath, content) {
  if (fs.existsSync(filePath)) {
    console.log(`  [ATLA]  ${path.relative(process.cwd(), filePath)} (zaten mevcut)`);
    return false;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  [OLUSTUR] ${path.relative(process.cwd(), filePath)}`);
  return true;
}

// ─── Admin Modül Şablon Oluşturucular ─────────────────────────────────────────

function moduleControllerPHP(name) {
  const lower = name.toLowerCase();
  return `<?php
/**
 * Admin${name}Controller — Admin panel ${name} modülü
 * Rol: admin veya editor
 *
 * Not: AdminAuthMiddleware ve RoleMiddleware routes/admin.php tarafından
 * already yüklenmiştir. Burada tekrar require_once gerekmez.
 */

class Admin${name}Controller
{
    public function index(array $params = []): void
    {
        AdminAuthMiddleware::handle();
        RoleMiddleware::require('editor');
        // $items = ${name}Service::get${name}List();
        View::render('admin/${lower}/index', ['title' => '${name}', 'items' => []], 'admin');
    }

    public function show(array $params = []): void
    {
        AdminAuthMiddleware::handle();
        RoleMiddleware::require('editor');
        // $item = ${name}Service::get${name}ById((int)$params['id']);
        View::render('admin/${lower}/show', ['title' => '${name} Detay', 'item' => null], 'admin');
    }

    public function store(array $params = []): void
    {
        AdminAuthMiddleware::handle();
        RoleMiddleware::require('editor');
        // ${name}Service::create${name}($_POST);
        header('Location: /admin/${lower}');
        exit;
    }

    public function destroy(array $params = []): void
    {
        AdminAuthMiddleware::handle();
        RoleMiddleware::require('admin');
        // ${name}Service::delete${name}((int)$params['id']);
        header('Location: /admin/${lower}');
        exit;
    }
}
`.replace(/\${name}/g, name).replace(/\${lower}/g, lower);
}

function moduleListViewPHP(name) {
  const lower = name.toLowerCase();
  return `<!-- Admin ${name} — Liste -->
<?php /** @var array $items */ ?>
<div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
    <h2 style="color:#f1f5f9">${name}</h2>
    <a href="/admin/${lower}/create"
       style="padding:8px 18px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;font-size:.9em">
      + Yeni Ekle
    </a>
  </div>

  <?php if (empty($items)): ?>
    <p style="color:#475569">Henüz kayıt yok.</p>
  <?php else: ?>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:.9em">
        <thead>
          <tr style="background:#0f172a;color:#94a3b8">
            <th style="padding:10px 14px;text-align:left">ID</th>
            <th style="padding:10px 14px;text-align:left">Ad</th>
            <th style="padding:10px 14px;text-align:left">İşlem</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($items as $i => $item): ?>
          <tr style="background:<?= $i%2===0?'#1e293b':'#162032'; ?>;border-bottom:1px solid #1e3a5f">
            <td style="padding:9px 14px;color:#94a3b8"><?= (int)($item['id']??0) ?></td>
            <td style="padding:9px 14px;color:#e2e8f0"><?= htmlspecialchars((string)($item['name']??'')) ?></td>
            <td style="padding:9px 14px">
              <a href="/admin/${lower}/<?= (int)($item['id']??0) ?>"
                 style="color:#a5b4fc;font-size:.85em">Görüntüle</a>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  <?php endif; ?>
</div>
`.replace(/\${name}/g, name).replace(/\${lower}/g, lower);
}

// ─── Alt Komutlar ────────────────────────────────────────────────────────────

async function cmdInstall(root) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log('\n[QTR ADMIN INSTALL]');
    console.log('Kurulacak Admin Panel Template\'ini Seçin:');
    console.log('  1) Basic Admin Panel  [tam destekli]');
    console.log('  2) Professional Dashboard  [yakinda]');
    console.log('  3) CRM / Yönetim Paneli  [yakinda]');
    console.log('  4) E-Ticaret Yönetimi  [yakinda]');

    const choice = (await ask(rl, '\nSeçiminiz (varsayılan: 1): ')).trim() || '1';
    if (choice !== '1') {
      console.log('\n[UYARI] Sadece Basic Admin Panel tam desteklidir. Basic kurulumu yapılıyor...');
    }

    _installBasicAdmin(root);

    const cfg = readQtrJson(root);
    cfg.admin = { template: 'basic', installed: new Date().toISOString().slice(0, 10), modules: [] };
    writeQtrJson(root, cfg);

    console.log('\nAdmin panel kuruldu. Erişim: /admin');
    console.log('  qtr admin:add-module <Modul> ile modül ekleyebilirsiniz.');
  } finally {
    rl.close();
  }
}

function _installBasicAdmin(root) {
  // Dizinler
  const dirs = [
    'app/admin/controllers', 'app/admin/middleware',
    'app/admin/services', 'resources/views/admin',
  ];
  for (const d of dirs) fs.mkdirSync(path.join(root, d), { recursive: true });

  // routes/admin.php zaten oluşturulmuş (qtr create sırasında kopyalanır)
  // Kontrol et, yoksa basit placeholder yaz
  const routeFile = path.join(root, ADMIN_ROUTES);
  if (!fs.existsSync(routeFile)) {
    fs.writeFileSync(routeFile, `<?php\n// Admin router — qtr admin:install ile oluşturuldu\n`, 'utf-8');
    console.log('  [OLUSTUR] routes/admin.php');
  } else {
    console.log('  [MEVCUT] routes/admin.php');
  }

  console.log('  [OK] Admin panel iskelet hazır.');
}

async function cmdBackendInstall(root) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log('\n[QTR BACKEND INSTALL]');
    console.log('Kurulacak Backend Template\'ini Seçin:');
    console.log('  1) Basic CRUD Backend  [yakinda]');
    console.log('  2) Auth + User Management  [tam destekli]');
    console.log('  3) CMS Backend  [yakinda]');
    console.log('  4) API Driven Backend  [yakinda]');

    const choice = (await ask(rl, '\nSeçiminiz (varsayılan: 2): ')).trim() || '2';
    if (choice !== '2') {
      console.log('\n[UYARI] Sadece Auth + User Management tam desteklidir.');
    }

    // Auth + User Management backend
    const servicePath   = path.join(root, 'app/api/services/UserService.php');
    const validatorPath = path.join(root, 'app/api/validators/UserValidator.php');
    const modelPath     = path.join(root, 'app/models/UserModel.php');

    for (const f of [servicePath, validatorPath, modelPath]) {
      if (fs.existsSync(f)) console.log(`  [MEVCUT] ${path.relative(root, f)}`);
      else console.log(`  [EKSIK]  ${path.relative(root, f)} — önce qtr api:crud User çalıştırın.`);
    }

    const cfg = readQtrJson(root);
    cfg.backend = { template: 'auth-user', installed: new Date().toISOString().slice(0, 10) };
    writeQtrJson(root, cfg);

    console.log('\nBackend yapılandırması kaydedildi.');
  } finally {
    rl.close();
  }
}

function cmdAddModule(root, moduleName) {
  const name  = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  const lower = name.toLowerCase();

  console.log(`\n[ADMIN ADD-MODULE] ${name}`);

  writeIfNew(
    path.join(root, ADMIN_CONTROLLERS_DIR, `Admin${name}Controller.php`),
    moduleControllerPHP(name)
  );
  writeIfNew(
    path.join(root, ADMIN_VIEWS_DIR, lower, 'index.php'),
    moduleListViewPHP(name)
  );

  // routes/admin.php'ye route satırları ekle
  const routeFile = path.join(root, ADMIN_ROUTES);
  if (fs.existsSync(routeFile)) {
    const content = fs.readFileSync(routeFile, 'utf-8');
    const marker  = '$adminRouter->dispatch()';
    if (!content.includes(`Admin${name}Controller`)) {
      const block = `// --- ${name} ---\n`
        + `$adminRouter->get('/admin/${lower}',       'Admin${name}Controller@index');\n`
        + `$adminRouter->get('/admin/${lower}/{id}',  'Admin${name}Controller@show');\n`
        + `$adminRouter->post('/admin/${lower}',      'Admin${name}Controller@store');\n`
        + `$adminRouter->delete('/admin/${lower}/{id}','Admin${name}Controller@destroy');\n\n`;
      fs.writeFileSync(routeFile, content.replace(marker, block + marker), 'utf-8');
      console.log(`  [GUNCELLE] routes/admin.php (+${name})`);
    }
  }

  // .qtr.json modules listesini güncelle
  const cfg = readQtrJson(root);
  if (!cfg.admin) cfg.admin = { modules: [] };
  if (!cfg.admin.modules) cfg.admin.modules = [];
  if (!cfg.admin.modules.includes(name)) {
    cfg.admin.modules.push(name);
    writeQtrJson(root, cfg);
  }

  console.log(`\nModül "${name}" eklendi. Erişim: /admin/${lower}`);
}

function cmdListModules(root) {
  const cfg     = readQtrJson(root);
  const modules = cfg.admin?.modules || [];

  console.log('\n[ADMIN LIST-MODULES]');
  if (modules.length === 0) {
    console.log('  Kurulu modül yok. qtr admin:add-module <Modul> ile ekleyin.');
    return;
  }
  modules.forEach((m, i) => console.log(`  ${i + 1}. ${m}  (/admin/${m.toLowerCase()})`));
  console.log('');
}

async function cmdRemoveModule(root, moduleName) {
  const name  = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  const lower = name.toLowerCase();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const confirm = await ask(rl, `[ADMIN REMOVE-MODULE] "${name}" silinecek. Emin misiniz? (e/H): `);
    if (confirm.trim().toLowerCase() !== 'e') {
      console.log('İptal edildi.');
      return;
    }

    const ctrlFile = path.join(root, ADMIN_CONTROLLERS_DIR, `Admin${name}Controller.php`);
    const viewDir  = path.join(root, ADMIN_VIEWS_DIR, lower);

    if (fs.existsSync(ctrlFile)) { fs.unlinkSync(ctrlFile); console.log(`  [SIL] ${path.relative(root, ctrlFile)}`); }
    if (fs.existsSync(viewDir))  { fs.rmSync(viewDir, { recursive: true }); console.log(`  [SIL] ${path.relative(root, viewDir)}/`); }

    // .qtr.json güncelle
    const cfg = readQtrJson(root);
    if (cfg.admin?.modules) {
      cfg.admin.modules = cfg.admin.modules.filter(m => m !== name);
      writeQtrJson(root, cfg);
    }

    console.log(`Modül "${name}" kaldırıldı.`);
  } finally {
    rl.close();
  }
}

function cmdBindApi(root, moduleName) {
  const name  = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  const lower = name.toLowerCase();

  console.log(`\n[ADMIN BIND-API] ${name}`);

  // routes/api.php'de modülün route'larını ara
  const apiRoute = path.join(root, 'routes/api.php');
  if (!fs.existsSync(apiRoute)) {
    console.log('  routes/api.php bulunamadi.');
    return;
  }
  const apiContent = fs.readFileSync(apiRoute, 'utf-8');
  const hasRoutes  = apiContent.includes(`${name}Controller`);

  if (!hasRoutes) {
    console.log(`  [UYARI] routes/api.php'de ${name} route'u bulunamadi.`);
    console.log(`          Önce: qtr api:crud ${name}`);
    return;
  }

  // Liste view'unu API fetch ile güncelle (yorum bloğu ekle)
  const viewFile = path.join(root, ADMIN_VIEWS_DIR, lower, 'index.php');
  if (!fs.existsSync(viewFile)) {
    console.log(`  [UYARI] resources/views/admin/${lower}/index.php bulunamadi.`);
    console.log(`          Önce: qtr admin:add-module ${name}`);
    return;
  }

  const viewContent  = fs.readFileSync(viewFile, 'utf-8');
  const bindComment  = `<!-- API Binding: GET /api/${lower}s -->\n`;
  if (!viewContent.includes('API Binding')) {
    fs.writeFileSync(viewFile, bindComment + viewContent, 'utf-8');
    console.log(`  [GUNCELLE] resources/views/admin/${lower}/index.php (API binding yorumu eklendi)`);
  } else {
    console.log(`  [MEVCUT] API binding zaten mevcut.`);
  }

  console.log(`\n${name} modülü API'ye bağlandı. Endpoint: /api/${lower}s`);
}

function cmdThemeSet(root, theme) {
  const validThemes = ['light', 'dark', 'auto', 'minimal'];
  if (!validThemes.includes(theme)) {
    console.log(`[ADMIN THEME] Gecersiz tema: "${theme}". (light|dark|auto|minimal)`);
    process.exit(1);
  }

  const cfg = readQtrJson(root);
  if (!cfg.admin) cfg.admin = {};
  cfg.admin.theme = theme;
  writeQtrJson(root, cfg);

  console.log(`[ADMIN THEME] Tema ayarlandi: ${theme}`);
}

// ─── Ana execute ─────────────────────────────────────────────────────────────

async function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  const sub = params._subcommand;
  const cmd = params._command || '';
  if (!sub) { console.log(HELP_TEXT); return; }

  const root = findProjectRoot();
  if (!root) {
    console.log('[ADMIN] Bu dizin bir QTR projesi degil (.qtr.json bulunamadi).');
    process.exit(1);
  }

  const modName = () => {
    const raw = (params.args || []).find(a => !a.startsWith('--')) || '';
    if (!raw) {
      console.log('[ADMIN] Modul adi gerekli. Ornek: qtr admin:add-module Blog');
      process.exit(1);
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  if (sub === 'install') {
    if (cmd === 'backend:install')     await cmdBackendInstall(root);
    else if (cmd === 'stack:install') { await cmdInstall(root); await cmdBackendInstall(root); }
    else                               await cmdInstall(root);
  }
  else if (sub === 'install-backend' || sub === 'backend-install') await cmdBackendInstall(root);
  else if (sub === 'add-module') cmdAddModule(root, modName());
  else if (sub === 'list-modules' || sub === 'list') cmdListModules(root);
  else if (sub === 'remove-module') await cmdRemoveModule(root, modName());
  else if (sub === 'bind-api')   cmdBindApi(root, modName());
  else if (sub === 'theme:set' || sub === 'theme-set') {
    const theme = (params.args || []).find(a => !a.startsWith('--')) || '';
    cmdThemeSet(root, theme);
  } else {
    console.log(`[ADMIN] Bilinmeyen alt komut: "${sub}". qtr admin --help`);
    process.exit(1);
  }
}

module.exports = { execute };
