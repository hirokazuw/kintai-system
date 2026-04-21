<?php
// ============================================
// fix_stamp.php — 打刻修正API
// POST: action=update&id=打刻ID&stamped_at=HH:MM
// POST: action=add&staff_id=ID&type=in|out&date=YYYY-MM-DD&time=HH:MM
// POST: action=delete&id=打刻ID
// ============================================
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$action = $_POST['action'] ?? '';

try {
    $pdo = get_pdo();
    $tz  = new DateTimeZone('Asia/Tokyo');

    if ($action === 'update') {
        // 既存打刻の時刻を修正
        $id   = (int)($_POST['id'] ?? 0);
        $time = $_POST['time'] ?? '';

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'IDが不正です']);
            exit;
        }
        if (!preg_match('/^\d{2}:\d{2}$/', $time)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '時刻の形式はHH:MMです']);
            exit;
        }

        // 既存レコードの日付を取得
        $stmt = $pdo->prepare('SELECT date FROM attendance WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '打刻が見つかりません']);
            exit;
        }

        $stamped_at = $row['date'] . ' ' . $time . ':00';
        $stmt = $pdo->prepare('UPDATE attendance SET stamped_at = ? WHERE id = ?');
        $stmt->execute([$stamped_at, $id]);
        echo json_encode(['success' => true, 'message' => '打刻時刻を修正しました']);

    } elseif ($action === 'add') {
        // 打刻を新規追加（退勤忘れなど）
        $staff_id = (int)($_POST['staff_id'] ?? 0);
        $type     = $_POST['type'] ?? '';
        $date     = $_POST['date'] ?? '';
        $time     = $_POST['time'] ?? '';

        if ($staff_id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'スタッフIDが不正です']);
            exit;
        }
        if (!in_array($type, ['in', 'out'], true)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'typeはinまたはoutです']);
            exit;
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '日付の形式はYYYY-MM-DDです']);
            exit;
        }
        if (!preg_match('/^\d{2}:\d{2}$/', $time)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '時刻の形式はHH:MMです']);
            exit;
        }

        $stamped_at = $date . ' ' . $time . ':00';
        $stmt = $pdo->prepare(
            'INSERT INTO attendance (staff_id, type, stamped_at, date) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$staff_id, $type, $stamped_at, $date]);
        $label = $type === 'in' ? '出勤' : '退勤';
        echo json_encode(['success' => true, 'message' => "{$label}打刻を追加しました"]);

    } elseif ($action === 'delete') {
        // 打刻を削除
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'IDが不正です']);
            exit;
        }
        $stmt = $pdo->prepare('DELETE FROM attendance WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => '打刻を削除しました']);

    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'actionはupdate/add/deleteです']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DBエラー: ' . $e->getMessage()]);
}
