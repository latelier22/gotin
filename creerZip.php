<?php
$exportDir = __DIR__ . '/site_export';
$zipPath = __DIR__ . '/gotin_montres_site.zip';
$csvFile = __DIR__ . '/data/montres.csv';
$jsSource = __DIR__ . '/js/script.js';
$cssSource = __DIR__ . '/styles/style.css';

// Création des dossiers
@mkdir("$exportDir/js", 0777, true);
@mkdir("$exportDir/styles", 0777, true);
@mkdir("$exportDir/images", 0777, true);

// Lecture CSV
$csv = array_map('str_getcsv', file($csvFile));
$headers = array_map('trim', $csv[0]);
$data = array_slice($csv, 1);

// Création du tableau montres JS
$montresJS = [];
foreach ($data as $i => $row) {
    $assoc = array_combine($headers, $row);
    $montre = [
        'id' => (int)$assoc['id'],
        'nom' => $assoc['nom'],
        'prix' => $assoc['prix'],
        'description' => $assoc['description'],
        'images' => [
            $assoc['image1'],
            $assoc['image2'],
            $assoc['image3'],
            $assoc['image4'],
        ]
    ];
    $montresJS[] = $montre;

    // Copie des images
    foreach (['image1', 'image2', 'image3', 'image4'] as $imgKey) {
        $src = __DIR__ . '/' . $assoc[$imgKey];
        $dest = $exportDir . '/' . $assoc[$imgKey];
        if (file_exists($src)) {
            $imgDir = dirname($dest);
            if (!is_dir($imgDir)) mkdir($imgDir, 0777, true);
            copy($src, $dest);
        }
    }
}

// Générer data.js
$dataJS = "let montres = " . json_encode($montresJS, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . ";";
file_put_contents("$exportDir/js/data.js", $dataJS);

// Copier JS et CSS
copy($jsSource, "$exportDir/js/script.js");
copy($cssSource, "$exportDir/styles/style.css");

// Générer index.html
$html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Le fouineur...</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles/style.css">
  <script src="js/data.js"></script>
  <script src="js/script.js" defer></script>
</head>
<body>
  <div class="container">
    <h1 style="text-align:center; font-size:2.5em; margin-bottom:30px; color:#FFD700; letter-spacing:2px; text-shadow:1px 1px 8px #000;">Le fouineur...</h1>
    <div class="container">
      <div id="montres-container"></div>
      <div class="thumbnail-strip" id="thumbnail-strip"></div>
      <div class="navigation">
          <button onclick="changeMontre(-1)">⟵ Précédente</button>
          <button onclick="changeMontre(1)">Suivante ⟶</button>
      </div>
    </div>

    <div class="modal" id="imageModal">
      <div class="modal-content">
        <span class="close" onclick="closeModal()">✖</span>
        <span class="prev" onclick="prevImage()">◀</span>
        <img id="modalImage" src="">
        <span class="next" onclick="nextImage()">▶</span>
      </div>
    </div>

    <footer class="footer">
      <p>Pour tout renseignement : <a href="mailto:robic@gmail.com">robic@gmail.com</a> — <a href="tel:+33326156546">+33 3 26 15 65 46</a></p>
    </footer>
  </div>
</body>
</html>
HTML;


$scriptPath = $exportDir . '/js/script.js';
if (file_exists($scriptPath)) {
    $content = file_get_contents($scriptPath);
    $newContent = preg_replace('/const USE_LOCAL_DATA\s*=\s*false\s*;/', 'const USE_LOCAL_DATA = true;', $content);
    file_put_contents($scriptPath, $newContent);
}

file_put_contents("$exportDir/index.html", $html);
// Créer le ZIP
$zip = new ZipArchive();
if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE)) {
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($exportDir),
        RecursiveIteratorIterator::LEAVES_ONLY
    );
    foreach ($files as $file) {
        if (!$file->isDir()) {
            $filePath = $file->getRealPath();
            $relativePath = substr($filePath, strlen($exportDir) + 1);
            $zip->addFile($filePath, $relativePath);
        }
    }
    $zip->close();

    // ✅ Téléchargement immédiat
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . basename($zipPath) . '"');
    header('Content-Length: ' . filesize($zipPath));
    readfile($zipPath);
    exit;
} else {
    http_response_code(500);
    echo "❌ Échec de la création du ZIP.\n";
}

?>
