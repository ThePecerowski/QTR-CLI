<?php
/**
 * QTR Framework — Validator
 * Input doğrulama yardımcısı. GET/POST verilerini temizler ve kontrol eder.
 *
 * Kullanım:
 *   $errors = Validator::check($_POST, [
 *       'email'    => 'required|email|max:255',
 *       'password' => 'required|min:8',
 *       'age'      => 'integer|min:1|max:120',
 *   ]);
 *   if (!empty($errors)) return JsonResponse::validationError($errors);
 */

class Validator
{
    // ─── Ana doğrulama ───────────────────────────────────────────────────────

    /**
     * Tek seferlik tüm kuralları çalıştırır.
     *
     * @param  array<string,mixed>         $data   $_POST veya $_GET dizisi
     * @param  array<string,string>        $rules  'field' => 'required|min:3|max:255'
     * @return array<string, list<string>> $errors boşsa geçerli
     */
    public static function check(array $data, array $rules): array
    {
        $errors = [];
        foreach ($rules as $field => $ruleStr) {
            $value     = $data[$field] ?? null;
            $ruleList  = explode('|', $ruleStr);
            foreach ($ruleList as $rule) {
                $err = self::applyRule($field, $value, $rule, $data);
                if ($err !== null) {
                    $errors[$field][] = $err;
                }
            }
        }
        return $errors;
    }

    /**
     * Tek bir alanı temizler (trim + htmlspecialchars).
     */
    public static function sanitize(mixed $value): string
    {
        return htmlspecialchars(trim((string) $value), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    /**
     * Tüm diziyi sanitize eder.
     *
     * @param  array<string,mixed> $data
     * @return array<string,string>
     */
    public static function sanitizeAll(array $data): array
    {
        $out = [];
        foreach ($data as $key => $val) {
            $out[$key] = self::sanitize($val);
        }
        return $out;
    }

    // ─── Kural motoru ────────────────────────────────────────────────────────

    private static function applyRule(string $field, mixed $value, string $rule, array $data): ?string
    {
        // Parametre ayıkla (örn. "min:8" → rule=min, param=8)
        [$name, $param] = array_pad(explode(':', $rule, 2), 2, null);

        return match ($name) {
            'required'   => (($value === null || $value === '') ? "{$field} zorunludur." : null),
            'nullable'   => null, // her zaman geçer
            'string'     => (!is_null($value) && !is_string($value)) ? "{$field} metin olmalıdır." : null,
            'integer'    => (!is_null($value) && $value !== '' && filter_var($value, FILTER_VALIDATE_INT) === false)
                                ? "{$field} tam sayı olmalıdır." : null,
            'numeric'    => (!is_null($value) && $value !== '' && !is_numeric($value))
                                ? "{$field} sayısal olmalıdır." : null,
            'boolean'    => (!is_null($value) && $value !== '' && !in_array($value, [true, false, 1, 0, '1', '0', 'true', 'false'], true))
                                ? "{$field} boolean olmalıdır." : null,
            'email'      => (!is_null($value) && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL))
                                ? "{$field} geçerli bir e-posta adresi olmalıdır." : null,
            'url'        => (!is_null($value) && $value !== '' && !filter_var($value, FILTER_VALIDATE_URL))
                                ? "{$field} geçerli bir URL olmalıdır." : null,
            'min'        => self::ruleMin($field, $value, (int) $param),
            'max'        => self::ruleMax($field, $value, (int) $param),
            'in'         => self::ruleIn($field, $value, (string) $param),
            'not_in'     => self::ruleNotIn($field, $value, (string) $param),
            'alpha'      => (!is_null($value) && $value !== '' && !ctype_alpha((string) $value))
                                ? "{$field} sadece harf içerebilir." : null,
            'alpha_num'  => (!is_null($value) && $value !== '' && !ctype_alnum((string) $value))
                                ? "{$field} sadece harf ve rakam içerebilir." : null,
            'regex'      => self::ruleRegex($field, $value, (string) $param),
            'confirmed'  => (($value !== ($data["{$field}_confirmation"] ?? null))
                                ? "{$field} ve onayı eşleşmiyor." : null),
            'date'       => (!is_null($value) && $value !== '' && strtotime((string) $value) === false)
                                ? "{$field} geçerli bir tarih olmalıdır." : null,
            default      => null,
        };
    }

    private static function ruleMin(string $field, mixed $value, int $min): ?string
    {
        if ($value === null || $value === '') return null;
        if (is_numeric($value)) {
            return ((float) $value < $min) ? "{$field} en az {$min} olmalıdır." : null;
        }
        return (mb_strlen((string) $value) < $min) ? "{$field} en az {$min} karakter olmalıdır." : null;
    }

    private static function ruleMax(string $field, mixed $value, int $max): ?string
    {
        if ($value === null || $value === '') return null;
        if (is_numeric($value)) {
            return ((float) $value > $max) ? "{$field} en fazla {$max} olabilir." : null;
        }
        return (mb_strlen((string) $value) > $max) ? "{$field} en fazla {$max} karakter olabilir." : null;
    }

    private static function ruleIn(string $field, mixed $value, string $param): ?string
    {
        if ($value === null || $value === '') return null;
        $allowed = explode(',', $param);
        return !in_array((string) $value, $allowed, true) ? "{$field} geçersiz değer: {$value}." : null;
    }

    private static function ruleNotIn(string $field, mixed $value, string $param): ?string
    {
        if ($value === null || $value === '') return null;
        $denied = explode(',', $param);
        return in_array((string) $value, $denied, true) ? "{$field} bu değeri alamaz: {$value}." : null;
    }

    private static function ruleRegex(string $field, mixed $value, string $pattern): ?string
    {
        if ($value === null || $value === '') return null;
        return (@preg_match($pattern, (string) $value) !== 1) ? "{$field} geçersiz format." : null;
    }
}
