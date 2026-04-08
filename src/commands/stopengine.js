'use strict';

const { sendCommand } = require('../utils/connection');

const INFO_TEXT = 'stopengine: SpeakerQuarter ses motorunu durdurur.';
const HELP_TEXT = [
  'stopengine komutu icin sorun giderme:',
  '  1. SpeakerQuarter uygulamasinin calisir durumda oldugunu kontrol edin.',
  '  2. "qtr fix --doctor" ile sistem kontrolu yapabilirsiniz.',
].join('\n');

async function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  try {
    // Once mevcut durumu kontrol et
    const statusRes = await sendCommand({ cmd: 'GET_STATUS' });
    if (statusRes.ok && !statusRes.running) {
      console.log('Motor zaten durdurulmus.');
      return;
    }

    const res = await sendCommand({ cmd: 'STOP_ENGINE' });
    if (!res.ok) {
      console.error('Hata: ' + (res.error || 'bilinmeyen hata'));
      process.exitCode = 1;
      return;
    }
    console.log('Motor durdurma istegi gonderildi.');
  } catch (err) {
    console.error('Hata: ' + err.message);
    process.exitCode = 1;
  }
}

module.exports = { execute };
