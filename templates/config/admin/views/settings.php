<!-- QTR Admin — Ayarlar -->
<?php $saved = $saved ?? false; ?>
<div>
  <h2 style="color:#f1f5f9;margin-bottom:20px">Ayarlar</h2>

  <?php if ($saved): ?>
  <div style="background:#052e16;color:#86efac;border-radius:6px;padding:10px 16px;
              margin-bottom:16px;font-size:.88em">Ayarlar kaydedildi.</div>
  <?php endif; ?>

  <div style="background:#1e293b;border-radius:8px;padding:24px 28px;max-width:520px">
    <form method="POST" action="/admin/settings">
      <label style="display:block;color:#94a3b8;font-size:.82em;margin-bottom:4px">Uygulama Adı</label>
      <input name="app_name" value="<?php echo htmlspecialchars(Config::get('APP_NAME', '')); ?>"
             style="width:100%;padding:9px 12px;border-radius:6px;border:1px solid #334155;
                    background:#0f172a;color:#f1f5f9;font-size:.93em;margin-bottom:16px">

      <label style="display:block;color:#94a3b8;font-size:.82em;margin-bottom:4px">Ortam (APP_ENV)</label>
      <select name="app_env"
              style="width:100%;padding:9px 12px;border-radius:6px;border:1px solid #334155;
                     background:#0f172a;color:#f1f5f9;font-size:.93em;margin-bottom:20px">
        <?php foreach (['local','staging','production'] as $e): ?>
        <option value="<?= $e ?>" <?= Config::get('APP_ENV','local')===$e ? 'selected' : '' ?>>
          <?= $e ?>
        </option>
        <?php endforeach; ?>
      </select>

      <button type="submit"
              style="padding:10px 24px;background:#6366f1;color:#fff;border:none;
                     border-radius:6px;cursor:pointer;font-size:.93em">Kaydet</button>
    </form>
  </div>
</div>
