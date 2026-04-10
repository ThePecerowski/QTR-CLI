# Project Mimari - {{PROJECT_NAME}}

---

## Genel Yapi

- **Framework:** QTR Web Framework
- **Template:** {{TEMPLATE}}
- **PHP:** {{PHP_PATH}}
- **Port:** {{PORT}}

---

## Klasor Yapisi

```
{{PROJECT_NAME}}/
|-- app/
|   |-- core/       (Router, Config, View, ErrorHandler)
|   |-- models/     (BaseModel extends edilir)
|   |-- api/        (API endpoints)
|   |-- admin/      (Admin panel)
|-- pages/
|-- routes/
|   |-- web.php
|   |-- api.php
|   |-- admin.php
|-- resources/views/
|-- public/
|-- database/
|-- storage/logs/
|-- memory-bank/
|-- index.php
```

---

## Framework Akisi

```
index.php -> Config -> ErrorHandler -> Router -> routes/*.php
         -> pages/*.php | api/*.php | admin/*.php
         -> View::render() | json_encode()
```

---

## Mimari Kararlar

- (onemli mimari kararlar buraya)
