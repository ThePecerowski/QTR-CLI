'use strict';

const { sendCommand, isAppRunning } = require('../utils/connection');
const { execSync } = require('child_process');

const INFO_TEXT = 'fix: CLI ve uygulama kurulumunun dogru calisip calismadigini kontrol eder.';
const HELP_TEXT = [
  'fix komutu parametreleri:',
  '  fix            -- Temel baglanti testi yapar.',
  '  fix --doctor   -- Windows ortamini ve kurulumu derinlemesine kontrol eder.',
  '  fix --show     -- Tespit edilen sorunlari nasil cozecegini anlatir.',
].join('\n');

// Basit versiyon kontrolu
function getNodeVersion() {
  try { return process.version; } catch { return null; }
}

function getNpmVersion() {
  try { return execSync('npm --version', { stdio: 'pipe' }).toString().trim(); } catch { return null; }
}

function checkExeExists() {
  const path = require('path');
  const fs   = require('fs');
  // Olasilik: ayni surucude ya da PATH üzerinde
  const candidates = [
    path.join(process.env.LOCALAPPDATA || '', 'SpeakerQuarter', 'SpeakerQuarter.exe'),
    'C:\\Program Files\\SpeakerQuarter\\SpeakerQuarter.exe',
  ];
  return candidates.some(p => fs.existsSync(p));
}

async function runBasicCheck() {
  const checks = [];

  // 1. Node.js
  const nodeVer = getNodeVersion();
  checks.push({ label: 'Node.js',   ok: !!nodeVer, detail: nodeVer || 'bulunamadi' });

  // 2. npm
  const npmVer = getNpmVersion();
  checks.push({ label: 'npm',       ok: !!npmVer,  detail: npmVer  || 'bulunamadi' });

  // 3. Uygulama baglantisi
  const running = await isAppRunning();
  checks.push({
    label: 'SpeakerQuarter baglantisi',
    ok: running,
    detail: running ? 'Baglanti basarili' : 'Uygulama calismiyor veya baglanti kurulamiyor',
  });

  return checks;
}

async function runDoctorCheck() {
  const checks = await runBasicCheck();

  // 4. Windows WASAPI / ses hizmeti
  try {
    const audsrv = execSync('sc query AudioSrv', { stdio: 'pipe' }).toString();
    const running = audsrv.includes('RUNNING');
    checks.push({ label: 'Windows Ses Servisi (AudioSrv)', ok: running, detail: running ? 'Calisiyor' : 'Durdurulmus' });
  } catch {
    checks.push({ label: 'Windows Ses Servisi (AudioSrv)', ok: false, detail: 'Sorgulanamadi' });
  }

  // 5. SpeakerQuarter.exe varligi
  const exeFound = checkExeExists();
  checks.push({
    label: 'SpeakerQuarter.exe',
    ok: exeFound,
    detail: exeFound ? 'Bulundu' : 'Standart konumlarda bulunamadi (PATH kontrolu yapilmadi)',
  });

  return checks;
}

function printChecks(checks) {
  const padLabel = 40;
  console.log('');
  for (const c of checks) {
    const status = c.ok ? '[OK]  ' : '[HATA]';
    console.log(`  ${status}  ${c.label.padEnd(padLabel)} ${c.detail}`);
  }
  const allOk = checks.every(c => c.ok);
  console.log('');
  console.log(allOk
    ? 'Tum kontroller basarili.'
    : 'Bazi kontroller basarisiz. "qtr fix --show" ile cozum onerilerini gorebilirsiniz.');
  console.log('');
}

const SHOW_TEXT = `
SpeakerQuarter CLI Sorun Giderme Kilavuzu
==========================================

[HATA] SpeakerQuarter baglantisi -- Uygulama calismiyor
  -> SpeakerQuarter.exe uygulamasini baslatin.
  -> Uygulama sistem tepsisinde (sag alt kose) kucultulmus olabilir.

[HATA] Windows Ses Servisi (AudioSrv) -- Durdurulmus
  -> Windows + R > services.msc acin.
  -> "Windows Audio" servisini bulup "Baslat" a tiklayin.
  -> Veya terminalde: net start AudioSrv

[HATA] Node.js / npm bulunamadi
  -> https://nodejs.org adresinden LTS surumu indirip kurun.

[HATA] SpeakerQuarter.exe standart konumda bulunamadi
  -> Bu bir uyari: uygulama farkli bir konumda olmasi durumunda
     baglanti testi yukaridaki baglanti kontrolune bakar.
     Eger baglanti OK ise bu uyari onemsizdir.
`;

async function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  if (params.show) {
    console.log(SHOW_TEXT);
    return;
  }

  const deep = !!params.doctor;
  console.log(deep ? 'Derinlemesine sistem kontrolu yapiliyor...' : 'Temel kontroller yapiliyor...');

  try {
    const checks = deep ? await runDoctorCheck() : await runBasicCheck();
    printChecks(checks);
    const anyFail = checks.some(c => !c.ok);
    if (anyFail) process.exitCode = 1;
  } catch (err) {
    console.error('Kontrol sirasinda hata: ' + err.message);
    process.exitCode = 1;
  }
}

module.exports = { execute };
