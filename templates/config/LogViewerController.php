<?php
/**
 * QTR Framework — Admin Log Viewer Controller
 * Admin panelinden log dosyalarını görüntüler.
 *
 * Güvenlik: path traversal koruması zorunludur (basename + .log uzantısı).
 */
class LogViewerController
{
    private string $logsDir;

    public function __construct()
    {
        $this->logsDir = QTR_ROOT . '/storage/logs';
    }

    // ─── GET /admin/logs ─────────────────────────────────────────────────────

    public function index(): void
    {
        $files   = $this->getFiles();
        $file    = isset($_GET['file']) ? basename($_GET['file']) : ($files[0] ?? '');
        $page    = max(1, (int) ($_GET['page'] ?? 1));
        $level   = isset($_GET['level']) ? strtoupper(trim($_GET['level'])) : '';
        $perPage = 100;

        $content  = '';
        $total    = 0;
        $pages    = 1;
        $fileSize = 0;

        if ($file && preg_match('/^[a-zA-Z0-9_\-\.]+\.log$/', $file)) {
            $filePath = $this->logsDir . '/' . $file;
            if (is_file($filePath)) {
                $fileSize = filesize($filePath);
                $lines    = $this->readLines($filePath, $level);
                $total    = count($lines);
                $pages    = max(1, (int) ceil($total / $perPage));
                $page     = min($page, $pages);
                $offset   = ($page - 1) * $perPage;
                $content  = implode("\n", array_slice($lines, $offset, $perPage));
            }
        }

        View::render('admin/logs', [
            'files'    => $files,
            'file'     => $file,
            'content'  => $content,
            'page'     => $page,
            'pages'    => $pages,
            'total'    => $total,
            'level'    => $level,
            'fileSize' => $fileSize,
        ]);
    }

    // ─── GET /admin/logs/content (AJAX) ─────────────────────────────────────

    public function getContent(): void
    {
        $file  = isset($_GET['file'])  ? basename($_GET['file'])          : '';
        $page  = max(1, (int) ($_GET['page']  ?? 1));
        $level = isset($_GET['level']) ? strtoupper(trim($_GET['level'])) : '';

        if (!$file || !preg_match('/^[a-zA-Z0-9_\-\.]+\.log$/', $file)) {
            http_response_code(400);
            echo json_encode(['error' => 'Geçersiz dosya adı']);
            return;
        }

        $filePath = $this->logsDir . '/' . $file;
        if (!is_file($filePath)) {
            http_response_code(404);
            echo json_encode(['error' => 'Dosya bulunamadı']);
            return;
        }

        $perPage = 100;
        $lines   = $this->readLines($filePath, $level);
        $total   = count($lines);
        $pages   = max(1, (int) ceil($total / $perPage));
        $page    = min($page, $pages);
        $offset  = ($page - 1) * $perPage;
        $slice   = array_slice($lines, $offset, $perPage);

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'lines' => $slice,
            'page'  => $page,
            'pages' => $pages,
            'total' => $total,
        ]);
    }

    // ─── Yardımcı ─────────────────────────────────────────────────────────────

    /**
     * storage/logs/ içindeki .log dosyalarını, en yeniden eskiye sıralar.
     * @return string[]
     */
    private function getFiles(): array
    {
        if (!is_dir($this->logsDir)) return [];

        $files = array_filter(
            scandir($this->logsDir),
            fn($f) => str_ends_with($f, '.log') && is_file($this->logsDir . '/' . $f)
        );

        usort($files, fn($a, $b) =>
            filemtime($this->logsDir . '/' . $b) <=> filemtime($this->logsDir . '/' . $a)
        );

        return array_values($files);
    }

    /**
     * Log dosyasını okur, isteğe göre level filtresi uygular.
     * @return string[]
     */
    private function readLines(string $filePath, string $level): array
    {
        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];

        if ($level) {
            $lines = array_filter($lines, fn($l) => str_contains(strtoupper($l), "[{$level}]"));
        }

        return array_values($lines);
    }
}
