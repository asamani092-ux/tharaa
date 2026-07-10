<?php
ob_start();
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');

require_once 'cors.php';
require_once 'db.php';
require_once 'week_label_helpers.php';
require_once 'auth_helpers.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
        exit();
    }

    $role = requireStaffRole($pdo);
    if (!isSupervisorRole($role)) {
        authJsonError(403, 'سوبرفايزر فقط');
    }

    $settings = fetchSettingsRow($pdo);
    $startDay = resolvePrimaryStartDay($settings);

    $stmt = $pdo->query('SELECT id, date, week_label FROM reading_logs ORDER BY id');
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $updateStmt = $pdo->prepare('UPDATE reading_logs SET week_label = ? WHERE id = ?');
    $updated = 0;

    foreach ($logs as $log) {
        $dateStr = $log['date'] ?? '';
        if ($dateStr === '') {
            continue;
        }
        $newLabel = weekLabelForDate(riyadhDateTime($dateStr), $startDay);
        if ($newLabel !== ($log['week_label'] ?? '')) {
            $updateStmt->execute([$newLabel, (int)$log['id']]);
            $updated++;
        }
    }

    echo json_encode([
        'success' => true,
        'updated' => $updated,
        'total' => count($logs),
        'startDay' => $startDay,
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}

ob_end_flush();
