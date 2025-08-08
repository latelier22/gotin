<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['csvFile'])) {
    $tmpPath = $_FILES['csvFile']['tmp_name'];

    if (!is_uploaded_file($tmpPath)) {
        echo "❌ Le fichier n’a pas été correctement uploadé.";
        exit;
    }

    $content = file_get_contents($tmpPath);
    if ($content === false) {
        echo "❌ Impossible de lire le fichier temporaire.";
        exit;
    }

    $targetFile = 'data/montres.csv';

    // Crée le fichier s'il n'existe pas
    if (!file_exists($targetFile)) {
        if (!touch($targetFile)) {
            echo "❌ Impossible de créer le fichier montres.csv.";
            exit;
        }
    }

    // Vérifie si le fichier est accessible en écriture
    if (!is_writable($targetFile)) {
        echo "❌ Le fichier montres.csv n'est pas accessible en écriture.";
        exit;
    }

    $result = file_put_contents($targetFile, $content);
    if ($result === false) {
        echo "❌ Erreur lors de l’écriture du fichier montres.csv.";
    } else {
        echo "✅ Le fichier montres.csv a bien été remplacé.";
    }
} else {
    echo "❌ Aucune donnée reçue ou mauvaise méthode.";
}
