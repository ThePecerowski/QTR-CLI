<?php
/**
 * QTR Framework — UserService
 *
 * Mimari: Controller → Service → Model → DB
 *
 * Service katmanı iş mantığını barındırır.
 * Controller asla doğrudan Model çağırmaz.
 *
 * Kullanim ornegi:
 *   $list  = UserService::getUserList();
 *   $user  = UserService::getUserById(1);
 *   $id    = UserService::createUser(['name'=>'Ali','email'=>'a@b.com','password'=>'1234']);
 *   UserService::updateUser(1, ['name'=>'Veli']);
 *   UserService::deleteUser(1);
 */

require_once __DIR__ . '/../../models/UserModel.php';

class UserService
{
    /**
     * Tüm kullanıcıları döner (şifre alanı çıkarılır).
     */
    public static function getUserList(): array
    {
        $users = UserModel::findAll();
        return array_map([static::class, 'sanitize'], $users);
    }

    /**
     * ID'ye göre kullanıcı döner; bulunamazsa null.
     */
    public static function getUserById(int $id): ?array
    {
        $user = UserModel::findById($id);
        return $user ? static::sanitize($user) : null;
    }

    /**
     * Yeni kullanıcı oluşturur.
     * $data: ['name', 'email', 'password']
     */
    public static function createUser(array $data): int
    {
        // Aynı e-posta kontrolü
        if (UserModel::findByEmail($data['email'] ?? '')) {
            throw new \RuntimeException('Bu e-posta adresi zaten kayitli.');
        }
        return UserModel::register(
            $data['name']     ?? '',
            $data['email']    ?? '',
            $data['password'] ?? ''
        );
    }

    /**
     * Kullanıcıyı günceller.
     */
    public static function updateUser(int $id, array $data): int
    {
        // Şifre güncelleniyorsa hashle
        if (!empty($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        }
        return UserModel::update($id, $data);
    }

    /**
     * Kullanıcıyı siler.
     */
    public static function deleteUser(int $id): int
    {
        return UserModel::delete($id);
    }

    // ─── Yardımcı ────────────────────────────────────────────────────────────

    /** Hassas alanları (password) dizi çıktısından kaldırır. */
    private static function sanitize(array $user): array
    {
        unset($user['password']);
        return $user;
    }
}
