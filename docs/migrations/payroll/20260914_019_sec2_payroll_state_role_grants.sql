-- 20260914_018_sec2 (مسار الأمان SEC2 — خطة المراجعة الخطوة 9، البند الأخير): منح صلاحيات حالة المسير لأدوار محددة بأقل امتياز.
-- شرط الخطوة: بعد إغلاق 8-أ. وقد أُغلقت: SUPER_ADMIN_ONLY_GRANTS تضم payroll.reopen وpayroll.cancel وovertime.adjust
-- وattendance_exemption.approve وattendance_exemption.approve_executive؛ فلا يمررها حامل users.manage لحساب أو تجاوز أو كلمة مرور،
-- ولا حامل roles.manage من غير مدير النظام لدور. القرار موثق في PAYROLL_DECISIONS_2026-09-14.md (قسم «منح الأدوار — SEC2»).
--   hr_manager      : payroll.reopen + payroll.cancel — الدور الوحيد الذي يحمل payroll.approve؛ إعادة الفتح تعيد المسير المعتمد
--                     (لا المصروف) إلى CALCULATED وتُسقط الاعتماد فيحتاج اعتمادًا جديدًا، والإلغاء لمسودة CALCULATED فقط، وكلاهما بسبب وحدث.
--                   + overtime.adjust — موجودة في حزمة hr_manager في الكود (ROLE_PRESETS) وغائبة عن القاعدة؛ تخفيض فقط بسبب موثق.
--   payroll_officer وbranch_manager وemployee: لا شيء من هذه الثلاث.
--   attendance_exemption.* منحها 016_c1 (hr_manager: view/manage/approve، branch_manager: view/manage)،
--   وpayroll.policy.manage منحها 017_b2 (hr_manager)؛ هذا الملف لا يكررهما. approve_executive لا يُمنح لأي دور.
-- إضافي فقط: يُلحق المفتاح الناقص بآخر مصفوفة JSON دون حذف أو إعادة ترتيب، ولا يلمس دورًا معطلًا أو يحمل '*'.
-- الصلاحيات محفوظة داخل الـJWT؛ يُرفع tokenVersion لمستخدمي الدور الذي تغيّر فعلًا (نفس سلوك شاشة الأدوار).
-- إعادة التشغيل لا تغيّر شيئًا (لا مفتاح ناقص = لا تحديث = لا رفع لإصدار الجلسات).
SET NOCOUNT ON;

IF EXISTS (SELECT 1 FROM dbo.roles WHERE code = N'hr_manager' AND ISJSON(permissions) <> 1)
  THROW 53901, N'20260914_018_sec2: صلاحيات دور hr_manager ليست مصفوفة JSON صالحة؛ راجعها قبل منح صلاحيات حالة المسير', 1;

CREATE TABLE #sec2_grants (seq int NOT NULL PRIMARY KEY, roleCode nvarchar(50) NOT NULL, permission nvarchar(100) NOT NULL);
INSERT INTO #sec2_grants (seq, roleCode, permission) VALUES
  (1, N'hr_manager', N'payroll.reopen'),
  (2, N'hr_manager', N'payroll.cancel'),
  (3, N'hr_manager', N'overtime.adjust');
CREATE TABLE #sec2_changed (roleCode nvarchar(50) NOT NULL PRIMARY KEY);

DECLARE @seq int = 1, @role nvarchar(50), @permission nvarchar(100);
WHILE @seq <= (SELECT MAX(seq) FROM #sec2_grants)
BEGIN
  SELECT @role = roleCode, @permission = permission FROM #sec2_grants WHERE seq = @seq;
  UPDATE r SET r.permissions = JSON_MODIFY(r.permissions, N'append $', @permission)
  FROM dbo.roles r
  WHERE r.code = @role AND ISNULL(r.isActive, 1) = 1 AND ISJSON(r.permissions) = 1
    AND NOT EXISTS (SELECT 1 FROM OPENJSON(r.permissions) j WHERE j.[value] IN (@permission, N'*'));
  IF @@ROWCOUNT > 0 AND NOT EXISTS (SELECT 1 FROM #sec2_changed WHERE roleCode = @role)
    INSERT INTO #sec2_changed (roleCode) VALUES (@role);
  SET @seq += 1;
END

UPDATE u SET u.tokenVersion = ISNULL(u.tokenVersion, 0) + 1
FROM dbo.users u
JOIN #sec2_changed c ON c.roleCode = u.[role];

-- تحقق بعد التطبيق (1): دور hr_manager النشط يحمل الثلاث.
IF EXISTS (
  SELECT 1 FROM #sec2_grants g
  JOIN dbo.roles r ON r.code = g.roleCode AND ISNULL(r.isActive, 1) = 1
  WHERE NOT EXISTS (SELECT 1 FROM OPENJSON(r.permissions) j WHERE j.[value] IN (g.permission, N'*')))
  THROW 53902, N'20260914_018_sec2: تعذر منح payroll.reopen وpayroll.cancel وovertime.adjust لدور hr_manager', 1;

-- تحقق بعد التطبيق (2) — أقل امتياز: لا دور نشط غير hr_manager (ولا يحمل '*') يحمل إعادة الفتح أو الإلغاء أو الاعتماد التنفيذي للاستثناء.
IF EXISTS (
  SELECT 1 FROM dbo.roles r CROSS APPLY OPENJSON(r.permissions) j
  WHERE ISNULL(r.isActive, 1) = 1 AND ISJSON(r.permissions) = 1
    AND NOT EXISTS (SELECT 1 FROM OPENJSON(r.permissions) s WHERE s.[value] = N'*')
    AND ((j.[value] IN (N'payroll.reopen', N'payroll.cancel') AND r.code <> N'hr_manager')
      OR j.[value] = N'attendance_exemption.approve_executive'))
  THROW 53903, N'20260914_018_sec2: دور غير hr_manager يحمل إعادة فتح المسير أو إلغاءه أو الاعتماد التنفيذي للاستثناء؛ خلاف قرار أقل امتياز', 1;

DROP TABLE #sec2_changed;
DROP TABLE #sec2_grants;
