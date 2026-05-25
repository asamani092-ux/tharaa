# نسخ PHP لرفعها يدوياً إلى Hostinger (`public_html/api/`)

| ملف | ملاحظة |
|-----|--------|
| `analytics.php` | مهمة 4: `expectedFinishHint` حسب مسار كامل/ميسر + تقدم رسمي |
| `CUSTOM_PROGRESS_SERVER.md` | دمج تراكمي لـ `completed_books` على الخادم |
| `settings.php` | إعدادات المنصة + `curriculumPdfUrl` |
| `MIGRATION_curriculum_pdf_url.sql` | عمود رابط PDF المنهج |

الواجهة ترسل بالفعل `completedBooks` مدمجة؛ يُفضّل أن يدمج الخادم أيضاً (اتحاد) وليس استبدالاً.
