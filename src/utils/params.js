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
 *   --dry-run            => params['dry-run'] = true
 *   --stop               => params.stop = true
 *   --status             => params.status = true
 *   --force              => params.force = true
 *   --list               => params.list = true
 *   --clean              => params.clean = true
 *   --port=<n>           => params.port = "3000"
 *   --path=<yol>         => params.path = "C:/projeler/..."
 *   --message=<metin>    => params.message = "..."
 *   --branch=<dal>       => params.branch = "main"
 *   --note=<metin>       => params.note = "..."
 *   --section=<baslik>   => params.section = "..."
 *   --data=<json>        => params.data = "..."
 *   --version=<v>        => params.version = "v1"
 *   --restore=<deger>    => params.restore = "..."
 *   --delete=<deger>     => params.delete = "..."
 *   <deger>              => params.args dizisine eklenir (orn. band 2)
 *
 * @param {string[]} argv - process.argv'den komut sonrasi gelen kisim
 * @returns {object}
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
    } else if (token === '--dry-run') {
      params['dry-run'] = true;
    } else if (token === '--stop') {
      params.stop = true;
    } else if (token === '--status') {
      params.status = true;
    } else if (token === '--force') {
      params.force = true;
    } else if (token === '--list') {
      params.list = true;
    } else if (token === '--clean') {
      params.clean = true;
    } else if (token.startsWith('--port=')) {
      params.port = token.slice('--port='.length);
    } else if (token === '--port') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        console.error('Hata: --port parametresi bir port numarasi gerektirir. Ornek: --port 3000');
        process.exitCode = 1;
        return params;
      }
      params.port = next;
      i++;
    } else if (token.startsWith('--path=')) {
      params.path = token.slice('--path='.length);
    } else if (token === '--path') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        console.error('Hata: --path parametresi bir dizin yolu gerektirir.');
        process.exitCode = 1;
        return params;
      }
      params.path = next;
      i++;
    } else if (token.startsWith('--message=')) {
      params.message = token.slice('--message='.length);
    } else if (token === '--message') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        console.error('Hata: --message parametresi bir metin gerektirir.');
        process.exitCode = 1;
        return params;
      }
      params.message = next;
      i++;
    } else if (token.startsWith('--branch=')) {
      params.branch = token.slice('--branch='.length);
    } else if (token === '--branch') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        console.error('Hata: --branch parametresi bir dal adi gerektirir.');
        process.exitCode = 1;
        return params;
      }
      params.branch = next;
      i++;
    } else if (token.startsWith('--note=')) {
      params.note = token.slice('--note='.length);
    } else if (token.startsWith('--section=')) {
      params.section = token.slice('--section='.length);
    } else if (token.startsWith('--data=')) {
      params.data = token.slice('--data='.length);
    } else if (token.startsWith('--version=')) {
      params.version = token.slice('--version='.length);
    } else if (token.startsWith('--restore=')) {
      params.restore = token.slice('--restore='.length);
    } else if (token === '--restore') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        console.error('Hata: --restore parametresi bir tarih/deger gerektirir.');
        process.exitCode = 1;
        return params;
      }
      params.restore = next;
      i++;
    } else if (token.startsWith('--delete=')) {
      params.delete = token.slice('--delete='.length);
    } else if (token === '--delete') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        console.error('Hata: --delete parametresi bir deger gerektirir.');
        process.exitCode = 1;
        return params;
      }
      params.delete = next;
      i++;
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
