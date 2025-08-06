<?php
$uploadDir = 'images/';
$response = [];

foreach ($_FILES as $key => $file) {
    $targetPath = $uploadDir . basename($file['name']);

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        $response[$key] = "✅ {$file['name']} uploadée";
    } else {
        $response[$key] = "❌ Erreur pour {$file['name']}";
    }
}

header('Content-Type: application/json');
echo json_encode($response);
