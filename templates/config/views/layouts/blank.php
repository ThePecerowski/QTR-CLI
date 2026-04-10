<!-- QTR Framework — Blank Layout (layout'suz boş sayfa) -->
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($title ?? 'QTR'); ?></title>
</head>
<body>
    <?php echo $content ?? ''; ?>
</body>
</html>
