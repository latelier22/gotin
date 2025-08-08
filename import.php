<?php
// config
define('DB_FILE', __DIR__ . '/data/montres.sqlite');
define('GOOGLE_API_URL', 'https://script.google.com/macros/s/AKfycbwLLsPWmWlMOA4XUGx6AemxHzeV8m9F6zBaanJ9oFUtqsLJPFvbivEIkcIpfvaL37F0UQ/exec'); // à adapter

// fetch depuis Google API
$json = file_get_contents(GOOGLE_API_URL);
if (!$json) {
    http_response_code(500);
    die("❌ Impossible de récupérer les données depuis Google Sheets");
}

$data = json_decode($json, true);
if (!$data || !is_array($data)) {
    http_response_code(500);
    die("❌ Format JSON invalide");
}

// connect à SQLite
try {
    $pdo = new PDO('sqlite:' . DB_FILE);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    die("❌ Erreur connexion BDD : " . $e->getMessage());
}

// clean table
$pdo->exec("DELETE FROM montres");

// préparer requête
$stmt = $pdo->prepare("
    INSERT INTO montres (id, nom, prix, description, image1, image2, image3, image4)
    VALUES (:id, :nom, :prix, :description, :image1, :image2, :image3, :image4)
");

$imported = 0;
foreach ($data as $m) {
    if (!isset($m['nom']) || !isset($m['prix'])) continue; // skip lignes invalides

    $stmt->execute([
        ':id' => $m['id'] ?? null,
        ':nom' => $m['nom'],
        ':prix' => $m['prix'],
        ':description' => $m['description'] ?? '',
        ':image1' => $m['image1'] ?? '',
        ':image2' => $m['image2'] ?? '',
        ':image3' => $m['image3'] ?? '',
        ':image4' => $m['image4'] ?? '',
    ]);
    $imported++;
}

// echo "✅ $imported montres importées depuis Google Sheets dans la base SQLite.";

header("Location: crud.html");
exit;