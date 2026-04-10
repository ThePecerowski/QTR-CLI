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

  // QTR Framework varsayilan degerleri
  DEFAULT_PORT:            8000,
  DEFAULT_SECURITY_MODE:   'strict',
  BACKUP_MAX_COUNT:        10,
  RUNNER_TIMEOUT:          30000,  // ms — qtr run sandbox timeout

  // .env'de gizlenmesi gereken hassas anahtar adlari
  SENSITIVE_KEYS: ['DB_PASS', 'MAIL_PASS', 'API_KEY', 'SECRET', 'TOKEN', 'PASSWORD'],

  // .env'de zorunlu olması gereken anahtarlar
  REQUIRED_ENV_KEYS: ['DB_HOST', 'DB_NAME', 'APP_ENV'],
};

module.exports = config;
