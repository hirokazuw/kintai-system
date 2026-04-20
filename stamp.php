<?php
// ============================================
// stamp.php — 打刻API
// POST: staff_id, type(in/out)
// ============================================
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

// POSTのみ受け付ける
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$staff_id = isset($_POST['staff_id']) ? (int)$_POST['staff_id'] : 0;
$type     = isset($_POST['type'])     ? $_POST['type']           : '';

// バリデーション
if ($staff_id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'スタッフIDが不正です']);
    exit;
}
if (!in_array($type, ['in', 'out'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'typeはinまたはoutを指定してください']);
    exit;
}

try {
    $pdo = get_pdo();

    // スタッフ存在チェック
    $stmt = $pdo->prepare('SELECT id, name FROM staff WHERE id = ?');
    $stmt->execute([$staff_id]);
    $staff = $stmt->fetch();

    if (!$staff) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'スタッフが見つかりません']);
        exit;
    }

    // 打刻登録
    $now  = new DateTimeImmutable('now', new DateTimeZone('Asia/Tokyo'));
    $stmt = $pdo->prepare(
        'INSERT INTO attendance (staff_id, type, stamped_at, date) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([
        $staff_id,
        $type,
        $now->format('Y-m-d H:i:s'),
        $now->format('Y-m-d'),
    ]);

    $label = ($type === 'in') ? '出勤' : '退勤';
    echo json_encode([
        'success'    => true,
        'message'    => "{$staff['name']} さんの{$label}を記録しました",
        'staff_name' => $staff['name'],
        'type'       => $type,
        'stamped_at' => $now->format('Y-m-d H:i:s'),
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DBエラー: ' . $e->getMessage()]);
}
