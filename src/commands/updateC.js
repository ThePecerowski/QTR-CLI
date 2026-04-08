'use strict';

const path    = require('path');
const os      = require('os');
const { execSync } = require('child_process');
const { getLatestRelease, downloadFile, compareVersions } = require('../utils/github');
const config  = require('../config/config');

const INFO_TEXT = "updateC: qtr CLI'yi GitHub uzerinden en son surume gunceller.";
const HELP_TEXT = [
  'updateC komutu icin sorun giderme:',
  '  1. Internet baglantinizi kontrol edin.',
  '  2. GitHub API erisimini dogrulayin (api.github.com).',
  '  3. npm guncelleme hatasi aliyorsaniz terminali yonetici olarak calistirin.',
].join('\n');

async function execute(params) {
  if (params.info) { console.log(INFO_TEXT); return; }
  if (params.help) { console.log(HELP_TEXT); return; }

  try {
    console.log('GitHub uzerinden CLI en son surum kontrol ediliyor...');
    const release = await getLatestRelease(config.app.githubRepoCLI);
    const latest  = release.tag_name;

    // Mevcut CLI surumunu al
    const current = config.version;
    console.log(`Mevcut surum : v${current}`);
    console.log(`En son surum : ${latest}`);

    if (compareVersions(latest, current) <= 0) {
      console.log('CLI zaten en son surumde, guncelleme gerekmiyor.');
      return;
    }

    console.log('Yeni surum mevcut, npm ile guncelleniyor...');

    // npm pack asset'i ara, yoksa npm install ile guncelle
    const asset = (release.assets || []).find(a => a.name.endsWith('.tgz'));

    if (asset) {
      const tmpPath = path.join(os.tmpdir(), asset.name);
      process.stdout.write('Paket indiriliyor...');
      await downloadFile(asset.browser_download_url, tmpPath);
      execSync(`npm install -g "${tmpPath}"`, { stdio: 'inherit' });
    } else {
      // Direkt GitHub npm paketinden yukle
      const pkg = `${config.app.githubOwner}/${config.app.githubRepoCLI}`;
      execSync(`npm install -g "github:${pkg}"`, { stdio: 'inherit' });
    }

    console.log(`CLI basariyla ${latest} surumune guncellendi.`);
    console.log('Degisikliklerin gecerli olmasi icin yeni bir terminal acin.');

  } catch (err) {
    console.error('Hata: ' + err.message);
    process.exitCode = 1;
  }
}

module.exports = { execute };
