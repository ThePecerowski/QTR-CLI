'use strict';

/**
 * src/utils/project.js
 * .qtr.json okuma/yazma ve proje kök klasörü bulma yardımcıları.
 *
 * Her komut dosyasındaki tekrarlanan findProjectRoot() + readQtrJson()
 * ikilisinin merkezi kaynağı. Yeni komutlar buradan import eder.
 */

const fs   = require('fs');
const path = require('path');

const QTR_JSON = '.qtr.json';

/**
 * process.cwd()'den başlayarak yukarı doğru .qtr.json arar.
 * Bulamazsa null döner.
 * @returns {string|null}
 */
function findProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, QTR_JSON))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * Proje kök dizinindeki .qtr.json içeriğini okur.
 * Parse hatası veya dosya yoksa null döner.
 * @param {string} projectRoot
 * @returns {object|null}
 */
function readQtrJson(projectRoot) {
  try {
    return JSON.parse(fs.readFileSync(path.join(projectRoot, QTR_JSON), 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * .qtr.json dosyasını günceller (var olan içeriği birleştirir).
 * @param {string} projectRoot
 * @param {object} data  — Mevcut config üzerine merge edilecek alan(lar)
 */
function writeQtrJson(projectRoot, data) {
  const configPath = path.join(projectRoot, QTR_JSON);
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch { /* yeni dosya */ }
  const merged = Object.assign({}, existing, data);
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2) + '\n', 'utf-8');
}

/**
 * Proje kökünü bulur; bulamazsa hata yazdırıp process.exitCode=1 set eder.
 * @returns {string|null}
 */
function requireProjectRoot() {
  const root = findProjectRoot();
  if (!root) {
    console.error('[HATA] QTR projesi bulunamadı. (.qtr.json yok)');
    console.error('Bir QTR projesi klasöründe olduğunuzdan emin olun.');
    process.exitCode = 1;
  }
  return root;
}

/**
 * .env dosyasını key=value çiftleri olarak parse eder.
 * @param {string} projectRoot
 * @returns {Record<string, string>}
 */
function readEnvFile(projectRoot) {
  const envPath = path.join(projectRoot, '.env');
  const result  = {};
  if (!fs.existsSync(envPath)) return result;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = val;
  }
  return result;
}

module.exports = { findProjectRoot, readQtrJson, writeQtrJson, requireProjectRoot, readEnvFile };
