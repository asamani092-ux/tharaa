<?php
ob_start();
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');

require_once 'cors.php';
require_once 'db.php';

function loadSettings(PDO $pdo): array
{
    $row = $pdo->query('SELECT * FROM settings LIMIT 1')->fetch(PDO::FETCH_ASSOC);
    return $row ?: ['weekly_quota' => 75, 'submission_start_day' => 0];
}

function getBatchEpoch(string $batchCreatedAt, int $submissionStartDay): DateTime
{
    $created = new DateTime($batchCreatedAt);
    $created->setTime(0, 0, 0);
    for ($i = 0; $i < 8; $i++) {
        $candidate = (clone $created)->modify("+{$i} day");
        if ((int)$candidate->format('w') === $submissionStartDay) {
            return $candidate;
        }
    }
    return $created;
}

function getBatchWeekNow(DateTime $epoch): int
{
    $today = new DateTime('today');
    if ($today < $epoch) {
        return 1;
    }
    $days = (int)$epoch->diff($today)->format('%a');
    return max(1, (int)floor($days / 7) + 1);
}

function getEffectiveTrack(?string $override, ?string $batchDefault): string
{
    if (!empty($override)) {
        return $override;
    }
    if (!empty($batchDefault)) {
        return $batchDefault;
    }
    return 'full';
}

function bookMatchesTrack(array $book, string $track): bool
{
    $tt = $book['track_type'] ?? 'both';
    return $tt === $track || $tt === 'both';
}

function sumTrackPages(array $booksMap, string $track): int
{
    $sum = 0;
    foreach ($booksMap as $book) {
        if (bookMatchesTrack($book, $track)) {
            $sum += (int)$book['total_pages'];
        }
    }
    return $sum;
}

/** تقدم رسمي في المسار: كتب مكتملة (ضمن المسار) + last_page للكتاب الحالي */
function evalProgressPagesForTrack(array $user, array $booksMap, string $track): int
{
    $completedIds = json_decode($user['completed_books'] ?: '[]', true) ?: [];
    $pages = 0;
    foreach ($completedIds as $bookId) {
        $bookId = (int)$bookId;
        if (!isset($booksMap[$bookId])) {
            continue;
        }
        $book = $booksMap[$bookId];
        if (bookMatchesTrack($book, $track)) {
            $pages += (int)$book['total_pages'];
        }
    }

    $currentBookId = (int)($user['current_book_id'] ?? 0);
    if ($currentBookId > 0 && isset($booksMap[$currentBookId])) {
        $current = $booksMap[$currentBookId];
        if (bookMatchesTrack($current, $track)) {
            $pages += (int)($user['last_page'] ?? 0);
        }
    }

    return $pages;
}

function evalNumeratorFromUser(array $user, array $booksMap): int
{
    return evalProgressPagesForTrack($user, $booksMap, 'full');
}

function trackLabelAr(string $effectiveTrack): string
{
    return $effectiveTrack === 'simplified' ? 'الميسر' : 'الكامل';
}

function buildFinishHint(
    int $progressPages,
    int $totalTrackPages,
    int $batchWeekNow,
    int $weeklyQuota,
    string $effectiveTrack,
    int $gamificationPages
): string {
    $trackAr = trackLabelAr($effectiveTrack);

    if ($totalTrackPages <= 0 || $batchWeekNow <= 0) {
        return "تسير على الخطة — مسار {$trackAr}";
    }

    $progressPages = min($progressPages, $totalTrackPages);
    $remaining = max(0, $totalTrackPages - $progressPages);

    if ($remaining <= 0) {
        return "أداء استثنائي! اقتربت من ختم المسار {$trackAr} 🚀";
    }

    $paceFromProgress = $progressPages / $batchWeekNow;
    $paceFromLogs = $gamificationPages / $batchWeekNow;
    $pace = max($paceFromProgress, $paceFromLogs, 1.0);

    $weeksLeft = (int)ceil($remaining / max($pace, $weeklyQuota * 0.25));
    $monthsLeft = (int)ceil($weeksLeft / 4.33);
    $monthsLeft = min(36, max(1, $monthsLeft));

    if ($pace >= $weeklyQuota) {
        return "أداء استثنائي! متبقي {$monthsLeft} شهراً لختم المسار {$trackAr} 🚀";
    }

    return "تسير على الخطة ({$trackAr})، متبقي نحو {$monthsLeft} شهراً";
}

try {
    $settings = loadSettings($pdo);
    $weeklyQuota = max(1, (int)($settings['weekly_quota'] ?? 75));
    $submissionStartDay = (int)($settings['submission_start_day'] ?? 0);

    $stmtBooks = $pdo->query('SELECT id, title, total_pages, phase_number, track_type FROM curriculum');
    $allBooks = $stmtBooks->fetchAll(PDO::FETCH_ASSOC);
    $booksMap = [];
    foreach ($allBooks as $book) {
        $booksMap[(int)$book['id']] = $book;
    }

    $stmtBatches = $pdo->query('SELECT id, name, default_track, created_at FROM batches');
    $batches = $stmtBatches->fetchAll(PDO::FETCH_ASSOC);
    $batchesMap = [];
    $batchEpochCache = [];
    $batchWeekCache = [];
    foreach ($batches as $batch) {
        $bid = (int)$batch['id'];
        $batchesMap[$bid] = $batch;
        $epoch = getBatchEpoch($batch['created_at'], $submissionStartDay);
        $batchEpochCache[$bid] = $epoch;
        $batchWeekCache[$bid] = getBatchWeekNow($epoch);
    }

    $stmtUsers = $pdo->query("
        SELECT u.id, u.name, u.batch_id, u.completed_books, u.last_page, u.current_book_id,
               u.track_override, b.default_track, b.created_at
        FROM users u
        LEFT JOIN batches b ON b.id = u.batch_id
        WHERE u.role = 'student'
    ");
    $users = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);

    $logsStmt = $pdo->query("
        SELECT user_id, week_label, submission_status, pages_read
        FROM reading_logs
    ");
    $logsRows = $logsStmt->fetchAll(PDO::FETCH_ASSOC);

    $gamificationByUser = [];
    $onTimeWeeksByUser = [];
    $lateWeeksByUser = [];

    foreach ($logsRows as $log) {
        $uid = (int)$log['user_id'];
        $gamificationByUser[$uid] = ($gamificationByUser[$uid] ?? 0) + (int)$log['pages_read'];

        $week = $log['week_label'] ?? '';
        $status = $log['submission_status'] ?? '';
        if ($week === '') {
            continue;
        }
        if ($status === 'on_time') {
            $onTimeWeeksByUser[$uid][$week] = true;
        } elseif ($status === 'late') {
            $lateWeeksByUser[$uid][$week] = true;
        }
    }

    $filterTrack = isset($_GET['track']) ? strtolower(trim($_GET['track'])) : null;
    if ($filterTrack && !in_array($filterTrack, ['full', 'simplified'], true)) {
        $filterTrack = null;
    }
    $filterBatchId = isset($_GET['batchId']) ? (int)$_GET['batchId'] : null;
    $scopeMe = isset($_GET['scope']) && $_GET['scope'] === 'me';
    $meId = $scopeMe ? (int)($_COOKIE['userId'] ?? 0) : 0;

    $usersDetail = [];
    $totalBooksCompleted = 0;

    foreach ($users as $user) {
        $userId = (int)$user['id'];
        if ($scopeMe && $userId !== $meId) {
            continue;
        }

        $batchId = (int)($user['batch_id'] ?? 0);
        if ($filterBatchId && $batchId !== $filterBatchId) {
            continue;
        }

        $effectiveTrack = getEffectiveTrack($user['track_override'] ?? null, $user['default_track'] ?? null);
        if ($filterTrack && $effectiveTrack !== $filterTrack) {
            continue;
        }

        $totalTrackPages = sumTrackPages($booksMap, $effectiveTrack);
        $batchWeekNow = $batchId ? ($batchWeekCache[$batchId] ?? 1) : 1;

        $gamificationPages = (int)($gamificationByUser[$userId] ?? 0);

        $progressPages = evalProgressPagesForTrack($user, $booksMap, $effectiveTrack);
        $evalNumerator = $progressPages;
        $batchPaceTarget = min($totalTrackPages, $batchWeekNow * $weeklyQuota);
        $stageCompletionRate = $batchPaceTarget > 0
            ? round(min(100, ($evalNumerator / $batchPaceTarget) * 100), 1)
            : 0;

        /** نسبة التقدم التراكمي للدفعة (بطاقة الطالب): كل pages_read ÷ هدف الدفعة حتى اليوم */
        $batchCumulativeRate = $batchPaceTarget > 0
            ? round(min(100, ($gamificationPages / $batchPaceTarget) * 100), 1)
            : 0;
        $onTimeWeeks = isset($onTimeWeeksByUser[$userId]) ? count($onTimeWeeksByUser[$userId]) : 0;
        $lateWeeks = isset($lateWeeksByUser[$userId]) ? count($lateWeeksByUser[$userId]) : 0;
        $commitmentIndex = round(($onTimeWeeks + 0.5 * $lateWeeks) / $batchWeekNow, 2);

        $completedIds = json_decode($user['completed_books'] ?: '[]', true) ?: [];
        $completedBooksCount = count($completedIds);
        $totalBooksCompleted += $completedBooksCount;

        $usersDetail[] = [
            'id' => $userId,
            'name' => $user['name'],
            'batchId' => $batchId,
            'batchName' => $batchId && isset($batchesMap[$batchId]) ? $batchesMap[$batchId]['name'] : 'بدون دفعة',
            'effectiveTrack' => $effectiveTrack,
            'stageCompletionRate' => $stageCompletionRate,
            'batchCumulativeRate' => $batchCumulativeRate,
            'batchPaceTarget' => $batchPaceTarget,
            'gamificationPages' => $gamificationPages,
            'commitmentIndex' => $commitmentIndex,
            'completedBooksCount' => $completedBooksCount,
            'totalReadPages' => $evalNumerator,
            'completionRate' => $stageCompletionRate,
            'batchWeekNow' => $batchWeekNow,
            'expectedFinishHint' => buildFinishHint(
                $progressPages,
                $totalTrackPages,
                $batchWeekNow,
                $weeklyQuota,
                $effectiveTrack,
                $gamificationPages
            ),
        ];
    }

    $disciplineLeaderboard = $usersDetail;
    usort($disciplineLeaderboard, fn($a, $b) => $b['commitmentIndex'] <=> $a['commitmentIndex']);
    $disciplineLeaderboard = array_slice($disciplineLeaderboard, 0, 10);

    $eliteReadersLeaderboard = $usersDetail;
    usort($eliteReadersLeaderboard, fn($a, $b) => $b['gamificationPages'] <=> $a['gamificationPages']);
    $eliteReadersLeaderboard = array_slice($eliteReadersLeaderboard, 0, 10);

    $batchStats = [];
    foreach ($batches as $batch) {
        $bid = (int)$batch['id'];
        $batchUsers = array_filter($usersDetail, fn($u) => $u['batchId'] === $bid);
        $userCount = count($batchUsers);
        $batchStats[] = [
            'batchId' => $bid,
            'batchName' => $batch['name'],
            'studentCount' => $userCount,
            'totalPages' => array_sum(array_column($batchUsers, 'gamificationPages')),
            'avgCompletionRate' => $userCount > 0
                ? round(array_sum(array_column($batchUsers, 'stageCompletionRate')) / $userCount, 1)
                : 0,
            'avgCommitmentIndex' => $userCount > 0
                ? round(array_sum(array_column($batchUsers, 'commitmentIndex')) / $userCount, 2)
                : 0,
        ];
    }

    $count = count($usersDetail);
    $response = [
        'overview' => [
            'totalStudents' => $count,
            'totalBooksCompleted' => $totalBooksCompleted,
            'avgCompletionRate' => $count > 0
                ? round(array_sum(array_column($usersDetail, 'stageCompletionRate')) / $count, 1)
                : 0,
            'avgStageCompletionRate' => $count > 0
                ? round(array_sum(array_column($usersDetail, 'stageCompletionRate')) / $count, 1)
                : 0,
            'avgCommitmentIndex' => $count > 0
                ? round(array_sum(array_column($usersDetail, 'commitmentIndex')) / $count, 2)
                : 0,
        ],
        'usersDetail' => $usersDetail,
        'batchStats' => $batchStats,
        'disciplineLeaderboard' => $disciplineLeaderboard,
        'eliteReadersLeaderboard' => $eliteReadersLeaderboard,
        'topCommitted' => array_map(fn($u) => [
            'name' => $u['name'],
            'logs_count' => $u['commitmentIndex'],
        ], $disciplineLeaderboard),
    ];

    if ($scopeMe) {
        $me = $usersDetail[0] ?? null;
        echo json_encode(['me' => $me], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}

ob_end_flush();
