<?php
// ============================================
// get_today_status.php — 本日の打刻状況取得API
// GET: なし
// Response: JSON {success, statuses:[{staff_id, status}]}
//   status: 'in'  = 出勤中（最後の打刻がin）
//           'out' = 退勤済（最後の打刻がout）
// ============================================
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

try {
    $pdo = get_pdo();

    // 本日の打刻ログから、各スタッフの最後の打刻typeを取得
    $today = (new DateTimeImmutable('now', new DateTimeZone('Asia/Tokyo')))->format('Y-m-d');

    $stmt = $pdo->prepare(
        'SELECT staff_id, type AS status
         FROM attendance
         WHERE date = ?
           AND id = (
             SELECT MAX(a2.id)
             FROM attendance a2
             WHERE a2.staff_id = attendance.staff_id
               AND a2.date = ?
           )
         ORDER BY staff_id ASC'
    );
    $stmt->execute([$today, $today]);
    $statuses = $stmt->fetchAll();

    echo json_encode(['success' => true, 'statuses' => $statuses]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DBエラー: ' . $e->getMessage()]);
}
