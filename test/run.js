'use strict';

/**
 * qtr CLI birim test kosucusu.
 * Harici bagimliligi olmayan testleri calistirir.
 * Kullanim: node test/run.js
 */

const { parseParams } = require('../src/utils/params');
const { compareVersions } = require('../src/utils/github');

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  [OK]   ${label}`);
    passed++;
  } else {
    console.log(`  [HATA] ${label}${detail ? ' -- ' + detail : ''}`);
    failed++;
  }
}

// ── params.js testleri ──────────────────────────────────────────────────────
console.log('\nparams.js testleri:');

let p = parseParams([]);
assert('Bos argv -> bos args', p.args.length === 0);

p = parseParams(['2']);
assert('Pozisyonel arg args[0]', p.args[0] === '2');

p = parseParams(['--info']);
assert('--info algilandi', p.info === true);

p = parseParams(['--help']);
assert('--help algilandi', p.help === true);

p = parseParams(['--doctor']);
assert('--doctor algilandi', p.doctor === true);

p = parseParams(['--show']);
assert('--show algilandi', p.show === true);

p = parseParams(['--stime', '15']);
assert('--stime degeri dogru', p.stime === '15');

p = parseParams(['band', '--info']);
assert('Karma: args ve --info', p.args[0] === 'band' && p.info === true);

// ── github.js / compareVersions testleri ───────────────────────────────────
console.log('\ncompareVersions() testleri:');

assert('v1.0.0 == v1.0.0', compareVersions('v1.0.0', 'v1.0.0') === 0);
assert('v1.1.0 > v1.0.0',  compareVersions('v1.1.0', 'v1.0.0')  > 0);
assert('v1.0.0 < v1.1.0',  compareVersions('v1.0.0', 'v1.1.0')  < 0);
assert('v2.0.0 > v1.9.9',  compareVersions('v2.0.0', 'v1.9.9')  > 0);
assert('v prefix olmadan', compareVersions('1.2.3',  'v1.2.2')   > 0);

// ── komut dosyasi varligi testleri ──────────────────────────────────────────
console.log('\nKomut dosyalari var mi:');

const COMMANDS = ['showd','showl','band','unban','startengine','stopengine',
                  'help','fix','about','updateA','updateC'];
const path = require('path');
const fs   = require('fs');

for (const cmd of COMMANDS) {
  const p = path.join(__dirname, '..', 'src', 'commands', cmd + '.js');
  assert(`src/commands/${cmd}.js`, fs.existsSync(p));
}

// ── index.js COMMANDS map testleri ─────────────────────────────────────────
console.log('\nindex.js COMMANDS map:');

// require ile her komutu yuklemeye calis
for (const cmd of COMMANDS) {
  try {
    const mod = require(`../src/commands/${cmd}`);
    assert(`${cmd} modulu yuklenebiliyor`, typeof mod.execute === 'function');
  } catch (e) {
    assert(`${cmd} modulu yuklenebiliyor`, false, e.message);
  }
}

// ── Sonuc ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Toplam: ${passed + failed} test  |  Basarili: ${passed}  |  Basarisiz: ${failed}`);
console.log('─'.repeat(50) + '\n');

if (failed > 0) process.exitCode = 1;
