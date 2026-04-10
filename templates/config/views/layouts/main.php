<!-- QTR Framework — Ana Layout Şablonu -->
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($title ?? 'QTR App'); ?></title>
</head>
<body>
    <?php require_once QTR_ROOT . '/resources/views/partials/header.php'; ?>

    <main>
        <?php echo $content ?? ''; ?>
    </main>

    <?php require_once QTR_ROOT . '/resources/views/partials/footer.php'; ?>
</body>
</html>
