-- 20261009_135: بنود الراتب (خطة التنفيذ — B4.3: بنود الراتب).
-- جدول جديد:
--   salary_items: وصف كل بند بيظهر في القسيمة — كوده، واسمه بالعربي والإنجليزي، ونوعه (EARNING استحقاق / DEDUCTION استقطاع)، وخاضع للتأمين،
--     وخاضع للضريبة، وطريقة التناسب (SERVICE_DAYS بأيام الخدمة / NONE)، وترتيبه في القسيمة، وهل قانوني، وهل بيتحسب، ومين عدّله وإمتى.
-- الصفوف بيضيفها الخادم وقت الإقلاع (الناقص بس، والموجود مابيتلمسش) بنفس ترتيب القسيمة الحالي.
-- الكود بيشتغل قبل الترحيل: القسيمة وجدول المسير بالترتيب الثابت زي الأول، وشاشة بنود الراتب بتقول إن الترحيل ناقص.
-- المبالغ مابتتغيّرش: الجدول بيوصف وبيرتّب بس.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.salary_items', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'code', N'nvarchar', 80, 0, 0, 0, 0),
      (N'nameAr', N'nvarchar', 240, 0, 0, 0, 0),
      (N'nameEn', N'nvarchar', 240, 0, 0, 0, 0),
      (N'kind', N'nvarchar', 24, 0, 0, 0, 0),
      (N'insurable', N'bit', 1, 1, 0, 0, 0),
      (N'taxable', N'bit', 1, 1, 0, 0, 0),
      (N'proration', N'nvarchar', 40, 0, 0, 0, 0),
      (N'sortOrder', N'int', 4, 10, 0, 0, 0),
      (N'statutory', N'bit', 1, 1, 0, 0, 0),
      (N'computed', N'bit', 1, 1, 0, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.salary_items', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.salary_items', N'U') AND [name] = N'PK_salary_items'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.salary_items', N'U') AND i.[name] = N'PK_salary_items'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 135001, N'20261009_135: جدول salary_items موجود وشكله مش شكل بنود الراتب (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.salary_items', N'U') IS NULL
CREATE TABLE dbo.salary_items (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_salary_items] PRIMARY KEY,
  [code] nvarchar(40) NOT NULL,
  [nameAr] nvarchar(120) NOT NULL,
  [nameEn] nvarchar(120) NOT NULL,
  [kind] nvarchar(12) NOT NULL,
  [insurable] bit NOT NULL,
  [taxable] bit NOT NULL,
  [proration] nvarchar(20) NOT NULL,
  [sortOrder] int NOT NULL,
  [statutory] bit NOT NULL,
  [computed] bit NOT NULL,
  [updatedByUserId] int NULL,
  [updatedAt] datetime2 NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.salary_items', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'code', N'nvarchar', 80, 0, 0, 0, 0),
      (N'nameAr', N'nvarchar', 240, 0, 0, 0, 0),
      (N'nameEn', N'nvarchar', 240, 0, 0, 0, 0),
      (N'kind', N'nvarchar', 24, 0, 0, 0, 0),
      (N'insurable', N'bit', 1, 1, 0, 0, 0),
      (N'taxable', N'bit', 1, 1, 0, 0, 0),
      (N'proration', N'nvarchar', 40, 0, 0, 0, 0),
      (N'sortOrder', N'int', 4, 10, 0, 0, 0),
      (N'statutory', N'bit', 1, 1, 0, 0, 0),
      (N'computed', N'bit', 1, 1, 0, 0, 0),
      (N'updatedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'updatedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.salary_items', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.salary_items', N'U') AND [name] = N'PK_salary_items'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.salary_items', N'U') AND i.[name] = N'PK_salary_items'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 135002, N'20261009_135: جدول salary_items ناقص أو شكله غلط', 1;
GO
