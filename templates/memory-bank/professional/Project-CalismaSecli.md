# Project Calisma Sekli - {{PROJECT_NAME}}

---

## HTTP Istek Akisi

```
1. Tarayici -> GET /sayfa
2. index.php -> Config + ErrorHandler
3. Router -> routes/web.php
4. Sayfa fonksiyonu calisir
5. View::render('sayfa', $data)
6. HTML donulur
```

---

## Yerel Gelistirme

```bash
qtr serve       # port: {{PORT}}
qtr serve --stop
qtr db:migrate
```

---

## Hata Yonetimi

- development: Ekranda gosterilir
- production: storage/logs/ yazilir
- 404: pages/404.php
