<?php
class WatchService {
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

  public function list(int $page, int $limit, array $filters): array {
    return $this->watches->paginate($page, $limit, $filters);
  }

  public function find(int $id): ?array {
    return $this->watches->find($id);
  }

  public function create(array $data): array {
    // valeur par défaut stock
    $data['stock_qty'] = (int)($data['stock_qty'] ?? 0);
    $data['low_stock_threshold'] = (int)($data['low_stock_threshold'] ?? 0);
    $data['stock_status'] = $data['stock_qty'] <= 0 ? 'out' : ($data['stock_qty'] <= $data['low_stock_threshold'] ? 'low' : 'in_stock');
    return $this->watches->create($data);
  }

  public function update(int $id, array $data): ?array {
    return $this->watches->update($id, $data);
  }

  public function delete(int $id): bool {
    return $this->watches->delete($id);
  }
}
