# Memory-Bank Nasıl Kullanılır — QTR CLI

Bu memory-bank, QTR CLI projesinin AI destekli geliştirilmesini kolaylaştırmak için tasarlanmıştır.

## Temel Kural

Her yeni sohbette AI önce şu dosyaları okumalıdır:
1. CurrentProject.md — CLI'ın mevcut durumu
2. Current-Durum.md — Son geliştirme durumu
3. Current-Hatalar.md — Aktif hatalar

## Dosya Türleri

### Current- Dosyaları
Projenin o alandaki son değişikliklerini tutar. Her önemli değişiklikten sonra güncellenir.

| Dosya | İçerik |
|---|---|
| Current-Degisiklikler.md | Yapılan değişiklikler (komut ekle/kaldır, dosya güncelle) |
| Current-Durum.md | Geliştirme aşaması ve öncelikler |
| Current-Hatalar.md | Açık hatalar ve çözüm durumları |

### Project- Dosyaları
CLI'ın teknik yapısını kalıcı olarak belgeler. Büyük mimari değişikliklerde güncellenir.

| Dosya | İçerik |
|---|---|
| Project-Mimari.md | Teknoloji seçimleri, klasör yapısı, tasarım kararları |
| Project-CalismaSecli.md | Komut akışı, yönlendirme mantığı, işleyiş |
| Project-Dosyalar.md | Her dosyanın görevi ve konumu |
| Project-Fonksiyonlar.md | Komut grupları ve komut listesi |
| Project-Baglantilar.md | QTR Framework ile bağlantı, dış bağımlılıklar |
| Project-Parametreler.md | Global ve özel komut parametreleri |

## Güncelleme Zamanları

| Olay | Güncellenen Dosya |
|---|---|
| Yeni komut eklendi | Project-Fonksiyonlar.md, Current-Degisiklikler.md |
| Hata bulundu | Current-Hatalar.md |
| Hata çözüldü | Current-Hatalar.md, FixedIssue.md |
| Mimari değişti | Project-Mimari.md, Current-Degisiklikler.md |
| Yeni parametre eklendi | Project-Parametreler.md |
| Yeni bağımlılık eklendi | Project-Baglantilar.md |

## İlgili Belgeler

- Tam CLI dokümantasyonu: d:/Projelerim/QTR_Web_Framework/memory-bank/About-CLI/About-CLI.md
- QTR Framework memory-bank: d:/Projelerim/QTR_Web_Framework/memory-bank/
