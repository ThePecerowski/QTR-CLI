<?php
/**
 * QTR Framework — FileUpload
 * Güvenli dosya yükleme: MIME kontrolü, boyut limiti, uzantı whitelist,
 * executable dosya engelleme.
 *
 * Kullanım:
 *   $result = FileUpload::handle('avatar', [
 *       'allowed_types' => ['image/jpeg','image/png','image/webp'],
 *       'max_size'      => 2 * 1024 * 1024, // 2 MB
 *       'dest_dir'      => QTR_ROOT . '/storage/uploads/avatars',
 *   ]);
 *
 *   if ($result['error']) {
 *       return JsonResponse::validationError(['file' => $result['message']]);
 *   }
 *   $savedPath = $result['path'];
 */

class FileUpload
{
    // Hiçbir koşulda izin verilmeyen uzantılar (executable, server-side script)
    private const BLOCKED_EXTENSIONS = [
        'php', 'php3', 'php4', 'php5', 'php7', 'phtml', 'phar',
        'exe', 'sh', 'bat', 'cmd', 'com', 'msi', 'ps1', 'py',
        'pl', 'rb', 'asp', 'aspx', 'jsp', 'cfm', 'cgi',
    ];

    private const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

    // ─── Ana metod ──────────────────────────────────────────────────────────

    /**
     * @param  string $fieldName  $_FILES dizisindeki alan adı
     * @param  array{
     *   allowed_types?: list<string>,
     *   max_size?: int,
     *   dest_dir?: string,
     *   rename?: bool,
     * } $options
     * @return array{error: bool, message: string, path: string, filename: string}
     */
    public static function handle(string $fieldName, array $options = []): array
    {
        if (!isset($_FILES[$fieldName]) || $_FILES[$fieldName]['error'] === UPLOAD_ERR_NO_FILE) {
            return self::err('Dosya seçilmedi.');
        }

        $file = $_FILES[$fieldName];

        // PHP yükleme hataları
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return self::err(self::uploadErrorMessage($file['error']));
        }

        // Güvenlik: gerçekten yüklenmiş dosya mı?
        if (!is_uploaded_file($file['tmp_name'])) {
            return self::err('Geçersiz dosya yükleme isteği.');
        }

        // Boyut kontrolü
        $maxSize = $options['max_size'] ?? self::DEFAULT_MAX_SIZE;
        if ($file['size'] > $maxSize) {
            $mb = round($maxSize / 1024 / 1024, 1);
            return self::err("Dosya boyutu {$mb} MB sınırını aşıyor.");
        }

        // Uzantı kontrolü
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (in_array($ext, self::BLOCKED_EXTENSIONS, true)) {
            return self::err("'.{$ext}' uzantılı dosyalar yüklenemez.");
        }

        // MIME tipi kontrolü
        $allowedTypes = $options['allowed_types'] ?? [];
        if (!empty($allowedTypes)) {
            $mime = self::detectMime($file['tmp_name']);
            if (!in_array($mime, $allowedTypes, true)) {
                return self::err("Dosya tipi izin verilmiyor: {$mime}.");
            }
        }

        // Hedef dizin
        $destDir = $options['dest_dir'] ?? (defined('QTR_ROOT') ? QTR_ROOT . '/storage/uploads' : sys_get_temp_dir());
        if (!is_dir($destDir)) {
            mkdir($destDir, 0755, true);
        }

        // Dosya adı (UUID benzeri, orijinal okunmaz)
        $shouldRename = $options['rename'] ?? true;
        if ($shouldRename) {
            $safeName = bin2hex(random_bytes(16)) . ($ext ? ".{$ext}" : '');
        } else {
            $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($file['name']));
        }

        $destPath = rtrim($destDir, '/\\') . DIRECTORY_SEPARATOR . $safeName;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            return self::err('Dosya kaydedilemedi. Dizin yazılabilir mi?');
        }

        return [
            'error'    => false,
            'message'  => 'Dosya başarıyla yüklendi.',
            'path'     => $destPath,
            'filename' => $safeName,
        ];
    }

    // ─── Yardımcılar ────────────────────────────────────────────────────────

    private static function detectMime(string $tmpPath): string
    {
        if (function_exists('finfo_file')) {
            $fi = finfo_open(FILEINFO_MIME_TYPE);
            $mime = finfo_file($fi, $tmpPath);
            finfo_close($fi);
            return $mime ?: 'application/octet-stream';
        }
        return mime_content_type($tmpPath) ?: 'application/octet-stream';
    }

    /** @return array{error: bool, message: string, path: string, filename: string} */
    private static function err(string $msg): array
    {
        return ['error' => true, 'message' => $msg, 'path' => '', 'filename' => ''];
    }

    private static function uploadErrorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE   => 'Dosya php.ini boyut limitini aştı.',
            UPLOAD_ERR_FORM_SIZE  => 'Dosya form boyut limitini aştı.',
            UPLOAD_ERR_PARTIAL    => 'Dosya kısmen yüklendi.',
            UPLOAD_ERR_NO_TMP_DIR => 'Geçici dizin bulunamadı.',
            UPLOAD_ERR_CANT_WRITE => 'Dosya diske yazılamadı.',
            UPLOAD_ERR_EXTENSION  => 'Yükleme bir PHP eklentisi tarafından durduruldu.',
            default               => "Bilinmeyen yükleme hatası (kod: {$code}).",
        };
    }
}
