'use strict';

const { sendCommand } = require('../utils/connection');

const INFO_TEXT = 'showd: Bagli tum cihazlari tablo halinde gosterir. (Ad, MAC adresi, aktiflik, engel durumu)';
const HELP_TEXT = [
  'showd komutu icin sorun giderme:',
  '  1. SpeakerQuarter uygulamasinin calisir durumda oldugunu kontrol edin.',
  '  2. "qtr fix" komutunu calistirarak kurulumu dogrulayin.',
].join('\n');

// Tablo sutun genislikleri
const COL = { index: 5, name: 38, mac: 19, active: 8, blocked: 8 };

function padEnd(str, len) {
  return String(str).padEnd(len).substring(0, len);
}

function printTable(devices) {
  const sep = '-'.repeat(COL.index + COL.name + COL.mac + COL.active + COL.blocked + 8);
  const header =
    padEnd('#',       COL.index)  + '  ' +
    padEnd('Cihaz Adi', COL.name) + '  ' +
    padEnd('MAC Adresi', COL.mac) + '  ' +
    padEnd('Aktif',   COL.active) + '  ' +
    padEnd('Engelli', COL.blocked);

  console.log('\n' + sep);
  console.log(header);
  console.log(sep);

  if (devices.length === 0) {
    console.log('  Hicbir cihaz bulunamadi.');
  } else {
    for (const d of devices) {
      const row =
        padEnd(d.index,                   COL.index)  + '  ' +
        padEnd(d.name  || '(isimsiz)',     COL.name)   + '  ' +
        padEnd(d.mac   || '-',             COL.mac)    + '  ' +
        padEnd(d.active  ? 'Evet' : 'Hayir', COL.active) + '  ' +
        padEnd(d.blocked ? 'Evet' : 'Hayir', COL.blocked);
      console.log(row);
    }
  }

  console.log(sep + '\n');
}

async function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  try {
    const res = await sendCommand({ cmd: 'GET_DEVICES' });
    if (!res.ok) {
      console.error('Hata: ' + (res.error || 'bilinmeyen hata'));
      process.exitCode = 1;
      return;
    }
    printTable(res.devices || []);
  } catch (err) {
    console.error('Hata: ' + err.message);
    process.exitCode = 1;
  }
}

module.exports = { execute };
