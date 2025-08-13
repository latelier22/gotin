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
    // joint aussi le logo de la marque
    $stmt = $db->query("
        SELECT m.*,
               ma.logo AS marque_logo
        FROM montres m
        LEFT JOIN marques ma ON ma.name = m.marque
        ORDER BY m.id ASC
    ");
    $montres = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($montres, JSON_UNESCAPED_UNICODE);
    exit;
}

case 'add': {
    $stmt = $db->prepare("
        INSERT INTO montres
          (nom, marque, prix,prix_conseille, promotion, short_description, description,
           image1, image2, image3, image4, categorie, reference, etat, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        $data['status'] ?? 'disponible'
    ]);
    echo json_encode(['message' => 'Ajouté', 'id' => (int)$db->lastInsertId()], JSON_UNESCAPED_UNICODE);
    exit;
}

case 'edit': {
    if (!isset($data['id'])) json_fail('ID requis');

    $stmt = $db->prepare("
        UPDATE montres
           SET nom=?, marque=?, prix=?,prix_conseille=?, promotion=?, short_description=?, description=?,
               image1=?, image2=?, image3=?, image4=?,
               categorie=?, reference=?, etat=?, status=?
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
        $data['id']
    ]);
    echo json_encode(['message' => 'Modifié', 'id' => (int)$data['id']], JSON_UNESCAPED_UNICODE);
    exit;
}

case 'delete': {
    $id = $_GET['id'] ?? $_POST['id'] ?? $data['id'] ?? null;
    if (!is_numeric($id)) json_fail('ID invalide');

    $stmt = $db->prepare("DELETE FROM montres WHERE id=?");
    $stmt->execute([$id]);
    echo json_encode(['message' => 'Supprimé', 'id' => (int)$id], JSON_UNESCAPED_UNICODE);
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

default:
    echo json_encode(['error' => 'Action inconnue']);
    exit;
}
