-- تشغيل مرة واحدة على Hostinger

-- مدة انقطاع الرصد لدائرة الخطر (أيام)
ALTER TABLE settings
  ADD COLUMN at_risk_inactive_days INT NOT NULL DEFAULT 14
  AFTER prior_achievement_enabled;

-- دور supervisor: حدّث يدوياً حساباً علوياً واحداً، مثال:
-- UPDATE users SET role = 'supervisor' WHERE id = 1 AND phone = '05xxxxxxxx';
