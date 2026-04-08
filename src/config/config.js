'use strict';

const config = {
  // CLI versiyonu
  version: '1.0.0',

  // Uygulama bilgileri
  app: {
    name: 'SpeakerQuarter',
    pipeName: '\\\\.\\pipe\\SpeakerQuarterCLI',
    // GitHub release URL'leri (Asama 6'da kullanilacak)
    githubOwner: 'ThePecerowski',
    githubRepoApp: 'SpeakerQuarter',
    githubRepoCLI: 'QTR-CLI',
  },

  // Yapimc bilgileri (about komutu icin)
  author: {
    name: 'Recep Samet Yildiz',
    website: 'https://www.yildizportfolio.com/',
    github: 'https://github.com/ThePecerowski',
    psykolink: 'https://psykolink.com/',
  },
};

module.exports = config;
