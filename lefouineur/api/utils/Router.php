<?php
class Router {
  private string $method;
  private string $uri;
  private array $routes = [];

  public function __construct(string $method, string $uri) {
    $this->method = $method;
    $this->uri = parse_url($uri, PHP_URL_PATH) ?? '/';
  }

  public function add(string $method, string $pattern, $handler) {
    $this->routes[] = [$method, "#^{$pattern}$#", $handler];
  }
  public function get($pattern, $handler){ $this->add('GET', $pattern, $handler); }
  public function post($pattern, $handler){ $this->add('POST', $pattern, $handler); }
  public function put($pattern, $handler){ $this->add('PUT', $pattern, $handler); }
  public function delete($pattern, $handler){ $this->add('DELETE', $pattern, $handler); }

  public function dispatch() {
    foreach ($this->routes as [$m, $regex, $handler]) {
      if ($m === $this->method && preg_match($regex, $this->uri, $matches)) {
        array_shift($matches);
        if (is_array($handler) && is_string($handler[0])) {
          $class = $handler[0];
          if (!class_exists($class)) {
            require_once __DIR__ . '/../controllers/' . $class . '.php';
          }
          $obj = new $class();
          return $obj->{$handler[1]}(...$matches);
        } elseif (is_callable($handler)) {
          return $handler(...$matches);
        }
      }
    }
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
  }
}
