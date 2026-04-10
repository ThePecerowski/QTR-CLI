<?php
/**
 * QTR Framework — UserModel
 *
 * Kullanim ornegi:
 *   $users = UserModel::findAll();
 *   $user  = UserModel::findById(1);
 *   $id    = UserModel::create(['name'=>'Ali','email'=>'ali@example.com','password'=>$hash]);
 *   UserModel::update(1, ['name' => 'Veli']);
 *   UserModel::delete(1);
 */

require_once __DIR__ . '/BaseModel.php';

class UserModel extends BaseModel
{
    protected static string $table = 'users';

    /**
     * E-posta adresine göre kullanıcı arar.
     */
    public static function findByEmail(string $email): ?array
    {
        $rows = static::where('email = ?', [$email]);
        return $rows[0] ?? null;
    }

    /**
     * Yeni kullanıcı oluşturur — şifreyi bcrypt ile hashler.
     */
    public static function register(string $name, string $email, string $plainPassword): int
    {
        return static::create([
            'name'     => $name,
            'email'    => $email,
            'password' => password_hash($plainPassword, PASSWORD_BCRYPT),
        ]);
    }
}
