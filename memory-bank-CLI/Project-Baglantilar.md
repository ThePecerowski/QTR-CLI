# Project — Bağlantılar (QTR CLI)

> CLI'ın dış bağlantıları, bağımlılıkları ve QTR Framework ile ilişkisi burada anlatılır.

## QTR Framework Bağlantısı

CLI, QTR Framework projelerini yönetir. İki proje birbirinden bağımsız geliştirilir:
- CLI: `d:/Projelerim/QTR_Web_Framework/SpeakerQuarterCLI/`
- Framework: `d:/Projelerim/QTR_Web_Framework/`

CLI, framework'ü şu yollarla yönetir:
- `child_process` ile PHP binary'sini çalıştırır
- `fs` ile proje dosyalarını oluşturur/günceller
- `.qtr.json` üzerinden proje ayarlarını okur/yazar
- Sistem `git` binary'si üzerinden GitHub işlemleri yapar

## Dış Bağımlılıklar

| Bağımlılık | Tür | Neden |
|---|---|---|
| Node.js >= 18 | Runtime | CLI'ın çalışma ortamı |
| PHP binary | Sistem | `qtr serve` ve proje komutları için |
| Git binary | Sistem | `qtr github:*` komutları için |
| MySQL / PDO | Sistem | `qtr db:run` için |

## GitHub Repoları

- **CLI:** _Henüz belirlenmedi_
- **Framework:** _Henüz belirlenmedi_
- **Yapımcı:** https://github.com/ThePecerowski

## npm Bağımlılıkları

Bkz. `package.json` — Minimal bağımlılık prensibi benimsenmiştir.
