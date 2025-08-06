<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['csvFile'])) {
    $tmpPath = $_FILES['csvFile']['tmp_name'];

    if (is_uploaded_file($tmpPath)) {
        $content = file_get_contents($tmpPath);
        if ($content === false) {
            echo "❌ Impossible de lire le fichier temporaire.";
            exit;
        }

        $result = file_put_contents('data/montres.csv', $content);
        if ($result === false) {
            echo "❌ Erreur lors de l’écriture du fichier montres.csv.";
        } else {
            echo "✅ Le fichier montres.csv a bien été remplacé.";
        }
    } else {
        echo "❌ Le fichier n’a pas été correctement uploadé.";
    }
} else {
    echo "❌ Aucune donnée reçue ou mauvaise méthode.";
}
