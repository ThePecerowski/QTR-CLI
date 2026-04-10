<!-- QTR Admin — Dashboard -->
<?php
/** @var array $stats ['users' => int, 'posts' => int, ...] */
$stats = $stats ?? [];
?>
<div style="padding:0">
  <h2 style="color:#f1f5f9;margin-bottom:20px">Dashboard</h2>

  <!-- İstatistik kartları -->
  <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:32px">
    <?php foreach ($stats as $label => $value): ?>
    <div style="background:#1e293b;border-radius:8px;padding:20px 28px;min-width:150px;
                border-top:3px solid #6366f1">
      <div style="color:#64748b;font-size:.8em;margin-bottom:6px">
        <?php echo htmlspecialchars(ucfirst($label)); ?>
      </div>
      <div style="color:#f1f5f9;font-size:1.9em;font-weight:700">
        <?php echo htmlspecialchars((string)$value); ?>
      </div>
    </div>
    <?php endforeach; ?>
    <?php if (empty($stats)): ?>
    <p style="color:#475569">İstatistik bağlantısı henüz tanımlanmamış.</p>
    <?php endif; ?>
  </div>

  <!-- Hızlı bağlantılar -->
  <div style="background:#1e293b;border-radius:8px;padding:20px 24px">
    <h3 style="color:#94a3b8;font-size:.9em;margin-bottom:14px">HIZLI BAĞLANTILAR</h3>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a href="/admin/users"    style="<?= $btnStyle = 'padding:8px 16px;background:#0f172a;color:#a5b4fc;border-radius:6px;text-decoration:none;font-size:.88em'; ?>">Kullanıcılar</a>
      <a href="/admin/settings" style="<?= $btnStyle; ?>">Ayarlar</a>
    </div>
  </div>
</div>
