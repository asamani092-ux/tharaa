# نسخ PHP لرفعها يدوياً إلى Hostinger (`public_html/api/`)

| ملف | ملاحظة |
|-----|--------|
| `analytics.php` | مهمة 4: `expectedFinishHint` حسب مسار كامل/ميسر + تقدم رسمي |
| `CUSTOM_PROGRESS_SERVER.md` | دمج تراكمي لـ `completed_books` على الخادم |
| `settings.php` | `curriculumPdfUrlFull` / `curriculumPdfUrlSimplified` + `priorAchievementEnabled` |
| `MIGRATION_curriculum_pdf_by_track.sql` | منهج PDF للمسار الكامل والميسر |
| `users.php` | إنجاز سابق — يُرفض إذا `prior_achievement_enabled = 0` |
| `MIGRATION_curriculum_pdf_url.sql` | عمود رابط PDF المنهج |
| `MIGRATION_prior_achievement_enabled.sql` | إظهار/إخفاء زر إنجاز سابق |

الواجهة ترسل بالفعل `completedBooks` مدمجة؛ يُفضّل أن يدمج الخادم أيضاً (اتحاد) وليس استبدالاً.
