# Current — Hatalar (QTR CLI)

> CLI projesinde tespit edilen hatalar burada tutulur.

## Hata Formatı

`
### [Hata Başlığı]
- **Tarih:** GG.AA.YYYY
- **Dosya/Komut:**
- **Açıklama:**
- **Durum:** Açık / Çözüldü
`

---

## Aktif Hatalar

_Henüz aktif hata bulunmamaktadır._

---

## Öğrenilen Dersler (Tekrar Edilmeyecek)

### `params.js`'e yeni parametre eklerken dikkat edilmesi gerekenler
Yeni bir komut `--xyz` parametresi kullanıyorsa mutlaka `src/utils/params.js` dosyasına eklenmeli. Eklenmezse parametre sessizce göz ardı edilir ve komut beklenmedik davranır — hata mesajı vermez, bu yüzden fark edilmesi güçtür.

### Komutlar her dizinden çalışabilmeli
`findProjectRoot()` kullanan tüm komutlarda `--path` parametresi desteği olmalı. Kullanıcı veya AI farklı dizinden `qtr` çalıştırdığında proje kökü bulunamaz. `params.path` kontrolü her `execute()` başında eklenebilir.
