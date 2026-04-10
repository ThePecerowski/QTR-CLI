<!-- QTR Framework — Admin Layout Şablonu -->
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars(($title ?? 'Admin') . ' — QTR Admin'); ?></title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: sans-serif; background: #f0f2f5; display: flex; min-height: 100vh; }
        .sidebar { width: 220px; background: #1a1a2e; color: #ccc; padding: 24px 0; flex-shrink: 0; }
        .sidebar h2 { color: #fff; font-size: 1em; padding: 0 20px 20px; border-bottom: 1px solid #333; margin-bottom: 12px; }
        .sidebar a { display: block; padding: 10px 20px; color: #aaa; text-decoration: none; font-size: .9em; }
        .sidebar a:hover { background: #16213e; color: #fff; }
        .main-area { flex: 1; display: flex; flex-direction: column; }
        .topbar { background: #fff; padding: 12px 24px; border-bottom: 1px solid #ddd; font-size: .9em; color: #555; }
        .content { padding: 28px; flex: 1; }
        footer.admin-footer { background: #fff; padding: 10px 24px; border-top: 1px solid #ddd; font-size: .8em; color: #999; text-align: right; }
    </style>
</head>
<body>
    <aside class="sidebar">
        <h2>QTR Admin</h2>
        <a href="/admin">Dashboard</a>
        <a href="/admin/users">Kullanıcılar</a>
    </aside>

    <div class="main-area">
        <div class="topbar">
            <?php echo htmlspecialchars($pageTitle ?? ($title ?? 'Panel')); ?>
        </div>

        <div class="content">
            <?php echo $content ?? ''; ?>
        </div>

        <footer class="admin-footer">
            QTR Framework <?php echo defined('QTR_VERSION') ? QTR_VERSION : ''; ?>
        </footer>
    </div>
</body>
</html>
