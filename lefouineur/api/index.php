<?php
declare(strict_types=1);

require_once __DIR__ . '/utils/Response.php';
require_once __DIR__ . '/utils/Validator.php';
require_once __DIR__ . '/utils/JWT.php';
require_once __DIR__ . '/utils/Router.php';
require_once __DIR__ . '/services/AuthService.php';
require_once __DIR__ . '/services/WatchService.php';
require_once __DIR__ . '/services/StockService.php';
require_once __DIR__ . '/models/Watch.php';
require_once __DIR__ . '/models/User.php';
require_once __DIR__ . '/middleware/AuthMiddleware.php';

// CORS & JSON
header('Content-Type: application/json; charset=utf-8');
$cfg = require __DIR__ . '/config/config.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
if (in_array('*', $cfg['ALLOWED_ORIGINS']) || in_array($origin, $cfg['ALLOWED_ORIGINS'])) {
  header('Access-Control-Allow-Origin: ' . ($cfg['ALLOWED_ORIGINS'][0] === '*' ? '*' : $origin));
  header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$router = new Router($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);

// Routes publiques
$router->post('/api/auth/login', ['AuthController', 'login']);
$router->get('/api/watches', ['WatchController', 'index']);
$router->get('/api/watches/(\d+)', ['WatchController', 'show']);

// Routes protégées
$router->post('/api/watches', AuthMiddleware::requireAuth(['WatchController', 'store']));
$router->put('/api/watches/(\d+)', AuthMiddleware::requireAuth(['WatchController', 'update']));
$router->delete('/api/watches/(\d+)', AuthMiddleware::requireAuth(['WatchController', 'destroy']));

$router->post('/api/stocks/adjust', AuthMiddleware::requireAuth(['StockController', 'adjust']));
$router->get('/api/auth/me', AuthMiddleware::requireAuth(['AuthController', 'me']));

// Dispatch
$router->dispatch();
