<?php
/**
 * QTR Framework — Table Component
 *
 * Kullanim:
 *   View::partial('../components/table', [
 *       'headers' => ['ID', 'Ad', 'E-posta'],
 *       'rows'    => $users,
 *   ]);
 */

/** @var array $headers Sutun baslikları */
/** @var array $rows    Satirlar (her satir indexli veya iliskisel dizi) */

$headers = $headers ?? [];
$rows    = $rows    ?? [];
?>
<div class="qtr-table-wrap" style="overflow-x:auto">
  <table style="width:100%;border-collapse:collapse;font-size:.9em">
    <?php if ($headers): ?>
    <thead>
      <tr style="background:#1a1a2e;color:#fff">
        <?php foreach ($headers as $h): ?>
          <th style="padding:10px 14px;text-align:left"><?php echo htmlspecialchars((string)$h); ?></th>
        <?php endforeach; ?>
      </tr>
    </thead>
    <?php endif; ?>
    <tbody>
      <?php if (empty($rows)): ?>
        <tr><td colspan="<?php echo count($headers) ?: 1; ?>"
              style="padding:12px 14px;color:#999;text-align:center">Kayıt yok.</td></tr>
      <?php else: ?>
        <?php foreach ($rows as $i => $row): ?>
          <tr style="background:<?php echo $i % 2 === 0 ? '#fff' : '#f9f9f9'; ?>;border-bottom:1px solid #eee">
            <?php foreach ((array)$row as $cell): ?>
              <td style="padding:9px 14px"><?php echo htmlspecialchars((string)$cell); ?></td>
            <?php endforeach; ?>
          </tr>
        <?php endforeach; ?>
      <?php endif; ?>
    </tbody>
  </table>
</div>
