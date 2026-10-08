-- 20261008_104: الوظائف الشاغرة (خطة التنفيذ — B3.2 الجزء أ: الاحتياج والوظيفة الشاغرة).
-- جدول جديد:
--   recruitment_jobs: وظيفة شاغرة — المسمى، والفرع والقسم (اختياري)، والعدد المطلوب، والسبب، ونطاق الراتب وتاريخ البدء (اختياريين)،
--     والوصف والمتطلبات، والحالة (DRAFT مسودة / PUBLISHED منشورة / PAUSED موقوفة / CLOSED مقفولة)، وهل منشورة داخليًا أو خارجيًا،
--     وطلب «احتياج التوظيف» المعتمد اللي اتعملت منه (requestId؛ الفاضي = اتعملت من الشاشة)، ومين عملها (0 = من طلب معتمد).
-- الكود بيشتغل قبل الترحيل ده: قايمة الوظائف بتقول إن الترحيل ناقص، وإنشاء وظيفة وتقديم طلب «احتياج توظيف» مرفوضين برسالته.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.recruitment_jobs', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'title', N'nvarchar', 400, 0, 0, 0, 0),
      (N'branchId', N'int', 4, 10, 0, 0, 0),
      (N'departmentId', N'int', 4, 10, 0, 1, 0),
      (N'openings', N'int', 4, 10, 0, 0, 0),
      (N'reason', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'salaryFrom', N'decimal', 9, 18, 2, 1, 0),
      (N'salaryTo', N'decimal', 9, 18, 2, 1, 0),
      (N'startDate', N'date', 3, 10, 0, 1, 0),
      (N'description', N'nvarchar', 8000, 0, 0, 1, 0),
      (N'requirements', N'nvarchar', 8000, 0, 0, 1, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'internal', N'bit', 1, 1, 0, 0, 0),
      (N'external', N'bit', 1, 1, 0, 0, 0),
      (N'requestId', N'int', 4, 10, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'publishedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.recruitment_jobs', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.recruitment_jobs', N'U') AND [name] = N'PK_recruitment_jobs'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.recruitment_jobs', N'U') AND i.[name] = N'PK_recruitment_jobs'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 104001, N'20261008_104: جدول recruitment_jobs موجود وشكله مش شكل الوظائف الشاغرة (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.recruitment_jobs', N'U') IS NULL
CREATE TABLE dbo.recruitment_jobs (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_recruitment_jobs] PRIMARY KEY,
  [title] nvarchar(200) NOT NULL,
  [branchId] int NOT NULL,
  [departmentId] int NULL,
  [openings] int NOT NULL,
  [reason] nvarchar(500) NULL,
  [salaryFrom] decimal(18,2) NULL,
  [salaryTo] decimal(18,2) NULL,
  [startDate] date NULL,
  [description] nvarchar(4000) NULL,
  [requirements] nvarchar(4000) NULL,
  [status] nvarchar(20) NOT NULL,
  [internal] bit NOT NULL,
  [external] bit NOT NULL,
  [requestId] int NULL,
  [createdByUserId] int NOT NULL,
  [publishedAt] datetime2 NULL,
  [closedAt] datetime2 NULL,
  [createdAt] datetime2 NOT NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.recruitment_jobs', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'title', N'nvarchar', 400, 0, 0, 0, 0),
      (N'branchId', N'int', 4, 10, 0, 0, 0),
      (N'departmentId', N'int', 4, 10, 0, 1, 0),
      (N'openings', N'int', 4, 10, 0, 0, 0),
      (N'reason', N'nvarchar', 1000, 0, 0, 1, 0),
      (N'salaryFrom', N'decimal', 9, 18, 2, 1, 0),
      (N'salaryTo', N'decimal', 9, 18, 2, 1, 0),
      (N'startDate', N'date', 3, 10, 0, 1, 0),
      (N'description', N'nvarchar', 8000, 0, 0, 1, 0),
      (N'requirements', N'nvarchar', 8000, 0, 0, 1, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'internal', N'bit', 1, 1, 0, 0, 0),
      (N'external', N'bit', 1, 1, 0, 0, 0),
      (N'requestId', N'int', 4, 10, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'publishedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.recruitment_jobs', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.recruitment_jobs', N'U') AND [name] = N'PK_recruitment_jobs'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.recruitment_jobs', N'U') AND i.[name] = N'PK_recruitment_jobs'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 104002, N'20261008_104: جدول recruitment_jobs ناقص أو شكله غلط', 1;
GO
