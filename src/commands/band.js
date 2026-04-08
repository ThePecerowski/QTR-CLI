'use strict';

const { sendCommand } = require('../utils/connection');

const INFO_TEXT = 'band <sira>: Belirtilen sira numarasindaki cihazi engeller. Ornek: qtr band 2';
const HELP_TEXT = [
  'band komutu icin sorun giderme:',
  '  1. Cihaz sira numarasini "qtr showl" ile ogrenebiilrsiniz.',
  '  2. SpeakerQuarter uygulamasinin calisir durumda oldugunu kontrol edin.',
].join('\n');

async function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  const sira = parseInt(params.args[0], 10);
  if (!params.args[0] || isNaN(sira) || sira < 1) {
    console.error('Hata: Gecerli bir cihaz sira numarasi gerekli. Ornek: qtr band 2');
    console.error('Cihaz listesi icin: qtr showl');
    process.exitCode = 1;
    return;
  }

  try {
    const res = await sendCommand({ cmd: 'BAND', index: sira });
    if (!res.ok) {
      console.error('Hata: ' + (res.error || 'bilinmeyen hata'));
      process.exitCode = 1;
      return;
    }
    console.log(`Cihaz ${sira} engellendi.`);
  } catch (err) {
    console.error('Hata: ' + err.message);
    process.exitCode = 1;
  }
}

module.exports = { execute };
