# Project — Mimari (QTR CLI)

> CLI'ın mimari yapısı, teknoloji seçimleri ve tasarım kararları burada anlatılır.
> Tam detay için: `memory-bank/About-CLI/About-CLI.md` Bölüm 2

## Teknoloji Seçimleri

| Bileşen | Teknoloji | Neden |
|---|---|---|
| Dil | Node.js (>= 18) | Cross-platform, hızlı geliştirme, npm ekosistemi |
| Komut ayrıştırıcı | Yerleşik argüman parser | Gereksiz bağımlılık eklememek için |
| IPC / Süreç | `child_process` (Node.js) | PHP ve diğer runtime'ları çağırmak için |
| Dosya işlemleri | `fs` modülü | Proje dosyası oluşturma/düzenleme |
| GitHub işlemleri | Sistem `git` binary'si | Token saklamamak için |
| Config dosyası | `.qtr.json` (proje kökünde) | Proje bazlı ayar merkezi |

## Klasör Yapısı

```
SpeakerQuarterCLI/
├── bin/
│   └── qtr.js            ← Giriş noktası
├── src/
│   ├── index.js          ← Komut yönlendirici
│   ├── commands/         ← Her komut grubu ayrı dosyada
│   ├── config/
│   │   └── config.js     ← CLI sabitleri
│   └── utils/
│       ├── params.js
│       ├── connection.js
│       ├── github.js
│       └── project.js
├── templates/            ← Memory-bank şablonları
├── memory-bank-CLI/      ← Bu klasör
└── package.json
```

## Komut Adlandırma Kuralı

```
qtr <grup>:<eylem> [hedef] [--parametre]
```

Basit komutlar grup olmadan da çalışır: `qtr help`, `qtr fix`, `qtr serve`

## Tasarım Kararları

_Henüz doldurulmadı._
