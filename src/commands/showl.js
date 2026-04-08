'use strict';

const { sendCommand } = require('../utils/connection');

const INFO_TEXT = 'showl: Bagli tum cihazlari sira numarasiyla listeler. (Sira no, cihaz adi)';
const HELP_TEXT = [
  'showl komutu icin sorun giderme:',
  '  1. SpeakerQuarter uygulamasinin calisir durumda oldugunu kontrol edin.',
  '  2. "qtr fix" komutunu calistirarak kurulumu dogrulayin.',
].join('\n');

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

    const devices = res.devices || [];
    if (devices.length === 0) {
      console.log('\nHicbir cihaz bulunamadi.\n');
      return;
    }

    console.log('\nBagli Cihazlar:');
    for (const d of devices) {
      const durum = d.blocked ? ' [ENGELLI]' : '';
      console.log(`  ${String(d.index).padStart(2)}. ${d.name || '(isimsiz)'}${durum}`);
    }
    console.log('');
  } catch (err) {
    console.error('Hata: ' + err.message);
    process.exitCode = 1;
  }
}

module.exports = { execute };
