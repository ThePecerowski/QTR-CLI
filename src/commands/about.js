'use strict';

const config = require('../config/config');

const INFO_TEXT = 'about: CLI ve SpeakerQuarter uygulamasi hakkinda genel bilgi verir.';

function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }

  console.log(`
========================================
  SpeakerQuarter CLI (qtr) v${config.version}
========================================

SpeakerQuarter icin komut satiri araci.
${config.app.name} uygulamasiyla birlikte calisir.

Yapimci : ${config.author.name}
Web     : ${config.author.website}
GitHub  : ${config.author.github}
Proje   : ${config.author.psykolink}
========================================
`);
}

module.exports = { execute };
