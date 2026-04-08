# About Project - SpeakerQuarter CLI

## Proje Hakkında

Bu proje bir Node.js CLI eklentisidir. SpeakerQuarter uygulaması için bir CLI aracı olarak geliştirilmektedir.

Ayrı olarak geliştirilecek ancak `qtr` kütüphanesi ile uygulama ile bağlantılı çalışacaktır.

## CLI Kütüphanesi

Kütüphane adı: **qtr** (Quarter)

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `showd` | Bütün cihazları tablo halinde gösterir (ad, MAC adresi vb.) |
| `showl` | Bütün cihazları listeler (sıra numarası ve adları) |
| `band <sıra>` | Cihaz sırasına göre engeller |
| `unban <sıra>` | Cihaz sırasına göre engeli kaldırır |
| `stopengine` | Motoru durdurur |
| `startengine` | Motoru başlatır |
| `help` | Bütün komutları ve açıklamalarını gösterir |
| `fix` | CLI ve Uygulama kurulumunda sorun olup olmadığını kontrol eder |
| `about` | CLI ve Uygulama hakkında genel bilgi verir |
| `updateA` | Uygulamanın GitHub'dan en son sürümünü indirip günceller |
| `updateC` | CLI'ın GitHub'dan en son sürümünü indirip günceller |

## Genel Parametreler

| Parametre | Açıklama |
|-----------|----------|
| `--info` | Komutun ne işe yaradığını söyler |
| `--help` | Komutun hata vermesi durumunda ne yapılabileceğini söyler |
| `--stime <süre>` | Belirlenen süre sonra komutu çalıştırır |

## Özel Parametreler

### fix komutu
| Parametre | Açıklama |
|-----------|----------|
| `--doctor` | Windows'da uygulamanın ve CLI'ın çalışmasına engel bir şey var mı kontrol eder |
| `--show` | Mevcut sorunların nasıl düzeltileceği hakkında bilgi verir |

## Teknik Bilgiler

- **Dil:** Node.js

## Yapımcı Bilgileri

- **Ad:** Recep Samet Yıldız
- **Web Site:** https://www.yildizportfolio.com/
- **GitHub:** https://github.com/ThePecerowski
