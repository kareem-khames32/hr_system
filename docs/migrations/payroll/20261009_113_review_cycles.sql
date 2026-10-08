-- 20261009_113: دورات تقييم الأداء (خطة التنفيذ — B3.7 الجزء أ: النماذج والدورات).
-- جدول جديد:
--   review_cycles: دورة تقييم — الاسم، والنوع (ANNUAL سنوي / SEMI_ANNUAL نصف سنوي / PROBATION فترة تجربة / PROJECT مشروع)، والنموذج، وفترة التقييم،
--     والجمهور (audienceMode: COMPANY الشركة / BRANCHES فروع / DEPARTMENTS أقسام، وأرقامهم JSON)، والفروع اللي الدورة بتغطيها (branchIds: JSON؛ الفاضي =
--     كل الشركة) — لحكم نطاق اللي بيديرها، وآخر يوم للتقييم الذاتي ولتقييم المدير، والحالة (DRAFT مسودة / ACTIVE شغالة / CLOSED مقفولة)،
--     ونسخة النموذج المتجمّدة وقت الإطلاق (templateSnapshot)، ومين أطلقها وإمتى.
-- بيتطبق بعد ترحيل 20261009_112 (review_templates).
-- الكود بيشتغل قبل الترحيلات: شاشات الدورات والنماذج بتقول إن الترحيل ناقص، والإنشاء مرفوض برسالته.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.review_cycles', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'name', N'nvarchar', 400, 0, 0, 0, 0),
      (N'kind', N'nvarchar', 40, 0, 0, 0, 0),
      (N'templateId', N'int', 4, 10, 0, 0, 0),
      (N'periodStart', N'date', 3, 10, 0, 0, 0),
      (N'periodEnd', N'date', 3, 10, 0, 0, 0),
      (N'audienceMode', N'nvarchar', 40, 0, 0, 0, 0),
      (N'audienceIds', N'nvarchar', 4000, 0, 0, 1, 0),
      (N'branchIds', N'nvarchar', 4000, 0, 0, 1, 0),
      (N'selfDueDate', N'date', 3, 10, 0, 0, 0),
      (N'managerDueDate', N'date', 3, 10, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'templateSnapshot', N'nvarchar', -1, 0, 0, 1, 0),
      (N'launchedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'launchedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.review_cycles', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.review_cycles', N'U') AND [name] = N'PK_review_cycles'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.review_cycles', N'U') AND i.[name] = N'PK_review_cycles'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 113001, N'20261009_113: جدول review_cycles موجود وشكله مش شكل دورات التقييم (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.review_cycles', N'U') IS NULL
CREATE TABLE dbo.review_cycles (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_review_cycles] PRIMARY KEY,
  [name] nvarchar(200) NOT NULL,
  [kind] nvarchar(20) NOT NULL,
  [templateId] int NOT NULL,
  [periodStart] date NOT NULL,
  [periodEnd] date NOT NULL,
  [audienceMode] nvarchar(20) NOT NULL,
  [audienceIds] nvarchar(2000) NULL,
  [branchIds] nvarchar(2000) NULL,
  [selfDueDate] date NOT NULL,
  [managerDueDate] date NOT NULL,
  [status] nvarchar(20) NOT NULL,
  [templateSnapshot] nvarchar(max) NULL,
  [launchedAt] datetime2 NULL,
  [launchedByUserId] int NULL,
  [createdByUserId] int NOT NULL,
  [createdAt] datetime2 NOT NULL,
  [closedAt] datetime2 NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.review_cycles', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'name', N'nvarchar', 400, 0, 0, 0, 0),
      (N'kind', N'nvarchar', 40, 0, 0, 0, 0),
      (N'templateId', N'int', 4, 10, 0, 0, 0),
      (N'periodStart', N'date', 3, 10, 0, 0, 0),
      (N'periodEnd', N'date', 3, 10, 0, 0, 0),
      (N'audienceMode', N'nvarchar', 40, 0, 0, 0, 0),
      (N'audienceIds', N'nvarchar', 4000, 0, 0, 1, 0),
      (N'branchIds', N'nvarchar', 4000, 0, 0, 1, 0),
      (N'selfDueDate', N'date', 3, 10, 0, 0, 0),
      (N'managerDueDate', N'date', 3, 10, 0, 0, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'templateSnapshot', N'nvarchar', -1, 0, 0, 1, 0),
      (N'launchedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'launchedByUserId', N'int', 4, 10, 0, 1, 0),
      (N'createdByUserId', N'int', 4, 10, 0, 0, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0),
      (N'closedAt', N'datetime2', 8, 27, 7, 1, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.review_cycles', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.review_cycles', N'U') AND [name] = N'PK_review_cycles'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.review_cycles', N'U') AND i.[name] = N'PK_review_cycles'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 113002, N'20261009_113: جدول review_cycles ناقص أو شكله غلط', 1;
GO
