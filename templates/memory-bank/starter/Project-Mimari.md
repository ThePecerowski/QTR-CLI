# Project Mimari — {{PROJECT_NAME}}

> Projenin mimari kararları ve yapısı. Mimari değişince güncellenir.

---

## Genel Yapı

- **Framework:** QTR Web Framework
- **Template:** {{TEMPLATE}}
- **PHP:** {{PHP_PATH}}
- **Port:** {{PORT}}

---

## Klasör Yapısı

```
{{PROJECT_NAME}}/
├── app/
│   ├── core/           ← Framework çekirdeği
│   ├── models/         ← Veritabanı modelleri
│   ├── api/            ← API endpoint'leri
│   └── admin/          ← Admin bölümü
├── pages/              ← Sayfa dosyaları
├── routes/
│   ├── web.php         ← Web rotaları
│   └── api.php         ← API rotaları
├── resources/views/    ← View dosyaları
├── public/             ← Statik dosyalar (CSS, JS, resim)
├── memory-bank/        ← Proje bağlam dosyaları
└── index.php           ← Giriş noktası
```

---

## Mimari Kararlar

- (önemli mimari kararlar buraya)

---

## Bağımlılıklar

- QTR Web Framework
- PHP {{PHP_PATH}}
