<?php
class AuthService {
  private PDO $db;
  private array $cfg;
  private User $users;

  public function __construct(){
    $this->cfg = require __DIR__ . '/../config/config.php';
    $this->db = $this->connect();
    $this->users = new User($this->db);
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

  public function attempt(string $email, string $password): ?array {
    $user = $this->users->findByEmail($email);
    if (!$user || !password_verify($password, $user['password_hash'])) return null;
    $now = time();
    $payload = [
      'iss' => 'gotin-api',
      'sub' => (int)$user['id'],
      'email' => $user['email'],
      'iat' => $now,
      'exp' => $now + 60*60*12 // 12h
    ];
    $token = JWT::encode($payload, $this->cfg['JWT_SECRET']);
    return ['token'=>$token, 'user'=>['id'=>(int)$user['id'],'email'=>$user['email']]];
  }

  public function getUserById(int $id): ?array {
    return $this->users->findById($id);
  }
}
