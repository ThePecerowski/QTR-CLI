-- QTR Framework — Users Seeder
-- Çalıştırmak için: qtr db:seed --class=UsersSeeder
-- Şifreler bcrypt (cost=10) ile hashlenmiştir.

INSERT IGNORE INTO `users` (`name`, `email`, `password`) VALUES
  ('Admin',     'admin@example.com', '{{ADMIN_HASH}}'),
  ('Test User', 'test@example.com',  '{{TEST_HASH}}');
