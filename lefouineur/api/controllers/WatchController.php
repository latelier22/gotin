<?php
class WatchController {
  private WatchService $svc;
  public function __construct(){ $this->svc = new WatchService(); }

  public function index(): void {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
    $filters = [
      'q' => $_GET['q'] ?? null,
      'brand' => $_GET['brand'] ?? null,
      'status' => $_GET['status'] ?? null,
    ];
    $data = $this->svc->list($page, $limit, $filters);
    Response::json($data);
  }

  public function show(int $id): void {
    $w = $this->svc->find($id);
    if (!$w) { Response::json(['error'=>'Not found'], 404); return; }
    Response::json($w);
  }

  public function store(int $userId): void {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $errors = Validator::required($body, ['reference','nom','prix']);
    if ($errors) { Response::json(['errors'=>$errors], 422); return; }
    $created = $this->svc->create($body);
    if (isset($created['error'])) { Response::json($created, 400); return; }
    Response::json($created, 201);
  }

  public function update(int $userId, int $id): void {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $updated = $this->svc->update($id, $body);
    if (!$updated) { Response::json(['error'=>'Not found or not modified'], 404); return; }
    Response::json($updated);
  }

  public function destroy(int $userId, int $id): void {
    $ok = $this->svc->delete($id);
    if (!$ok) { Response::json(['error'=>'Not found'], 404); return; }
    Response::json(['deleted'=>true]);
  }
}
