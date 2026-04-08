'use strict';

const COMMANDS_LIST = [
  { name: 'showd',       desc: 'Tum cihazlari tablo halinde gosterir (ad, MAC adresi, durum).' },
  { name: 'showl',       desc: 'Tum cihazlari sirali liste halinde gosterir.' },
  { name: 'band <sira>', desc: 'Cihaz sira numarasina gore cihazi engeller.' },
  { name: 'unban <sira>',desc: 'Cihaz sira numarasina gore engeli kaldirir.' },
  { name: 'stopengine',  desc: 'Ses motorunu durdurur.' },
  { name: 'startengine', desc: 'Ses motorunu baslatir.' },
  { name: 'help',        desc: 'Tum komutlari ve aciklamalarini gosterir.' },
  { name: 'fix',         desc: 'CLI ve uygulama kurulumunda sorun olup olmadigini kontrol eder.' },
  { name: 'about',       desc: 'CLI ve uygulama hakkinda bilgi verir.' },
  { name: 'updateA',     desc: 'Uygulamayi en son surume gunceller.' },
  { name: 'updateC',     desc: "CLI'i en son surume gunceller." },
];

const PARAMS_LIST = [
  { name: '--info',          desc: 'Komutun ne ise yaradigini soyler.' },
  { name: '--help',          desc: 'Komut hata verdiginde ne yapilabilecegini soyler.' },
  { name: '--stime <saniye>',desc: 'Belirlenen sure sonra komutu calistirir.' },
];

function execute(params) {
  if (params.info) {
    console.log('help: Tum komutlari ve aciklamalarini gosterir.');
    return;
  }

  console.log('\nqtr - SpeakerQuarter CLI\n');
  console.log('KOMUTLAR:');
  for (const cmd of COMMANDS_LIST) {
    console.log(`  qtr ${cmd.name.padEnd(20)} ${cmd.desc}`);
  }
  console.log('\nPARAMETRELER (her komut icin):');
  for (const p of PARAMS_LIST) {
    console.log(`  ${p.name.padEnd(22)} ${p.desc}`);
  }
  console.log('');
}

module.exports = { execute };
