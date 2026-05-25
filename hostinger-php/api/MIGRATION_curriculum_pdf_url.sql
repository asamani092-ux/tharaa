-- تشغيل مرة واحدة على Hostinger إن لم يكن العمود موجوداً
ALTER TABLE settings
  ADD COLUMN curriculum_pdf_url VARCHAR(2048) NULL DEFAULT NULL
  AFTER maintenance_mode;
