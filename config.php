<?php
// ============================================
// DB接続設定
// ============================================
define('DB_HOST', 'mysql46.conoha.ne.jp');
define('DB_NAME', '8kk9t_kintai');
define('DB_USER', '8kk9t_kintaiadmin');
define('DB_PASS', 'YOUR_PASSWORD');
define('DB_CHARSET', 'utf8mb4');

function get_pdo(): PDO {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    return new PDO($dsn, DB_USER, DB_PASS, $options);
}
