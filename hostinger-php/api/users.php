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

$id = $_GET['id'] ?? null;
if (!$id) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (preg_match('/\/api\/users\/([a-zA-Z0-9_-]+)/', $uri, $matches)) {
        $id = $matches[1];
    }
}

function getWeekLabel(): string
{
    $now = new DateTime('today');
    $startOfWeek = clone $now;
    $startOfWeek->modify('-' . (int)$now->format('w') . ' days');
    return $startOfWeek->format('Y-m-d');
}

function isPriorAchievementEnabled(PDO $pdo): bool
{
    try {
        $row = $pdo->query('SELECT prior_achievement_enabled FROM settings LIMIT 1')->fetch(PDO::FETCH_ASSOC);
        if (!$row || !array_key_exists('prior_achievement_enabled', $row)) {
            return true;
        }
        return !empty($row['prior_achievement_enabled']);
    } catch (Exception $e) {
        return true;
    }
}

function formatUser($u)
{
    global $pdo;
    if (!$u) {
        return null;
    }

    $userId = (int)$u['id'];
    $role = $u['role'];
    $phase = !empty($u['phase_number']) ? (int)$u['phase_number'] : 1;
    $currentBook = !empty($u['current_book_id']) ? (int)$u['current_book_id'] : null;

    $trackOverride = !empty($u['track_override']) ? $u['track_override'] : null;
    $batchDefault = !empty($u['default_track']) ? $u['default_track'] : 'full';
    $effectiveTrack = $trackOverride ?? $batchDefault;

    if (!$currentBook && !in_array($role, ['admin', 'supervisor'], true)) {
        $stmt = $pdo->prepare("
            SELECT id FROM curriculum
            WHERE phase_number = ?
              AND (track_type = ? OR track_type = 'both')
              AND (level_type IS NULL OR level_type = '' OR level_type = 'basic')
            ORDER BY order_in_level ASC
            LIMIT 1
        ");
        $stmt->execute([$phase, $effectiveTrack]);
        $firstBook = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($firstBook) {
            $currentBook = (int)$firstBook['id'];
            $update = $pdo->prepare("UPDATE users SET current_book_id = ?, phase_number = ? WHERE id = ?");
            $update->execute([$currentBook, $phase, $userId]);
        }
    }

    return [
        'id' => $userId,
        'name' => $u['name'],
        'phone' => $u['phone'],
        'role' => $role,
        'status' => $u['status'],
        'batchId' => $u['batch_id'] !== null ? (int)$u['batch_id'] : null,
        'phaseNumber' => $phase,
        'levelType' => !empty($u['level_type']) ? $u['level_type'] : 'basic',
        'currentBookId' => $currentBook,
        'lastPage' => (int)$u['last_page'],
        'completedBooks' => json_decode($u['completed_books'] ?: '[]', true),
        'trackOverride' => $trackOverride,
        'effectiveTrack' => $effectiveTrack,
    ];
}

try {
    if ($method === 'GET') {
        if ($id === 'my') {
            $userId = $_COOKIE['userId'] ?? null;
            if ($userId) {
                $stmt = $pdo->prepare("
                    SELECT u.*, b.default_track
                    FROM users u
                    LEFT JOIN batches b ON b.id = u.batch_id
                    WHERE u.id = ?
                ");
                $stmt->execute([$userId]);
                echo json_encode(formatUser($stmt->fetch(PDO::FETCH_ASSOC)), JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode(null);
            }
        } elseif ($id && is_numeric($id)) {
            $stmt = $pdo->prepare("
                SELECT u.*, b.default_track
                FROM users u
                LEFT JOIN batches b ON b.id = u.batch_id
                WHERE u.id = ?
            ");
            $stmt->execute([$id]);
            echo json_encode(formatUser($stmt->fetch(PDO::FETCH_ASSOC)), JSON_UNESCAPED_UNICODE);
        } elseif ($id === 'admins') {
            requireSupervisorRole($pdo);
            $stmt = $pdo->query("
                SELECT u.*, b.default_track
                FROM users u
                LEFT JOIN batches b ON b.id = u.batch_id
                WHERE u.role = 'admin'
                ORDER BY u.id DESC
            ");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(array_map('formatUser', $users), JSON_UNESCAPED_UNICODE);
        } else {
            requireStaffRole($pdo);
            $stmt = $pdo->query("
                SELECT u.*, b.default_track
                FROM users u
                LEFT JOIN batches b ON b.id = u.batch_id
                WHERE u.role = 'student'
                ORDER BY u.id DESC
            ");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(array_map('formatUser', $users), JSON_UNESCAPED_UNICODE);
        }
    }

    elseif ($method === 'POST' && $id === 'admin') {
        requireSupervisorRole($pdo);
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            authJsonError(400, 'بيانات غير صالحة');
        }
        $name = trim((string)($data['name'] ?? ''));
        $phone = trim((string)($data['phone'] ?? ''));
        $password = (string)($data['password'] ?? '');
        if ($name === '' || $phone === '' || $password === '') {
            authJsonError(400, 'الاسم والجوال وكلمة المرور مطلوبة');
        }
        $stmt = $pdo->prepare("
            INSERT INTO users (name, phone, password_hash, role, status)
            VALUES (?, ?, ?, 'admin', 'active')
        ");
        $stmt->execute([$name, $phone, $password]);
        echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
    }

    elseif ($method === 'POST' && $id === 'bulk') {
        requireStaffRole($pdo);
        $data = json_decode(file_get_contents('php://input'), true);

        $batchId = $data['batchId'] ?? null;
        $phaseNumber = $data['phaseNumber'] ?? 1;
        $levelType = $data['levelType'] ?? 'basic';
        $rawText = trim($data['rawText'] ?? '');

        if (empty($rawText)) {
            echo json_encode(['error' => 'لا توجد بيانات للإضافة'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $lines = explode("\n", $rawText);
        $addedCount = 0;

        $pdo->beginTransaction();
        $stmt = $pdo->prepare("
            INSERT INTO users (name, phone, password_hash, role, batch_id, phase_number, level_type, status)
            VALUES (?, ?, ?, 'student', ?, ?, ?, 'active')
        ");

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }

            $parts = preg_split('/\s+/', $line);
            $count = count($parts);
            if ($count < 3) {
                continue;
            }

            $password = $parts[$count - 1];
            $phone = $parts[$count - 2];
            $nameParts = array_slice($parts, 0, $count - 2);
            $name = implode(' ', $nameParts);

            $stmt->execute([$name, $phone, $password, $batchId, $phaseNumber, $levelType]);
            $addedCount++;
        }

        $pdo->commit();
        echo json_encode([
            'success' => true,
            'added' => $addedCount,
            'created' => $addedCount,
        ], JSON_UNESCAPED_UNICODE);
    }

    elseif ($method === 'POST' && $id === 'custom_progress') {
        if (!isPriorAchievementEnabled($pdo)) {
            http_response_code(403);
            echo json_encode(['error' => 'ميزة إنجاز سابق معطّلة من إعدادات المنصة'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            $data = [];
        }

        $targetUserId = (int)($data['userId'] ?? ($_COOKIE['userId'] ?? 0));
        $incoming = $data['completedBooks'] ?? [];
        $newCurrentBookId = isset($data['newCurrentBookId']) ? (int)$data['newCurrentBookId'] : 0;

        if ($targetUserId <= 0) {
            http_response_code(401);
            echo json_encode(['error' => 'غير مصرح'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        if (!is_array($incoming)) {
            $incoming = [];
        }

        $pdo->beginTransaction();

        $fetchStmt = $pdo->prepare('SELECT completed_books FROM users WHERE id = ?');
        $fetchStmt->execute([$targetUserId]);
        $row = $fetchStmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            $pdo->rollBack();
            http_response_code(404);
            echo json_encode(['error' => 'المستخدم غير موجود'], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $existing = json_decode($row['completed_books'] ?: '[]', true);
        if (!is_array($existing)) {
            $existing = [];
        }

        $existingIds = array_map('intval', $existing);
        $merged = array_values(array_unique(array_merge(
            $existingIds,
            array_map('intval', $incoming)
        )));

        $newlyAddedIds = array_values(array_diff($merged, $existingIds));
        $weekLabel = getWeekLabel();
        $gamificationPagesAdded = 0;

        if (count($newlyAddedIds) > 0) {
            $placeholders = implode(',', array_fill(0, count($newlyAddedIds), '?'));
            $bookStmt = $pdo->prepare("SELECT id, total_pages FROM curriculum WHERE id IN ($placeholders)");
            $bookStmt->execute($newlyAddedIds);
            $booksById = [];
            while ($bookRow = $bookStmt->fetch(PDO::FETCH_ASSOC)) {
                $booksById[(int)$bookRow['id']] = (int)$bookRow['total_pages'];
            }

            $logStmt = $pdo->prepare("
                INSERT INTO reading_logs (
                    user_id, book_id, start_page, end_page, pages_read,
                    is_completed, submission_status, reflection, week_label
                ) VALUES (?, ?, 1, ?, ?, 1, 'extra', ?, ?)
            ");

            foreach ($newlyAddedIds as $bookId) {
                if (!isset($booksById[$bookId]) || $booksById[$bookId] <= 0) {
                    continue;
                }
                $totalPages = $booksById[$bookId];
                $logStmt->execute([
                    $targetUserId,
                    $bookId,
                    $totalPages,
                    $totalPages,
                    'إنجاز سابق (تحفيز)',
                    $weekLabel,
                ]);
                $gamificationPagesAdded += $totalPages;
            }
        }

        $encodedCompletedBooks = json_encode($merged, JSON_UNESCAPED_UNICODE);

        if ($newCurrentBookId > 0) {
            $stmt = $pdo->prepare('SELECT phase_number FROM curriculum WHERE id = ?');
            $stmt->execute([$newCurrentBookId]);
            $newPhase = $stmt->fetchColumn();

            if ($newPhase) {
                $updateStmt = $pdo->prepare("
                    UPDATE users
                    SET completed_books = ?, current_book_id = ?, phase_number = ?, last_page = 0
                    WHERE id = ?
                ");
                $updateStmt->execute([$encodedCompletedBooks, $newCurrentBookId, $newPhase, $targetUserId]);
            } else {
                $updateStmt = $pdo->prepare("
                    UPDATE users
                    SET completed_books = ?, current_book_id = ?, last_page = 0
                    WHERE id = ?
                ");
                $updateStmt->execute([$encodedCompletedBooks, $newCurrentBookId, $targetUserId]);
            }
        } else {
            $updateStmt = $pdo->prepare('UPDATE users SET completed_books = ? WHERE id = ?');
            $updateStmt->execute([$encodedCompletedBooks, $targetUserId]);
        }

        $pdo->commit();
        echo json_encode([
            'success' => true,
            'completedBooks' => $merged,
            'gamificationPagesAdded' => $gamificationPagesAdded,
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    elseif ($method === 'PUT' || $method === 'PATCH') {
        if (!$id) {
            throw new Exception('ID required');
        }
        if ($id === 'my') {
            $id = $_COOKIE['userId'] ?? null;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            throw new Exception('بيانات غير صالحة');
        }

        $callerRole = requireAuthenticatedRole($pdo);
        $targetStmt = $pdo->prepare('SELECT role FROM users WHERE id = ?');
        $targetStmt->execute([$id]);
        $targetRole = $targetStmt->fetchColumn();
        if ($targetRole === false) {
            authJsonError(404, 'المستخدم غير موجود');
        }
        $targetRole = (string)$targetRole;

        $isSelf = (int)$id === getCurrentUserId();
        if ($targetRole === 'admin' && !isSupervisorRole($callerRole) && !$isSelf) {
            authJsonError(403, 'يتطلب صلاحية سوبرفايزر لتعديل حساب مشرف');
        }
        if ($targetRole === 'supervisor' && !isSupervisorRole($callerRole)) {
            authJsonError(403, 'غير مصرح');
        }
        if ($targetRole === 'student' && !isStaffRole($callerRole) && (int)$id !== getCurrentUserId()) {
            authJsonError(403, 'غير مصرح');
        }
        if (array_key_exists('role', $data)) {
            authJsonError(403, 'لا يمكن تغيير الدور من هنا');
        }
        $fields = [];
        $params = [];

        $map = [
            'name' => 'name',
            'phone' => 'phone',
            'status' => 'status',
            'phaseNumber' => 'phase_number',
            'batchId' => 'batch_id',
            'levelType' => 'level_type',
            'currentBookId' => 'current_book_id',
            'lastPage' => 'last_page',
        ];

        foreach ($map as $key => $col) {
            if (array_key_exists($key, $data)) {
                $fields[] = "$col = ?";
                $params[] = $data[$key];
            }
        }

        if (!empty($data['password'])) {
            $fields[] = 'password_hash = ?';
            $params[] = $data['password'];
        }

        if (isset($data['completedBooks'])) {
            $fields[] = 'completed_books = ?';
            $params[] = json_encode($data['completedBooks']);
        }

        if (array_key_exists('trackOverride', $data)) {
            $to = $data['trackOverride'];
            if ($to === null || $to === '' || $to === 'inherit') {
                $fields[] = 'track_override = NULL';
            } elseif (in_array($to, ['full', 'simplified'], true)) {
                $fields[] = 'track_override = ?';
                $params[] = $to;
            } else {
                $fields[] = 'track_override = NULL';
            }
        }

        if (!empty($fields)) {
            $params[] = $id;
            $stmt = $pdo->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?');
            $stmt->execute($params);
        }

        echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
    }

    elseif ($method === 'DELETE') {
        requireStaffRole($pdo);
        $data = json_decode(file_get_contents('php://input'), true);
        $targetId = $id ?? ($data['id'] ?? null);

        if (!$targetId) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'رقم المشارك مفقود، لا يمكن الحذف',
            ], JSON_UNESCAPED_UNICODE);
            exit();
        }

        $targetStmt = $pdo->prepare('SELECT role FROM users WHERE id = ?');
        $targetStmt->execute([$targetId]);
        $targetRole = (string)$targetStmt->fetchColumn();
        if ($targetRole === 'admin' && !isSupervisorRole(getCurrentUserRole($pdo))) {
            authJsonError(403, 'يتطلب صلاحية سوبرفايزر لحذف مشرف');
        }
        if ($targetRole === 'supervisor') {
            authJsonError(403, 'لا يمكن حذف حساب سوبرفايزر');
        }

        $stmtLogs = $pdo->prepare('DELETE FROM reading_logs WHERE user_id = ?');
        $stmtLogs->execute([$targetId]);

        $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
        $stmt->execute([$targetId]);

        echo json_encode([
            'success' => true,
            'message' => 'تم حذف المشارك بنجاح',
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }

    else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}

ob_end_flush();
