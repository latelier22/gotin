<?php
class Watch {
  private PDO $db;
  public function __construct(PDO $db){ $this->db = $db; }

  public function paginate(int $page, int $limit, array $filters = []): array {
    $where = [];
    $params = [];
    if (!empty($filters['q'])) {
      $where[] = '(nom LIKE :q OR marque LIKE :q OR reference LIKE :q)';
      $params[':q'] = '%' . $filters['q'] . '%';
    }
    if (!empty($filters['brand'])) { $where[] = 'marque = :brand'; $params[':brand'] = $filters['brand']; }
    if (!empty($filters['status'])) { $where[] = 'status = :status'; $params[':status'] = $filters['status']; }
    $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

    $count = (int)$this->db->query("SELECT COUNT(*) FROM watches $whereSql")->fetchColumn();
    $offset = ($page - 1) * $limit;
    $st = $this->db->prepare("SELECT * FROM watches $whereSql ORDER BY id DESC LIMIT :limit OFFSET :offset");
    foreach ($params as $k=>$v) $st->bindValue($k, $v);
    $st->bindValue(':limit', $limit, PDO::PARAM_INT);
    $st->bindValue(':offset', $offset, PDO::PARAM_INT);
    $st->execute();
    $items = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    return ['items'=>$items, 'page'=>$page, 'limit'=>$limit, 'total'=>$count];
  }

  public function find(int $id): ?array {
    $st = $this->db->prepare('SELECT * FROM watches WHERE id = :id');
    $st->execute([':id'=>$id]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
  }

  public function findByReference(string $ref): ?array {
    $st = $this->db->prepare('SELECT * FROM watches WHERE reference = :r');
    $st->execute([':r'=>$ref]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
  }

  public function create(array $data): array {
    $sql = 'INSERT INTO watches (reference, nom, marque, prix, promotion, short_description, description, categorie, etat, status, image1, image2, image3, image4, stock_qty, low_stock_threshold, stock_status)
            VALUES (:reference,:nom,:marque,:prix,:promotion,:sd,:desc,:cat,:etat,:status,:i1,:i2,:i3,:i4,:sq,:lst,:ss)';
    $st = $this->db->prepare($sql);
    try {
      $st->execute([
        ':reference'=>$data['reference'],
        ':nom'=>$data['nom'] ?? '',
        ':marque'=>$data['marque'] ?? '',
        ':prix'=>$data['prix'],
        ':promotion'=>$data['promotion'] ?? 0,
        ':sd'=>$data['short_description'] ?? '',
        ':desc'=>$data['description'] ?? '',
        ':cat'=>$data['categorie'] ?? '',
        ':etat'=>$data['etat'] ?? '',
        ':status'=>$data['status'] ?? 'active',
        ':i1'=>$data['image1'] ?? '',
        ':i2'=>$data['image2'] ?? '',
        ':i3'=>$data['image3'] ?? '',
        ':i4'=>$data['image4'] ?? '',
        ':sq'=>$data['stock_qty'] ?? 0,
        ':lst'=>$data['low_stock_threshold'] ?? 0,
        ':ss'=>$data['stock_status'] ?? 'in_stock',
      ]);
      $id = (int)$this->db->lastInsertId();
      return $this->find($id) ?? [];
    } catch (PDOException $e) {
      return ['error'=>$e->getMessage()];
    }
  }

  public function update(int $id, array $data): ?array {
    $current = $this->find($id);
    if (!$current) return null;
    $merged = array_merge($current, $data);
    $sql = 'UPDATE watches SET reference=:reference, nom=:nom, marque=:marque, prix=:prix, promotion=:promotion, short_description=:sd, description=:desc, categorie=:cat, etat=:etat, status=:status, image1=:i1, image2=:i2, image3=:i3, image4=:i4, stock_qty=:sq, low_stock_threshold=:lst, stock_status=:ss WHERE id=:id';
    $st = $this->db->prepare($sql);
    $st->execute([
      ':id'=>$id,
      ':reference'=>$merged['reference'],
      ':nom'=>$merged['nom'],
      ':marque'=>$merged['marque'],
      ':prix'=>$merged['prix'],
      ':promotion'=>$merged['promotion'],
      ':sd'=>$merged['short_description'],
      ':desc'=>$merged['description'],
      ':cat'=>$merged['categorie'],
      ':etat'=>$merged['etat'],
      ':status'=>$merged['status'],
      ':i1'=>$merged['image1'],
      ':i2'=>$merged['image2'],
      ':i3'=>$merged['image3'],
      ':i4'=>$merged['image4'],
      ':sq'=>$merged['stock_qty'],
      ':lst'=>$merged['low_stock_threshold'],
      ':ss'=>$merged['stock_status'],
    ]);
    return $this->find($id);
  }

  public function delete(int $id): bool {
    $st = $this->db->prepare('DELETE FROM watches WHERE id = :id');
    return $st->execute([':id'=>$id]);
  }

  public function adjustStockById(int $id, int $delta): ?array {
    $w = $this->find($id);
    if (!$w) return null;
    $qty = max(0, (int)$w['stock_qty'] + $delta);
    $status = $qty == 0 ? 'out' : ($qty <= (int)$w['low_stock_threshold'] ? 'low' : 'in_stock');
    $st = $this->db->prepare('UPDATE watches SET stock_qty=:q, stock_status=:s WHERE id=:id');
    $st->execute([':q'=>$qty, ':s'=>$status, ':id'=>$id]);
    return $this->find($id);
  }

  public function adjustStockByReference(string $ref, int $delta): ?array {
    $w = $this->findByReference($ref);
    if (!$w) return null;
    return $this->adjustStockById((int)$w['id'], $delta);
  }
}
