# Project Baglantilar - {{PROJECT_NAME}}

---

## Katman Bagimliliklari

```
index.php
  -> Config.php  (okur .env)
  -> ErrorHandler.php  (yazar storage/logs/)
  -> Router.php  (calistirir routes/*.php)
      -> Fonksiyon/sayfa
          -> *Model.php  (extends BaseModel)
          -> View.php  (render resources/views/)
```

---

## Dis Bagimliliklar

| Bagimlilik | Neden |
|------------|-------|
| PHP {{PHP_PATH}} | Framework |
| MySQL/MariaDB | Veritabani |
