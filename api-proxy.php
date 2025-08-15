<?php
// /var/www/gotin/public/api-proxy.php
$API_BASE = 'https://lefouineur.latelier22.fr/api/v2';

// Autoriser seulement les routes shop
$path = $_GET['path'] ?? '';
if ($path === '' || strpos($path, '/shop/') !== 0) {
  http_response_code(400);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['error' => 'Bad path']);
  exit;
}

// Recompose l’URL cible
parse_str($_SERVER['QUERY_STRING'] ?? '', $qs);
unset($qs['path']);
$qstr = http_build_query($qs);
$url = $API_BASE . $path . ($qstr ? ('?' . $qstr) : '');

// Prépare la requête
$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST  => $_SERVER['REQUEST_METHOD'],
]);

// Forward body pour POST/PUT/PATCH
$body = file_get_contents('php://input');
if (in_array($_SERVER['REQUEST_METHOD'], ['POST','PUT','PATCH'])) {
  curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

// Forward des en-têtes utiles
$headers = ['Accept: ' . ($_SERVER['HTTP_ACCEPT'] ?? 'application/json')];
if (!empty($_SERVER['HTTP_AUTHORIZATION'])) $headers[] = 'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION'];
if (!empty($_SERVER['CONTENT_TYPE']))       $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// Exécution
$resBody = curl_exec($ch);
$http    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Réponse au client
header('Content-Type: application/json; charset=utf-8');
http_response_code($http);
echo $resBody;
