-- 20260914_017_b2 (مسار path-core، الجزء B2 — خطة المراجعة الخطوتان 12 و15)
-- (1) مفاتيح قرارات المالك الافتراضية D1/D2/D3/D5/D10/D11 في requests_config بالقيم المختارة (PAYROLL_DECISIONS_2026-09-14.md).
--     إضافة فقط لما هو غير موجود: القيمة القائمة لا تُلمس (قد يكون مسؤول النظام غيّرها من الشاشة).
-- (2) صلاحية payroll.policy.manage لدور مدير الموارد البشرية (إنشاء مجموعات السياسات ونسخها ونشرها)؛
--     دور مسؤول الرواتب (payroll.calculate) لا يحملها. لا يُحذف أي صف ولا تُغير صلاحية قائمة.
SET NOCOUNT ON;

INSERT INTO dbo.requests_config ([key], [value])
SELECT v.[key], v.[value]
FROM (VALUES
  -- D1: الخروج المبكر على الوردية الثابتة يُخصم بسعر الدقيقة
  (N'payroll.early_leave_deduction_enabled', N'true'),
  -- D2: أساس سعر الساعة = payroll.daily_hours
  (N'payroll.hourly_rate_basis', N'DAILY_HOURS'),
  -- D3: سعر اليوم = الأجر الشهري للمكونات الستة ÷ 30
  (N'payroll.day_rate_basis', N'MONTHLY_FIXED_COMPONENTS_30'),
  -- D10: قسط متأخر واحد لكل مسير إضافة لأقساط الشهر الحالي
  (N'payroll.loan_catchup_max_overdue', N'1'),
  -- D11: نافذة الإضافي الافتراضية بعد نهاية الوردية، وما خارج النوافذ مغلق (SRS LOT-14)
  (N'overtime.default_window', N'AFTER_SHIFT_END'),
  (N'overtime.outside_window_policy', N'CLOSED'),
  -- D5: قيم المواصفة للنقص والتداخل والسقف اليومي والمرونة (تُضاف فقط لو غابت)
  (N'payroll.shortfall_enabled', N'true'),
  (N'payroll.shortfall_mode', N'MINUTES'),
  (N'payroll.shortfall_value', N'1'),
  (N'payroll.attendance_overlap_policy', N'NET_OF_LATENESS'),
  (N'payroll.attendance_daily_cap_days', N'1'),
  (N'attendance.flex.shortfall_grace_minutes', N'10'),
  (N'attendance.flex.count_early_work_toward_required', N'false'),
  (N'attendance.flex.prorate_window_on_partial_leave', N'false'),
  (N'attendance.flex.unpaid_break_minutes', N'0'),
  (N'attendance.flex.max_session_minutes', N'900'),
  (N'attendance.flex.window_supersedes_grace', N'true'),
  (N'attendance.flex.missing_checkout_policy', N'MANUAL_ONLY')
) AS v([key], [value])
WHERE NOT EXISTS (SELECT 1 FROM dbo.requests_config c WHERE c.[key] = v.[key]);
GO

UPDATE r SET r.permissions = JSON_MODIFY(r.permissions, 'append $', N'payroll.policy.manage')
FROM dbo.roles r
WHERE r.code = N'hr_manager' AND ISJSON(r.permissions) = 1
  AND NOT EXISTS (SELECT 1 FROM OPENJSON(r.permissions) j WHERE j.[value] = N'payroll.policy.manage');
GO

-- تحقق بعد التطبيق: كل مفاتيح القرارات موجودة، ودور مدير الموارد البشرية يحمل الصلاحية الجديدة.
IF (SELECT COUNT(*) FROM dbo.requests_config WHERE [key] IN (N'payroll.early_leave_deduction_enabled', N'payroll.hourly_rate_basis',
      N'payroll.day_rate_basis', N'payroll.loan_catchup_max_overdue', N'overtime.default_window', N'overtime.outside_window_policy',
      N'payroll.shortfall_enabled', N'payroll.shortfall_mode', N'payroll.shortfall_value', N'payroll.attendance_overlap_policy',
      N'payroll.attendance_daily_cap_days', N'attendance.flex.shortfall_grace_minutes')) <> 12
  THROW 51217, N'20260914_017_b2: مفاتيح قرارات الرواتب غير مكتملة بعد الإضافة', 1;
IF EXISTS (SELECT 1 FROM dbo.roles WHERE code = N'hr_manager' AND ISJSON(permissions) = 1)
  AND NOT EXISTS (SELECT 1 FROM dbo.roles r CROSS APPLY OPENJSON(r.permissions) j WHERE r.code = N'hr_manager' AND j.[value] = N'payroll.policy.manage')
  THROW 51218, N'20260914_017_b2: دور hr_manager لا يحمل payroll.policy.manage بعد الترحيل', 1;
