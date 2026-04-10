'use strict';

const COMMANDS_LIST = [
  { name: 'create <proje-adi>',    desc: 'Yeni bir QTR Framework projesi olusturur.' },
  { name: 'serve',                  desc: 'PHP built-in server baslatir. (--port, --stop, --status)' },
  { name: 'route:list',             desc: 'Projedeki tum sayfa route\'larini listeler.' },
  { name: 'route:create <ad>',      desc: 'Yeni sayfa ve route olusturur.' },
  { name: 'route:remove <ad>',      desc: 'Route ve .php dosyasini kaldirir.' },
  { name: 'db:create <ad>',         desc: 'Yeni numaralandirilmis SQL dosyasi olusturur.' },
  { name: 'db:list',                desc: 'SQL dosyalarini ve calistirilma durumlarini listeler.' },
  { name: 'db:run',                 desc: 'Bekleyen SQL dosyalarini PDO ile calistirir. (--force)' },
  { name: 'env:setup',              desc: '.env.example dosyasindan .env olusturur.' },
  { name: 'env:show',               desc: '.env degerlerini maskeli olarak listeler.' },
  { name: 'env:set <KEY> <DEGER>',  desc: '.env anahtarini gunceller.' },
  { name: 'env:check',              desc: 'Zorunlu alanlar ve ortam kurallarini dogrular.' },
  { name: 'api:create <Modul>',     desc: 'Controller + Service + Validator olusturur.' },
  { name: 'api:crud   <Modul>',     desc: '5 CRUD endpoint + dosyalar olusturur.' },
  { name: 'api:list',               desc: 'Kayitli API endpoint\'lerini listeler.' },
  { name: 'api:docs',               desc: 'api_endpoints.md ve openapi.json uretir.' },
  { name: 'api:middleware <tur>',   desc: 'Middleware dosyasi olusturur (auth|rate-limit|cors).' },
  { name: 'admin:install',               desc: 'Admin panel template kurar (interaktif).' },
  { name: 'backend:install',             desc: 'Auth + User Management backend kurar.' },
  { name: 'stack:install',               desc: 'Admin panel + backend birlikte kurar.' },
  { name: 'admin:add-module <Modul>',    desc: 'Admin panele yeni modul ekler (liste+form+route).' },
  { name: 'admin:list-modules',          desc: 'Kurulu admin modullerini listeler.' },
  { name: 'admin:remove-module <Modul>', desc: 'Admin modulunu kaldirir (onay ister).' },
  { name: 'admin:bind-api <Modul>',      desc: 'Admin modulunu API endpoint ile baglar.' },
  { name: 'admin:theme:set <tema>',      desc: 'Admin tema ayarini gunceller (light|dark|auto|minimal).' },
  { name: 'security:list',               desc: 'Tüm güvenlik katmanlarinin durumunu gösterir.' },
  { name: 'security:enable <tur>',       desc: 'Güvenlik katmanini etkinlestirir (csrf|xss|rate-limit|...).' },
  { name: 'security:disable <tur>',      desc: 'Güvenlik katmanini devre disi birakir.' },
  { name: 'security:mode <mod>',         desc: 'Güvenlik modunu ayarlar (strict|balanced|relaxed).' },
  { name: 'security:audit',              desc: 'Risk skoru hesaplar, rapor uretir.' },
  { name: 'security:fix',                desc: 'Eksik/kapali güvenlikleri otomatik açar.' },
  { name: 'security:reset',              desc: 'Tüm güvenlik ayarlarini varsayilana sifirlar.' },
  { name: 'security:disable-all',        desc: 'TEHLIKELI — tüm güvenlikleri kapatir (uzun onay).' },
  { name: 'backup',                      desc: 'Proje + DB yeđeği alir. (--list|--restore|--delete|--clean)' },
  { name: 'github:init',                 desc: 'GithubCtrl.json olusturur, git init + remote ekler.' },
  { name: 'github:push',                 desc: 'git add + commit + push yapar. (--message="<msg>")' },
  { name: 'github:pull',                 desc: 'git pull yapar.' },
  { name: 'github:sync',                 desc: 'pull + push sirasiyla yapar.' },
  { name: 'github:status',               desc: 'Degistirilmis dosyalari ve dal durumunu gosterir.' },
  { name: 'github:log',                  desc: 'Son 10 commit ozetini gosterir.' },
  { name: 'mb:init',                     desc: 'memory-bank dosyalarini template\'ten yeniden olusturur.' },
  { name: 'mb:update <dosya>',           desc: 'Memory-bank dosyasina taihli not ekler. (--note="")' },
  { name: 'mb:list',                     desc: 'memory-bank/ dosyalarini listeler.' },
  { name: 'mb:show <dosya>',             desc: 'Belirtilen memory-bank dosyasini gosterir.' },
  { name: 'run <dosya>',                 desc: 'PHP/Python/Node/Go scriptini sandbox\'ta calistirir.' },
  { name: 'runtime:list',                desc: 'Mevcut runtime\'lari ve durumlarini gosterir.' },
  { name: 'runtime:enable <dil>',        desc: 'Runtime\'i etkinlestirir (python|node|go|php).' },
  { name: 'runtime:disable <dil>',       desc: 'Runtime\'i devre disi birakir.' },
  { name: 'runtime:add <dil>',           desc: 'Yeni runtime ekler.' },
  { name: 'api:test <url> <method>',     desc: 'Tek API endpointini test eder (GET/POST/PUT/DELETE).' },
  { name: 'api:test-suite',              desc: 'routes/api.php deki tum endpointleri test eder.' },
  { name: 'test:install',                desc: 'PHPUnit kurar ve tests/ klasor yapisini olusturur.' },
  { name: 'test:run [dosya]',            desc: 'PHPUnit testlerini calistirir.' },
  { name: 'test:coverage',               desc: 'HTML coverage raporu uretir (storage/coverage/).' },
  { name: 'deploy:check',                desc: 'Production deploy oncesi kontrol listesini calistirir.' },
  { name: 'deploy:nginx-config',         desc: 'Nginx server bloku ornegini gosterir.' },
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
