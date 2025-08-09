<?php
header('Content-Type: application/json');

$dir = __DIR__ . '/images';
$files = array_values(array_filter(scandir($dir), function($f) use ($dir) {
    return !is_dir($dir . '/' . $f) && preg_match('/\.(jpg|jpeg|png|gif|avif)$/i', $f);
}));

shuffle($files); // mélange l'ordre
$random4 = array_slice($files, 0, 6); // prend 4 images

echo json_encode($random4);
