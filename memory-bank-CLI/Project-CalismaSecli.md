# Project — Çalışma Şekli (QTR CLI)

> CLI'ın nasıl çalıştığı, komut akışı ve işleyiş mantığı burada anlatılır.
> Tam detay için: `memory-bank/About-CLI/About-CLI.md` Bölüm 2-4

## Komut Akışı (Genel)

```
1. Kullanıcı: qtr <komut> [parametreler]
2. bin/qtr.js  →  giriş noktası
3. src/index.js  →  komutu ayrıştır, ilgili handler'a yönlendir
4. src/commands/<grup>.js  →  komutu çalıştır
5. utils/*.js  →  yardımcı işlemler (fs, git, php, project)
6. .qtr.json  →  proje ayarlarını oku
7. Sonuç kullanıcıya döndürülür
```

## .qtr.json Okuma

Her komut başında projenin `.qtr.json` dosyası okunur. Bu dosya:
- PHP binary yolunu
- Veritabanı bağlantı bilgilerini
- GitHub repo bilgilerini
- Güvenlik modunu içerir.

## Global Parametreler

| Parametre | Davranış |
|---|---|
| `--info` | Komutu çalıştırmadan açıklama gösterir |
| `--help` | Hata durumunda yol gösterir |
| `--stime <saniye>` | Gecikmeyle çalıştırır |
| `--dry-run` | Simüle eder, gerçek değişiklik yapmaz |

## Belirli Komut Akışları

_Henüz doldurulmadı._ (Bkz. About-CLI.md Bölüm 4)
