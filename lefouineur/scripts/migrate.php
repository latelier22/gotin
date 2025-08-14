<?php
declare(strict_types=1);
$cfg = require __DIR__ . '/../api/config/config.php';
$dbPath = $cfg['DB_PATH'];
$dir = dirname($dbPath);
if (!is_dir($dir)) mkdir($dir, 0775, true);
$pdo = new PDO('sqlite:' . $dbPath);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('PRAGMA foreign_keys = ON;');

$migrations = [
  __DIR__ . '/../api/db/migrations/001_init.sql',
  __DIR__ . '/../api/db/migrations/002_stock.sql',
];
foreach ($migrations as $file) {
  $sql = file_get_contents($file);
  if (trim($sql)) $pdo->exec($sql);
}
echo "Migrations executed.\n";
