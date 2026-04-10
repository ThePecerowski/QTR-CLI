# Project — Dosyalar (QTR CLI)

> CLI projesindeki dosyaların görevleri burada anlatılır.
> Tam detay için: `memory-bank/About-CLI/About-CLI.md` Bölüm 2.2

## Mevcut Dosyalar (src/commands/)

| Dosya | Bağlı Komut | Durum |
|---|---|---|
| `about.js` | `qtr about` | Mevcut |
| `band.js` | `qtr band` | Mevcut (eski SpeakerQuarter komutu) |
| `fix.js` | `qtr fix` | Mevcut |
| `help.js` | `qtr help` | Mevcut |
| `showd.js` | `qtr showd` | Mevcut (eski komut) |
| `showl.js` | `qtr showl` | Mevcut (eski komut) |
| `startengine.js` | `qtr startengine` | Mevcut (eski komut) |
| `stopengine.js` | `qtr stopengine` | Mevcut (eski komut) |
| `unban.js` | `qtr unban` | Mevcut (eski komut) |
| `updateA.js` | `qtr updateA` | Mevcut |
| `updateC.js` | `qtr updateC` | Mevcut |

## Planlanan Dosyalar (About-CLI.md'ye göre)

| Dosya | Bağlı Komutlar |
|---|---|
| `create.js` | `qtr create` |
| `serve.js` | `qtr serve` |
| `db.js` | `qtr db:*` |
| `route.js` | `qtr route:*` |
| `api.js` | `qtr api:*` |
| `admin.js` | `qtr admin:*`, `qtr backend:*`, `qtr stack:*` |
| `security.js` | `qtr security:*` |
| `backup.js` | `qtr backup` |
| `github.js` | `qtr github:*` |
| `mb.js` | `qtr mb:*` |
| `run.js` | `qtr run` |
| `runtime.js` | `qtr runtime:*` |

## Yardımcı Dosyalar

| Dosya | Görev |
|---|---|
| `src/utils/connection.js` | Bağlantı yardımcıları |
| `src/utils/github.js` | Git işlemleri |
| `src/utils/params.js` | Parametre ayrıştırıcı |
| `src/config/config.js` | CLI sabitleri (sürüm, URL'ler) |
| `bin/qtr.js` | Giriş noktası |
| `src/index.js` | Komut yönlendirici |
