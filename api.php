<?php
header('Content-Type: application/json');

// Chemin absolu vers la base SQLite
$dbPath = '/home/debian/gotin/data/montres.sqlite';

try {
    $db = new PDO("sqlite:$dbPath");
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Connexion DB échouée: ' . $e->getMessage()]);
    exit;
}

// Lecture des données JSON ou POST classique
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) $data = $_POST;

// Action
$action = $_GET['action'] ?? $_POST['action'] ?? $data['action'] ?? null;

if (!$action) {
    echo json_encode(['error' => 'Aucune action fournie']);
    exit;
}

// === ACTION: LIST ===
if ($action === 'list') {
    $stmt = $db->query("SELECT * FROM montres ORDER BY id ASC");
    $montres = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($montres);
    exit;
}

// === ACTION: ADD ===
if ($action === 'add') {
   $stmt = $db->prepare("INSERT INTO montres (nom, prix, description, image1, image2, image3, image4, categorie, reference)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->execute([
    $data['nom'] ?? '',
    $data['prix'] ?? 0,
    $data['description'] ?? '',
    $data['image1'] ?? '',
    $data['image2'] ?? '',
    $data['image3'] ?? '',
    $data['image4'] ?? '',
    $data['categorie'] ?? '',
    $data['reference'] ?? ''
]);

    $id = $db->lastInsertId();
    echo json_encode(['message' => 'Ajouté', 'id' => (int)$id]);
    exit;
}

// === ACTION: EDIT ===
if ($action === 'edit') {
    if (!isset($data['id'])) {
        echo json_encode(['error' => 'ID requis']);
        exit;
    }
    $stmt = $db->prepare("UPDATE montres SET nom=?, prix=?, description=?, image1=?, image2=?, image3=?, image4=?, categorie=?, reference=? WHERE id=?");
$stmt->execute([
    $data['nom'] ?? '',
    $data['prix'] ?? 0,
    $data['description'] ?? '',
    $data['image1'] ?? '',
    $data['image2'] ?? '',
    $data['image3'] ?? '',
    $data['image4'] ?? '',
    $data['categorie'] ?? '',
    $data['reference'] ?? '',
    $data['id']
]);

echo json_encode(['message' => 'Modifié', 'id' => (int)$data['id'], 'debug' => $data]);

    exit;
}

// === ACTION: DELETE ===
if ($action === 'delete') {
    $id = $_GET['id'] ?? $_POST['id'] ?? $data['id'] ?? null;
    if (!is_numeric($id)) {
        echo json_encode(['error' => 'ID invalide']);
        exit;
    }
    $stmt = $db->prepare("DELETE FROM montres WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['message' => 'Supprimé', 'id' => (int)$id]);
    exit;
}

// === ACTION inconnue ===
echo json_encode(['error' => 'Action inconnue']);
exit;
