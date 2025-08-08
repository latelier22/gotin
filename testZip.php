<?php
$zip = new ZipArchive();
if ($zip->open('test.zip', ZipArchive::CREATE) === TRUE) {
    $zip->addFromString("test.txt", "Hello Gotin!");
    $zip->close();
    echo "✅ ZIP OK";
} else {
    echo "❌ Échec ZIP";
}
