# ربط الواجهة بالخلفية (PHP على Hostinger)

| ملف الواجهة | نقطة API | ملاحظة |
|-------------|----------|--------|
| `src/pages/student/index.tsx` | `GET /api/analytics.php?scope=me` | بطاقات: `stageCompletionRate`, `gamificationPages`, `expectedFinishHint` |
| `src/pages/student/index.tsx` | `GET /api/logs.php?id=status` | حالة الرصد الأسبوعي |
| `src/pages/student/index.tsx` | `POST /api/logs.php` | `mode`: primary \| extra |
| `src/pages/student/index.tsx` | `POST /api/users.php?id=custom_progress` | إنجاز سابق |
| `src/pages/student/index.tsx` | Orval: `useGetMe`, `useListCurriculum`, … | `effectiveTrack` من المستخدم أو من `me` في analytics |
