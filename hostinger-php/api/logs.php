<?php
ob_start();
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');

require_once 'cors.php';
require_once 'db.php';

function getWeekLabel(): string
{
    $date = new DateTime();
    $dayOfWeek = (int)$date->format('w');
    $date->modify("-{$dayOfWeek} days");
    return $date->format('Y-m-d');
}

function getSubmissionStatus(PDO $pdo): string
{
    try {
        $stmt = $pdo->query('SELECT * FROM settings LIMIT 1');
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$settings) {
            return 'on_time';
        }
        if (!empty($settings['all_days_active'])) {
            return 'on_time';
        }

        $currentDay = (int)date('w');
        // يوم الرسمي من primary_day (إعدادات الواجهة)؛ التأخير دائماً اليوم التالي — O(1).
        $DAY_NAME_TO_NUM = [
            'Sunday' => 0,
            'Monday' => 1,
            'Tuesday' => 2,
            'Wednesday' => 3,
            'Thursday' => 4,
            'Friday' => 5,
            'Saturday' => 6,
        ];

        $startDay = null;
        if (!empty($settings['primary_day']) && is_string($settings['primary_day'])) {
            $name = trim($settings['primary_day']);
            if (isset($DAY_NAME_TO_NUM[$name])) {
                $startDay = $DAY_NAME_TO_NUM[$name];
            }
        }

        if ($startDay === null) {
            $startDayRaw = $settings['submission_start_day'] ?? null;
            if (is_numeric($startDayRaw)) {
                $n = (int)$startDayRaw;
                if ($n >= 0 && $n <= 6) {
                    $startDay = $n;
                }
            }
        }

        if ($startDay === null) {
            $startDay = 5;
        }

        $lateDay = ($startDay + 1) % 7;

        if ($currentDay === $startDay) {
            return 'on_time';
        }
        if ($currentDay === $lateDay) {
            return 'late';
        }
        return 'missed';
    } catch (PDOException $e) {
        return 'on_time';
    }
}

function getEffectiveTrack(PDO $pdo, int $userId): string
{
    $stmt = $pdo->prepare("
        SELECT u.track_override, b.default_track
        FROM users u
        LEFT JOIN batches b ON b.id = u.batch_id
        WHERE u.id = ?
    ");
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return 'full';
    }
    if (!empty($row['track_override'])) {
        return $row['track_override'];
    }
    return !empty($row['default_track']) ? $row['default_track'] : 'full';
}

function bookAllowedForTrack(array $book, string $effectiveTrack): bool
{
    $trackType = $book['track_type'] ?? 'both';
    return $trackType === 'both' || $trackType === $effectiveTrack;
}

/**
 * هل يوجد تسليم رسمي (primary) في هذا الأسبوع؟
 * (on_time / late / missed فقط)
 */
function hasPrimarySubmissionThisWeek(PDO $pdo, int $userId, string $weekLabel): bool
{
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM reading_logs
        WHERE user_id = ? AND week_label = ?
          AND submission_status IN ('on_time', 'late', 'missed')
    ");
    $stmt->execute([$userId, $weekLabel]);
    return (int)$stmt->fetchColumn() > 0;
}

/**
 * هل يوجد أي نشاط في هذا الأسبوع؟
 * (يستخدم فقط لحالة الواجهة: hasPrimaryThisWeek)
 */
function hasAnySubmissionThisWeek(PDO $pdo, int $userId, string $weekLabel): bool
{
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM reading_logs
        WHERE user_id = ? AND week_label = ?
          AND submission_status IN ('on_time', 'late', 'missed', 'extra')
    ");
    $stmt->execute([$userId, $weekLabel]);
    return (int)$stmt->fetchColumn() > 0;
}

function mapLogRow(array $l): array
{
    return [
        'id' => (int)$l['id'],
        'userId' => (int)$l['user_id'],
        'bookId' => (int)$l['book_id'],
        'bookTitle' => $l['book_title'] ?? '',
        'date' => $l['date'],
        'startPage' => (int)$l['start_page'],
        'endPage' => (int)$l['end_page'],
        'pagesRead' => (int)$l['pages_read'],
        'isCompleted' => (bool)$l['is_completed'],
        'submissionStatus' => $l['submission_status'] ?? 'on_time',
        'reflection' => $l['reflection'] ?? '',
        'weekLabel' => $l['week_label'] ?? '',
    ];
}

try {
    $method = $_SERVER['REQUEST_METHOD'];

    $idParam = $_GET['id'] ?? null;
    if (!$idParam) {
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        if (preg_match('/\/api\/logs(?:\.php)?\/([a-zA-Z0-9_-]+)/', $uri, $matches)) {
            $idParam = $matches[1];
        }
    }

    if ($method === 'GET') {
        if ($idParam === 'status') {
            $userId = isset($_COOKIE['userId']) ? (int)$_COOKIE['userId'] : 0;
            if (!$userId) {
                http_response_code(401);
                echo json_encode(['error' => 'غير مصرح'], JSON_UNESCAPED_UNICODE);
                exit();
            }
            $weekLabel = getWeekLabel();
            echo json_encode([
                'weekLabel' => $weekLabel,
                'hasPrimaryThisWeek' => hasAnySubmissionThisWeek($pdo, $userId, $weekLabel),
                'submissionStatus' => getSubmissionStatus($pdo),
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        if ($idParam === 'my') {
            $userId = $_COOKIE['userId'] ?? null;
            if (!$userId) {
                echo json_encode([]);
                exit();
            }
            $query = "
                SELECT l.*, c.title AS book_title
                FROM reading_logs l
                LEFT JOIN curriculum c ON l.book_id = c.id
                WHERE l.user_id = ?
                ORDER BY l.date DESC
            ";
            $stmt = $pdo->prepare($query);
            $stmt->execute([$userId]);
        } else {
            $userId = isset($_GET['userId']) ? (int)$_GET['userId'] : null;
            $week = $_GET['week'] ?? null;

            $query = "
                SELECT l.*, c.title AS book_title
                FROM reading_logs l
                LEFT JOIN curriculum c ON l.book_id = c.id
                WHERE 1=1
            ";
            $params = [];

            if ($userId) {
                $query .= ' AND l.user_id = ?';
                $params[] = $userId;
            }
            if ($week) {
                $query .= ' AND l.week_label = ?';
                $params[] = $week;
            }
            $query .= ' ORDER BY l.date DESC';

            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
        }

        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(array_map('mapLogRow', $logs), JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($method === 'POST') {
        if (!isset($_COOKIE['userId'])) {
            http_response_code(401);
            echo json_encode(['error' => 'غير مصرح'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $userId = (int)$_COOKIE['userId'];
        $body = json_decode(file_get_contents('php://input'), true);
        if (!is_array($body)) {
            http_response_code(400);
            echo json_encode(['error' => 'بيانات غير صالحة'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $mode = ($body['mode'] ?? 'primary') === 'extra' ? 'extra' : 'primary';
        $reflection = $body['reflection'] ?? null;
        $weekLabel = getWeekLabel();
        $effectiveTrack = getEffectiveTrack($pdo, $userId);

        if ($mode === 'extra' && !hasPrimarySubmissionThisWeek($pdo, $userId, $weekLabel)) {
            http_response_code(400);
            echo json_encode(['error' => 'يجب تسليم الرصد الأسبوعي أولاً'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        if ($mode === 'primary' && hasPrimarySubmissionThisWeek($pdo, $userId, $weekLabel)) {
            http_response_code(400);
            echo json_encode(['error' => 'تم تسليم الرصد الأسبوعي مسبقاً. استخدم إنجازاً إضافياً'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $rows = $body['rows'] ?? null;
        if (!$rows || !is_array($rows) || count($rows) === 0) {
            $bookId = $body['bookId'] ?? null;
            $startPage = $body['startPage'] ?? null;
            $endPage = $body['endPage'] ?? null;
            if ($bookId && $startPage !== null && $endPage !== null) {
                $rows = [[
                    'bookId' => $bookId,
                    'startPage' => $startPage,
                    'endPage' => $endPage,
                    'isCompleted' => (bool)($body['isCompleted'] ?? false),
                ]];
            }
        }

        if (!$rows || count($rows) === 0) {
            http_response_code(400);
            echo json_encode(['error' => 'بيانات ناقصة'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $submissionStatus = $mode === 'extra' ? 'extra' : getSubmissionStatus($pdo);
        $insertedIds = [];

        $pdo->beginTransaction();

        $stmtUser = $pdo->prepare('SELECT completed_books, phase_number FROM users WHERE id = ?');
        $stmtUser->execute([$userId]);
        $userRow = $stmtUser->fetch(PDO::FETCH_ASSOC);
        $completedBooks = json_decode($userRow['completed_books'] ?: '[]', true);

        $stmtBook = $pdo->prepare('SELECT id, phase_number, track_type, total_pages FROM curriculum WHERE id = ?');
        $stmtInsert = $pdo->prepare("
            INSERT INTO reading_logs
            (user_id, book_id, start_page, end_page, pages_read, is_completed, submission_status, reflection, week_label)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $lastBookId = null;
        $lastEndPage = 0;
        $lastCompleted = false;
        $lastPhase = (int)($userRow['phase_number'] ?? 1);
        $reflectionUsed = false;

        foreach ($rows as $row) {
            $bookId = (int)($row['bookId'] ?? 0);
            $startPage = (int)($row['startPage'] ?? 0);
            $endPage = (int)($row['endPage'] ?? 0);
            $isCompleted = !empty($row['isCompleted']);

            if ($bookId <= 0 || $startPage <= 0 || $endPage < $startPage) {
                throw new Exception('صف غير صالح في الإرسال');
            }

            $stmtBook->execute([$bookId]);
            $book = $stmtBook->fetch(PDO::FETCH_ASSOC);
            if (!$book || !bookAllowedForTrack($book, $effectiveTrack)) {
                throw new Exception('الكتاب غير متاح لمسارك');
            }

            $pagesRead = $endPage - $startPage + 1;
            $rowReflection = (!$reflectionUsed && $reflection) ? $reflection : null;
            if ($rowReflection) {
                $reflectionUsed = true;
            }

            $stmtInsert->execute([
                $userId,
                $bookId,
                $startPage,
                $endPage,
                $pagesRead,
                (int)$isCompleted,
                $submissionStatus,
                $rowReflection,
                $weekLabel,
            ]);
            $insertedIds[] = (int)$pdo->lastInsertId();

            if ($isCompleted && !in_array($bookId, $completedBooks, true)) {
                $completedBooks[] = $bookId;
            }

            $lastBookId = $bookId;
            $lastEndPage = $endPage;
            $lastCompleted = $isCompleted;
            $lastPhase = (int)$book['phase_number'];
        }

        $newLastPage = $lastCompleted ? 0 : $lastEndPage;
        $encodedCompleted = json_encode($completedBooks);

        $stmtUpdate = $pdo->prepare("
            UPDATE users
            SET last_page = ?, current_book_id = ?, phase_number = ?, completed_books = ?
            WHERE id = ?
        ");
        $stmtUpdate->execute([$newLastPage, $lastBookId, $lastPhase, $encodedCompleted, $userId]);

        $pdo->commit();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'ids' => $insertedIds,
            'submissionStatus' => $submissionStatus,
            'mode' => $mode,
            'weekLabel' => $weekLabel,
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}

ob_end_flush();

