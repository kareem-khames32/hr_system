-- 20260922_064: الأدوار ونطاق الفروع (قرارات المالك 22 سبتمبر بعد تدقيق الأدوار ROLES_AUDIT.md — العيوب D1 وD2 وD4 وD5).
-- (1) عمود users.scopeAllBranches  bit NOT NULL افتراضي 0 — «نطاقه: فرعه / كل الفروع». لما يتفتح، branchScopeOf بيرجّع null للحساب
--     فيشوف كل الفروع ويعدّل إعدادات الشركة بشرط الصلاحية المحددة (النطاق مش صلاحية). مايفتحوش غير مدير النظام من الشاشة.
--     كل الحسابات الحالية = 0 فمحدش نطاقه بيتغيّر من الترحيل. اسم القيد الافتراضي مطابق لما تولّده TypeORM (فرق المخطط = صفر).
-- (2) ثلاثة أدوار جديدة تُدرج لو مش موجودة بس (الدور الموجود بنفس الكود مايتلمسش):
--       asset_officer      مسؤول الأصول        custody.assign + approve.custody
--       hr_officer         مسؤول موارد بشرية    قراءة فقط في وحدات الموارد البشرية (9 صلاحيات عرض)
--       payroll_disburser  مسؤول صرف الرواتب   payroll.view + payroll.disburse
-- (3) تضييق ثلاثة أدوار أنشأها مستورد النظام القديم — **فقط لو الصف لسه مطابق بالحرف للحزمة اللي اتشحنت** (نفس مجموعة
--     الصلاحيات بالظبط: لا زيادة ولا نقص ولا تكرار، مقارنة ثنائية). الدور اللي المالك عدّله من شاشة الأدوار مايتلمسش،
--     وشاشة الأدوار بتعلّم على فرقه عن الحزمة المعتمدة فيتشال الزائد بالإيد:
--       payroll_manager  يتشال منه payroll.approve + payroll.pay            (D1: يحتسب ويدير، لا يعتمد ولا يصرف)
--       read_only        يتشال منه attendance.manage + custody.assign + candidates.manage + documents.manage + payroll.view
--                                                                            (D2: لا يكتب، ولا يقرأ كشف البنك بالحسابات البنكية)
--       data_entry       يتشال منه employees.archive                        (D4: لا يؤرشف)
--     الصلاحيات داخل الـJWT: يُرفع tokenVersion لمستخدمي الدور اللي اتغيّر فعلًا بس (نفس سلوك شاشة الأدوار وترحيل 019).
-- إضافي فقط: بلا إسقاط ولا حذف صفوف. إعادة التشغيل لا تغيّر شيئًا (العمود موجود، والأدوار موجودة، والحزم لم تعد مطابقة
-- للقديمة فلا تحديث ولا رفع لإصدار الجلسات). متوافق مع SQL Server 2019 (OPENJSON وISJSON فقط).
SET NOCOUNT ON;
GO

IF COL_LENGTH(N'dbo.users', N'scopeAllBranches') IS NULL
  ALTER TABLE dbo.users ADD [scopeAllBranches] bit NOT NULL CONSTRAINT [DF_20a6fc998d6589e92bb17fe0946] DEFAULT 0;
GO

-- تحقق (1): العمود موجود وغير قابل للفراغ، والقيد الافتراضي باسم TypeORM
IF COL_LENGTH(N'dbo.users', N'scopeAllBranches') IS NULL
  THROW 56641, N'20260922_064: عمود scopeAllBranches ناقص في users', 1;
IF NOT EXISTS (
  SELECT 1 FROM sys.default_constraints dc
  JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
  WHERE dc.parent_object_id = OBJECT_ID(N'dbo.users') AND c.name = N'scopeAllBranches' AND c.is_nullable = 0
    AND dc.name = N'DF_20a6fc998d6589e92bb17fe0946'
)
  THROW 56642, N'20260922_064: القيد الافتراضي لـ scopeAllBranches مش باسم TypeORM أو العمود بيقبل الفراغ', 1;
GO

-- (2) + (3) في دفعة واحدة: الجداول المؤقتة ماتعديش حدود الدفعة لو المنفّذ بيبدّل الاتصال.
-- أعمدتها النصية بترتيب القاعدة (DATABASE_DEFAULT) عشان المقارنة مع أعمدة القاعدة ماتتعارضش لو ترتيب tempdb مختلف.
IF EXISTS (SELECT 1 FROM dbo.roles WHERE code IN (N'payroll_manager', N'read_only', N'data_entry') AND ISJSON(permissions) <> 1)
  THROW 56643, N'20260922_064: صلاحيات payroll_manager أو read_only أو data_entry ليست مصفوفة JSON صالحة؛ راجعها من شاشة الأدوار قبل الترحيل', 1;

CREATE TABLE #r64_new (
  seq int NOT NULL PRIMARY KEY,
  code nvarchar(50) COLLATE DATABASE_DEFAULT NOT NULL,
  nameAr nvarchar(100) COLLATE DATABASE_DEFAULT NOT NULL,
  permissions nvarchar(max) COLLATE DATABASE_DEFAULT NOT NULL);
INSERT INTO #r64_new (seq, code, nameAr, permissions) VALUES
  (1, N'asset_officer', N'مسؤول الأصول', N'["custody.assign","approve.custody"]'),
  (2, N'hr_officer', N'مسؤول موارد بشرية', N'["employees.view","requests.view_all","attendance.view_all","attendance_exemption.view","leaves.view_all","calendar.view_all","dashboard.view_all","reports.view","transfers.view"]'),
  (3, N'payroll_disburser', N'مسؤول صرف الرواتب', N'["payroll.view","payroll.disburse"]');

INSERT INTO dbo.roles (code, nameAr, permissions, isSystem, isActive)
SELECT n.code, n.nameAr, n.permissions, 0, 1
FROM #r64_new n
WHERE NOT EXISTS (SELECT 1 FROM dbo.roles r WHERE r.code = n.code)
ORDER BY n.seq;

-- الحزمة اللي اتشحنت (مرتبة أبجديًا زي ما المستورد كتبها) والحزمة المعتمدة بعد القرار
CREATE TABLE #r64_presets (
  code nvarchar(50) COLLATE DATABASE_DEFAULT NOT NULL PRIMARY KEY,
  shipped nvarchar(max) COLLATE DATABASE_DEFAULT NOT NULL,
  trimmed nvarchar(max) COLLATE DATABASE_DEFAULT NOT NULL);
INSERT INTO #r64_presets (code, shipped, trimmed) VALUES
  (N'payroll_manager',
   N'["bonuses.manage","dashboard.view_all","deductions.manage","deductions.view","documents.manage","employees.view","payroll.approve","payroll.calculate","payroll.pay","payroll.view","reports.view","requests.create_on_behalf"]',
   N'["bonuses.manage","dashboard.view_all","deductions.manage","deductions.view","documents.manage","employees.view","payroll.calculate","payroll.view","reports.view","requests.create_on_behalf"]'),
  (N'read_only',
   N'["attendance.manage","attendance.view_all","candidates.manage","custody.assign","dashboard.view_all","deductions.view","documents.manage","employees.view","leaves.view_all","payroll.view","reports.view","requests.view_all"]',
   N'["attendance.view_all","dashboard.view_all","deductions.view","employees.view","leaves.view_all","reports.view","requests.view_all"]'),
  (N'data_entry',
   N'["documents.manage","employees.archive","employees.create","employees.edit","employees.view"]',
   N'["documents.manage","employees.create","employees.edit","employees.view"]');

CREATE TABLE #r64_changed (code nvarchar(50) COLLATE DATABASE_DEFAULT NOT NULL PRIMARY KEY);

-- مطابقة بالحرف = نفس المجموعة بالظبط: نفس العدد (فلا تكرار ولا زيادة)، وكل عنصر في الصف نص موجود في الحزمة القديمة،
-- وكل عنصر في الحزمة القديمة موجود في الصف. المقارنة ثنائية (BIN2) فلا تتساهل في حالة الأحرف ولا المسافات.
UPDATE r SET r.permissions = p.trimmed
OUTPUT inserted.code INTO #r64_changed (code)
FROM dbo.roles r
JOIN #r64_presets p ON p.code COLLATE Latin1_General_BIN2 = r.code COLLATE Latin1_General_BIN2
WHERE ISJSON(r.permissions) = 1
  AND (SELECT COUNT(*) FROM OPENJSON(r.permissions)) = (SELECT COUNT(*) FROM OPENJSON(p.shipped))
  AND NOT EXISTS (
    SELECT 1 FROM OPENJSON(r.permissions) a
    WHERE a.[type] <> 1
       OR NOT EXISTS (SELECT 1 FROM OPENJSON(p.shipped) s WHERE s.[value] COLLATE Latin1_General_BIN2 = a.[value] COLLATE Latin1_General_BIN2))
  AND NOT EXISTS (
    SELECT 1 FROM OPENJSON(p.shipped) s
    WHERE NOT EXISTS (SELECT 1 FROM OPENJSON(r.permissions) a WHERE a.[value] COLLATE Latin1_General_BIN2 = s.[value] COLLATE Latin1_General_BIN2));

UPDATE u SET u.tokenVersion = ISNULL(u.tokenVersion, 0) + 1
FROM dbo.users u
JOIN #r64_changed c ON c.code COLLATE Latin1_General_BIN2 = u.[role] COLLATE Latin1_General_BIN2;

-- تحقق (2): الأدوار الثلاثة الجديدة موجودة (أدرجها الترحيل أو كانت موجودة قبله)
IF (SELECT COUNT(*) FROM dbo.roles r JOIN #r64_new n ON n.code = r.code) <> 3
  THROW 56644, N'20260922_064: الأدوار الجديدة (مسؤول الأصول / مسؤول موارد بشرية / مسؤول صرف الرواتب) لم تُدرج كاملة', 1;

-- تحقق (3): الدور اللي الترحيل ضيّقه بقى على الحزمة المعتمدة بالظبط ومافيهوش أي صلاحية من اللي اتشالت
IF EXISTS (
  SELECT 1 FROM #r64_changed c
  JOIN dbo.roles r ON r.code COLLATE Latin1_General_BIN2 = c.code COLLATE Latin1_General_BIN2
  JOIN #r64_presets p ON p.code COLLATE Latin1_General_BIN2 = c.code COLLATE Latin1_General_BIN2
  WHERE r.permissions COLLATE Latin1_General_BIN2 <> p.trimmed COLLATE Latin1_General_BIN2
     OR EXISTS (
       SELECT 1 FROM OPENJSON(p.shipped) s
       WHERE NOT EXISTS (SELECT 1 FROM OPENJSON(p.trimmed) t WHERE t.[value] COLLATE Latin1_General_BIN2 = s.[value] COLLATE Latin1_General_BIN2)
         AND EXISTS (SELECT 1 FROM OPENJSON(r.permissions) a WHERE a.[value] COLLATE Latin1_General_BIN2 = s.[value] COLLATE Latin1_General_BIN2)))
  THROW 56645, N'20260922_064: دور اتضيّق ولسه شايل صلاحية من اللي المفروض تتشال', 1;

DROP TABLE #r64_changed;
DROP TABLE #r64_presets;
DROP TABLE #r64_new;
GO
