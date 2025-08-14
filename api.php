<?php
header('Content-Type: application/json; charset=utf-8');

// --- Connexion DB ---
$dbPath = '/home/debian/gotin/data/montres.sqlite';
try {
    $db = new PDO("sqlite:$dbPath");
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('PRAGMA foreign_keys = ON');
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Connexion DB échouée: ' . $e->getMessage()]);
    exit;
}

/* Assure la table des marques (NOMMÉE "marques") */
$db->exec("
CREATE TABLE IF NOT EXISTS marques (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  logo TEXT
);
");

// --- Entrée (JSON ou POST classique) ---
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) $data = $_POST;

// --- Action ---
$action = $_GET['action'] ?? $_POST['action'] ?? $data['action'] ?? null;
if (!$action) {
    echo json_encode(['error' => 'Aucune action fournie']);
    exit;
}

// --- Utils ---
function json_fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

// ===================================================================
//                         PRODUITS (montres)
// ===================================================================
switch ($action) {
case 'list': {
    // ⚠️ NE PAS relire php://input ici : tu as déjà $data plus haut
    $id          = isset($_GET['id'])           ? (int)$_GET['id']           : (isset($data['id'])           ? (int)$data['id']           : 0);
    $brand       = isset($_GET['brand'])        ? trim($_GET['brand'])       : (isset($data['brand'])        ? trim($data['brand'])       : '');
    $activeOnly  = isset($_GET['active_only'])  ? (int)$_GET['active_only']  : (isset($data['active_only'])  ? (int)$data['active_only']  : 1);
    $includeTrash= isset($_GET['include_trash'])? (int)$_GET['include_trash']: (isset($data['include_trash'])? (int)$data['include_trash']: 0);
    $onlyTrash   = isset($_GET['only_trash'])   ? (int)$_GET['only_trash']   : (isset($data['only_trash'])   ? (int)$data['only_trash']   : 0);

    // -------------------------
    // Cas A : un seul produit
    // -------------------------
    if ($id > 0) {
        $sql = "
            SELECT m.*, ma.logo AS marque_logo
            FROM montres m
            LEFT JOIN marques ma ON ma.name = m.marque
            WHERE m.id = :id
        ";
        // Par défaut, on EXCLUT la corbeille; pour l'inclure explicitement -> include_trash=1
        if (!$includeTrash) {
            $sql .= " AND COALESCE(m.corbeille,0) = 0";
        }
        $sql .= " LIMIT 1";

        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        $montre = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($montre) {
            if (isset($montre['stock_qty']) && (int)$montre['stock_qty'] === 0) {
                $montre['status'] = 'Vendu';
            }
            echo json_encode($montre, JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Produit introuvable'], JSON_UNESCAPED_UNICODE);
        }
        exit;
    }

    // -------------------------
    // Cas B/C : liste
    // -------------------------
    $sql = "
        SELECT m.*, ma.logo AS marque_logo
        FROM montres m
        LEFT JOIN marques ma ON ma.name = m.marque
    ";

    $where  = [];
    $params = [];

    // Gestion corbeille
    if ($onlyTrash) {
        $where[] = "COALESCE(m.corbeille,0) = 1";           // uniquement corbeille
    } else if (!$includeTrash) {
        $where[] = "COALESCE(m.corbeille,0) = 0";           // exclure corbeille (défaut)
    } // sinon include_trash=1 -> on ne met pas de condition sur corbeille

    // Actifs uniquement par défaut
    if ($activeOnly) {
        $where[] = "COALESCE(m.active,1) = 1";
    }

    // Filtre marque exact (si fourni)
    if ($brand !== '') {
        $where[] = "m.marque = :brand";
        $params[':brand'] = $brand;
    }

    if ($where) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    $sql .= " ORDER BY m.id ASC";

    $stmt = $db->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->execute();
    $montres = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($montres as &$m) {
        if (isset($m['stock_qty']) && (int)$m['stock_qty'] === 0) {
            $m['status'] = 'Vendu';
        }
    }

    echo json_encode($montres, JSON_UNESCAPED_UNICODE);
    exit;
}



case 'add': {
    try {
        $stmt = $db->prepare("
            INSERT INTO montres
              (nom, marque, prix, prix_conseille, promotion, short_description, description,
               image1, image2, image3, image4, categorie, reference, etat, status, active, stock_qty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['nom'] ?? '',
            $data['marque'] ?? '',
            $data['prix'] ?? 0,
            $data['prix_conseille'] ?? 0,
            $data['promotion'] ?? '',
            $data['short_description'] ?? '',
            $data['description'] ?? '',
            $data['image1'] ?? '',
            $data['image2'] ?? '',
            $data['image3'] ?? '',
            $data['image4'] ?? '',
            $data['categorie'] ?? '',
            $data['reference'] ?? '',
            $data['etat'] ?? 'neuf',
            $data['status'] ?? 'disponible',
            isset($data['active']) ? (int)$data['active'] : 1,
            $data['stock_qty'] ?? 0
        ]);
        echo json_encode(['message' => 'Ajouté', 'id' => (int)$db->lastInsertId()], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => 'DB', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

case 'edit': {
    if (!isset($data['id'])) json_fail('ID requis');

    $stmt = $db->prepare("
        UPDATE montres
           SET nom=?, marque=?, prix=?, prix_conseille=?, promotion=?, short_description=?, description=?,
               image1=?, image2=?, image3=?, image4=?,
               categorie=?, reference=?, etat=?, status=?, active=?, stock_qty=?
         WHERE id=?
    ");
    $stmt->execute([
        $data['nom'] ?? '',
        $data['marque'] ?? '',
        $data['prix'] ?? 0,
        $data['prix_conseille'] ?? 0,
        $data['promotion'] ?? '',
        $data['short_description'] ?? '',
        $data['description'] ?? '',
        $data['image1'] ?? '',
        $data['image2'] ?? '',
        $data['image3'] ?? '',
        $data['image4'] ?? '',
        $data['categorie'] ?? '',
        $data['reference'] ?? '',
        $data['etat'] ?? 'neuf',
        $data['status'] ?? 'disponible',
        isset($data['active']) ? (int)$data['active'] : 1,
        isset($data['stock_qty']) ? (int)$data['stock_qty'] : 0,
        $data['id']
    ]);
    echo json_encode(['message' => 'Modifié', 'id' => (int)$data['id']], JSON_UNESCAPED_UNICODE);
    exit;
}


case 'delete': {
    $id = $_GET['id'] ?? $_POST['id'] ?? $data['id'] ?? null;
    if (!is_numeric($id)) json_fail('ID invalide');

    // Passage en corbeille au lieu de suppression définitive
    $stmt = $db->prepare("UPDATE montres SET corbeille = 1 WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode([
        'message' => 'Mis en corbeille',
        'id'      => (int)$id
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

case 'restore': {
    $id = $_GET['id'] ?? $_POST['id'] ?? $data['id'] ?? null;
    if (!is_numeric($id)) json_fail('ID invalide');

    try {
        $stmt = $db->prepare("UPDATE montres SET corbeille = 0 WHERE id = ?");
        $stmt->execute([$id]);

        echo json_encode([
            'message' => 'Produit restauré',
            'id'      => (int)$id,
            'success' => true
        ], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Throwable $e) {
        json_fail('Erreur DB: ' . $e->getMessage(), 500);
    }
}
break;


case 'set_active': {
    $id = (int)($data['id'] ?? $_POST['id'] ?? 0);

    // Normalise 'active' si fourni (accepte "1","0","true","false","on","off")
    $activeRaw = $data['active'] ?? $_POST['active'] ?? null;
    $active = null;
    if ($activeRaw !== null) {
        $val = is_string($activeRaw) ? strtolower(trim($activeRaw)) : $activeRaw;
        if ($val === 'true' || $val === 'on')  $active = 1;
        else if ($val === 'false' || $val === 'off') $active = 0;
        else $active = (int)$val;
    }

    if ($id < 0) json_fail("Paramètres invalides.");

    if ($active === null) {
        // Pas de valeur fournie -> toggle
        $sel = $db->prepare("SELECT COALESCE(active,1) as active FROM montres WHERE id=?");
        $sel->execute([$id]);
        $row = $sel->fetch(PDO::FETCH_ASSOC);
        if (!$row) json_fail("Produit introuvable.", 404);
        $active = ((int)$row['active'] === 1) ? 0 : 1;
    }

    $stmt = $db->prepare("UPDATE montres SET active=? WHERE id=?");
    $stmt->execute([$active, $id]);

    echo json_encode(['ok' => true, 'id' => $id, 'active' => (int)$active], JSON_UNESCAPED_UNICODE);
    exit;
}



// ===================================================================
//                           MARQUES (marques)
// ===================================================================

case 'list_brands': {
    // retourne [{id, name, logo}]
    $stmt = $db->query("SELECT id, name, logo FROM marques ORDER BY name COLLATE NOCASE");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_UNESCAPED_UNICODE);
    exit;
}

case 'add_brand': {
    $name = trim($data['name'] ?? '');
    $logo = trim($data['logo'] ?? '');
    if ($name === '') json_fail("Nom de marque requis.");

    try {
        $ins = $db->prepare("INSERT INTO marques (name, logo) VALUES (?, ?)");
        $ins->execute([$name, $logo]);
        echo json_encode(['ok' => true, 'id' => (int)$db->lastInsertId()], JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        json_fail("Nom de marque déjà existant.", 409);
    }
    exit;
}

case 'edit_brand':
case 'update_brand': {
    $id   = (int)($data['id'] ?? 0);
    $name = trim($data['name'] ?? '');
    $logo = trim($data['logo'] ?? ''); // optionnel

    if ($id <= 0 || $name === '') json_fail("Paramètres invalides.");

    // récupérer l'ancien nom (pour propager dans montres si changement)
    $old = $db->prepare("SELECT name FROM marques WHERE id=?");
    $old->execute([$id]);
    $row = $old->fetch(PDO::FETCH_ASSOC);
    if (!$row) json_fail("Marque inconnue.", 404);
    $oldName = $row['name'];

    $db->beginTransaction();
    try {
        if ($logo !== '') {
            $upd = $db->prepare("UPDATE marques SET name=?, logo=? WHERE id=?");
            $upd->execute([$name, $logo, $id]);
        } else {
            $upd = $db->prepare("UPDATE marques SET name=? WHERE id=?");
            $upd->execute([$name, $id]);
        }

        if ($oldName !== $name) {
            // propage le nouveau nom dans les produits
            $up = $db->prepare("UPDATE montres SET marque=? WHERE marque=?");
            $up->execute([$name, $oldName]);
        }

        $db->commit();
        echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        $db->rollBack();
        json_fail("Impossible de mettre à jour la marque.");
    }
    exit;
}

case 'delete_brand': {
    $id = (int)($data['id'] ?? 0);
    if ($id <= 0) json_fail("ID manquant.");

    $sel = $db->prepare("SELECT name FROM marques WHERE id=?");
    $sel->execute([$id]);
    $brand = $sel->fetch(PDO::FETCH_ASSOC);
    if (!$brand) json_fail("Marque inconnue.", 404);
    $name = $brand['name'];

    // bloque la suppression si des produits utilisent cette marque
    $cnt = $db->prepare("SELECT COUNT(*) FROM montres WHERE marque=?");
    $cnt->execute([$name]);
    $used = (int)$cnt->fetchColumn();
    if ($used > 0) {
        json_fail("Marque utilisée par $used produit(s) — modifie d’abord les produits.");
    }

    $del = $db->prepare("DELETE FROM marques WHERE id=?");
    $del->execute([$id]);
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

case 'adjust_stock': {
    // on utilise UNIQUEMENT id + delta (+ reason obligatoire)
    $id     = isset($data['id'])     ? (int)$data['id']     : (isset($_POST['id'])     ? (int)$_POST['id']     : 0);
    $delta  = isset($data['delta'])  ? (int)$data['delta']  : (isset($_POST['delta'])  ? (int)$_POST['delta']  : 0);
    $reason = isset($data['reason']) ? trim($data['reason']) : (isset($_POST['reason']) ? trim($_POST['reason']) : '');

    if ($id <= 0)         json_fail('id requis', 422);
    if ($delta === 0)     json_fail('delta required (non-zero)', 422);
    if ($reason === '')   json_fail('reason requise', 422);

    try {
        // Vérifier si la montre existe
        $sel = $db->prepare('SELECT id, stock_qty FROM montres WHERE id = ?');
        $sel->execute([$id]);
        $row = $sel->fetch(PDO::FETCH_ASSOC);
        if (!$row) json_fail('Produit introuvable', 404);

        // Nouveau stock (minimum 0)
        $newQty = max(0, (int)$row['stock_qty'] + $delta);

        // Mise à jour du stock
        $up = $db->prepare('UPDATE montres SET stock_qty = ? WHERE id = ?');
        $up->execute([$newQty, $id]);

        // Insérer dans l’historique
        $log = $db->prepare('INSERT INTO stock_history (montre_id, delta, reason, created_at) VALUES (?, ?, ?, datetime("now"))');
        $log->execute([$id, $delta, $reason]);

        // Retourner la ligne complète mise à jour
$r2 = $db->prepare('SELECT * FROM montres WHERE id = ?');
$r2->execute([$id]);
$updated = $r2->fetch(PDO::FETCH_ASSOC);

// ✅ renvoyer UN SEUL JSON, avec un champ success
echo json_encode([
    'success' => true,
    'item'    => $updated
], JSON_UNESCAPED_UNICODE);
exit;



    } catch (Throwable $e) {
        json_fail('Erreur DB: ' . $e->getMessage(), 500);
    }
}






default:
    echo json_encode(['error' => 'Action inconnue']);
    exit;
}
