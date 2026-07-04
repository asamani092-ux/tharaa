<?php
ob_start();
error_reporting(0);
require_once 'cors.php';
require_once 'db.php';
if (!function_exists('requireStaffRole')) {
    require_once 'auth_helpers.php';
}
header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'];

/** إعدادات يعدّلها السوبرفايزر فقط */
$SUPERVISOR_ONLY_KEYS = [
    'maintenanceMode' => 'maintenance_mode',
    'priorAchievementEnabled' => 'prior_achievement_enabled',
];

function resolveCurriculumPdfUrl(?array $row, string $trackColumn): ?string
{
    if (!$row) {
        return null;
    }
    if (!empty($row[$trackColumn])) {
        return trim((string)$row[$trackColumn]);
    }
    if (!empty($row['curriculum_pdf_url'])) {
        return trim((string)$row['curriculum_pdf_url']);
    }
    return null;
}

function normalizePdfUrlInput($val): ?string
{
    return is_string($val) && trim($val) !== '' ? trim($val) : null;
}

/** أسماء أيام الرصد — مطابقة submissionWindow.ts */
function submissionDayNameToNum(?string $dayName): ?int
{
    static $map = [
        'Sunday' => 0,
        'Monday' => 1,
        'Tuesday' => 2,
        'Wednesday' => 3,
        'Thursday' => 4,
        'Friday' => 5,
        'Saturday' => 6,
    ];
    if ($dayName === null || trim($dayName) === '') {
        return null;
    }
    $name = trim($dayName);
    return $map[$name] ?? null;
}

function syncSubmissionDaysFromPrimary(string $primaryDayName): ?array
{
    $start = submissionDayNameToNum($primaryDayName);
    if ($start === null) {
        return null;
    }
    return [
        'submission_start_day' => $start,
        'late_deadline_day' => ($start + 1) % 7,
    ];
}

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
            'curriculumPdfUrlFull' => null,
            'curriculumPdfUrlSimplified' => null,
            'priorAchievementEnabled' => true,
            'atRiskInactiveDays' => 14,
        ];
    }

    $pdfFull = resolveCurriculumPdfUrl($row, 'curriculum_pdf_url_full');
    $pdfSimplified = resolveCurriculumPdfUrl($row, 'curriculum_pdf_url_simplified');

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
        'curriculumPdfUrl' => $pdfFull,
        'curriculumPdfUrlFull' => $pdfFull,
        'curriculumPdfUrlSimplified' => $pdfSimplified,
        'priorAchievementEnabled' => !array_key_exists('prior_achievement_enabled', $row)
            || !empty($row['prior_achievement_enabled']),
        'atRiskInactiveDays' => (int)($row['at_risk_inactive_days'] ?? 14),
    ];
}

try {
    if ($method === 'GET') {
        if (!getCurrentUserId()) {
            authJsonError(401, 'غير مصرح');
        }
        $row = $pdo->query('SELECT * FROM settings LIMIT 1')->fetch(PDO::FETCH_ASSOC);
        echo json_encode(formatSettingsRow($row ?: null), JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($method === 'PATCH' || $method === 'PUT' || $method === 'POST') {
        $role = requireStaffRole($pdo);

        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(['error' => 'بيانات غير صالحة'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        foreach (array_keys($SUPERVISOR_ONLY_KEYS) as $superKey) {
            if (array_key_exists($superKey, $data) && !isSupervisorRole($role)) {
                authJsonError(403, 'يتطلب صلاحية سوبرفايزر لتعديل هذا الإعداد');
            }
        }

        if (array_key_exists('primaryDay', $data) && is_string($data['primaryDay'])) {
            $synced = syncSubmissionDaysFromPrimary($data['primaryDay']);
            if ($synced !== null) {
                $data['submissionStartDay'] = $synced['submission_start_day'];
                $data['lateDeadlineDay'] = $synced['late_deadline_day'];
            }
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
            'curriculumPdfUrlFull' => 'curriculum_pdf_url_full',
            'curriculumPdfUrlSimplified' => 'curriculum_pdf_url_simplified',
            'priorAchievementEnabled' => 'prior_achievement_enabled',
            'atRiskInactiveDays' => 'at_risk_inactive_days',
        ];

        $fields = [];
        $params = [];
        foreach ($map as $key => $col) {
            if (!array_key_exists($key, $data)) {
                continue;
            }
            $val = $data[$key];
            if ($key === 'allDaysActive' || $key === 'maintenanceMode' || $key === 'priorAchievementEnabled') {
                $val = $val ? 1 : 0;
            }
            if ($key === 'atRiskInactiveDays') {
                $val = max(1, min(90, (int)$val));
            }
            if ($key === 'curriculumPdfUrl' || $key === 'curriculumPdfUrlFull' || $key === 'curriculumPdfUrlSimplified') {
                $val = normalizePdfUrlInput($val);
            }
            $fields[] = "$col = ?";
            $params[] = $val;
        }

        if (array_key_exists('primaryDay', $data) && is_string($data['primaryDay'])) {
            $synced = syncSubmissionDaysFromPrimary($data['primaryDay']);
            if ($synced !== null) {
                foreach ($synced as $col => $num) {
                    $already = false;
                    foreach ($fields as $f) {
                        if (strpos($f, $col . ' =') === 0) {
                            $already = true;
                            break;
                        }
                    }
                    if (!$already) {
                        $fields[] = "$col = ?";
                        $params[] = $num;
                    }
                }
            }
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
