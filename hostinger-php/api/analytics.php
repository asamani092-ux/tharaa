<?php
ob_start();
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');

require_once 'cors.php';
require_once 'db.php';
if (!function_exists('requireStaffRole')) {
    require_once 'auth_helpers.php';
}

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

function normalizeBookLevelType($levelType): string
{
    $lt = strtolower(trim((string)($levelType ?? 'basic')));
    if (in_array($lt, ['optional', 'اختياري', 'إختياري'], true)) {
        return 'optional';
    }
    return 'basic';
}

/** أساسي = أي level_type غير optional (لا ربط بمرحلة) */
function bookIsBasic(array $book): bool
{
    return normalizeBookLevelType($book['level_type'] ?? null) === 'basic';
}

function bookIsOptional(array $book): bool
{
    return normalizeBookLevelType($book['level_type'] ?? null) === 'optional';
}

function bookMatchesCoreTrack(array $book, string $track): bool
{
    return bookMatchesTrack($book, $track) && bookIsBasic($book);
}

function bookMatchesOptionalTrack(array $book, string $track): bool
{
    return bookMatchesTrack($book, $track) && bookIsOptional($book);
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

function sumCoreTrackPages(array $booksMap, string $track): int
{
    $sum = 0;
    foreach ($booksMap as $book) {
        if (bookMatchesCoreTrack($book, $track)) {
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

/** تقدم رسمي للكتب الأساسية فقط (بطاقة الطالب / ختم المسار) */
function evalProgressPagesForCoreTrack(array $user, array $booksMap, string $track): int
{
    $completedIds = json_decode($user['completed_books'] ?: '[]', true) ?: [];
    $pages = 0;
    foreach ($completedIds as $bookId) {
        $bookId = (int)$bookId;
        if (!isset($booksMap[$bookId])) {
            continue;
        }
        $book = $booksMap[$bookId];
        if (bookMatchesCoreTrack($book, $track)) {
            $pages += (int)$book['total_pages'];
        }
    }

    $currentBookId = (int)($user['current_book_id'] ?? 0);
    if ($currentBookId > 0 && isset($booksMap[$currentBookId])) {
        $current = $booksMap[$currentBookId];
        if (bookMatchesCoreTrack($current, $track)) {
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

/** أسابيع الدفعة؛ بدون دفعة: خطة واقعية لا تضغط المقام على أسبوع واحد */
function resolveBatchWeekNow(int $batchId, array $batchWeekCache, int $totalTrackPages, int $weeklyQuota): int
{
    if ($batchId > 0) {
        return max(1, (int)($batchWeekCache[$batchId] ?? 1));
    }
    if ($totalTrackPages <= 0) {
        return 4;
    }
    $weeksToCoverTrack = (int)ceil($totalTrackPages / max(1, $weeklyQuota));
    return max(4, $weeksToCoverTrack);
}

/**
 * مجموع pages_read ضمن المسار، مع إزالة التكرار لنفس الكتاب والأسبوع.
 * $pagesScope: core | optional | all
 */
function sumGamificationPagesForTrack(
    int $userId,
    string $track,
    array $booksMap,
    array $logsRows,
    string $pagesScope = 'all'
): int {
    $deduped = [];
    foreach ($logsRows as $log) {
        if ((int)($log['user_id'] ?? 0) !== $userId) {
            continue;
        }
        $bookId = (int)($log['book_id'] ?? 0);
        if ($bookId <= 0 || !isset($booksMap[$bookId])) {
            continue;
        }
        $book = $booksMap[$bookId];
        if ($pagesScope === 'core') {
            if (!bookMatchesCoreTrack($book, $track)) {
                continue;
            }
        } elseif ($pagesScope === 'optional') {
            if (!bookMatchesOptionalTrack($book, $track)) {
                continue;
            }
        } elseif (!bookMatchesTrack($book, $track)) {
            continue;
        }
        $week = trim((string)($log['week_label'] ?? ''));
        $key = $bookId . '|' . ($week !== '' ? $week : 'no-week');
        $pages = max(0, (int)($log['pages_read'] ?? 0));
        if (!isset($deduped[$key]) || $pages > $deduped[$key]) {
            $deduped[$key] = $pages;
        }
    }
    return (int)array_sum($deduped);
}

/** صفحات اختيارية: سجلات القراءة + كتب اختيارية مكتملة في completed_books (لكل كتاب الأعلى) */
function sumOptionalGamificationPages(
    int $userId,
    string $track,
    array $booksMap,
    array $logsRows,
    array $completedIds
): int {
    $byBookMax = [];

    foreach ($logsRows as $log) {
        if ((int)($log['user_id'] ?? 0) !== $userId) {
            continue;
        }
        $bookId = (int)($log['book_id'] ?? 0);
        if ($bookId <= 0 || !isset($booksMap[$bookId])) {
            continue;
        }
        $book = $booksMap[$bookId];
        if (!bookMatchesOptionalTrack($book, $track)) {
            continue;
        }
        $pages = max(0, (int)($log['pages_read'] ?? 0));
        if (!isset($byBookMax[$bookId]) || $pages > $byBookMax[$bookId]) {
            $byBookMax[$bookId] = $pages;
        }
    }

    foreach ($completedIds as $bookId) {
        $bookId = (int)$bookId;
        if ($bookId <= 0 || !isset($booksMap[$bookId])) {
            continue;
        }
        $book = $booksMap[$bookId];
        if (!bookMatchesOptionalTrack($book, $track)) {
            continue;
        }
        $total = max(0, (int)($book['total_pages'] ?? 0));
        if (!isset($byBookMax[$bookId]) || $total > $byBookMax[$bookId]) {
            $byBookMax[$bookId] = $total;
        }
    }

    return (int)array_sum($byBookMax);
}

function isTrackCurriculumComplete(array $completedIds, array $booksMap, string $track): bool
{
    $completedSet = array_flip(array_map('intval', $completedIds));
    $hasAnyBook = false;
    foreach ($booksMap as $book) {
        if (!bookMatchesTrack($book, $track)) {
            continue;
        }
        $hasAnyBook = true;
        if (!isset($completedSet[(int)$book['id']])) {
            return false;
        }
    }
    return $hasAnyBook;
}

/** ختم المسار الأساسي: كل الكتب basic في المسار مكتملة */
function isCoreTrackCurriculumComplete(array $completedIds, array $booksMap, string $track): bool
{
    $completedSet = array_flip(array_map('intval', $completedIds));
    $hasAnyBook = false;
    foreach ($booksMap as $book) {
        if (!bookMatchesCoreTrack($book, $track)) {
            continue;
        }
        $hasAnyBook = true;
        if (!isset($completedSet[(int)$book['id']])) {
            return false;
        }
    }
    return $hasAnyBook;
}

/** عدد الكتب الأساسية في منهج المسار — O(B) */
function countCoreBooksInTrack(array $booksMap, string $track): int
{
    $n = 0;
    foreach ($booksMap as $book) {
        if (bookMatchesCoreTrack($book, $track)) {
            $n++;
        }
    }
    return $n;
}

/** كتب أساسية مكتملة في المسار — O(B + C) */
function countCompletedCoreBooksInTrack(array $completedIds, array $booksMap, string $track): int
{
    $completedSet = array_flip(array_map('intval', $completedIds));
    $n = 0;
    foreach ($booksMap as $book) {
        if (!bookMatchesCoreTrack($book, $track)) {
            continue;
        }
        if (isset($completedSet[(int)$book['id']])) {
            $n++;
        }
    }
    return $n;
}

/** تقدم تراكمي للمنهج بالكتب الأساسية (0–100%) — لا يعتمد على التاريخ */
function evalCurriculumBooksProgressRate(array $completedIds, array $booksMap, string $track): float
{
    $total = countCoreBooksInTrack($booksMap, $track);
    if ($total <= 0) {
        return 0.0;
    }
    $done = countCompletedCoreBooksInTrack($completedIds, $booksMap, $track);
    return round(min(100, ($done / $total) * 100), 1);
}

function buildFinishHint(
    int $totalTrackPages,
    int $batchWeekNow,
    int $weeklyQuota,
    string $effectiveTrack,
    int $trackGamificationPages,
    bool $trackComplete
): string {
    $trackAr = trackLabelAr($effectiveTrack);

    if ($trackComplete) {
        return "مبروك! أتممت المنهج الأساسي في المسار {$trackAr} 🎉";
    }

    if ($totalTrackPages <= 0 || $batchWeekNow <= 0) {
        return "تسير على الخطة — مسار {$trackAr}";
    }

    $pacePages = min(max(0, $trackGamificationPages), $totalTrackPages);
    $remaining = max(0, $totalTrackPages - $pacePages);

    if ($remaining <= 0) {
        return "أداء استثنائي! اقتربت من ختم المسار {$trackAr} 🚀";
    }

    $pace = max($trackGamificationPages / $batchWeekNow, 1.0);
    $weeksLeft = (int)ceil($remaining / max($pace, $weeklyQuota * 0.25));
    $monthsLeft = (int)ceil($weeksLeft / 4.33);
    $maxMonths = $effectiveTrack === 'simplified' ? 20 : 27;
    $monthsLeft = min($maxMonths, max(1, $monthsLeft));

    if ($pace >= $weeklyQuota) {
        return "أداء استثنائي! متبقي {$monthsLeft} شهراً لختم المسار {$trackAr} 🚀";
    }

    return "تسير على الخطة ({$trackAr})، متبقي نحو {$monthsLeft} شهراً";
}

function loadLastLogDateByUser(PDO $pdo): array
{
    $map = [];
    try {
        $rows = $pdo->query('SELECT user_id, MAX(`date`) AS last_date FROM reading_logs GROUP BY user_id')->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $row) {
            $uid = (int)($row['user_id'] ?? 0);
            if ($uid > 0 && !empty($row['last_date'])) {
                $map[$uid] = (string)$row['last_date'];
            }
        }
    } catch (Exception $e) {
        // ignore if date column missing
    }
    return $map;
}

function buildAtRiskStudents(array $usersDetail, array $lastLogByUser, int $inactiveDays): array
{
    $cutoff = (new DateTime('today'))->modify('-' . max(1, $inactiveDays) . ' days');
    $students = [];
    foreach ($usersDetail as $u) {
        $uid = (int)$u['id'];
        $last = $lastLogByUser[$uid] ?? null;
        $isAtRisk = true;
        if ($last !== null) {
            try {
                $lastDt = new DateTime($last);
                $isAtRisk = $lastDt < $cutoff;
            } catch (Exception $e) {
                $isAtRisk = true;
            }
        }
        if ($isAtRisk) {
            $students[] = [
                'id' => $uid,
                'name' => $u['name'],
                'batchName' => $u['batchName'],
                'trackLabelAr' => $u['trackLabelAr'] ?? '',
                'lastLogAt' => $last,
            ];
        }
    }
    return $students;
}

function buildBookBottleneck(array $filteredUsers, array $booksMap): ?array
{
    $counts = [];
    foreach ($filteredUsers as $user) {
        $bookId = (int)($user['current_book_id'] ?? 0);
        if ($bookId <= 0 || !isset($booksMap[$bookId])) {
            continue;
        }
        $completed = json_decode($user['completed_books'] ?: '[]', true) ?: [];
        $completedIds = array_map('intval', is_array($completed) ? $completed : []);
        if (in_array($bookId, $completedIds, true)) {
            continue;
        }
        $counts[$bookId] = ($counts[$bookId] ?? 0) + 1;
    }
    if (count($counts) === 0) {
        return null;
    }
    arsort($counts);
    $bookId = (int)array_key_first($counts);
    $book = $booksMap[$bookId];
    return [
        'bookId' => $bookId,
        'title' => $book['title'] ?? ('كتاب ' . $bookId),
        'stuckCount' => (int)$counts[$bookId],
        'method' => 'current_book',
    ];
}

try {
    $scopeMe = isset($_GET['scope']) && $_GET['scope'] === 'me';
    if (!$scopeMe) {
        requireStaffRole($pdo);
    }

    $settings = loadSettings($pdo);
    $weeklyQuota = max(1, (int)($settings['weekly_quota'] ?? 75));
    $atRiskInactiveDays = max(1, min(90, (int)($settings['at_risk_inactive_days'] ?? 14)));
    $submissionStartDay = (int)($settings['submission_start_day'] ?? 0);

    $stmtBooks = $pdo->query('SELECT id, title, total_pages, phase_number, track_type, level_type FROM curriculum');
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
        SELECT user_id, book_id, week_label, submission_status, pages_read
        FROM reading_logs
    ");
    $logsRows = $logsStmt->fetchAll(PDO::FETCH_ASSOC);

    $onTimeWeeksByUser = [];
    $lateWeeksByUser = [];

    foreach ($logsRows as $log) {
        $uid = (int)$log['user_id'];
        $week = $log['week_label'] ?? '';
        $status = $log['submission_status'] ?? '';
        if ($week === '') {
            continue;
        }
        // لا تدخل سجلات إنجاز سابق / تحفيز اختياري في مؤشر التزام
        if ($status === 'extra') {
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
    $meId = $scopeMe ? (int)($_COOKIE['userId'] ?? 0) : 0;
    $lastLogByUser = $scopeMe ? [] : loadLastLogDateByUser($pdo);

    $usersDetail = [];
    $totalBooksCompleted = 0;
    $filteredUsersRaw = [];

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
        $totalCoreTrackPages = sumCoreTrackPages($booksMap, $effectiveTrack);
        $batchWeekNow = resolveBatchWeekNow($batchId, $batchWeekCache, $totalCoreTrackPages, $weeklyQuota);
        $batchWeekSupervisor = resolveBatchWeekNow($batchId, $batchWeekCache, $totalTrackPages, $weeklyQuota);

        $completedIds = json_decode($user['completed_books'] ?: '[]', true) ?: [];
        if (!is_array($completedIds)) {
            $completedIds = [];
        }

        $gamificationPagesCore = sumGamificationPagesForTrack(
            $userId,
            $effectiveTrack,
            $booksMap,
            $logsRows,
            'core'
        );
        $gamificationPagesOptional = sumOptionalGamificationPages(
            $userId,
            $effectiveTrack,
            $booksMap,
            $logsRows,
            $completedIds
        );
        $gamificationPages = $gamificationPagesCore;

        $progressPagesCore = evalProgressPagesForCoreTrack($user, $booksMap, $effectiveTrack);
        $progressPages = evalProgressPagesForTrack($user, $booksMap, $effectiveTrack);
        $batchPaceTargetCore = min($totalCoreTrackPages, $batchWeekNow * $weeklyQuota);
        /** إنجاز مرحلي: تقدم أساسي رسمي ÷ هدف دفعة أساسي */
        $stageCompletionRate = $batchPaceTargetCore > 0
            ? round(min(100, ($progressPagesCore / $batchPaceTargetCore) * 100), 1)
            : 0;

        /** نسبة التقدم التراكمي للدفعة (بطاقة الطالب): صفحات أساسية مسجّلة ÷ هدف الدفعة الأساسي */
        $batchCumulativeRate = $batchPaceTargetCore > 0
            ? round(min(100, ($gamificationPagesCore / $batchPaceTargetCore) * 100), 1)
            : 0;
        $trackCompleted = isCoreTrackCurriculumComplete($completedIds, $booksMap, $effectiveTrack);
        $totalCoreBooksInTrack = countCoreBooksInTrack($booksMap, $effectiveTrack);
        $completedCoreBooksInTrack = countCompletedCoreBooksInTrack($completedIds, $booksMap, $effectiveTrack);
        $curriculumBooksProgressRate = evalCurriculumBooksProgressRate($completedIds, $booksMap, $effectiveTrack);

        $onTimeWeeks = isset($onTimeWeeksByUser[$userId]) ? count($onTimeWeeksByUser[$userId]) : 0;
        $lateWeeks = isset($lateWeeksByUser[$userId]) ? count($lateWeeksByUser[$userId]) : 0;
        $commitmentIndex = round(($onTimeWeeks + 0.5 * $lateWeeks) / $batchWeekNow, 2);
        $completedBooksCount = count($completedIds);
        if ($trackCompleted) {
            $totalBooksCompleted++;
        }
        $filteredUsersRaw[] = $user;

        $usersDetail[] = [
            'id' => $userId,
            'name' => $user['name'],
            'batchId' => $batchId,
            'batchName' => $batchId && isset($batchesMap[$batchId]) ? $batchesMap[$batchId]['name'] : 'بدون دفعة',
            'effectiveTrack' => $effectiveTrack,
            'stageCompletionRate' => $stageCompletionRate,
            'batchCumulativeRate' => $batchCumulativeRate,
            'curriculumBooksProgressRate' => $curriculumBooksProgressRate,
            'completedCoreBooksInTrack' => $completedCoreBooksInTrack,
            'totalCoreBooksInTrack' => $totalCoreBooksInTrack,
            'batchPaceTarget' => $batchPaceTargetCore,
            'gamificationPages' => $gamificationPages,
            'gamificationPagesOptional' => $gamificationPagesOptional,
            'trackCompleted' => $trackCompleted,
            'trackLabelAr' => trackLabelAr($effectiveTrack),
            'commitmentIndex' => $commitmentIndex,
            'completedBooksCount' => $completedBooksCount,
            'totalReadPages' => $progressPages,
            'completionRate' => $stageCompletionRate,
            'batchWeekNow' => $batchWeekNow,
            'expectedFinishHint' => buildFinishHint(
                $totalCoreTrackPages,
                $batchWeekNow,
                $weeklyQuota,
                $effectiveTrack,
                $gamificationPagesCore,
                $trackCompleted
            ),
            'totalCoreTrackPages' => $totalCoreTrackPages,
            'progressPagesCore' => $progressPagesCore,
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
            'avgBatchCumulativeRate' => $count > 0
                ? round(array_sum(array_column($usersDetail, 'batchCumulativeRate')) / $count, 1)
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

    if (!$scopeMe) {
        $atRiskList = buildAtRiskStudents($usersDetail, $lastLogByUser, $atRiskInactiveDays);
        $response['supervisorIndicators'] = [
            'atRisk' => [
                'count' => count($atRiskList),
                'windowDays' => $atRiskInactiveDays,
                'students' => $atRiskList,
            ],
            'bookBottleneck' => buildBookBottleneck($filteredUsersRaw, $booksMap),
        ];
        $response['filters'] = [
            'batchId' => $filterBatchId,
            'track' => $filterTrack,
        ];
    }

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
