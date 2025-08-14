<?php
class StockService {
  private PDO $db;
  private array $cfg;
  private Watch $watches;

  public function __construct(){
    $this->cfg = require __DIR__ . '/../config/config.php';
    $this->db = $this->connect();
    $this->watches = new Watch($this->db);
  }
  private function connect(): PDO {
    $dbPath = $this->cfg['DB_PATH'];
    $dir = dirname($dbPath);
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA foreign_keys = ON;');
    return $pdo;
  }

  public function adjust(array $body): array {
    $delta = (int)$body['delta'];
    if (isset($body['watch_id'])) {
      $w = $this->watches->adjustStockById((int)$body['watch_id'], $delta);
    } elseif (isset($body['reference'])) {
      $w = $this->watches->adjustStockByReference((string)$body['reference'], $delta);
    } else {
      return ['error'=>'watch_id or reference required'];
    }
    return $w ? $w : ['error'=>'watch not found'];
  }
}
