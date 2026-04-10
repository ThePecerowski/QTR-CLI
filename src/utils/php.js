'use strict';

/**
 * src/utils/php.js
 * PHP binary tespiti ve PHP komut çalıştırma yardımcıları.
 */

const fs             = require('fs');
const { execFileSync, spawnSync } = require('child_process');

/**
 * .qtr.json config'inden PHP binary yolunu okur.
 * Dosya bulunamazsa veya yol geçersizse null döner.
 * @param {object|null} config — readQtrJson() sonucu
 * @returns {string|null}
 */
function getPhpPath(config) {
  return (config && (config.php || config.php_path)) || null;
}

/**
 * PHP binary'nin disk üzerinde var olduğunu kontrol eder.
 * @param {string|null} phpPath
 * @returns {boolean}
 */
function isPhpPathValid(phpPath) {
  return !!phpPath && fs.existsSync(phpPath);
}

/**
 * PHP binary'yi zorunlu kılar; bulamazsa hata yazdırır, null döner.
 * @param {object|null} config
 * @returns {string|null}
 */
function requirePhpPath(config) {
  const phpPath = getPhpPath(config);
  if (!isPhpPathValid(phpPath)) {
    console.error('[HATA] PHP binary bulunamadı.');
    console.error('  .qtr.json dosyasındaki "php" alanının doğru bir PHP yolu içerdiğinden emin olun.');
    console.error('  Örnek: "php": "C:/xampp/php/php.exe"');
    process.exitCode = 1;
    return null;
  }
  return phpPath;
}

/**
 * PHP ile kısa bir inline kod çalıştırır (php -r "...").
 * Başarılıysa stdout string döner; hata olursa null döner.
 * @param {string} phpPath
 * @param {string} phpCode
 * @returns {string|null}
 */
function phpRun(phpPath, phpCode) {
  try {
    return execFileSync(phpPath, ['-r', phpCode], { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
  } catch {
    return null;
  }
}

/**
 * PHP versiyonunu döner (örn. "8.2.10") ya da bulunamazsa null.
 * @param {string} phpPath
 * @returns {string|null}
 */
function getPhpVersion(phpPath) {
  const out = phpRun(phpPath, 'echo PHP_VERSION;');
  return out || null;
}

/**
 * PDO MySQL bağlantısını inline PHP ile test eder.
 * @param {string} phpPath
 * @param {{host:string, port:number, user:string, pass:string}} db
 * @returns {{ ok: boolean, detail: string }}
 */
function testMysqlConnection(phpPath, db) {
  const host = db.host || 'localhost';
  const port = db.port || 3306;
  const user = db.user || 'root';
  const pass = (db.pass || '').replace(/'/g, "\\'");

  const phpCode = [
    `try {`,
    `  new PDO('mysql:host=${host};port=${port};charset=utf8mb4','${user}','${pass}',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);`,
    `  echo 'OK';`,
    `} catch(Exception $e){ fwrite(STDERR, $e->getMessage()); exit(1); }`,
  ].join(' ');

  try {
    execFileSync(phpPath, ['-r', phpCode], { stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, detail: 'Bağlantı başarılı' };
  } catch (err) {
    const msg = (err.stderr || '').toString().trim() || 'Bağlantı kurulamadı';
    return { ok: false, detail: msg.slice(0, 120) };
  }
}

/**
 * PHP scriptini spawn ile çalıştırır (stdio: inherit).
 * @param {string} phpPath
 * @param {string[]} args
 * @param {string} cwd
 * @returns {number} exit kodu
 */
function phpSpawn(phpPath, args, cwd) {
  const result = spawnSync(phpPath, args, { cwd, stdio: 'inherit', shell: false });
  return result.status || 0;
}

module.exports = { getPhpPath, isPhpPathValid, requirePhpPath, phpRun, getPhpVersion, testMysqlConnection, phpSpawn };
