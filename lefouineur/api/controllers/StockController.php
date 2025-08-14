<?php
class StockController {
  private StockService $svc;
  public function __construct(){ $this->svc = new StockService(); }
  // Body: { watch_id, delta } or { reference, delta }
  public function adjust(int $userId): void {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    if (!isset($body['delta'])) { Response::json(['error'=>'delta required'], 422); return; }
    $res = $this->svc->adjust($body);
    if (isset($res['error'])) { Response::json($res, 400); return; }
    Response::json($res);
  }
}
