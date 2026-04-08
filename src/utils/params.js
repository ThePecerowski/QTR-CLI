'use strict';

/**
 * Komut satirindaki ham argumanlari parse eder.
 *
 * Desteklenen parametreler:
 *   --info               => params.info = true
 *   --help               => params.help = true
 *   --stime <saniye>     => params.stime = "30"
 *   --doctor             => params.doctor = true
 *   --show               => params.show = true
 *   <deger>              => params.args dizisine eklenir (orn. band 2)
 *
 * @param {string[]} argv - process.argv'den komut sonrasi gelen kisim
 * @returns {{ args: string[], info?: true, help?: true, stime?: string, doctor?: true, show?: true }}
 */
function parseParams(argv) {
  const params = { args: [] };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (token === '--info') {
      params.info = true;
    } else if (token === '--help') {
      params.help = true;
    } else if (token === '--doctor') {
      params.doctor = true;
    } else if (token === '--show') {
      params.show = true;
    } else if (token === '--stime') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        console.error('Hata: --stime parametresi bir sure degeri gerektirir (saniye). Ornek: --stime 10');
        process.exitCode = 1;
        return params;
      }
      params.stime = next;
      i++;
    } else if (!token.startsWith('--')) {
      params.args.push(token);
    } else {
      console.warn(`Uyari: "${token}" bilinmeyen bir parametre, gozardi ediliyor.`);
    }
  }

  return params;
}

module.exports = { parseParams };
