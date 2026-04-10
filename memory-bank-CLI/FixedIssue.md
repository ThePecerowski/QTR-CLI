# Çözülen Hatalar — QTR CLI

Bu dosya, CLI projesinde çözülen hataların kaydını tutar.

## Kayıt Formatı

`
### [Hata Başlığı]
- **Tarih:** GG.AA.YYYY
- **Komut/Dosya:** Etkilenen komut veya dosya
- **Açıklama:** Hatanın ne olduğu
- **Sebep:** Neden oluştuğu
- **Çözüm:** Nasıl çözüldüğü
`

---

## Kayıtlar

### 10.04.2026 — `params.js` `--path`, `--message` ve diğer parametreler tanınmıyordu

- **Komut/Dosya:** `src/utils/params.js` — tüm komutlar etkilendi
- **Açıklama:** `--message`, `--path`, `--branch`, `--note`, `--data`, `--version`, `--restore`, `--delete`, `--list`, `--clean` gibi parametreler `parseParams()` içinde tanımlı değildi. Bu yüzden tüm bu parametreler `Uyarı: bilinmeyen parametre, göz ardı ediliyor` ile sessizce atlanıyordu. Sonuç: `qtr github:push --message="..."` mesajı hiç iletmiyordu.
- **Sebep:** `params.js` yalnızca basit boolean flag'ler ve `--port` için yazılmıştı; diğer komutların ihtiyaç duyduğu `key=value` parametreleri eklenmemişti.
- **Çözüm:** Tüm yaygın parametreler `parseParams()` içine eklendi. `--param=değer` ve `--param değer` (space-separated) formatlarının ikisi de desteklenir.

### 10.04.2026 — `qtr github:push` proje dışından çalıştırılınca başarısız oluyordu

- **Komut/Dosya:** `src/commands/github.js` → `findProjectRoot()`
- **Açıklama:** Komut QTRFramework dışındaki bir dizinden çalıştırıldığında `.qtr.json` bulunamıyor ve `Bu dizin bir QTR projesi değil` hatası veriyordu.
- **Sebep:** `findProjectRoot()` yalnızca `process.cwd()`'den başlıyordu; terminal tool'u `cd` komutunu uygulamadan komutu farklı dizinden çalıştırabiliyordu.
- **Çözüm:** `findProjectRoot(startDir?)` — opsiyonel `startDir` parametresi eklendi. `execute()` içinde `params.path` varsa o dizinden başlar. Arama derinliği 5 → 10'a çıkarıldı.
- **Kullanım:**
  ```bash
  # Yöntem 1 — proje içinden
  cd QTRFramework ; qtr github:push --message="..."

  # Yöntem 2 — her yerden
  qtr github:push --path="D:/Projelerim/QTRFramework" --message="..."
  ```
