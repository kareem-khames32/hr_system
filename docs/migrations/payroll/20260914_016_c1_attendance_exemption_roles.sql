-- 20260914_016_c1 (المرحلة ج، خطة المراجعة الخطوة 24 — مسار الاستثناء C1): منح صلاحيات استثناء الحضور لأدوار محددة.
-- قرار الخطوة 9 أجّل المنح حتى تُغلق الخطوة 8-أ؛ وقد أُغلقت: SUPER_ADMIN_ONLY_GRANTS تضم attendance_exemption.approve
-- وattendance_exemption.approve_executive، فلا يمنحهما حامل users.manage لحساب أو دور أو تجاوز.
--   hr_manager     : view + manage + approve  (يطلب ويعتمد ويرفض وينهي؛ لا يعتمد ولا يرفض ما أنشأه — فصل مهام في الخدمة)
--   branch_manager : view + manage            (يطلب لموظفي فرعه ويتابع؛ القرار للموارد البشرية)
--   attendance_exemption.approve_executive لا يُمنح لأي دور: الاعتماد التنفيذي للقيادات يبقى لمدير النظام.
-- إضافي فقط: يُلحق المفتاح الناقص بآخر مصفوفة JSON دون حذف أو إعادة ترتيب، ولا يلمس دورًا معطلًا أو يحمل '*'.
-- الصلاحيات محفوظة داخل الـJWT؛ لذا يُرفع tokenVersion لمستخدمي الدور الذي تغيّر فعلًا (نفس سلوك شاشة الأدوار).
-- إعادة التشغيل لا تغيّر شيئًا (لا مفتاح ناقص = لا تحديث = لا رفع لإصدار الجلسات).
SET NOCOUNT ON;

IF EXISTS (SELECT 1 FROM dbo.roles WHERE code IN (N'hr_manager', N'branch_manager') AND ISJSON(permissions) <> 1)
  THROW 52401, N'صلاحيات أحد الدورين hr_manager أو branch_manager ليست مصفوفة JSON صالحة؛ راجعها قبل منح استثناء الحضور', 1;

CREATE TABLE #c1_grants (seq int NOT NULL PRIMARY KEY, roleCode nvarchar(50) NOT NULL, permission nvarchar(100) NOT NULL);
INSERT INTO #c1_grants (seq, roleCode, permission) VALUES
  (1, N'hr_manager', N'attendance_exemption.view'),
  (2, N'hr_manager', N'attendance_exemption.manage'),
  (3, N'hr_manager', N'attendance_exemption.approve'),
  (4, N'branch_manager', N'attendance_exemption.view'),
  (5, N'branch_manager', N'attendance_exemption.manage');
CREATE TABLE #c1_changed (roleCode nvarchar(50) NOT NULL PRIMARY KEY);

DECLARE @seq int = 1, @role nvarchar(50), @permission nvarchar(100);
WHILE @seq <= (SELECT MAX(seq) FROM #c1_grants)
BEGIN
  SELECT @role = roleCode, @permission = permission FROM #c1_grants WHERE seq = @seq;
  UPDATE r SET r.permissions = JSON_MODIFY(r.permissions, N'append $', @permission)
  FROM dbo.roles r
  WHERE r.code = @role AND ISNULL(r.isActive, 1) = 1 AND ISJSON(r.permissions) = 1
    AND NOT EXISTS (SELECT 1 FROM OPENJSON(r.permissions) j WHERE j.[value] IN (@permission, N'*'));
  IF @@ROWCOUNT > 0 AND NOT EXISTS (SELECT 1 FROM #c1_changed WHERE roleCode = @role)
    INSERT INTO #c1_changed (roleCode) VALUES (@role);
  SET @seq += 1;
END

UPDATE u SET u.tokenVersion = ISNULL(u.tokenVersion, 0) + 1
FROM dbo.users u
JOIN #c1_changed c ON c.roleCode = u.[role];

IF EXISTS (
  SELECT 1 FROM #c1_grants g
  JOIN dbo.roles r ON r.code = g.roleCode AND ISNULL(r.isActive, 1) = 1
  WHERE NOT EXISTS (SELECT 1 FROM OPENJSON(r.permissions) j WHERE j.[value] IN (g.permission, N'*')))
  THROW 52402, N'تعذر منح صلاحيات استثناء الحضور لدوري hr_manager وbranch_manager', 1;

DROP TABLE #c1_changed;
DROP TABLE #c1_grants;
