<?php
class JWT {
  public static function encode(array $payload, string $secret, string $alg = 'HS256'): string {
    $header = ['typ'=>'JWT','alg'=>$alg];
    $segments = [
      self::b64(json_encode($header)),
      self::b64(json_encode($payload))
    ];
    $signing_input = implode('.', $segments);
    $signature = hash_hmac('sha256', $signing_input, $secret, true);
    $segments[] = self::b64($signature);
    return implode('.', $segments);
  }

  public static function decode(string $jwt, string $secret): ?array {
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) return null;
    [$h64, $p64, $s64] = $parts;
    $sig = self::ub64($s64);
    $expected = hash_hmac('sha256', "$h64.$p64", $secret, true);
    if (!hash_equals($expected, $sig)) return null;
    $payload = json_decode(self::ub64($p64), true);
    if (isset($payload['exp']) && time() >= $payload['exp']) return null;
    return $payload;
  }

  private static function b64(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
  }
  private static function ub64(string $b64): string {
    return base64_decode(strtr($b64, '-_', '+/'));
  }
}
