# Memory-Bank Kullanım Kılavuzu — {{PROJECT_NAME}}# Memory-Bank Nasıl Kullanılır — {{PROJECT_NAME}}





































3. İlgili `Project-` dosyası → Teknik detay2. `Current-Durum.md` → Anlık durum1. `CurrentProject.md` → Genel bağlamYeni bir AI oturumu açıldığında bu klasördeki dosyalar sırayla okunur:## Nasıl Kullanılır?---| `Project-Mimari.md` | Mimari kararlar | Mimari değişince || `Project-Fonksiyonlar.md` | Ana fonksiyon açıklamaları | Fonksiyon eklenince || `Project-Dosyalar.md` | Dosya ve klasör açıklamaları | Yapı değişince || `FixedIssue.md` | Çözülen sorunlar kaydı | Sorun çözülünce || `Current-Durum.md` | Proje anlık durumu | Periyodik || `Current-Hatalar.md` | Aktif hatalar | Hata bulununca/çözününce || `Current-Degisiklikler.md` | Son değişiklikler | Her değişiklikte || `CurrentProject.md` | Genel durum özeti | Büyük değişikliklerde ||-------|----------|------------|| Dosya | Açıklama | Güncelleme |## Dosya Rehberi---5. `Current-` önekli dosyalar projenin anlık durumunu tutar.4. `Project-` önekli dosyalar projenin kalıcı teknik gerçeklerini tutar.3. **FixedIssue.md** çözülen hata ve sorunların kaydıdır; silinmez, üstüne yeni kayıt eklenir.2. **CurrentProject.md** genel proje durumunu özetler; büyük değişikliklerden sonra güncellenir.1. Her değişiklik sonrasında **Current-Degisiklikler.md** güncellenir.## Kurallar---> Bu dosya **sabit kurallara** sahiptir; içerik eklenebilir ama kurallar değiştirilemez.
> Bu dosya sabittir. İçeriği değiştirme; yeni bilgi eklemek için diğer memory-bank dosyalarını kullan.

---

## Kurallar

1. Memory-bank dosyaları, AI'ın projenin bağlamını anlaması için vardır.
2. Her sohbet başında AI bu dosyaları okur ve devam eder.
3. Her önemli değişiklikten sonra ilgili `Current-*` ve `Project-*` dosyaları güncellenir.
4. `HowToUse.md`, `FixedIssue.md` ve `CurrentProject.md` her template'te zorunludur.

---

## Dosyalar ve Amaçları

| Dosya | Amaç |
|-------|-------|
| `CurrentProject.md` | Projenin genel mevcut durumu |
| `FixedIssue.md` | Çözülen hatalar ve sorunlar |
| `project_brief.md` | Projenin ne olduğu, kimin için yapıldığı |
| `file_structure.md` | Klasör yapısı ve açıklamaları |

---

## Güncelleme Döngüsü

1. Değişiklik yap.
2. `CurrentProject.md` güncelle.
3. Eğer bir hata çözüldüyse `FixedIssue.md`'ye ekle.
