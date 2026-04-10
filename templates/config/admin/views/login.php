<!-- QTR Admin — Login Sayfası -->
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Giriş — <?php echo htmlspecialchars(Config::get('APP_NAME', 'QTR')); ?></title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;
         background:#0f172a;font-family:sans-serif}
    .card{background:#1e293b;border-radius:12px;padding:40px 36px;width:360px;
          box-shadow:0 8px 32px rgba(0,0,0,.4)}
    h1{color:#f1f5f9;font-size:1.4em;margin-bottom:8px;text-align:center}
    .sub{color:#64748b;font-size:.85em;text-align:center;margin-bottom:28px}
    label{display:block;color:#94a3b8;font-size:.82em;margin-bottom:4px}
    input{width:100%;padding:10px 12px;border-radius:6px;border:1px solid #334155;
          background:#0f172a;color:#f1f5f9;font-size:.95em;margin-bottom:18px}
    input:focus{outline:none;border-color:#6366f1}
    button{width:100%;padding:11px;background:#6366f1;color:#fff;border:none;
           border-radius:6px;font-size:1em;cursor:pointer}
    button:hover{background:#4f46e5}
    .error{background:#450a0a;color:#fca5a5;border-radius:6px;padding:10px 14px;
           font-size:.85em;margin-bottom:16px}
  </style>
</head>
<body>
<div class="card">
  <h1>Admin Paneli</h1>
  <div class="sub">Lütfen giriş yapın</div>

  <?php if (!empty($error)): ?>
    <div class="error"><?php echo htmlspecialchars($error); ?></div>
  <?php endif; ?>

  <form method="POST" action="/admin/login">
    <?php if (class_exists('CsrfToken')): ?>
      <input type="hidden" name="_token" value="<?php echo CsrfToken::generate(); ?>">
    <?php endif; ?>

    <label for="email">E-posta</label>
    <input type="email" id="email" name="email" required autocomplete="email">

    <label for="password">Şifre</label>
    <input type="password" id="password" name="password" required autocomplete="current-password">

    <button type="submit">Giriş Yap</button>
  </form>
</div>
</body>
</html>
