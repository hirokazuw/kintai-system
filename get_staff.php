<?php
// ============================================
// get_staff.php — スタッフ一覧取得API
// GET: なし
// Response: JSON [{id, name}, ...]
// ============================================
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

// GETのみ受け付ける
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

try {
    $pdo  = get_pdo();
    $stmt = $pdo->query('SELECT id, name FROM staff ORDER BY id ASC');
    $list = $stmt->fetchAll();

    echo json_encode(['success' => true, 'staff' => $list]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DBエラー: ' . $e->getMessage()]);
}
