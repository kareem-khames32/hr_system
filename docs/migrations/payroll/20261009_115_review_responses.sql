-- 20261009_115: ردود تقييم الأداء (خطة التنفيذ — B3.7: التقييم الذاتي وتقييم المدير).
-- جدول جديد:
--   review_responses: رد على تكليف تقييم (review_assignments.id) — العلاقة (SELF ذاتي / MANAGER مدير)، والإجابات (JSON: تقدير كل بند وتعليقه)،
--     ولوحة الأدلة المتجمّدة وقت التسليم (JSON: الحضور، المهام، الأهداف…)، والدرجة المحسوبة بالأوزان (من 100)، والتعليق العام، ومين سلّم وإمتى.
-- بيتطبق بعد ترحيل 20261009_114 (review_assignments).
-- الكود بيشتغل قبل الترحيلات: شاشات التقييم بتقول إن الترحيل ناقص، والتسليم مرفوض برسالته.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.review_responses', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'assignmentId', N'int', 4, 10, 0, 0, 0),
      (N'relation', N'nvarchar', 20, 0, 0, 0, 0),
      (N'answers', N'nvarchar', -1, 0, 0, 0, 0),
      (N'evidence', N'nvarchar', -1, 0, 0, 1, 0),
      (N'score', N'decimal', 5, 5, 2, 1, 0),
      (N'comment', N'nvarchar', 4000, 0, 0, 1, 0),
      (N'submittedByUserId', N'int', 4, 10, 0, 0, 0),
      (N'submittedAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.review_responses', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.review_responses', N'U') AND [name] = N'PK_review_responses'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.review_responses', N'U') AND i.[name] = N'PK_review_responses'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 115001, N'20261009_115: جدول review_responses موجود وشكله مش شكل ردود التقييم (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.review_responses', N'U') IS NULL
CREATE TABLE dbo.review_responses (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_review_responses] PRIMARY KEY,
  [assignmentId] int NOT NULL,
  [relation] nvarchar(10) NOT NULL,
  [answers] nvarchar(max) NOT NULL,
  [evidence] nvarchar(max) NULL,
  [score] decimal(5,2) NULL,
  [comment] nvarchar(2000) NULL,
  [submittedByUserId] int NOT NULL,
  [submittedAt] datetime2 NOT NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.review_responses', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'assignmentId', N'int', 4, 10, 0, 0, 0),
      (N'relation', N'nvarchar', 20, 0, 0, 0, 0),
      (N'answers', N'nvarchar', -1, 0, 0, 0, 0),
      (N'evidence', N'nvarchar', -1, 0, 0, 1, 0),
      (N'score', N'decimal', 5, 5, 2, 1, 0),
      (N'comment', N'nvarchar', 4000, 0, 0, 1, 0),
      (N'submittedByUserId', N'int', 4, 10, 0, 0, 0),
      (N'submittedAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.review_responses', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.review_responses', N'U') AND [name] = N'PK_review_responses'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.review_responses', N'U') AND i.[name] = N'PK_review_responses'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 115002, N'20261009_115: جدول review_responses ناقص أو شكله غلط', 1;
GO
