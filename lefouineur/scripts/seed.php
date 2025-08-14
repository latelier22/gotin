<?php
declare(strict_types=1);
$cfg = require __DIR__ . '/../api/config/config.php';
$pdo = new PDO('sqlite:' . $cfg['DB_PATH']);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('PRAGMA foreign_keys = ON;');

$email = 'admin@example.com';
$pass = 'admin123';

$hash = password_hash($pass, PASSWORD_BCRYPT);
$pdo->prepare('INSERT OR IGNORE INTO users (email, password_hash) VALUES (:e, :h)')
    ->execute([':e'=>$email, ':h'=>$hash]);

echo "Seeded admin user: $email / $pass\n";
