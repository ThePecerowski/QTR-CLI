# Project — Parametreler (QTR CLI)

> CLI komutlarının parametreleri ve `.qtr.json` yapısı burada anlatılır.
> Tam detay için: `memory-bank/About-CLI/About-CLI.md` Bölüm 2.3

## Global Parametreler (Her Komutta Geçerli)

| Parametre | Açıklama |
|---|---|
| `--info` | Komutun ne işe yaradığını açıklar, çalıştırmaz |
| `--help` | Hata durumunda ne yapılacağını açıklar |
| `--stime <saniye>` | Belirtilen süre sonra komutu çalıştırır |
| `--dry-run` | Komutu simüle eder, gerçek değişiklik yapmaz |

## Özel Parametreler

### `qtr fix`
| Parametre | Açıklama |
|---|---|
| `--doctor` | Derin sistem kontrolü yapar |
| `--show` | Tespit edilen sorunların çözüm yollarını gösterir |

### `qtr serve`
| Parametre | Açıklama |
|---|---|
| `--stop` | Çalışan sunucuyu durdurur |
| `--status` | Sunucu durumunu gösterir |
| `--port <numara>` | Farklı port kullanır |

### `qtr backup`
| Parametre | Açıklama |
|---|---|
| `--list` | Mevcut yedekleri listeler |
| `--restore <ad>` | Yedeği geri yükler |

### `qtr github:push`
| Parametre | Açıklama |
|---|---|
| `--message="..."` | Commit mesajı |

## .qtr.json Yapısı

```json
{
  "project": "proje-adi",
  "template": "professional",
  "php": "C:/xampp/php/php.exe",
  "server": "xampp",
  "db": {
    "host": "localhost",
    "port": 3306,
    "name": "proje_db"
  },
  "github": {
    "repository": "https://github.com/kullanici/proje.git",
    "branch": "main",
    "commit_prefix": "[QTR]",
    "require_confirmation": true
  },
  "security": {
    "mode": "strict"
  },
  "backup": {
    "max_count": 10,
    "exclude": ["node_modules", ".git", "storage/backups"]
  }
}
```
