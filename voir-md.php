<?php
// Chemin vers ton fichier Markdown
$fichier = __DIR__ . '/readme.md';

// Vérifie que le fichier existe
if (!file_exists($fichier)) {
    header("HTTP/1.0 404 Not Found");
    echo "Fichier introuvable.";
    exit;
}

// Envoie le bon type MIME
header("Content-Type: text/markdown; charset=UTF-8");

// Lecture et affichage du fichier
readfile($fichier);
