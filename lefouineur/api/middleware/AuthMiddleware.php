<?php
class AuthMiddleware {
  public static function requireAuth($handler) {
    return function(...$args) use ($handler) {
      $cfg = require __DIR__ . '/../config/config.php';
      $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
      if (!preg_match('/Bearer\s+(.*)$/i', $hdr, $m)) {
        http_response_code(401);
        echo json_encode(['error'=>'Missing bearer token']); return;
      }
      $payload = JWT::decode($m[1], $cfg['JWT_SECRET']);
      if (!$payload) { http_response_code(401); echo json_encode(['error'=>'Invalid token']); return; }
      $userId = $payload['sub'] ?? null;
      if (!$userId) { http_response_code(401); echo json_encode(['error'=>'Invalid token payload']); return; }

      // inject $userId as first arg
      if (is_array($handler)) {
        $class = $handler[0];
        if (!class_exists($class)) require_once __DIR__ . '/../controllers/' . $class . '.php';
        $obj = new $class();
        return $obj->{$handler[1]}($userId, ...$args);
      } elseif (is_callable($handler)) {
        return $handler($userId, ...$args);
      }
    };
  }
}
