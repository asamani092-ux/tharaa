# نسخ PHP لرفعها يدوياً إلى Hostinger (`public_html/api/`)

| ملف | ملاحظة |
|-----|--------|
| `auth_helpers.php` | أدوار `admin` / `supervisor` / `student` |
| `analytics.php` | مؤشرات، فلترة دفعة/مسار، دائرة الخطر، عنق الزجاجة |
| `settings.php` | منهج PDF؛ صيانة وإنجاز سابق (سوبرفايزر)； `atRiskInactiveDays` |
| `users.php` | `GET ?id=admins`، `POST ?id=admin` (سوبرفايزر)； إنجاز سابق |
| `MIGRATION_supervisor_and_at_risk.sql` | أيام الخطر + دور supervisor |
| `MIGRATION_curriculum_pdf_by_track.sql` | منهج PDF كامل/ميسر |
| `MIGRATION_prior_achievement_enabled.sql` | زر إنجاز سابق |
| `CUSTOM_PROGRESS_SERVER.md` | دمج تراكمي `completed_books` |

الواجهة ترسل بالفعل `completedBooks` مدمجة؛ يُفضّل أن يدمج الخادم أيضاً (اتحاد) وليس استبدالاً.
