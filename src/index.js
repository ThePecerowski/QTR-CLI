'use strict';

const { parseParams } = require('./utils/params');

const COMMANDS = {
  create:         () => require('./commands/create'),
  serve:          () => require('./commands/serve'),
  'route:list':   () => require('./commands/route'),
  'route:create': () => require('./commands/route'),
  'route:remove': () => require('./commands/route'),
  'db:create':         () => require('./commands/db'),
  'db:list':           () => require('./commands/db'),
  'db:migrate':        () => require('./commands/db'),
  'db:rollback':       () => require('./commands/db'),
  'db:reset':          () => require('./commands/db'),
  'db:make-migration': () => require('./commands/db'),
  'db:seed':           () => require('./commands/db'),
  'db:make-seeder':    () => require('./commands/db'),
  'db:run':            () => require('./commands/db'),
  'env:setup':    () => require('./commands/env'),
  'env:show':     () => require('./commands/env'),
  'env:set':      () => require('./commands/env'),
  'env:check':    () => require('./commands/env'),
  'api:create':   () => require('./commands/api'),
  'api:crud':     () => require('./commands/api'),
  'api:list':     () => require('./commands/api'),
  'api:docs':     () => require('./commands/api'),
  'api:middleware': () => require('./commands/api'),
  'admin:install':         () => require('./commands/admin'),
  'backend:install':       () => require('./commands/admin'),
  'stack:install':         () => require('./commands/admin'),
  'admin:add-module':      () => require('./commands/admin'),
  'admin:list-modules':    () => require('./commands/admin'),
  'admin:remove-module':   () => require('./commands/admin'),
  'admin:bind-api':        () => require('./commands/admin'),
  'admin:theme:set':       () => require('./commands/admin'),
  'security:list':         () => require('./commands/security'),
  'security:enable':       () => require('./commands/security'),
  'security:disable':      () => require('./commands/security'),
  'security:mode':         () => require('./commands/security'),
  'security:audit':        () => require('./commands/security'),
  'security:fix':          () => require('./commands/security'),
  'security:reset':        () => require('./commands/security'),
  'security:disable-all':  () => require('./commands/security'),
  backup:                  () => require('./commands/backup'),
  'github:init':           () => require('./commands/github'),
  'github:push':           () => require('./commands/github'),
  'github:pull':           () => require('./commands/github'),
  'github:sync':           () => require('./commands/github'),
  'github:status':         () => require('./commands/github'),
  'github:log':            () => require('./commands/github'),
  'mb:init':               () => require('./commands/mb'),
  'mb:update':             () => require('./commands/mb'),
  'mb:list':               () => require('./commands/mb'),
  'mb:show':               () => require('./commands/mb'),
  'api:test':              () => require('./commands/test'),
  'api:test-suite':        () => require('./commands/test'),
  'test:install':          () => require('./commands/test'),
  'test:run':              () => require('./commands/test'),
  'test:coverage':         () => require('./commands/test'),
  'deploy:check':          () => require('./commands/deploy'),
  'deploy:nginx-config':   () => require('./commands/deploy'),
  'cache:classmap':        () => require('./commands/cache'),
  'cache:routes':          () => require('./commands/cache'),
  'cache:clear':           () => require('./commands/cache'),
  doctor:                  () => require('./commands/doctor'),
  'log:show':              () => require('./commands/log'),
  'log:tail':              () => require('./commands/log'),
  'asset:build':           () => require('./commands/asset'),
  'asset:watch':           () => require('./commands/asset'),
  run:                     () => require('./commands/run'),
  'runtime:list':          () => require('./commands/run'),
  'runtime:enable':        () => require('./commands/run'),
  'runtime:disable':       () => require('./commands/run'),
  'runtime:add':           () => require('./commands/run'),
  showd:          () => require('./commands/showd'),
  showl:          () => require('./commands/showl'),
  band:           () => require('./commands/band'),
  unban:          () => require('./commands/unban'),
  stopengine:     () => require('./commands/stopengine'),
  startengine:    () => require('./commands/startengine'),
  help:           () => require('./commands/help'),
  fix:            () => require('./commands/fix'),
  about:          () => require('./commands/about'),
  updateA:        () => require('./commands/updateA'),
  updateC:        () => require('./commands/updateC'),
};

// Grup:eylem formatındaki komutlardan alt komut adını çıkar
// Örn: "route:list" → subcommand = "list"
function extractSubcommand(commandName) {
  const idx = commandName.indexOf(':');
  return idx !== -1 ? commandName.slice(idx + 1) : '';
}

function run(argv) {
  if (argv.length === 0) {
    console.log('Kullanim: qtr <komut> [parametreler]');
    console.log('Tum komutlar icin "qtr help" yazin.');
    return;
  }

  const commandName = argv[0];
  const rawArgs = argv.slice(1);

  if (!COMMANDS[commandName]) {
    console.error(`Hata: "${commandName}" bilinmeyen bir komuttur.`);
    console.error('Tum komutlar icin "qtr help" yazin.');
    process.exitCode = 1;
    return;
  }

  const params = parseParams(rawArgs);

  // Grup:eylem komutlarına _subcommand enjekte et (örn. route:list → "list")
  params._subcommand = extractSubcommand(commandName);
  params._command    = commandName;

  // --stime kontrolu: belirlenen sure sonra komutu calistir
  if (params.stime !== undefined) {
    const ms = parseInt(params.stime, 10) * 1000;
    if (isNaN(ms) || ms < 0) {
      console.error('Hata: --stime icin gecerli bir sure (saniye) giriniz.');
      process.exitCode = 1;
      return;
    }
    setTimeout(() => {
      COMMANDS[commandName]().execute(params);
    }, ms);
    return;
  }

  COMMANDS[commandName]().execute(params);
}

module.exports = { run };
