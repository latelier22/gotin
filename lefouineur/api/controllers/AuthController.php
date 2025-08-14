<?php
class AuthController {
  private AuthService $auth;
  public function __construct(){ $this->auth = new AuthService(); }

  public function login(): void {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $errors = Validator::required($body, ['email','password']);
    if ($errors) { Response::json(['errors'=>$errors], 422); return; }

    $res = $this->auth->attempt($body['email'], $body['password']);
    if (!$res) { Response::json(['error'=>'Invalid credentials'], 401); return; }
    Response::json($res);
  }

  public function me(int $userId): void {
    $user = $this->auth->getUserById($userId);
    if (!$user) { Response::json(['error'=>'User not found'], 404); return; }
    unset($user['password_hash']);
    Response::json($user);
  }
}
