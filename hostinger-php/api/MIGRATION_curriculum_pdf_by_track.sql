-- تشغيل مرة واحدة على Hostinger
-- منهج PDF حسب المسار: كامل / ميسر (مع نسخ الرابط القديم إن وُجد)

ALTER TABLE settings
  ADD COLUMN curriculum_pdf_url_full VARCHAR(2048) NULL DEFAULT NULL
  AFTER curriculum_pdf_url;

ALTER TABLE settings
  ADD COLUMN curriculum_pdf_url_simplified VARCHAR(2048) NULL DEFAULT NULL
  AFTER curriculum_pdf_url_full;

UPDATE settings
SET
  curriculum_pdf_url_full = COALESCE(NULLIF(TRIM(curriculum_pdf_url_full), ''), curriculum_pdf_url),
  curriculum_pdf_url_simplified = COALESCE(NULLIF(TRIM(curriculum_pdf_url_simplified), ''), curriculum_pdf_url)
WHERE curriculum_pdf_url IS NOT NULL AND TRIM(curriculum_pdf_url) <> '';
