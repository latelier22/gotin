<?php
class Validator {
  public static function required(array $data, array $fields): array {
    $errors = [];
    foreach ($fields as $f) {
      if (!isset($data[$f]) || $data[$f] === '') $errors[$f] = 'required';
    }
    return $errors;
  }
}
