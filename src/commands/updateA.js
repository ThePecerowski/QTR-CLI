'use strict';

const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const { getLatestRelease, downloadFile, compareVersions } = require('../utils/github');
const config  = require('../config/config');

const INFO_TEXT = 'updateA: SpeakerQuarter uygulamasini GitHub uzerinden en son surume gunceller.';
const HELP_TEXT = [
  'updateA komutu icin sorun giderme:',
  '  1. Internet baglantinizi kontrol edin.',
  '  2. GitHub API erisimini dogrulayin (api.github.com).',
  '  3. Indirme sirasinda yetki hatasi aliyorsaniz terminali yonetici olarak calistirin.',
].join('\n');

async function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  try {
    console.log('GitHub uzerinden en son surum kontrol ediliyor...');
    const release = await getLatestRelease(config.app.githubRepoApp);
    const latest  = release.tag_name;

    // Mevcut surum varsa karsilastir (uygulama IPC uzerinden sorgulanabilir
    // ama henuz bu endpoint yok; simdilik her zaman guncelle)
    console.log(`En son surum: ${latest}`);

    // .exe asset'i bul
    const asset = (release.assets || []).find(a =>
      a.name.endsWith('.exe') || a.name.endsWith('.zip') || a.name.endsWith('.msi')
    );

    if (!asset) {
      console.error('Hata: Bu release icin indirilebilir dosya bulunamadi.');
      process.exitCode = 1;
      return;
    }

    console.log(`Dosya: ${asset.name} (${(asset.size / 1024 / 1024).toFixed(1)} MB)`);

    // Gecici dizine indir
    const tmpPath = path.join(os.tmpdir(), asset.name);
    await downloadFile(asset.browser_download_url, tmpPath);

    console.log(`Indirme tamamlandi: ${tmpPath}`);
    console.log('Guncelleme tamamlandi. Yeni surumu kullanmak icin uygulamayi yeniden baslatin.');

  } catch (err) {
    console.error('Hata: ' + err.message);
    process.exitCode = 1;
  }
}

module.exports = { execute };
