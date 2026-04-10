<!-- QTR Admin — Log Viewer -->
<?php
/**
 * @var string[]  $files    Log dosyası listesi (en yeniden eskiye)
 * @var string    $file     Seçili dosya adı
 * @var string    $content  Gösterilecek log satırları (\n ile ayrılmış)
 * @var int       $page     Mevcut sayfa
 * @var int       $pages    Toplam sayfa
 * @var int       $total    Toplam satır sayısı
 * @var string    $level    Aktif filtre (ERROR/WARNING/INFO/DEBUG veya '')
 * @var int       $fileSize Dosya boyutu (bayt)
 */
$files    = $files    ?? [];
$file     = $file     ?? '';
$content  = $content  ?? '';
$page     = $page     ?? 1;
$pages    = $pages    ?? 1;
$total    = $total    ?? 0;
$level    = $level    ?? '';
$fileSize = $fileSize ?? 0;

$levels = ['', 'ERROR', 'WARNING', 'INFO', 'DEBUG'];

function logColor(string $line): string {
    $u = strtoupper($line);
    if (str_contains($u, '[ERROR]') || str_contains($u, '[CRITICAL]'))
        return '#ef4444';
    if (str_contains($u, '[WARNING]') || str_contains($u, '[WARN]'))
        return '#f59e0b';
    if (str_contains($u, '[INFO]'))
        return '#60a5fa';
    if (str_contains($u, '[DEBUG]'))
        return '#6b7280';
    return '#94a3b8';
}
?>

<style>
.qtr-logs{display:flex;gap:0;height:calc(100vh - 120px);overflow:hidden}
.qtr-logs-sidebar{width:220px;min-width:160px;background:#0f172a;border-right:1px solid #1e293b;overflow-y:auto;padding:12px 0}
.qtr-logs-sidebar h4{color:#475569;font-size:.72em;padding:0 14px 8px;letter-spacing:.08em}
.qtr-logs-sidebar a{display:block;padding:7px 14px;color:#94a3b8;font-size:.8em;text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-left:3px solid transparent}
.qtr-logs-sidebar a:hover{background:#1e293b;color:#f1f5f9}
.qtr-logs-sidebar a.active{background:#1e293b;color:#6366f1;border-left-color:#6366f1}
.qtr-logs-main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.qtr-logs-toolbar{background:#1e293b;padding:10px 16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-bottom:1px solid #0f172a}
.qtr-logs-toolbar span{color:#475569;font-size:.78em;margin-right:4px}
.qtr-filter-btn{padding:4px 12px;border-radius:20px;border:1px solid #334155;background:transparent;color:#94a3b8;cursor:pointer;font-size:.78em;text-decoration:none}
.qtr-filter-btn:hover{background:#0f172a}
.qtr-filter-btn.active{background:#6366f1;border-color:#6366f1;color:#fff}
.qtr-filter-btn.error.active{background:#ef4444;border-color:#ef4444}
.qtr-filter-btn.warning.active{background:#f59e0b;border-color:#f59e0b;color:#1e293b}
.qtr-filter-btn.info.active{background:#3b82f6;border-color:#3b82f6}
.qtr-filter-btn.debug.active{background:#6b7280;border-color:#6b7280}
.qtr-logs-content{flex:1;overflow-y:auto;padding:12px 16px;background:#0f172a;font-family:monospace;font-size:.8em;line-height:1.7}
.qtr-logs-content .log-line{white-space:pre-wrap;word-break:break-all}
.qtr-logs-pagination{padding:8px 16px;background:#1e293b;display:flex;gap:6px;align-items:center;border-top:1px solid #0f172a}
.qtr-logs-pagination a{padding:4px 10px;border-radius:4px;background:#0f172a;color:#94a3b8;text-decoration:none;font-size:.8em}
.qtr-logs-pagination a:hover{color:#f1f5f9}
.qtr-logs-pagination .current{background:#6366f1;color:#fff;padding:4px 10px;border-radius:4px;font-size:.8em}
.qtr-logs-pagination span{color:#475569;font-size:.78em;margin-left:8px}
</style>

<div class="qtr-logs">
  <!-- Dosya listesi -->
  <div class="qtr-logs-sidebar">
    <h4>LOG DOSYALARI</h4>
    <?php foreach ($files as $f): ?>
    <?php $href = '/admin/logs?file=' . urlencode($f) . ($level ? '&level=' . urlencode($level) : ''); ?>
    <a href="<?= htmlspecialchars($href) ?>"
       class="<?= $f === $file ? 'active' : '' ?>"
       title="<?= htmlspecialchars($f) ?>">
      <?= htmlspecialchars($f) ?>
    </a>
    <?php endforeach; ?>
    <?php if (empty($files)): ?>
    <p style="color:#475569;font-size:.78em;padding:0 14px">Log dosyası bulunamadı.</p>
    <?php endif; ?>
  </div>

  <!-- İçerik alanı -->
  <div class="qtr-logs-main">
    <!-- Araç çubuğu: filtreler + bilgi -->
    <div class="qtr-logs-toolbar">
      <span>FİLTRE:</span>
      <?php foreach ($levels as $lv): ?>
      <?php
        $label   = $lv ?: 'TÜMÜ';
        $cls     = strtolower($lv ?: 'all');
        $isActive = ($level === $lv) ? 'active' : '';
        $href    = '/admin/logs?' . http_build_query(array_filter([
            'file'  => $file,
            'level' => $lv,
            'page'  => 1,
        ]));
      ?>
      <a href="<?= htmlspecialchars($href) ?>"
         class="qtr-filter-btn <?= $cls ?> <?= $isActive ?>">
        <?= htmlspecialchars($label) ?>
      </a>
      <?php endforeach; ?>

      <?php if ($file): ?>
      <span style="margin-left:auto;color:#334155">
        <?= htmlspecialchars($file) ?>
        (<?= number_format($fileSize) ?> B · <?= number_format($total) ?> satır)
      </span>
      <?php endif; ?>
    </div>

    <!-- Log satırları -->
    <div class="qtr-logs-content" id="qtr-log-content">
      <?php if ($content): ?>
      <?php foreach (explode("\n", $content) as $line): ?>
      <?php if (trim($line) === '') continue; ?>
      <div class="log-line" style="color:<?= logColor($line) ?>">
        <?= htmlspecialchars($line) ?>
      </div>
      <?php endforeach; ?>
      <?php elseif ($file): ?>
      <p style="color:#475569">Bu dosyada gösterilecek satır yok<?= $level ? " ($level filtresi)" : '' ?>.</p>
      <?php else: ?>
      <p style="color:#475569">Sol taraftan bir log dosyası seçin.</p>
      <?php endif; ?>
    </div>

    <!-- Sayfalama -->
    <?php if ($pages > 1): ?>
    <div class="qtr-logs-pagination">
      <?php if ($page > 1): ?>
      <a href="?<?= http_build_query(['file' => $file, 'page' => $page - 1, 'level' => $level]) ?>">← Önceki</a>
      <?php endif; ?>

      <?php
        $start = max(1, $page - 2);
        $end   = min($pages, $page + 2);
        for ($p = $start; $p <= $end; $p++):
      ?>
      <?php if ($p === $page): ?>
      <span class="current"><?= $p ?></span>
      <?php else: ?>
      <a href="?<?= http_build_query(['file' => $file, 'page' => $p, 'level' => $level]) ?>"><?= $p ?></a>
      <?php endif; ?>
      <?php endfor; ?>

      <?php if ($page < $pages): ?>
      <a href="?<?= http_build_query(['file' => $file, 'page' => $page + 1, 'level' => $level]) ?>">Sonraki →</a>
      <?php endif; ?>
      <span>Sayfa <?= $page ?>/<?= $pages ?></span>
    </div>
    <?php endif; ?>
  </div>
</div>
