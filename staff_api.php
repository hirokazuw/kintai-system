<?php
// ============================================
// staff_api.php — スタッフ追加・削除API
// POST: action=add&name=氏名
// POST: action=delete&id=スタッフID
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

    if ($action === 'add') {
        $name = trim($_POST['name'] ?? '');
        if ($name === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '氏名を入力してください']);
            exit;
        }
        $stmt = $pdo->prepare('INSERT INTO staff (name) VALUES (?)');
        $stmt->execute([$name]);
        $newId = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'message' => "「{$name}」を追加しました", 'id' => $newId, 'name' => $name]);

    } elseif ($action === 'delete') {
        $id = (int)($_POST['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'IDが不正です']);
            exit;
        }
        // スタッフ名を取得（メッセージ用）
        $stmt = $pdo->prepare('SELECT name FROM staff WHERE id = ?');
        $stmt->execute([$id]);
        $staff = $stmt->fetch();
        if (!$staff) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'スタッフが見つかりません']);
            exit;
        }
        $stmt = $pdo->prepare('DELETE FROM staff WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => "「{$staff['name']}」を削除しました"]);

    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'actionはaddまたはdeleteです']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DBエラー: ' . $e->getMessage()]);
}
