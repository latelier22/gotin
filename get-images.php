<?php
header('Content-Type: application/json; charset=utf-8');

// Dossier des images
$dir = __DIR__ . '/images';

// Extensions acceptées (ajout avif + webp)
$pattern = '/\.(jpe?g|png|gif|webp|avif)$/i';

$all = [];
if (is_dir($dir)) {
    foreach (scandir($dir) as $f) {
        if ($f === '.' || $f === '..') continue;
        $path = $dir . '/' . $f;
        if (!is_file($path)) continue;
        if (!preg_match($pattern, $f)) continue;
        $all[] = 'images/' . $f; // chemins relatifs pour le client
    }
}

// Tri naturel pour une liste stable (optionnel)
natcasesort($all);
$all = array_values($all);

echo json_encode([
  'count' => count($all),
  'files' => $all
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
