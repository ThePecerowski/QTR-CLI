'use strict';

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const config = require('../config/config');

/**
 * GitHub Releases API'den en son release bilgisini getirir.
 *
 * @param {string} repo - config.app.githubRepoApp veya githubRepoCLI
 * @returns {Promise<{tag_name: string, assets: Array}>}
 */
function getLatestRelease(repo) {
  const owner = config.app.githubOwner;
  const url   = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path:     `/repos/${owner}/${repo}/releases/latest`,
      method:   'GET',
      headers:  {
        'User-Agent': `qtr-cli/${config.version}`,
        'Accept':     'application/vnd.github+json',
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 404) {
          return reject(new Error(`Repo bulunamadi: ${owner}/${repo}`));
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`GitHub API hatasi (HTTP ${res.statusCode})`));
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error('GitHub yaniti parse edilemedi.'));
        }
      });
    });

    req.on('error', err => reject(new Error(`GitHub baglantisi kurulamiyor: ${err.message}`)));
    req.on('timeout', () => { req.destroy(); reject(new Error('GitHub API zaman asimina ugradi.')); });
    req.end();
  });
}

/**
 * Verilen URL'den dosyayi indirip belirtilen yola yazar.
 * Redirect'leri (301/302) takip eder.
 * Indirme ilerlemesini konsola yazar.
 *
 * @param {string} url      - Indirme URL'si
 * @param {string} destPath - Kaydedilecek dosya yolu
 * @returns {Promise<void>}
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const doRequest = (currentUrl) => {
      const parsed  = new URL(currentUrl);
      const options = {
        hostname: parsed.hostname,
        path:     parsed.pathname + parsed.search,
        method:   'GET',
        headers:  { 'User-Agent': `qtr-cli/${config.version}` },
        timeout:  60000,
      };

      const mod = parsed.protocol === 'https:' ? https : require('http');
      const req = mod.request(options, (res) => {
        // Redirect takibi
        if (res.statusCode === 301 || res.statusCode === 302) {
          return doRequest(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Indirme basarisiz (HTTP ${res.statusCode})`));
        }

        const total     = parseInt(res.headers['content-length'] || '0', 10);
        let   received  = 0;
        const file      = fs.createWriteStream(destPath);

        res.on('data', (chunk) => {
          received += chunk.length;
          file.write(chunk);
          if (total > 0) {
            const pct = Math.floor((received / total) * 100);
            process.stdout.write(`\r  Indiriliyor... %${pct} (${(received / 1024 / 1024).toFixed(1)} MB)`);
          }
        });

        res.on('end', () => {
          file.end();
          process.stdout.write('\n');
          resolve();
        });

        res.on('error', (err) => { file.destroy(); reject(err); });
      });

      req.on('error', err => reject(new Error(`Indirme hatasi: ${err.message}`)));
      req.on('timeout', () => { req.destroy(); reject(new Error('Indirme zaman asimina ugradi.')); });
      req.end();
    };

    doRequest(url);
  });
}

/**
 * Semantik versiyon karsilastirir.
 * @param {string} v1 - "v1.2.3" veya "1.2.3"
 * @param {string} v2 - "v1.2.3" veya "1.2.3"
 * @returns {number} >0 v1 yeniyse, <0 v2 yeniyse, 0 esitse
 */
function compareVersions(v1, v2) {
  const parse = v => String(v).replace(/^v/, '').split('.').map(Number);
  const [a1, a2, a3] = parse(v1);
  const [b1, b2, b3] = parse(v2);
  return (a1 - b1) || (a2 - b2) || (a3 - b3);
}

module.exports = { getLatestRelease, downloadFile, compareVersions };
