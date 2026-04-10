<?php
/**
 * QTR Framework — Card Component
 *
 * Kullanim:
 *   View::partial('../components/card', [
 *       'title'   => 'Toplam Kullanıcı',
 *       'value'   => 142,
 *       'color'   => '#4CAF50',   // opsiyonel, varsayilan #1a1a2e
 *   ]);
 */

/** @var string $title Başlık */
/** @var mixed  $value Görüntülenecek değer */
/** @var string $color Accent rengi (opsiyonel) */

$title = $title ?? '';
$value = $value ?? '';
$color = $color ?? '#1a1a2e';
?>
<div style="background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.08);
            padding:20px 24px;display:inline-block;min-width:160px;
            border-top:4px solid <?php echo htmlspecialchars($color); ?>">
  <div style="font-size:.8em;color:#888;margin-bottom:6px">
    <?php echo htmlspecialchars((string)$title); ?>
  </div>
  <div style="font-size:1.8em;font-weight:700;color:#222">
    <?php echo htmlspecialchars((string)$value); ?>
  </div>
</div>
