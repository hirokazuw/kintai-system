<?php
// ============================================
// get_stamp_detail.php — 日付+スタッフの打刻詳細取得
// GET: staff_id=ID&date=YYYY-MM-DD
// ============================================
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$staff_id = (int)($_GET['staff_id'] ?? 0);
$date     = $_GET['date'] ?? '';

if ($staff_id <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'パラメータが不正です']);
    exit;
}

try {
    $pdo = get_pdo();

    $stmt = $pdo->prepare(
        'SELECT a.id, a.type, DATE_FORMAT(a.stamped_at, "%H:%i") AS time
         FROM attendance a
         WHERE a.staff_id = ? AND a.date = ?
         ORDER BY a.stamped_at ASC'
    );
    $stmt->execute([$staff_id, $date]);
    $rows = $stmt->fetchAll();

    echo json_encode(['success' => true, 'stamps' => $rows]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DBエラー: ' . $e->getMessage()]);
}
