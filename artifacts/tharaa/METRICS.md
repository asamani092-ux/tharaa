# مؤشرات المنصة (ثراء المعرفة)

مرجع المعادلات في `hostinger-php/api/analytics.php`. الفلترة: `?batchId=` و `?track=full|simplified`.

## مؤشرات المشارك (`scope=me`)

| المؤشر | الحقل API | البسط | المقام |
|--------|-----------|-------|--------|
| تقدم تراكمي للدفعة | `batchCumulativeRate` | صفحات مسجّلة **أساسية** (سجلات، dedupe كتاب+أسبوع) | `min(صفحات أساسية في المسار، أسبوع_الدفعة × النصاب)` |
| إنجاز مرحلي | `stageCompletionRate` | تقدم **أساسي** رسمي (`completed_books` + `last_page`) | نفس هدف الدفعة الأساسي |
| تحفيز أساسي | `gamificationPages` | كما البسط أعلاه | — |
| تحفيز اختياري | `gamificationPagesOptional` | سجلات + كتب اختيارية مكتملة | — |
| ختم المسار | `trackCompleted` | كل كتب **أساسية** في المسار في `completed_books` | — |

## مؤشرات المشرف (`usersDetail`)

| المؤشر | الحقل | ملاحظة |
|--------|-------|--------|
| المسار | `effectiveTrack` / `trackLabelAr` | تجاوز المشارك أو `default_track` للدفعة |
| إنجاز مرحلي % | `stageCompletionRate` | أساسي رسمي ÷ هدف دفعة أساسي |
| تقدم تراكمي للدفعة % | `batchCumulativeRate` | سجلات أساسية ÷ هدف دفعة أساسي |
| هدف الدفعة | `batchPaceTarget` | مقام التراكمي |
| تحفيز أساسي / اختياري | `gamificationPages` / `gamificationPagesOptional` | صفحات |
| التزام | `commitmentIndex` | `(أسابيع في الموعد + 0.5×متأخر) ÷ أسبوع_الدفعة` — **بلا** `submission_status = extra`؛ بطاقة الإحصائيات تعرض `min(100, متوسط×100)%` |
| تقدم رسمي | `totalReadPages` | تقدم كل كتب المسار (أساسي+اختياري) |
| تقدم أساسي | `progressPagesCore` | أساسي فقط |

## مؤشرات إضافية (`supervisorIndicators`)

| المؤشر | المنطق |
|--------|--------|
| دائرة الخطر | مشارك في الفلتر بلا `MAX(reading_logs.date)` خلال `atRiskInactiveDays` (من الإعدادات) |
| عنق الزجاجة | أعلى عدد مشاركين «عالقين» على `current_book_id` غير موجود في `completed_books` |

## الأدوار

| الدور | الوصف |
|-------|--------|
| `student` | مشارك |
| `admin` | مشرف — إدارة مشاركين ومنهج |
| `supervisor` | سوبرفايزر — إدارة حسابات `admin` + صيانة + إنجاز سابق |

## تصدير Excel

الأعمدة في `src/lib/exportAnalyticsExcel.ts` — تطابق جدول `/admin/analytics`.
