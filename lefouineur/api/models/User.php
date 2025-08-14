<?php
class User {
  private PDO $db;
  public function __construct(PDO $db){ $this->db = $db; }

  public function findByEmail(string $email): ?array {
    $st = $this->db->prepare('SELECT * FROM users WHERE email = :e LIMIT 1');
    $st->execute([':e'=>$email]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
  }
  public function findById(int $id): ?array {
    $st = $this->db->prepare('SELECT * FROM users WHERE id = :id');
    $st->execute([':id'=>$id]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
  }
}
