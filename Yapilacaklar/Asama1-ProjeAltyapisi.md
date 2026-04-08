# Aşama 1 - Proje Altyapısı ve Temel Kurulum

## Hedef
Node.js CLI projesinin temel yapısını kurmak, `qtr` kütüphanesinin iskeletini oluşturmak.

## Yapılacaklar

### 1.1 Proje Klasör Yapısı Oluşturma
```
SpeakerQuarterCLI/
├── src/
│   ├── index.js               # Ana giriş noktası, komut yönlendirici
│   ├── commands/
│   │   ├── showd.js           # Cihazları tablo halinde göster
│   │   ├── showl.js           # Cihazları listele
│   │   ├── band.js            # Cihaz engelle
│   │   ├── unban.js           # Cihaz engelini kaldır
│   │   ├── stopengine.js      # Motoru durdur
│   │   ├── startengine.js     # Motoru başlat
│   │   ├── help.js            # Yardım komutu
│   │   ├── fix.js             # Kurulum kontrol
│   │   ├── about.js           # Hakkında bilgisi
│   │   ├── updateA.js         # Uygulama güncelleme
│   │   └── updateC.js         # CLI güncelleme
│   ├── utils/
│   │   ├── params.js          # Parametre parse (--info, --help, --stime)
│   │   └── connection.js      # SpeakerQuarter uygulaması ile bağlantı
│   └── config/
│       └── config.js          # CLI ayarları
├── package.json
├── README.md
└── bin/
    └── qtr.js                 # Global CLI giriş noktası
```

### 1.2 Node.js Proje Başlatma
- `npm init` ile package.json oluşturulacak
- `bin` alanı package.json'a eklenecek (`"qtr": "./bin/qtr.js"`)
- Gerekli bağımlılıklar belirlenip kurulacak
- `npm link` ile lokal geliştirme ortamında test edilebilir olacak

### 1.3 Temel CLI Giriş Noktası
- `bin/qtr.js` - Shebang satırı (`#!/usr/bin/env node`)
- `src/index.js` - Komut satırı argümanlarını parse etme
- Komut yönlendirme mekanizması (hangi komut çağrılacak)
- Genel parametre işleme (`--info`, `--help`, `--stime`)

### 1.4 Hata Yönetimi Temel Yapısı
- Bilinmeyen komut hatası
- Eksik parametre hatası
- Genel hata yakalama

## Bağımlılıklar
- Node.js (LTS sürüm)
- npm

## Durum
- [x] Tamamlandı (08.04.2026)
