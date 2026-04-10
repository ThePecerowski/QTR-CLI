'use strict';

/**
 * src/utils/git.js
 * Git kurulum kontrolü ve temel git komut yardımcıları.
 */

const { execSync, spawnSync } = require('child_process');

/**
 * Git'in PATH'te kurulu olup olmadığını kontrol eder.
 * @returns {boolean}
 */
function isGitInstalled() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Belirtilen dizinin bir git deposu (working tree) olup olmadığını kontrol eder.
 * @param {string} dir
 * @returns {boolean}
 */
function isGitRepo(dir) {
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd: dir, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Mevcut branch adını döner; git yoksa veya repo değilse null döner.
 * @param {string} cwd
 * @returns {string|null}
 */
function getCurrentBranch(cwd) {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { cwd, stdio: 'pipe' }).toString().trim();
  } catch {
    return null;
  }
}

/**
 * Git komutunu spawn ile çalıştırır (stdio: inherit).
 * @param {string[]} args  — git'e iletilecek argümanlar
 * @param {string}   cwd   — çalışma dizini
 * @returns {number} exit kodu
 */
function gitRun(args, cwd) {
  const result = spawnSync('git', args, { cwd, stdio: 'inherit', shell: false });
  return result.status || 0;
}

/**
 * `git status --short` çıktısını satır dizisi olarak döner.
 * @param {string} cwd
 * @returns {string[]}
 */
function getStatusLines(cwd) {
  try {
    const out = execSync('git status --short', { cwd, stdio: 'pipe' }).toString();
    return out.split('\n').filter(l => l.trim().length > 0);
  } catch {
    return [];
  }
}

/**
 * Son `n` commit'in format dizisini döner.
 * @param {string} cwd
 * @param {number} n
 * @returns {string[]}
 */
function getRecentCommits(cwd, n = 10) {
  try {
    const out = execSync(
      `git log --oneline -${n} --no-color`,
      { cwd, stdio: 'pipe' }
    ).toString();
    return out.split('\n').filter(l => l.trim().length > 0);
  } catch {
    return [];
  }
}

module.exports = { isGitInstalled, isGitRepo, getCurrentBranch, gitRun, getStatusLines, getRecentCommits };
