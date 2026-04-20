<?php
// ============================================
// get_logs.php — ログ取得API
// GET: mode=today|month&month=YYYY-MM（month時）
// ============================================
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$mode = $_GET['mode'] ?? 'today';
$tz   = new DateTimeZone('Asia/Tokyo');
$now  = new DateTimeImmutable('now', $tz);

try {
    $pdo = get_pdo();

    if ($mode === 'today') {
        // ============ 当日ログ ============
        $today = $now->format('Y-m-d');
        $stmt  = $pdo->prepare(
            'SELECT s.name, a.type, a.stamped_at
             FROM attendance a
             JOIN staff s ON s.id = a.staff_id
             WHERE a.date = ?
             ORDER BY a.stamped_at ASC'
        );
        $stmt->execute([$today]);
        $rows = $stmt->fetchAll();

        $logs = array_map(fn($r) => [
            'name'       => $r['name'],
            'type'       => $r['type'] === 'in' ? '出勤' : '退勤',
            'stamped_at' => (new DateTimeImmutable($r['stamped_at']))->format('H:i'),
        ], $rows);

        echo json_encode(['success' => true, 'mode' => 'today', 'date' => $today, 'logs' => $logs]);

    } elseif ($mode === 'month') {
        // ============ 当月ログ（スタッフ×日付ごとに集計） ============
        $month = $_GET['month'] ?? $now->format('Y-m');
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'monthの形式はYYYY-MMです']);
            exit;
        }

        $stmt = $pdo->prepare(
            'SELECT
               s.id   AS staff_id,
               s.name,
               a.date,
               MAX(CASE WHEN a.type = "in"  THEN a.stamped_at END) AS in_time,
               MAX(CASE WHEN a.type = "out" THEN a.stamped_at END) AS out_time
             FROM attendance a
             JOIN staff s ON s.id = a.staff_id
             WHERE DATE_FORMAT(a.date, "%Y-%m") = ?
             GROUP BY s.id, s.name, a.date
             ORDER BY s.id ASC, a.date ASC'
        );
        $stmt->execute([$month]);
        $rows = $stmt->fetchAll();

        $logs = array_map(function($r) {
            $in_time  = $r['in_time']  ? (new DateTimeImmutable($r['in_time']) )->format('H:i') : '--';
            $out_time = $r['out_time'] ? (new DateTimeImmutable($r['out_time']))->format('H:i') : '--';

            // 在籍時間の計算
            $duration = '--';
            if ($r['in_time'] && $r['out_time']) {
                $in  = new DateTimeImmutable($r['in_time']);
                $out = new DateTimeImmutable($r['out_time']);
                $diff = $out->getTimestamp() - $in->getTimestamp();
                if ($diff > 0) {
                    $h = intdiv($diff, 3600);
                    $m = intdiv($diff % 3600, 60);
                    $duration = sprintf('%d:%02d', $h, $m);
                }
            }

            return [
                'name'     => $r['name'],
                'date'     => $r['date'],
                'in_time'  => $in_time,
                'out_time' => $out_time,
                'duration' => $duration,
            ];
        }, $rows);

        echo json_encode(['success' => true, 'mode' => 'month', 'month' => $month, 'logs' => $logs]);

    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'modeはtodayまたはmonthです']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DBエラー: ' . $e->getMessage()]);
}
