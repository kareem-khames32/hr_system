-- 20261009_114: تكليفات تقييم الأداء (خطة التنفيذ — B3.7 الجزء أ: النماذج والدورات).
-- جدول جديد:
--   review_assignments: صف لكل موظف في دورة — الدورة (review_cycles.id)، والموظف المقيَّم، وفرعه ومديره المباشر (المقيِّم) وقت الإطلاق، والحالة
--     (OPEN مفتوح / COMPLETED المدير سلّم / APPROVED معتمد / ANNOUNCED معلن للموظف / ACKNOWLEDGED الموظف أقرّ)، وإمتى اتسلّم التقييم الذاتي وتقييم المدير،
--     ودرجة كل واحد والدرجة النهائية (من 100).
-- بيتطبق بعد ترحيل 20261009_113 (review_cycles).
-- الكود بيشتغل قبل الترحيلات: شاشات الدورات والنماذج بتقول إن الترحيل ناقص، والإطلاق مرفوض برسالته.
-- إضافي فقط: بلا حذف ولا تعبئة رجعية، ومن غير افتراضي (زي الكيان). آمن للتكرار.
-- التحقق كامل: كل عمود بنوعه وطوله ودقته وإلزامه وهويته، ومن غير افتراضي ولا محسوب ولا عمود زيادة، والمفتاح باسمه وعموده — مرة قبل
-- أي تغيير (جدول موجود بنفس الاسم وبشكل تاني = الترحيل بيقف من غير ما يغيّر حاجة) ومرة بعد التنفيذ.
-- متوافق مع SQL Server 2019.
SET NOCOUNT ON;
GO

-- تحقق قبل أي تغيير
IF OBJECT_ID(N'dbo.review_assignments', N'U') IS NOT NULL AND (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'cycleId', N'int', 4, 10, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'branchId', N'int', 4, 10, 0, 1, 0),
      (N'managerEmployeeId', N'int', 4, 10, 0, 1, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'selfSubmittedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'managerSubmittedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'selfScore', N'decimal', 5, 5, 2, 1, 0),
      (N'managerScore', N'decimal', 5, 5, 2, 1, 0),
      (N'finalScore', N'decimal', 5, 5, 2, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.review_assignments', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.review_assignments', N'U') AND [name] = N'PK_review_assignments'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.review_assignments', N'U') AND i.[name] = N'PK_review_assignments'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 114001, N'20261009_114: جدول review_assignments موجود وشكله مش شكل تكليفات التقييم (الأعمدة أو المفتاح)', 1;
GO

IF OBJECT_ID(N'dbo.review_assignments', N'U') IS NULL
CREATE TABLE dbo.review_assignments (
  [id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_review_assignments] PRIMARY KEY,
  [cycleId] int NOT NULL,
  [employeeId] int NOT NULL,
  [branchId] int NULL,
  [managerEmployeeId] int NULL,
  [status] nvarchar(20) NOT NULL,
  [selfSubmittedAt] datetime2 NULL,
  [managerSubmittedAt] datetime2 NULL,
  [selfScore] decimal(5,2) NULL,
  [managerScore] decimal(5,2) NULL,
  [finalScore] decimal(5,2) NULL,
  [createdAt] datetime2 NOT NULL
);
GO

-- تحقق بعد التنفيذ: نفس الشكل كامل
IF OBJECT_ID(N'dbo.review_assignments', N'U') IS NULL OR (EXISTS (
    SELECT 1 FROM (VALUES (N'id', N'int', 4, 10, 0, 0, 1),
      (N'cycleId', N'int', 4, 10, 0, 0, 0),
      (N'employeeId', N'int', 4, 10, 0, 0, 0),
      (N'branchId', N'int', 4, 10, 0, 1, 0),
      (N'managerEmployeeId', N'int', 4, 10, 0, 1, 0),
      (N'status', N'nvarchar', 40, 0, 0, 0, 0),
      (N'selfSubmittedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'managerSubmittedAt', N'datetime2', 8, 27, 7, 1, 0),
      (N'selfScore', N'decimal', 5, 5, 2, 1, 0),
      (N'managerScore', N'decimal', 5, 5, 2, 1, 0),
      (N'finalScore', N'decimal', 5, 5, 2, 1, 0),
      (N'createdAt', N'datetime2', 8, 27, 7, 0, 0)
    ) AS expected([name], [typeName], [maxLength], [precision], [scale], [nullable], [isIdentity])
    FULL OUTER JOIN (
      SELECT c.[name], t.[name] AS [typeName], c.[max_length], c.[precision], c.[scale], c.[is_nullable], c.[is_identity], c.[default_object_id], c.[is_computed]
      FROM sys.columns c INNER JOIN sys.types t ON t.[user_type_id] = c.[user_type_id] WHERE c.[object_id] = OBJECT_ID(N'dbo.review_assignments', N'U')
    ) AS actual ON actual.[name] = expected.[name]
    WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[typeName] <> expected.[typeName] OR actual.[max_length] <> expected.[maxLength]
       OR actual.[precision] <> expected.[precision] OR actual.[scale] <> expected.[scale] OR actual.[is_nullable] <> expected.[nullable]
       OR actual.[is_identity] <> expected.[isIdentity] OR actual.[default_object_id] <> 0 OR actual.[is_computed] <> 0)
    OR (NOT EXISTS (SELECT 1 FROM sys.indexes WHERE [object_id] = OBJECT_ID(N'dbo.review_assignments', N'U') AND [name] = N'PK_review_assignments'
      AND [is_unique] = 1 AND [is_primary_key] = 1 AND [has_filter] = 0 AND [is_disabled] = 0)
    OR EXISTS (
      SELECT 1 FROM (VALUES (1, N'id')) AS expected([ordinal], [name])
      FULL OUTER JOIN (
        SELECT ic.[key_ordinal], ic.[is_included_column], c.[name]
        FROM sys.indexes i INNER JOIN sys.index_columns ic ON ic.[object_id] = i.[object_id] AND ic.[index_id] = i.[index_id]
        INNER JOIN sys.columns c ON c.[object_id] = ic.[object_id] AND c.[column_id] = ic.[column_id]
        WHERE i.[object_id] = OBJECT_ID(N'dbo.review_assignments', N'U') AND i.[name] = N'PK_review_assignments'
      ) AS actual ON actual.[key_ordinal] = expected.[ordinal] AND actual.[is_included_column] = 0
      WHERE actual.[name] IS NULL OR expected.[name] IS NULL OR actual.[name] <> expected.[name])))
  THROW 114002, N'20261009_114: جدول review_assignments ناقص أو شكله غلط', 1;
GO
