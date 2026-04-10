<?php
/**
 * QTR Framework — Örnek Users Seeder
 * Çalıştırmak için: qtr db:seed --class=UsersSeeder
 */
class UsersSeeder
{
    public function run(PDO $pdo): void
    {
        $users = [
            ['Admin',     'admin@example.com', password_hash('admin123', PASSWORD_DEFAULT)],
            ['Test User', 'test@example.com',  password_hash('test123',  PASSWORD_DEFAULT)],
        ];

        // Mevcut kayıtları kontrol et (tekrar çalıştırılabilir)
        $stmt = $pdo->prepare(
            "INSERT IGNORE INTO `users` (`name`, `email`, `password`) VALUES (?, ?, ?)"
        );

        $count = 0;
        foreach ($users as $user) {
            $stmt->execute($user);
            if ($stmt->rowCount() > 0) $count++;
        }

        echo "  ✓ UsersSeeder: {$count} kayıt eklendi\n";
    }
}
