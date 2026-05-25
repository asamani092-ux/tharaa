-- تشغيل مرة واحدة على Hostinger إن لم يكن العمود موجوداً
ALTER TABLE settings
  ADD COLUMN prior_achievement_enabled TINYINT(1) NOT NULL DEFAULT 1
  AFTER curriculum_pdf_url;
