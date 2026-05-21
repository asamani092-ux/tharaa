# ربط الواجهة بالخلفية (PHP على Hostinger)

| ملف الواجهة | نقطة API | ملاحظة |
|-------------|----------|--------|
| `src/pages/student/index.tsx` | `GET /api/analytics.php?scope=me` | بطاقات الطالب + `effectiveTrack` احتياطي |
| `src/pages/student/index.tsx` | `GET /api/logs.php?id=status` | حالة الرصد الأسبوعي |
| `src/pages/student/index.tsx` | `POST /api/logs.php` | `mode`: primary \| extra |
| `src/pages/student/index.tsx` | `POST /api/users.php?id=custom_progress` | إنجاز سابق — يعيد جلب analytics بعد الاعتماد |
| `src/components/layout.tsx` | Orval session/settings | `ThemeToggle` في هيدر الطالب |
