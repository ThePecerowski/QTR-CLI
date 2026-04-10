'use strict';

const fs   = require('fs');
const path = require('path');
const readline = require('readline');

// ─── Sabitler ────────────────────────────────────────────────────────────────

const INFO = 'create <proje-adi>: Yeni bir QTR Framework projesi olusturur.';

const HELP = `
create <proje-adi> [--dry-run]

  Yeni bir QTR Framework projesi olusturur.
  Interaktif olarak sorar:
    - PHP binary yolu
    - Memory-bank template secimi (starter/professional/iterative)
    - GitHub yapilandirmasi (opsiyonel)

  Ornekler:
    qtr create benim-projem
    qtr create benim-projem --dry-run   (dosya olusturmadan simule et)
`;

const SCAFFOLD_DIRS = [
  'app/api/controllers',
  'app/api/services',
  'app/api/middleware',
  'app/api/validators',
  'app/api/responses',
  'app/models',
  'app/core',
  'app/scripts/php',
  'app/scripts/python',
  'app/scripts/node',
  'routes',
  'pages',
  'resources/views/layouts',
  'resources/views/partials',
  'resources/views/components',
  'resources/views/admin',
  'app/admin/controllers',
  'app/admin/middleware',
  'app/admin/services',
  'database',
  'storage/logs',
  'storage/backups',
  'storage/cache',
  'public',
  'memory-bank',
  'tests',
];

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');

const MB_TEMPLATES = {
  '1': { key: 'starter',      label: 'Starter       - Basit projeler (landing page, script)' },
  '2': { key: 'professional', label: 'Professional  - DB + API + dashboard projeleri' },
  '3': { key: 'iterative',    label: 'Iterative     - Uzun sureli, buyuyen projeler' },
};

const PHP_CANDIDATES = [
  'C:/xampp/php/php.exe',
  'C:/laragon/bin/php/php8.3.0/php.exe',
  'C:/laragon/bin/php/php8.2.0/php.exe',
  'C:/laragon/bin/php/php8.1.0/php.exe',
  'C:/php/php.exe',
];

// ─── Yardımcı ────────────────────────────────────────────────────────────────

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
}

function detectPhp() {
  for (const p of PHP_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function validateProjectName(name) {
  if (!name || typeof name !== 'string') return false;
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

function injectTemplate(content, vars) {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] !== undefined ? vars[key] : `{{${key}}}`
  );
}

// ─── Proje oluşturma ─────────────────────────────────────────────────────────

function scaffoldProject(projectPath, config, isDryRun) {
  const log = msg => console.log(msg);

  if (isDryRun) {
    log('\n[QTR DRY-RUN] Olusturulacak klasorler:');
    for (const dir of SCAFFOLD_DIRS) {
      log(`  + ${path.join(config.project, dir)}`);
    }
    log('\n[QTR DRY-RUN] Olusturulacak dosyalar:');
    log(`  + ${config.project}/.qtr.json`);
    log(`  + ${config.project}/.env.example`);
    log(`  + ${config.project}/.env`);
    log(`  + ${config.project}/.gitignore`);
    log(`  + ${config.project}/.htaccess`);
    log(`  + ${config.project}/public/index.php`);
    log(`  + ${config.project}/routes/web.php`);
    log(`  + ${config.project}/routes/api.php`);
    log(`  + ${config.project}/pages/index.php`);
    log(`  + ${config.project}/memory-bank/ (${config.template} template)`);
    if (config.github) log(`  + ${config.project}/GithubCtrl.json`);
    return;
  }

  // Klasörleri oluştur
  for (const dir of SCAFFOLD_DIRS) {
    fs.mkdirSync(path.join(projectPath, dir), { recursive: true });
  }

  const vars = {
    PROJECT_NAME: config.project,
    PHP_PATH: config.php,
    TEMPLATE: config.template,
    PORT: String(config.port),
  };

  // Config dosyalarını oluştur (templates/config/ → proje kökü)
  const configFiles = [
    { src: '.htaccess',          dest: '.htaccess'              },
    { src: '.env.example',       dest: '.env.example'           },
    { src: '.env.example',       dest: '.env'                   },
    { src: '.gitignore',         dest: '.gitignore'             },
    { src: 'root-index.php',     dest: 'index.php'              },
    { src: 'public-index.php',   dest: 'public/index.php'       },
    { src: 'public-router.php',  dest: 'public/router.php'      },
    { src: 'routes-web.php',     dest: 'routes/web.php'         },
    { src: 'routes-api.php',     dest: 'routes/api.php'         },
    { src: 'pages-index.php',    dest: 'pages/index.php'        },
  ];

  for (const cf of configFiles) {
    const srcPath = path.join(TEMPLATES_DIR, 'config', cf.src);
    if (fs.existsSync(srcPath)) {
      const content = injectTemplate(fs.readFileSync(srcPath, 'utf-8'), vars);
      fs.writeFileSync(path.join(projectPath, cf.dest), content, 'utf-8');
    }
  }

  // .qtr.json oluştur
  const qtrJson = {
    project:  config.project,
    template: config.template,
    php:      config.php,
    server:   'xampp',
    port:     config.port,
    db: {
      host: 'localhost',
      port: 3306,
      name: config.project.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      user: 'root',
      pass: '',
    },
    github: config.github ? {
      repository:           config.githubRepo || '',
      branch:               'main',
      commit_prefix:        '[QTR]',
      require_confirmation: true,
      auto_add:             true,
      auto_commit:          true,
      auto_push:            false,
    } : null,
    security: {
      mode:              'strict',
      input_validation:  true,
      sql_injection:     true,
      xss:               true,
      csrf:              true,
      auth:              true,
      rate_limit:        true,
      api_security:      true,
      file_upload:       true,
      debug_protection:  true,
      config_protection: true,
    },
    backup: {
      max_count: 10,
      exclude: ['node_modules', '.git', 'storage/backups'],
    },
    runtimes: {
      php:    true,
      python: false,
      node:   false,
      go:     false,
    },
  };
  fs.writeFileSync(
    path.join(projectPath, '.qtr.json'),
    JSON.stringify(qtrJson, null, 2),
    'utf-8'
  );

  // Memory-bank template kopyala
  const mbSrc = path.join(TEMPLATES_DIR, 'memory-bank', config.template);
  const mbDest = path.join(projectPath, 'memory-bank');
  if (fs.existsSync(mbSrc)) {
    for (const file of fs.readdirSync(mbSrc)) {
      const srcFile = path.join(mbSrc, file);
      if (fs.statSync(srcFile).isFile()) {
        const content = injectTemplate(fs.readFileSync(srcFile, 'utf-8'), vars);
        fs.writeFileSync(path.join(mbDest, file), content, 'utf-8');
      }
    }
  }

  // GitHub yapılandırması
  if (config.github && config.githubRepo) {
    const githubCtrl = {
      repository:           config.githubRepo,
      branch:               'main',
      commit_prefix:        '[QTR]',
      require_confirmation: true,
      auto_add:             true,
      auto_commit:          true,
      auto_push:            false,
    };
    fs.writeFileSync(
      path.join(projectPath, 'GithubCtrl.json'),
      JSON.stringify(githubCtrl, null, 2),
      'utf-8'
    );
  }

  // storage/.htaccess — backup koruması
  const storageHta = 'Deny from all\n';
  fs.writeFileSync(path.join(projectPath, 'storage/.htaccess'), storageHta, 'utf-8');

  // db_runner.php — PDO ile SQL çalıştıran PHP yardımcısı
  const dbRunnerSrc = path.join(TEMPLATES_DIR, 'config', 'db_runner.php');
  if (fs.existsSync(dbRunnerSrc)) {
    fs.copyFileSync(dbRunnerSrc, path.join(projectPath, 'app/scripts/php/db_runner.php'));
  }

  // Config.php — .env okuma sınıfı
  const configSrc = path.join(TEMPLATES_DIR, 'config', 'Config.php');
  if (fs.existsSync(configSrc)) {
    fs.copyFileSync(configSrc, path.join(projectPath, 'app/core/Config.php'));
  }

  // Autoloader.php — PSR-4 otomatik sınıf yükleme
  const autoloaderSrc = path.join(TEMPLATES_DIR, 'config', 'Autoloader.php');
  if (fs.existsSync(autoloaderSrc)) {
    fs.copyFileSync(autoloaderSrc, path.join(projectPath, 'app/core/Autoloader.php'));
  }

  // MiddlewareRegistry.php — middleware isim-sınıf eşleştirme
  const mwRegistrySrc = path.join(TEMPLATES_DIR, 'config', 'MiddlewareRegistry.php');
  if (fs.existsSync(mwRegistrySrc)) {
    fs.copyFileSync(mwRegistrySrc, path.join(projectPath, 'app/core/MiddlewareRegistry.php'));
  }

  // Router.php — QtrRouter sınıfı (URL dispatching)
  const routerSrc = path.join(TEMPLATES_DIR, 'config', 'Router.php');
  if (fs.existsSync(routerSrc)) {
    fs.copyFileSync(routerSrc, path.join(projectPath, 'app/core/Router.php'));
  }

  // HealthController.php — /api/health endpointi
  const healthSrc = path.join(TEMPLATES_DIR, 'config', 'HealthController.php');
  if (fs.existsSync(healthSrc)) {
    fs.copyFileSync(healthSrc, path.join(projectPath, 'app/api/controllers/HealthController.php'));
  }

  // ErrorHandler.php — hata yönetim sınıfı
  const errorHandlerSrc = path.join(TEMPLATES_DIR, 'config', 'ErrorHandler.php');
  if (fs.existsSync(errorHandlerSrc)) {
    fs.copyFileSync(errorHandlerSrc, path.join(projectPath, 'app/core/ErrorHandler.php'));
  }

  // View.php — view render yardımcısı
  const viewSrc = path.join(TEMPLATES_DIR, 'config', 'View.php');
  if (fs.existsSync(viewSrc)) {
    fs.copyFileSync(viewSrc, path.join(projectPath, 'app/core/View.php'));
  }

  // View dosyaları — layouts, partials, components
  const viewTplDir = path.join(TEMPLATES_DIR, 'config', 'views');
  const viewDirs   = ['layouts', 'partials', 'components'];
  for (const vd of viewDirs) {
    const srcDir  = path.join(viewTplDir, vd);
    const destDir = path.join(projectPath, 'resources/views', vd);
    if (fs.existsSync(srcDir)) {
      for (const file of fs.readdirSync(srcDir)) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      }
    }
  }

  // BaseModel.php — PDO tabanlı model tabanı
  const baseModelSrc = path.join(TEMPLATES_DIR, 'config', 'BaseModel.php');
  if (fs.existsSync(baseModelSrc)) {
    fs.copyFileSync(baseModelSrc, path.join(projectPath, 'app/models/BaseModel.php'));
  }

  // UserModel.php — başlangıç kullanıcı modeli
  const userModelSrc = path.join(TEMPLATES_DIR, 'config', 'models', 'UserModel.php');
  if (fs.existsSync(userModelSrc)) {
    fs.copyFileSync(userModelSrc, path.join(projectPath, 'app/models/UserModel.php'));
  }

  // UserService.php — başlangıç kullanıcı servisi
  const userServiceSrc = path.join(TEMPLATES_DIR, 'config', 'services', 'UserService.php');
  if (fs.existsSync(userServiceSrc)) {
    fs.copyFileSync(userServiceSrc, path.join(projectPath, 'app/api/services/UserService.php'));
  }

  // JsonResponse.php — API yanıt yardımcısı
  const jsonRespSrc = path.join(TEMPLATES_DIR, 'config', 'responses', 'JsonResponse.php');
  if (fs.existsSync(jsonRespSrc)) {
    fs.copyFileSync(jsonRespSrc, path.join(projectPath, 'app/api/responses/JsonResponse.php'));
  }

  // Middleware şablonları — AuthMiddleware, RateLimitMiddleware, CorsMiddleware
  const mwTplDir = path.join(TEMPLATES_DIR, 'config', 'middleware');
  if (fs.existsSync(mwTplDir)) {
    for (const file of fs.readdirSync(mwTplDir)) {
      fs.copyFileSync(path.join(mwTplDir, file), path.join(projectPath, 'app/api/middleware', file));
    }
  }

  // Admin şablonları — middleware, controllers, views, routes
  const adminTplDir = path.join(TEMPLATES_DIR, 'config', 'admin');
  if (fs.existsSync(adminTplDir)) {
    const adminDirs = {
      'middleware':   'app/admin/middleware',
      'controllers':  'app/admin/controllers',
      'views':        'resources/views/admin',
    };
    for (const [sub, dest] of Object.entries(adminDirs)) {
      const srcDir  = path.join(adminTplDir, sub);
      const destDir = path.join(projectPath, dest);
      if (fs.existsSync(srcDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        for (const file of fs.readdirSync(srcDir)) {
          fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        }
      }
    }
    // Admin routes
    const adminRoutesSrc = path.join(TEMPLATES_DIR, 'config', 'admin-routes.php');
    if (fs.existsSync(adminRoutesSrc)) {
      fs.copyFileSync(adminRoutesSrc, path.join(projectPath, 'routes/admin.php'));
    }
  }

  // Güvenlik şablonları — core + middleware
  const secTplDir = path.join(TEMPLATES_DIR, 'config', 'security');
  if (fs.existsSync(secTplDir)) {
    const secMap = {
      'core':       'app/core',
      'middleware': 'app/api/middleware',
    };
    for (const [sub, dest] of Object.entries(secMap)) {
      const srcDir  = path.join(secTplDir, sub);
      const destDir = path.join(projectPath, dest);
      if (fs.existsSync(srcDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        for (const file of fs.readdirSync(srcDir)) {
          const destFile = path.join(destDir, file);
          if (!fs.existsSync(destFile)) {
            fs.copyFileSync(path.join(srcDir, file), destFile);
          }
        }
      }
    }
  }
}

// ─── Ana execute ─────────────────────────────────────────────────────────────

async function execute(params) {
  if (params.info) {
    console.log(INFO);
    return;
  }
  if (params.help) {
    console.log(HELP);
    return;
  }

  const isDryRun = params['dry-run'] === true || params.args.includes('--dry-run');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    // 1. Proje adı
    let projectName = params.args[0] || '';
    while (!validateProjectName(projectName)) {
      if (projectName) {
        console.log(
          '[QTR] Gecersiz proje adi! Sadece harf, rakam, tire (-) ve alt cizgi (_) kullanilabilir.'
        );
      }
      projectName = await ask(rl, '[QTR] Proje adi: ');
    }

    const projectPath = path.join(process.cwd(), projectName);
    if (!isDryRun && fs.existsSync(projectPath)) {
      console.log(`[QTR] "${projectName}" klasoru zaten mevcut!`);
      rl.close();
      process.exitCode = 1;
      return;
    }

    // 2. PHP binary
    const detected = detectPhp();
    let phpPath = '';
    console.log('\n[QTR] PHP binary\'si nerede?');
    if (detected) {
      console.log(`  1) Otomatik tespit edildi: ${detected}`);
      console.log('  2) Manuel gir');
      const phpChoice = await ask(rl, '  Secim (1-2) [1]: ') || '1';
      if (phpChoice === '2') {
        phpPath = await ask(rl, '  PHP binary yolu: ');
      } else {
        phpPath = detected;
      }
    } else {
      console.log('  (Otomatik tespit basarisiz)');
      phpPath = await ask(rl, '  PHP binary yolu (ornek: C:/xampp/php/php.exe): ');
    }
    if (!phpPath) phpPath = 'C:/xampp/php/php.exe';

    // 3. Template seçimi
    console.log('\n[QTR] Memory-Bank template secin:');
    for (const [num, t] of Object.entries(MB_TEMPLATES)) {
      console.log(`  ${num}) ${t.label}`);
    }
    const tmplChoice = await ask(rl, '  Secim (1-3) [2]: ') || '2';
    const template = (MB_TEMPLATES[tmplChoice] || MB_TEMPLATES['2']).key;

    // 4. GitHub
    console.log('\n[QTR] GitHub baglantisi kurmak ister misiniz?');
    console.log('  1) Evet');
    console.log('  2) Hayir');
    const ghChoice = await ask(rl, '  Secim (1-2) [2]: ') || '2';
    let githubRepo = null;
    if (ghChoice === '1') {
      githubRepo = await ask(rl, '  Repo URL (ornek: https://github.com/user/repo): ');
    }

    rl.close();

    // 5. Scaffold
    const config = {
      project:    projectName,
      php:        phpPath,
      template,
      port:       8000,
      github:     ghChoice === '1',
      githubRepo: githubRepo || '',
    };

    console.log(`\n[QTR] Proje olusturuluyor: ${projectName} (${template})...`);
    scaffoldProject(projectPath, config, isDryRun);

    if (!isDryRun) {
      console.log(`\n[QTR] Proje olusturuldu: ${projectName}`);
      console.log(`  Klasor  : ${projectPath}`);
      console.log(`  Template: ${template}`);
      console.log(`  PHP     : ${phpPath}`);
      console.log(`  Server  : qtr serve (${projectPath} klasorunden)`);
      console.log('\n  Baslangic:');
      console.log(`    cd ${projectName}`);
      console.log('    qtr serve');
    } else {
      console.log('\n[QTR DRY-RUN] Tamamlandi. Hicbir dosya olusturulmadi.');
    }

  } catch (err) {
    rl.close();
    console.error(`[QTR] Hata: ${err.message}`);
    process.exitCode = 1;
  }
}

// Async execute'u sync wrapper ile sar (mevcut index.js mimarisine uyum)
module.exports = {
  execute: (params) => {
    execute(params).catch(err => {
      console.error(`[QTR] Beklenmedik hata: ${err.message}`);
      process.exitCode = 1;
    });
  },
};
