# ربط الواجهة بالخلفية (PHP على Hostinger)

| ملف الواجهة | نقطة API | ملاحظة |
|-------------|----------|--------|
| `src/pages/student/index.tsx` | `GET /api/analytics.php?scope=me` | `batchCumulativeRate` (بطاقة 1)، `gamificationPages`، `expectedFinishHint`؛ `stageCompletionRate` للمشرف فقط |
| `src/pages/student/index.tsx` | `GET /api/logs.php?id=status` | `hasPrimaryThisWeek` — إغلاق «تم الإرسال» |
| `src/pages/student/index.tsx` | `POST /api/logs.php` | `mode`: primary \| extra، `rows[]` متعدد (المرحلة 2 PHP) |
| `src/pages/student/index.tsx` | `useGetSettings` | `weeklyQuota`, `allDaysActive`, `primaryDay` — نافذة التوقيت في `submissionWindow.ts` |
| `src/lib/submissionWindow.ts` | — | يوم رسمي / تأخير / طوال الأسبوع / خارج الموعد (واجهة فقط حتى تأكيد PHP) |
| `src/lib/weeklyLogEngine.ts` | — | حلقة النصاب، حقن الصفحات، تخطي |
| `src/pages/student/index.tsx` | `POST /api/users.php?id=custom_progress` | إنجاز سابق — `completedBooks` مدمج تراكمياً في الواجهة |
| `hostinger-php/api/analytics.php` | نسخة مرجعية للرفع | مقاييس الطالب: **أساسي فقط** (`level_type`≠optional)؛ `trackCompleted` = ختم الأساسي |
| `src/components/student/book-level-badge.tsx` | — | شارات أساسي (ذهبي صلب) / اختياري في قائمة الكتب |
| `hostinger-php/api/settings.php` | GET/PATCH `/api/settings.php` | `curriculumPdfUrl`؛ `priorAchievementEnabled` — إظهار/إخفاء إنجاز سابق |
| `src/pages/admin/settings.tsx` | PATCH settings | مفتاح «إظهار زر إنجاز سابق» |
| `src/pages/student/index.tsx` | `gamificationPagesOptional` | يظهر داخل بطاقة التحفيز عند القراءة فقط |
| `src/pages/student/index.tsx` | — | ختم المسار: بطاقة + modal؛ إخفاء رصد أسبوعي وإنجاز سابق عند الاكتمال |
| `src/components/layout.tsx` | Orval session/settings | `ThemeToggle` في هيدر الطالب |

## عقد POST الرصد (للمرحلة 2 على Hostinger)

```json
{
  "mode": "primary",
  "reflection": "اختياري",
  "rows": [
    { "bookId": 89, "startPage": 1, "endPage": 40, "isCompleted": true },
    { "bookId": 90, "startPage": 1, "endPage": 60, "isCompleted": false }
  ]
}
```

- **primary**: يغلق الأسبوع؛ يجب قبول كل `rows` وتحديث `last_page` / `current_book_id`.
- **extra**: تحفيز فقط؛ لا يغلق الأسبوع (ويفضل عدم مسّ `last_page` في PHP).
