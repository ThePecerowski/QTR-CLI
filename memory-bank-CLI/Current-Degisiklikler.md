# Current — Değişiklikler (QTR CLI)

> CLI projesinde yapılan değişiklikler burada tutulur.

## Değişiklik Formatı

`
### [GG.AA.YYYY] — [Başlık]
- **Amaç:** Ne için yapıldı
- **Nerede:** Hangi dosya/komut
- **Açıklama:** Ne değişti
`

---

## Değişiklik Geçmişi

### 10.04.2026 — `params.js` genişletildi + `github.js` `--path` desteği

- **Amaç:** `--message`, `--path` gibi parametreler bilinmeyen olarak atlanıyordu; kalıcı çözüm yapıldı
- **Nerede:** `src/utils/params.js`, `src/commands/github.js`
- **Açıklama:**
  - `params.js`: `--path`, `--message`, `--branch`, `--note`, `--section`, `--data`, `--version`, `--restore`, `--delete`, `--list`, `--clean` parametreleri eklendi
  - `github.js`: `findProjectRoot(startDir?)` — opsiyonel başlangıç dizini; arama derinliği 10'a çıkarıldı; `--path` ile uzaktan proje belirtme desteği

### 09.04.2026 — Memory-Bank Aşama 1

- **Amaç:** CLI için memory-bank iskelet yapısı kuruldu
- **Nerede:** SpeakerQuarterCLI/memory-bank-CLI/
- **Açıklama:** HowToUse.md, FixedIssue.md, CurrentProject.md eklendi; mevcut dosyalar QTR CLI içeriğiyle güncellendi ve encoding düzeltildi.
