# qtr — SpeakerQuarter CLI

**SpeakerQuarter** uygulaması için komut satırı aracı.  
Windows ses cihazlarını terminalizden yönetmenizi sağlar.

---

## Kurulum

```bash
npm install -g qtr
```

veya yerel geliştirme için:

```bash
git clone https://github.com/ThePecerowski/QTR-CLI.git
cd SpeakerQuarterCLI
npm link
```

> **Not:** `qtr`, [SpeakerQuarter](https://github.com/ThePecerowski/SpeakerQuarter) uygulamasının çalışır durumda olmasını gerektirir.

---

## Kullanım

```
qtr <komut> [parametreler]
```

---

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `showd` | Tüm cihazları tablo halinde gösterir (ad, MAC, aktiflik, engel durumu) |
| `showl` | Tüm cihazları sıralı liste halinde gösterir |
| `band <sıra>` | Belirtilen sıradaki cihazı engeller |
| `unban <sıra>` | Belirtilen sıradaki cihazın engelini kaldırır |
| `startengine` | Ses motorunu başlatır |
| `stopengine` | Ses motorunu durdurur |
| `help` | Tüm komutları listeler |
| `fix` | Kurulum ve bağlantı kontrolü yapar |
| `about` | CLI ve uygulama hakkında bilgi verir |
| `updateA` | SpeakerQuarter uygulamasını günceller |
| `updateC` | CLI'yi günceller |

---

## Parametreler

Her komutla kullanılabilir:

| Parametre | Açıklama |
|-----------|----------|
| `--info` | Komutun ne işe yaradığını anlatır |
| `--help` | Hata durumunda ne yapılacağını anlatır |
| `--stime <saniye>` | Belirtilen süre (sn) sonra komutu çalıştırır |

`fix` komutuna özel:

| Parametre | Açıklama |
|-----------|----------|
| `--doctor` | Windows ortamını derinlemesine kontrol eder |
| `--show` | Sorunların nasıl çözüleceğini gösterir |

---

## Örnekler

```bash
# Cihaz listesi (tablo)
qtr showd

# Cihaz listesi (liste — sıra numarası için)
qtr showl

# 3 numaralı cihazı engelle
qtr band 3

# 3 numaralı cihazın engelini kaldır
qtr unban 3

# Motoru başlat / durdur
qtr startengine
qtr stopengine

# Kurulum kontrolü
qtr fix
qtr fix --doctor
qtr fix --show

# 10 saniye sonra motoru durdur
qtr stopengine --stime 10
```

---

## Gereksinimler

- Windows 10/11
- Node.js >= 18
- [SpeakerQuarter](https://github.com/ThePecerowski/SpeakerQuarter) uygulaması

---

## Yapımcı

**Recep Samet Yıldız**  
Web: https://www.yildizportfolio.com/  
GitHub: https://github.com/ThePecerowski  
PsykoLink: https://psykolink.com/

---

## Lisans

MIT
