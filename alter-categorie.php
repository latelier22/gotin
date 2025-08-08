<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Ton code ici


$db = new PDO('sqlite:/home/debian/gotin/data/montres.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$db->exec("ALTER TABLE montres ADD COLUMN categorie TEXT DEFAULT 'Montres'");
echo "✅ Colonne categorie créée";