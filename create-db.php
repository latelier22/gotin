<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Ton code ici


$db = new PDO('sqlite:/home/debian/gotin/data/montres.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$db->exec("CREATE TABLE IF NOT EXISTS montres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    prix REAL,
    description TEXT,
    image1 TEXT,
    image2 TEXT,
    image3 TEXT,
    image4 TEXT
)");
echo "✅ Table créée";