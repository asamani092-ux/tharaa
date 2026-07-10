<?php

const APP_TIMEZONE = 'Asia/Riyadh';

const DAY_NAME_TO_NUM = [
    'Sunday' => 0,
    'Monday' => 1,
    'Tuesday' => 2,
    'Wednesday' => 3,
    'Thursday' => 4,
    'Friday' => 5,
    'Saturday' => 6,
];

function fetchSettingsRow(PDO $pdo): ?array
{
    try {
        $stmt = $pdo->query('SELECT * FROM settings LIMIT 1');
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    } catch (PDOException $e) {
        return null;
    }
}

/** يوم بداية أسبوع الرصد من الإعدادات — O(1). */
function resolvePrimaryStartDay(?array $settings): int
{
    $startDay = null;
    if ($settings && !empty($settings['primary_day']) && is_string($settings['primary_day'])) {
        $name = trim($settings['primary_day']);
        if (isset(DAY_NAME_TO_NUM[$name])) {
            $startDay = DAY_NAME_TO_NUM[$name];
        }
    }

    if ($startDay === null && $settings) {
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

    return $startDay;
}

function riyadhDateTime(?string $dateString = null): DateTime
{
    $tz = new DateTimeZone(APP_TIMEZONE);
    if ($dateString !== null && $dateString !== '') {
        return new DateTime($dateString, $tz);
    }
    return new DateTime('now', $tz);
}

/** مفتاح أسبوع الرصد لتاريخ معيّن — O(1). */
function weekLabelForDate(DateTime $date, int $startDay): string
{
    $d = clone $date;
    $d->setTimezone(new DateTimeZone(APP_TIMEZONE));
    $currentDay = (int)$d->format('w');
    $daysSinceStart = ($currentDay - $startDay + 7) % 7;
    if ($daysSinceStart > 0) {
        $d->modify("-{$daysSinceStart} days");
    }
    return $d->format('Y-m-d');
}

function getWeekLabel(PDO $pdo): string
{
    $settings = fetchSettingsRow($pdo);
    $startDay = resolvePrimaryStartDay($settings);
    return weekLabelForDate(riyadhDateTime(), $startDay);
}

function getRiyadhWeekday(): int
{
    return (int)riyadhDateTime()->format('w');
}
