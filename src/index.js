'use strict';

const { parseParams } = require('./utils/params');

const COMMANDS = {
  showd:       () => require('./commands/showd'),
  showl:       () => require('./commands/showl'),
  band:        () => require('./commands/band'),
  unban:       () => require('./commands/unban'),
  stopengine:  () => require('./commands/stopengine'),
  startengine: () => require('./commands/startengine'),
  help:        () => require('./commands/help'),
  fix:         () => require('./commands/fix'),
  about:       () => require('./commands/about'),
  updateA:     () => require('./commands/updateA'),
  updateC:     () => require('./commands/updateC'),
};

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
