<?php
ob_start();
error_reporting(0);
require_once 'cors.php';
require_once 'db.php';
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

function formatSettingsRow(?array $row): array
{
    if (!$row) {
        return [
            'id' => 1,
            'weeklyQuota' => 75,
            'submissionStartDay' => 0,
            'submissionStartHour' => 0,
            'normalDeadlineDay' => 0,
            'normalDeadlineHour' => 23,
            'lateDeadlineDay' => 0,
            'lateDeadlineHour' => 23,
            'gradeThresholdExcellent' => 90,
            'gradeThresholdGood' => 75,
            'gradeThresholdAcceptable' => 60,
            'allDaysActive' => false,
            'primaryDay' => 'Friday',
            'maintenanceMode' => false,
            'curriculumPdfUrl' => null,
        ];
    }

    return [
        'id' => (int)$row['id'],
        'weeklyQuota' => (int)($row['weekly_quota'] ?? 75),
        'submissionStartDay' => (int)($row['submission_start_day'] ?? 0),
        'submissionStartHour' => (int)($row['submission_start_hour'] ?? 0),
        'normalDeadlineDay' => (int)($row['normal_deadline_day'] ?? 0),
        'normalDeadlineHour' => (int)($row['normal_deadline_hour'] ?? 23),
        'lateDeadlineDay' => (int)($row['late_deadline_day'] ?? 0),
        'lateDeadlineHour' => (int)($row['late_deadline_hour'] ?? 23),
        'gradeThresholdExcellent' => (int)($row['grade_threshold_excellent'] ?? 90),
        'gradeThresholdGood' => (int)($row['grade_threshold_good'] ?? 75),
        'gradeThresholdAcceptable' => (int)($row['grade_threshold_acceptable'] ?? 60),
        'allDaysActive' => !empty($row['all_days_active']),
        'primaryDay' => !empty($row['primary_day']) ? $row['primary_day'] : 'Friday',
        'maintenanceMode' => !empty($row['maintenance_mode']),
        'curriculumPdfUrl' => !empty($row['curriculum_pdf_url']) ? $row['curriculum_pdf_url'] : null,
    ];
}

try {
    if ($method === 'GET') {
        $row = $pdo->query('SELECT * FROM settings LIMIT 1')->fetch(PDO::FETCH_ASSOC);
        echo json_encode(formatSettingsRow($row ?: null), JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($method === 'PATCH' || $method === 'PUT') {
        $userId = $_COOKIE['userId'] ?? null;
        if ($userId) {
            $roleStmt = $pdo->prepare('SELECT role FROM users WHERE id = ?');
            $roleStmt->execute([$userId]);
            $role = $roleStmt->fetchColumn();
            if ($role !== 'admin') {
                http_response_code(403);
                echo json_encode(['error' => 'غير مصرح'], JSON_UNESCAPED_UNICODE);
                exit();
            }
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'غير مصرح'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(['error' => 'بيانات غير صالحة'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $map = [
            'weeklyQuota' => 'weekly_quota',
            'submissionStartDay' => 'submission_start_day',
            'submissionStartHour' => 'submission_start_hour',
            'normalDeadlineDay' => 'normal_deadline_day',
            'normalDeadlineHour' => 'normal_deadline_hour',
            'lateDeadlineDay' => 'late_deadline_day',
            'lateDeadlineHour' => 'late_deadline_hour',
            'gradeThresholdExcellent' => 'grade_threshold_excellent',
            'gradeThresholdGood' => 'grade_threshold_good',
            'gradeThresholdAcceptable' => 'grade_threshold_acceptable',
            'allDaysActive' => 'all_days_active',
            'primaryDay' => 'primary_day',
            'maintenanceMode' => 'maintenance_mode',
            'curriculumPdfUrl' => 'curriculum_pdf_url',
        ];

        $fields = [];
        $params = [];
        foreach ($map as $key => $col) {
            if (!array_key_exists($key, $data)) {
                continue;
            }
            $val = $data[$key];
            if ($key === 'allDaysActive' || $key === 'maintenanceMode') {
                $val = $val ? 1 : 0;
            }
            if ($key === 'curriculumPdfUrl') {
                $val = is_string($val) && trim($val) !== '' ? trim($val) : null;
            }
            $fields[] = "$col = ?";
            $params[] = $val;
        }

        $existing = $pdo->query('SELECT id FROM settings LIMIT 1')->fetch(PDO::FETCH_ASSOC);
        if (count($fields) === 0) {
            $row = $pdo->query('SELECT * FROM settings LIMIT 1')->fetch(PDO::FETCH_ASSOC);
            echo json_encode(formatSettingsRow($row ?: null), JSON_UNESCAPED_UNICODE);
            exit();
        }

        if ($existing) {
            $params[] = (int)$existing['id'];
            $pdo->prepare('UPDATE settings SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($params);
        } else {
            $cols = array_map(fn($f) => explode(' = ', $f)[0], $fields);
            $pdo->prepare(
                'INSERT INTO settings (' . implode(', ', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')'
            )->execute($params);
        }

        $row = $pdo->query('SELECT * FROM settings LIMIT 1')->fetch(PDO::FETCH_ASSOC);
        echo json_encode(formatSettingsRow($row ?: null), JSON_UNESCAPED_UNICODE);
        exit();
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}

ob_end_flush();
