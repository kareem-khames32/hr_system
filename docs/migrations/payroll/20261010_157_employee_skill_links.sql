-- 20261010_157: ربط مهارة الموظف بمكتبة المهارات (خطة التنفيذ — B5.4: المهارات والإحلال).
-- خمس أعمدة جديدة على employee_skills (بيقبلوا الفراغ ومن غير افتراضي):
--   skillId int: المهارة من المكتبة (skills). الفاضي = مهارة حرة مكتوبة باليد زي الأول.
--   source nvarchar(20): مصدر المستوى (ASSESSMENT تقييم / CERTIFICATE شهادة).
--   assessedByUserId int و assessedAt datetime2: مين قيّم وإمتى.
--   validUntil date: صلاحية الشهادة (الفاضي = من غير انتهاء).
-- مفيش تعبئة: كل مهارات الموظفين الموجودة بتفضل مهارات حرة من غير ربط.
-- الكود بيشتغل قبل الترحيل ده: الأعمدة برّه قراءة وكتابة ملف الموظف، وشاشة المهارات بتقول إن الترحيل ناقص.
-- إضافي فقط: بلا حذف. آمن للتكرار. متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.employee_skills', N'U') IS NULL
  THROW 157001, N'20261010_157: جدول employee_skills مش موجود', 1;
IF COL_LENGTH(N'dbo.employee_skills', N'skillId') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_skills', N'U') AND c.[name] = N'skillId'
    AND c.[system_type_id] = TYPE_ID(N'int') AND c.[user_type_id] = TYPE_ID(N'int') AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 157002, N'20261010_157: عمود employee_skills.skillId موجود وشكله مش int NULL من غير افتراضي', 1;
IF COL_LENGTH(N'dbo.employee_skills', N'source') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_skills', N'U') AND c.[name] = N'source'
    AND c.[system_type_id] = TYPE_ID(N'nvarchar') AND c.[user_type_id] = TYPE_ID(N'nvarchar') AND c.[max_length] = 40 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 157003, N'20261010_157: عمود employee_skills.source موجود وشكله مش nvarchar(20) NULL من غير افتراضي', 1;
IF COL_LENGTH(N'dbo.employee_skills', N'assessedByUserId') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_skills', N'U') AND c.[name] = N'assessedByUserId'
    AND c.[system_type_id] = TYPE_ID(N'int') AND c.[user_type_id] = TYPE_ID(N'int') AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 157004, N'20261010_157: عمود employee_skills.assessedByUserId موجود وشكله مش int NULL من غير افتراضي', 1;
IF COL_LENGTH(N'dbo.employee_skills', N'assessedAt') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_skills', N'U') AND c.[name] = N'assessedAt'
    AND c.[system_type_id] = TYPE_ID(N'datetime2') AND c.[user_type_id] = TYPE_ID(N'datetime2') AND c.[scale] = 7 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 157005, N'20261010_157: عمود employee_skills.assessedAt موجود وشكله مش datetime2 NULL من غير افتراضي', 1;
IF COL_LENGTH(N'dbo.employee_skills', N'validUntil') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.employee_skills', N'U') AND c.[name] = N'validUntil'
    AND c.[system_type_id] = TYPE_ID(N'date') AND c.[user_type_id] = TYPE_ID(N'date') AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 157006, N'20261010_157: عمود employee_skills.validUntil موجود وشكله مش date NULL من غير افتراضي', 1;
GO

IF COL_LENGTH(N'dbo.employee_skills', N'skillId') IS NULL
  ALTER TABLE dbo.employee_skills ADD [skillId] int NULL;
GO

IF COL_LENGTH(N'dbo.employee_skills', N'source') IS NULL
  ALTER TABLE dbo.employee_skills ADD [source] nvarchar(20) NULL;
GO

IF COL_LENGTH(N'dbo.employee_skills', N'assessedByUserId') IS NULL
  ALTER TABLE dbo.employee_skills ADD [assessedByUserId] int NULL;
GO

IF COL_LENGTH(N'dbo.employee_skills', N'assessedAt') IS NULL
  ALTER TABLE dbo.employee_skills ADD [assessedAt] datetime2 NULL;
GO

IF COL_LENGTH(N'dbo.employee_skills', N'validUntil') IS NULL
  ALTER TABLE dbo.employee_skills ADD [validUntil] date NULL;
GO

-- تحقق بعد التطبيق
IF COL_LENGTH(N'dbo.employee_skills', N'skillId') IS NULL OR COL_LENGTH(N'dbo.employee_skills', N'source') IS NULL OR COL_LENGTH(N'dbo.employee_skills', N'assessedByUserId') IS NULL OR COL_LENGTH(N'dbo.employee_skills', N'assessedAt') IS NULL OR COL_LENGTH(N'dbo.employee_skills', N'validUntil') IS NULL
  THROW 157007, N'20261010_157: الأعمدة ماتضافتش كلها', 1;
GO

PRINT N'20261010_157: تم — employee_skills: skillId، source، assessedByUserId، assessedAt، validUntil';
GO
