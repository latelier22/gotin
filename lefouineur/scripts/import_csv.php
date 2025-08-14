<?php
/**
 * scripts/import_csv.php
 * Usage: php scripts/import_csv.php /path/to/montres.csv
 * CSV headers expected: reference,nom,marque,prix,promotion,short_description,description,categorie,etat,status,image1,image2,image3,image4,stock_qty,low_stock_threshold
 */
$cfg = require __DIR__ . '/../api/config/config.php';
$pdo = new PDO('sqlite:' . $cfg['DB_PATH']);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('PRAGMA foreign_keys = ON;');

$path = $argv[1] ?? null;
if (!$path || !file_exists($path)) {
  fwrite(STDERR, "CSV non trouvé.\n");
  exit(1);
}
$fh = fopen($path, 'r');
$headers = fgetcsv($fh);
$map = array_flip($headers);

$insert = $pdo->prepare('INSERT OR IGNORE INTO watches (reference, nom, marque, prix, promotion, short_description, description, categorie, etat, status, image1, image2, image3, image4, stock_qty, low_stock_threshold, stock_status)
VALUES (:reference,:nom,:marque,:prix,:promotion,:sd,:desc,:cat,:etat,:status,:i1,:i2,:i3,:i4,:sq,:lst,:ss)');
$count = 0;
while (($row = fgetcsv($fh)) !== false) {
  $data = fn($k)=> $map[$k] ?? null;
  $prix = (float)($row[$map['prix']] ?? 0);
  $sq = (int)($row[$map['stock_qty']] ?? 0);
  $lst = (int)($row[$map['low_stock_threshold']] ?? 0);
  $status = $sq == 0 ? 'out' : ($sq <= $lst ? 'low' : 'in_stock');
  $insert->execute([
    ':reference'=>$row[$map['reference']] ?? '',
    ':nom'=>$row[$map['nom']] ?? '',
    ':marque'=>$row[$map['marque']] ?? '',
    ':prix'=>$prix,
    ':promotion'=>(float)($row[$map['promotion']] ?? 0),
    ':sd'=>$row[$map['short_description']] ?? '',
    ':desc'=>$row[$map['description']] ?? '',
    ':cat'=>$row[$map['categorie']] ?? '',
    ':etat'=>$row[$map['etat']] ?? '',
    ':status'=>$row[$map['status']] ?? 'active',
    ':i1'=>$row[$map['image1']] ?? '',
    ':i2'=>$row[$map['image2']] ?? '',
    ':i3'=>$row[$map['image3']] ?? '',
    ':i4'=>$row[$map['image4']] ?? '',
    ':sq'=>$sq,
    ':lst'=>$lst,
    ':ss'=>$status,
  ]);
  $count++;
}
fclose($fh);
echo "Importés: $count\n";
