-- 20261007_103: قوالب التهيئة بالنطاق (خطة التنفيذ — B3.1 الجزء أ).
-- جدول جديد:
--   onboarding_templates: قالب تهيئة لفرع و/أو مسمى و/أو درجة و/أو نوع تعاقد (الخانة الفاضية = أي قيمة). المعطّل (isActive = 0)
--     مابيتختارش لموظف جديد.
-- عمود جديد (يقبل الفراغ ومن غير افتراضي):
--   onboarding_template_items.templateId int: قالب البند (onboarding_templates.id). الفاضي = بند من القالب العام (كل البنود القايمة).
-- الكود بيشتغل قبل الترحيل ده: القالب العام بس (السلوك القايم)، وإنشاء قالب بنطاق مرفوض برسالة الترحيل.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية (كل البنود القايمة فاضية = القالب العام). آمن للتكرار.
-- التحقق كامل: كل عمود في الجدول بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده؛
-- وعمود الربط int NULL من غير افتراضي ولا محسوب — مرة قبل أي تغيير (جدول أو عمود موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من
-- غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.onboarding_templates', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'name', N'nvarchar', 300, 0, 0, 0, 0),
      (N'branchId', N'int', 4, 10, 0, 1, 0),
      (N'jobTitle', N'nvarchar', 200, 0, 0, 1, 0),
      (N'gradeId', N'int', 4, 10, 0, 1, 0),
      (N'contractType', N'nvarchar', 60, 0, 0, 1, 0),
      (N'isActive', N'bit', 1, 1, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.onboarding_templates', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.onboarding_templates', N'U') AND [name] = N'PK_onboarding_templates'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.onboarding_templates', N'U') AND i.[name] = N'PK_onboarding_templates'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 103001, N'20261007_103: جدول onboarding_templates موجود وشكله مش شكل قوالب التهيئة (الأعمدة أو المفتاح)', 1;
IF OBJECT_ID(N'dbo.onboarding_template_items', N'U') IS NULL
  THROW 103002, N'20261007_103: جدول onboarding_template_items مش موجود (بنود قالب التهيئة)', 1;
IF COL_LENGTH(N'dbo.onboarding_template_items', N'templateId') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.onboarding_template_items', N'U') AND c.[name] = N'templateId'
    AND c.[system_type_id] = TYPE_ID(N'int') AND c.[user_type_id] = TYPE_ID(N'int') AND c.[max_length] = 4 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 103003, N'20261007_103: عمود onboarding_template_items.templateId موجود وشكله مش int NULL من غير افتراضي', 1;
GO

IF OBJECT_ID(N'dbo.onboarding_templates', N'U') IS NULL
CREATE TABLE dbo.onboarding_templates (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_onboarding_templates] PRIMARY KEY,
  [name] nvarchar(150) NOT NULL,
  [branchId] int NULL,
  [jobTitle] nvarchar(100) NULL,
  [gradeId] int NULL,
  [contractType] nvarchar(30) NULL,
  [isActive] bit NOT NULL,
  [createdAt] datetime2 NOT NULL
);
GO

IF COL_LENGTH(N'dbo.onboarding_template_items', N'templateId') IS NULL
  ALTER TABLE dbo.onboarding_template_items ADD [templateId] int NULL;
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.onboarding_templates', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'name', N'nvarchar', 300, 0, 0, 0, 0),
      (N'branchId', N'int', 4, 10, 0, 1, 0),
      (N'jobTitle', N'nvarchar', 200, 0, 0, 1, 0),
      (N'gradeId', N'int', 4, 10, 0, 1, 0),
      (N'contractType', N'nvarchar', 60, 0, 0, 1, 0),
      (N'isActive', N'bit', 1, 1, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.onboarding_templates', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.onboarding_templates', N'U') AND [name] = N'PK_onboarding_templates'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.onboarding_templates', N'U') AND i.[name] = N'PK_onboarding_templates'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 103004, N'20261007_103: جدول onboarding_templates ناقص أو شكله غلط', 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns c WHERE c.[object_id] = OBJECT_ID(N'dbo.onboarding_template_items', N'U') AND c.[name] = N'templateId'
    AND c.[system_type_id] = TYPE_ID(N'int') AND c.[user_type_id] = TYPE_ID(N'int') AND c.[max_length] = 4 AND c.[is_nullable] = 1
    AND c.[is_identity] = 0 AND c.[is_computed] = 0 AND c.[default_object_id] = 0)
  THROW 103005, N'20261007_103: عمود onboarding_template_items.templateId ناقص أو شكله غلط (المطلوب int NULL)', 1;
GO
